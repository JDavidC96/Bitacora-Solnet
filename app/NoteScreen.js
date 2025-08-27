import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { configureNotifications, showSaveNotification } from '../notifications';

// Firebase
import { addDoc, collection, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { useUser } from '../context/UserContext';
import { db } from '../firebase/firebaseConfig';

export default function NoteScreen() {
  const { id, title } = useLocalSearchParams();
  const router = useRouter();
  const { role } = useUser();

  const [author, setAuthor] = useState('');
  const [noteText, setNoteText] = useState('');
  const [entries, setEntries] = useState([]);

  // 👉 estados para edición
  const [editModal, setEditModal] = useState(false);
  const [editText, setEditText] = useState('');
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    configureNotifications();

    const q = query(
      collection(db, 'proyectos', id, 'notas'),
      orderBy('fechaISO', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEntries(data);
    });

    return () => unsubscribe();
  }, [id]);

  const handleSave = async () => {
    if (!noteText.trim() || !author.trim()) return;

    const now = new Date();
    const fechaISO = now.toISOString().split('T')[0];
    const hora = now.toLocaleTimeString();

    const newEntry = {
      fecha: `${fechaISO} ${hora}`,
      fechaISO,
      hora,
      texto: noteText.trim(),
      autor: author.trim(),
      timestamp: now.getTime(), // 👈 guardamos timestamp en ms
    };

    try {
      await addDoc(collection(db, 'proyectos', id, 'notas'), newEntry);
      await showSaveNotification();
      setNoteText('');
      setAuthor('');
    } catch (error) {
      console.error('Error guardando nota:', error);
    }
  };

  const handleLongPress = (entry, index) => {
    // Solo permitir en la primera (última añadida)
    if (index !== 0) return;

    const now = Date.now();
    const limite = 5 * 60 * 1000; // 5 minutos
    if (!entry.timestamp || now - entry.timestamp > limite) {
      alert("Solo puedes editar la última nota dentro de los primeros 5 minutos.");
      return;
    }

    setEditText(entry.texto);
    setEditId(entry.id);
    setEditModal(true);
  };

  const handleUpdate = async () => {
    if (!editId) return;
    try {
      const ref = doc(db, 'proyectos', id, 'notas', editId);
      await updateDoc(ref, { texto: editText });
      setEditModal(false);
      setEditId(null);
    } catch (error) {
      console.error("Error actualizando nota:", error);
    }
  };

  const canWrite = ["Administrador", "Ingeniero", "Supervisor"].includes(role);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bitácora para {title}</Text>

      {canWrite && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Tu nombre"
            placeholderTextColor="#aaa"
            value={author}
            onChangeText={setAuthor}
          />

          <TextInput
            style={[styles.input, { height: 160, textAlignVertical: 'top' }]}
            multiline
            placeholder="Escribe tu entrada..."
            placeholderTextColor="#aaa"
            value={noteText}
            onChangeText={setNoteText}
          />

          <TouchableOpacity style={styles.button} onPress={handleSave}>
            <Text style={styles.buttonText}>💾 Guardar entrada</Text>
          </TouchableOpacity>
        </>
      )}

      {/* === Botones de navegación === */}
      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#38B2AC', marginTop: 10 }]}
        onPress={() =>
          router.push({ pathname: '/CalendarScreen', params: { id, title } })
        }
      >
        <Text style={styles.buttonText}>📅 Ver Calendario</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#ECC94B', marginTop: 10 }]}
        onPress={() =>
          router.push({ pathname: '/ProjectStepScreen', params: { id, title } })
        }
      >
        <Text style={styles.buttonText}>🛠️ Etapas del Proyecto</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#48BB78', marginTop: 10 }]}
        onPress={() =>
          router.push({ pathname: '/ProjectStockScreen', params: { projectId: id, title } })
        }
      >
        <Text style={styles.buttonText}>📦 Inventario del Proyecto</Text>
      </TouchableOpacity>

      {/* === Historial === */}
      <ScrollView style={styles.historyBox}>
        <Text style={styles.historyTitle}>Entradas anteriores:</Text>
        {entries.length === 0 ? (
          <Text style={{ color: '#888' }}>No hay entradas aún.</Text>
        ) : (
          entries.map((entry, idx) => (
            <TouchableOpacity
              key={entry.id}
              style={styles.entryItem}
              onLongPress={() => handleLongPress(entry, idx)}
            >
              <Text style={styles.entryDate}>{entry.fecha}</Text>
              <Text style={styles.entryText}>
                {entry.texto ? entry.texto : "(Vacía)"} — ✍️ {entry.autor || "Anónimo"}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Modal para edición */}
      <Modal visible={editModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={{ color: '#FFF', fontSize: 18, marginBottom: 12 }}>Editar nota</Text>
            <TextInput
              style={[styles.input, { height: 120, textAlignVertical: 'top' }]}
              multiline
              value={editText}
              onChangeText={setEditText}
            />
            <TouchableOpacity style={styles.button} onPress={handleUpdate}>
              <Text style={styles.buttonText}>💾 Guardar cambios</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setEditModal(false)}>
              <Text style={{ color: '#F56565', textAlign: 'center', marginTop: 8 }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1E1E2F', padding: 20 },
  title: { fontSize: 22, color: '#FFF', marginBottom: 12 },
  input: {
    backgroundColor: '#2C2C3A',
    color: '#FFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#5A67D8',
    padding: 14,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  buttonText: { color: '#FFF', fontWeight: 'bold' },
  historyBox: { marginTop: 20 },
  historyTitle: { fontSize: 18, color: '#FFF', marginBottom: 8 },
  entryItem: {
    backgroundColor: '#2C2C3A',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  entryDate: { fontSize: 12, color: '#999', marginBottom: 4 },
  entryText: { fontSize: 14, color: '#FFF' },
  modalOverlay: { flex: 1, backgroundColor: '#000000aa', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { backgroundColor: '#2C2C3A', padding: 24, borderRadius: 12, width: '85%' },
});
