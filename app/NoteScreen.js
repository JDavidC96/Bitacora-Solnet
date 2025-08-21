import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { configureNotifications, showSaveNotification } from '../notifications';

// Firebase
import { addDoc, collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

export default function NoteScreen() {
  const { id, title } = useLocalSearchParams();
  const router = useRouter();

  const [noteText, setNoteText] = useState('');
  const [entries, setEntries] = useState([]);

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
    if (!noteText.trim()) return;

    const now = new Date();
    const fechaISO = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const hora = now.toLocaleTimeString();

    const newEntry = {
      fecha: `${fechaISO} ${hora}`,
      fechaISO,
      hora,
      texto: noteText.trim(),
    };

    try {
      await addDoc(collection(db, 'proyectos', id, 'notas'), newEntry);
      await showSaveNotification();
      setNoteText('');
    } catch (error) {
      console.error('Error guardando nota:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bitácora para {title}</Text>

      <TextInput
        style={styles.input}
        multiline
        placeholder="Escribe tu entrada..."
        placeholderTextColor="#aaa"
        value={noteText}
        onChangeText={setNoteText}
      />

      <TouchableOpacity style={styles.button} onPress={handleSave}>
        <Text style={styles.buttonText}>💾 Guardar entrada</Text>
      </TouchableOpacity>

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

      <ScrollView style={styles.historyBox}>
        <Text style={styles.historyTitle}>Entradas anteriores:</Text>
        {entries.length === 0 ? (
          <Text style={{ color: '#888' }}>No hay entradas aún.</Text>
        ) : (
          entries.map((entry) => (
            <View key={entry.id} style={styles.entryItem}>
              <Text style={styles.entryDate}>{entry.fecha}</Text>
              <Text style={styles.entryText}>
                {entry.texto ? entry.texto : "(Vacía)"}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
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
    height: 160,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#5A67D8',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  historyBox: { marginTop: 20 },
  historyTitle: { color: '#FFF', fontSize: 16, marginBottom: 10 },
  entryItem: {
    marginBottom: 12,
    backgroundColor: '#2C2C3A',
    padding: 10,
    borderRadius: 8,
  },
  entryDate: { color: '#999', fontSize: 12, marginBottom: 4 },
  entryText: { color: '#FFF', fontSize: 15 },
});
