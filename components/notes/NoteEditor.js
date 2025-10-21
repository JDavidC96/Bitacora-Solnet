// components/notes/NoteEditor.js
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function NoteEditor({
  noteText,
  onNoteChange,
  selectedImages = [],
  onSave,
  loading = false
}) {
  return (
    <View style={styles.container}>
      <TextInput
        style={[styles.input, { height: 160 }]}
        multiline
        placeholder="Escribe tu entrada..."
        placeholderTextColor="#aaa"
        value={noteText}
        onChangeText={onNoteChange}
        textAlignVertical="top"
      />

      {selectedImages.length > 0 && (
        <Text style={styles.imageCount}>
          📷 {selectedImages.length} imagen(es) seleccionada(s)
        </Text>
      )}

      <TouchableOpacity 
        style={[
          styles.saveButton,
          (!noteText.trim() || loading) && styles.disabledButton
        ]} 
        onPress={onSave}
        disabled={!noteText.trim() || loading}
      >
        <Text style={styles.saveButtonText}>
          {loading ? '⏳ Guardando...' : '💾 Guardar entrada'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#2C2C3A',
    color: '#FFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#3A3A4A',
  },
  imageCount: {
    color: '#63B3ED',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#5A67D8',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#718096',
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});