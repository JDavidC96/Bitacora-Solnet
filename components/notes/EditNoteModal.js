// components/notes/EditNoteModal.js
import { StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import ModalBase from '../ModalBase';

/**
 * Modal para editar el contenido de una nota
 * Permite modificar el texto de una nota existente con validación de contenido
 * 
 * @component
 * @param {Object} props - Propiedades del componente
 * @param {boolean} props.visible - Controla la visibilidad del modal
 * @param {string} props.editText - Texto actual de la nota que se está editando
 * @param {Function} props.onTextChange - Función que se ejecuta al cambiar el texto
 * @param {Function} props.onSave - Función que se ejecuta al guardar los cambios
 * @param {Function} props.onClose - Función que se ejecuta al cerrar el modal
 * @returns {JSX.Element} Modal con campo de texto para editar notas
 * 
 * @example
 * // Uso básico
 * <EditNoteModal
 *   visible={isModalVisible}
 *   editText={noteContent}
 *   onTextChange={setNoteContent}
 *   onSave={handleSaveNote}
 *   onClose={() => setIsModalVisible(false)}
 * />
 */
export default function EditNoteModal({
  visible,
  editText,
  onTextChange,
  onSave,
  onClose
}) {
  return (
    <ModalBase
      visible={visible}
      title="Editar nota"
      onClose={onClose}
      footer={
        <TouchableOpacity 
          style={[
            styles.saveButton,
            !editText.trim() && styles.disabledButton
          ]} 
          onPress={onSave}
          disabled={!editText.trim()}
        >
          <Text style={styles.saveButtonText}>💾 Guardar cambios</Text>
        </TouchableOpacity>
      }
    >
      {/* Campo de texto para editar la nota */}
      <TextInput
        style={[styles.input, { height: 120 }]}
        multiline
        value={editText}
        onChangeText={onTextChange}
        textAlignVertical="top"
        placeholder="Edita tu nota..."
        placeholderTextColor="#aaa"
      />
    </ModalBase>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: '#2C2C3A',
    color: '#FFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#3A3A4A',
  },
  saveButton: {
    backgroundColor: '#5A67D8',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#718096',
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});