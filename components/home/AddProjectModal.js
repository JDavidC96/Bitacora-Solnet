// components/home/AddProjectModal.js
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import ModalBase from '../ModalBase';

export default function AddProjectModal({
  visible,
  onClose,
  onAddProject,
  loading = false
}) {
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectLocation, setNewProjectLocation] = useState('');
  const [newProjectPotenciaAC, setNewProjectPotenciaAC] = useState('');
  const [newProjectPotenciaDC, setNewProjectPotenciaDC] = useState('');
  const [newProjectPaneles, setNewProjectPaneles] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const parseOptionalNumber = (raw, { allowFloat = true } = {}) => {
    const s = String(raw ?? '').trim();
    if (!s) return null;

    const normalized = s.replace(',', '.');
    const n = allowFloat ? Number(normalized) : parseInt(normalized, 10);

    if (!Number.isFinite(n) || n < 0) return NaN;
    return n;
  };

  const handleAdd = () => {
    if (!newProjectName.trim() || !newProjectLocation.trim()) {
      alert('Por favor completa todos los campos');
      return;
    }

    const potenciaAC = parseOptionalNumber(newProjectPotenciaAC, { allowFloat: true });
    if (potenciaAC !== null && Number.isNaN(potenciaAC)) {
      alert('Potencia AC inválida. Ingresa un número (>= 0).');
      return;
    }

    const potenciaDC = parseOptionalNumber(newProjectPotenciaDC, { allowFloat: true });
    if (potenciaDC !== null && Number.isNaN(potenciaDC)) {
      alert('Potencia DC inválida. Ingresa un número (>= 0).');
      return;
    }

    const paneles = parseOptionalNumber(newProjectPaneles, { allowFloat: false });
    if (paneles !== null && Number.isNaN(paneles)) {
      alert('Paneles inválido. Ingresa un entero (>= 0).');
      return;
    }

    onAddProject({
      name: newProjectName.trim(),
      location: newProjectLocation.trim(),
      date: selectedDate,
      ...(potenciaAC != null ? { potenciaAC } : {}),
      ...(potenciaDC != null ? { potenciaDC } : {}),
      ...(paneles != null ? { panelesInstalados: paneles } : {}),
    });
  };

  const handleClose = () => {
    setNewProjectName('');
    setNewProjectLocation('');
    setNewProjectPotenciaAC('');
    setNewProjectPotenciaDC('');
    setNewProjectPaneles('');
    setSelectedDate(new Date());
    onClose();
  };

  return (
    <ModalBase
      visible={visible}
      title="Nuevo proyecto"
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
            <Text style={styles.confirmButtonText}>Agregar proyecto</Text>
          )}
        </TouchableOpacity>
      }
    >
      <View style={styles.body}>
        <Text style={styles.label}>Nombre del proyecto</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Planta FV Bodega Central"
          placeholderTextColor="#9CA3AF"
          value={newProjectName}
          onChangeText={setNewProjectName}
          autoCapitalize="sentences"
        />

        <Text style={styles.label}>Ubicación</Text>
        <TextInput
          style={styles.input}
          placeholder="Dirección o enlace de Maps"
          placeholderTextColor="#9CA3AF"
          value={newProjectLocation}
          onChangeText={setNewProjectLocation}
          autoCapitalize="sentences"
        />

        <Text style={styles.label}>Potencia total instalada (kW AC) (opcional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: 150"
          placeholderTextColor="#9CA3AF"
          value={newProjectPotenciaAC}
          onChangeText={setNewProjectPotenciaAC}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Potencia total instalada (kW DC) (opcional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: 180"
          placeholderTextColor="#9CA3AF"
          value={newProjectPotenciaDC}
          onChangeText={setNewProjectPotenciaDC}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Paneles instalados (opcional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: 320"
          placeholderTextColor="#9CA3AF"
          value={newProjectPaneles}
          onChangeText={setNewProjectPaneles}
          keyboardType="number-pad"
        />

        <Text style={styles.label}>Fecha inicial</Text>
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
      </View>
    </ModalBase>
  );
}

const styles = {
  body: {
    gap: 10,
  },
  label: {
    color: '#E5E7EB',
    fontSize: 13,
    marginBottom: 2,
  },
  input: {
    backgroundColor: '#111827',
    color: '#F9FAFB',
    padding: 12,
    borderRadius: 10,
    marginBottom: 4,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#374151',
  },
  dateButton: {
    backgroundColor: '#111827',
    padding: 12,
    borderRadius: 10,
    marginBottom: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  dateButtonText: {
    color: '#F9FAFB',
    fontSize: 14,
  },
  confirmButton: {
    backgroundColor: '#FF7A00',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
    opacity: 0.7,
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
};
