// components/home/AssignPersonModal.js
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import DropdownSelect from '../DropdownSelect';
import ModalBase from '../ModalBase';

export default function AssignPersonModal({ 
  visible, 
  project, 
  personal, 
  onClose, 
  onAssign,
  loading = false 
}) {
  const [selectedPerson, setSelectedPerson] = useState(null);

  useEffect(() => {
    if (!visible) {
      setSelectedPerson(null);
    }
  }, [visible]);

  const personalLibre = personal.filter(p => p.estado === "libre");
  const dropdownData = personalLibre.map(p => ({
    label: `${p.nombre} (${p.cargo})`,
    value: p.id,
  }));

  const handleAssign = () => {
    if (!selectedPerson) {
      alert('Por favor selecciona una persona');
      return;
    }
    onAssign(selectedPerson);
  };

  if (!project) return null;

  return (
    <ModalBase
      visible={visible}
      title={`Asignar personal a ${project.title || ''}`}
      onClose={onClose}
      footer={
        <TouchableOpacity
          style={[
            styles.confirmButton,
            (!selectedPerson || loading) && styles.disabledButton
          ]}
          onPress={handleAssign}
          disabled={!selectedPerson || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.confirmButtonText}>Asignar</Text>
          )}
        </TouchableOpacity>
      }
    >
      {personalLibre.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No hay personal libre disponible
          </Text>
          <Text style={styles.emptySubtext}>
            Todos los trabajadores están asignados a otros proyectos
          </Text>
        </View>
      ) : (
        <DropdownSelect
          data={dropdownData}
          value={selectedPerson}
          placeholder="Selecciona personal..."
          onChange={setSelectedPerson}
          searchable={true}
        />
      )}
    </ModalBase>
  );
}

const styles = {
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
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    color: '#AAA',
    fontSize: 14,
    textAlign: 'center',
  },
};