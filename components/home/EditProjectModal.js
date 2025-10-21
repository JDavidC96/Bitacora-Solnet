// components/home/EditProjectModal.js
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity } from 'react-native';
import ModalBase from '../ModalBase';

export default function EditProjectModal({ 
  visible, 
  project, 
  onClose, 
  onSave,
  loading = false 
}) {
  const [editedName, setEditedName] = useState('');
  const [editedLocation, setEditedLocation] = useState('');

  useEffect(() => {
    if (project) {
      setEditedName(project.title || '');
      setEditedLocation(project.ubicacion || '');
    }
  }, [project]);

  const handleSave = () => {
    if (!editedName.trim()) {
      alert('El nombre del proyecto es requerido');
      return;
    }

    onSave({
      title: editedName.trim(),
      ubicacion: editedLocation.trim(),
    });
  };

  const handleClose = () => {
    setEditedName('');
    setEditedLocation('');
    onClose();
  };

  if (!project) return null;

  return (
    <ModalBase
      visible={visible}
      title="Editar Proyecto"
      onClose={handleClose}
      footer={
        <TouchableOpacity
          style={[
            styles.confirmButton,
            loading && styles.disabledButton
          ]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.confirmButtonText}>Guardar</Text>
          )}
        </TouchableOpacity>
      }
    >
      <TextInput
        style={styles.input}
        placeholder="Nuevo nombre"
        placeholderTextColor="#AAA"
        value={editedName}
        onChangeText={setEditedName}
        autoCapitalize="words"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Nueva ubicación"
        placeholderTextColor="#AAA"
        value={editedLocation}
        onChangeText={setEditedLocation}
        autoCapitalize="words"
      />
    </ModalBase>
  );
}

const styles = {
  input: {
    backgroundColor: '#3A3A4A',
    color: '#FFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 16,
  },
  confirmButton: {
    backgroundColor: '#5A67D8',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  disabledButton: {
    backgroundColor: '#718096',
    opacity: 0.7,
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
};