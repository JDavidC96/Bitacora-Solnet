// components/home/AddProjectModal.js
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity } from 'react-native';
import ModalBase from '../ModalBase';

export default function AddProjectModal({ 
  visible, 
  onClose, 
  onAddProject,
  loading = false 
}) {
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectLocation, setNewProjectLocation] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const handleAdd = () => {
    if (!newProjectName.trim() || !newProjectLocation.trim()) {
      alert('Por favor completa todos los campos');
      return;
    }

    onAddProject({
      name: newProjectName.trim(),
      location: newProjectLocation.trim(),
      date: selectedDate
    });
  };

  const handleClose = () => {
    // Limpiar campos al cerrar
    setNewProjectName('');
    setNewProjectLocation('');
    setSelectedDate(new Date());
    onClose();
  };

  return (
    <ModalBase
      visible={visible}
      title="Nuevo Proyecto"
      onClose={handleClose}
      footer={
        <TouchableOpacity
          style={[
            styles.confirmButton,
            loading && styles.disabledButton
          ]}
          onPress={handleAdd}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.confirmButtonText}>Agregar</Text>
          )}
        </TouchableOpacity>
      }
    >
      <TextInput
        style={styles.input}
        placeholder="Nombre del proyecto"
        placeholderTextColor="#AAA"
        value={newProjectName}
        onChangeText={setNewProjectName}
        autoCapitalize="words"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Ubicación del proyecto"
        placeholderTextColor="#AAA"
        value={newProjectLocation}
        onChangeText={setNewProjectLocation}
        autoCapitalize="words"
      />
      
      <Text style={styles.modalLabel}>📅 Fecha inicial</Text>
      
      <TouchableOpacity 
        style={styles.dateButton} 
        onPress={() => setShowPicker(true)}
      >
        <Text style={styles.dateButtonText}>
          {selectedDate.toLocaleDateString()}
        </Text>
      </TouchableOpacity>
      
      {showPicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowPicker(false);
            if (date) setSelectedDate(date);
          }}
        />
      )}
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
  modalLabel: {
    color: '#FFF',
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '600',
  },
  dateButton: {
    backgroundColor: '#3A3A4A',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  dateButtonText: {
    color: '#FFF',
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