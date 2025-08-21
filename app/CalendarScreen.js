import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Calendar } from 'react-native-calendars';

// Firebase
import { addDoc, collection, deleteDoc, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

function getCurrentTime() {
  return new Date().toLocaleTimeString();
}

export default function CalendarScreen() {
  const { id, title } = useLocalSearchParams();
  const [selected, setSelected] = useState(null);
  const [newNote, setNewNote] = useState('');
  const [entries, setEntries] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [editedText, setEditedText] = useState('');
  const [editModalVisible, setEditModalVisible] = useState(false);

  useEffect(() => {
    const q = collection(db, 'proyectos', id, 'notas');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ idDoc: d.id, ...d.data() }));
      setEntries(data);
    });
    return () => unsubscribe();
  }, [id]);

  const handleSave = async () => {
    if (!newNote.trim() || !selected) return;

    const hora = getCurrentTime();

    try {
      await addDoc(collection(db, 'proyectos', id, 'notas'), {
        fecha: `${selected} ${hora}`,
        fechaISO: selected, // YYYY-MM-DD
        hora,
        texto: newNote.trim(),
      });
      setNewNote('');
    } catch (error) {
      console.error('Error guardando nota:', error);
    }
  };

  const confirmEdit = async () => {
    try {
      const ref = doc(db, 'proyectos', id, 'notas', selectedNote.idDoc);
      await updateDoc(ref, { texto: editedText });
      setEditModalVisible(false);
      setSelectedNote(null);
    } catch (error) {
      console.error('Error editando nota:', error);
    }
  };

  const confirmDelete = async () => {
    try {
      const ref = doc(db, 'proyectos', id, 'notas', selectedNote.idDoc);
      await deleteDoc(ref);
      setEditModalVisible(false);
      setSelectedNote(null);
    } catch (error) {
      console.error('Error eliminando nota:', error);
    }
  };

  const markedDates = entries.reduce((acc, entry) => {
    acc[entry.fechaISO] = { marked: true, dotColor: '#5A67D8' };
    return acc;
  }, {});

  const notesOfSelectedDay = entries.filter(e => e.fechaISO === selected);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Calendario de {title}</Text>

        <Calendar
          onDayPress={(day) => {
            setSelected(day.dateString);
          }}
          markedDates={{
            ...markedDates,
            ...(selected && {
              [selected]: { selected: true, selectedColor: '#5A67D8' },
            }),
          }}
          theme={{
            calendarBackground: '#1E1E2F',
            dayTextColor: '#FFF',
            monthTextColor: '#FFF',
            selectedDayTextColor: '#FFF',
          }}
        />

        {selected && (
          <ScrollView style={styles.notesBox}>
            <Text style={styles.notesTitle}>Notas del {selected}:</Text>
            {notesOfSelectedDay.length === 0 ? (
              <Text style={{ color: '#888' }}>No hay notas aún.</Text>
            ) : (
              notesOfSelectedDay.map((entry) => (
                <TouchableOpacity key={entry.idDoc} onLongPress={() => {
                  setSelectedNote(entry);
                  setEditedText(entry.texto);
                  setEditModalVisible(true);
                }}>
                  <Text style={styles.noteItem}>• {entry.texto ? entry.texto : "(Vacía)"}</Text>
                </TouchableOpacity>
              ))
            )}

            <TextInput
              style={styles.input}
              placeholder="Agregar nueva nota..."
              placeholderTextColor="#aaa"
              value={newNote}
              onChangeText={setNewNote}
              multiline
            />

            <TouchableOpacity style={styles.button} onPress={handleSave}>
              <Text style={styles.buttonText}>💾 Guardar nota</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* Modal para editar/eliminar nota */}
        <Modal
          visible={editModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setEditModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Editar Nota</Text>
              <TextInput
                style={styles.input}
                value={editedText}
                onChangeText={setEditedText}
                multiline
              />
              <TouchableOpacity style={styles.button} onPress={confirmEdit}>
                <Text style={styles.buttonText}>✅ Guardar cambios</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, { backgroundColor: '#E53E3E' }]}
                onPress={confirmDelete}
              >
                <Text style={styles.buttonText}>🗑️ Eliminar nota</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1E1E2F', padding: 20 },
  title: { color: '#FFF', fontSize: 22, marginBottom: 10 },
  notesBox: { marginTop: 20 },
  notesTitle: { color: '#FFF', fontSize: 16, marginBottom: 8 },
  noteItem: { color: '#DDD', marginBottom: 4, fontSize: 15 },
  input: { backgroundColor: '#2C2C3A', color: '#FFF', padding: 12, borderRadius: 8, textAlignVertical: 'top', marginTop: 12 },
  button: { backgroundColor: '#5A67D8', paddingVertical: 12, marginTop: 10, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: '#00000099', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { backgroundColor: '#2C2C3A', padding: 24, borderRadius: 12, width: '85%' },
  modalTitle: { color: '#FFF', fontSize: 18, marginBottom: 12, textAlign: 'center' },
  cancelText: { color: '#AAA', textAlign: 'center', marginTop: 12 },
});
