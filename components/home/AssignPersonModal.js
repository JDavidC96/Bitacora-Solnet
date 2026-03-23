// components/home/AssignPersonModal.js
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DropdownSelect from '../DropdownSelect';
import ModalBase from '../ModalBase';

/**
 * Modal para asignar personal disponible a un proyecto específico.
 * 
 * Ahora incluye un campo opcional de "actividad" visible solo para
 * Administrador e Ingeniero, que permite describir qué se hará en el proyecto.
 *
 * @param {Object} props
 * @param {boolean} props.visible
 * @param {Object|null} props.project
 * @param {Array<Object>} props.personal
 * @param {function} props.onClose
 * @param {function} props.onAssign - (personId, actividad?) => void
 * @param {boolean} [props.loading=false]
 * @param {string} [props.role] - Rol del usuario actual
 */
export default function AssignPersonModal({ 
  visible, 
  project, 
  personal, 
  onClose, 
  onAssign,
  loading = false,
  role = "",
}) {
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [actividad, setActividad] = useState("");

  const canAddActividad = ["Administrador", "Ingeniero"].includes(role);

  useEffect(() => {
    if (!visible) {
      setSelectedPerson(null);
      setActividad("");
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
    // Pass actividad as second argument (empty string if not filled)
    onAssign(selectedPerson, actividad.trim() || "");
  };

  if (!project) return null;

  return (
    <ModalBase
      visible={visible}
      title={`Asignar personal a\n${project.title || ''}`}
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
        <View style={styles.body}>
          <Text style={styles.label}>Selecciona una persona</Text>
          <DropdownSelect
            data={dropdownData}
            value={selectedPerson}
            placeholder="Selecciona personal..."
            onChange={setSelectedPerson}
            searchable={true}
            disabled={loading}
          />

          {/* Campo de actividad — solo visible para Administrador / Ingeniero */}
          {canAddActividad && (
            <View style={styles.actividadContainer}>
              <Text style={styles.label}>
                ¿Qué se va a hacer? (opcional)
              </Text>
              <TextInput
                style={styles.actividadInput}
                placeholder="Ej: Instalación de paneles, mantenimiento..."
                placeholderTextColor="#6B7280"
                value={actividad}
                onChangeText={setActividad}
                multiline
                numberOfLines={2}
                maxLength={200}
              />
            </View>
          )}
        </View>
      )}
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
    marginBottom: 4,
  },
  confirmButton: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: '#6B7280',
    opacity: 0.7,
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
  },
  actividadContainer: {
    marginTop: 8,
  },
  actividadInput: {
    backgroundColor: '#111827',
    color: '#FFF',
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    minHeight: 56,
    textAlignVertical: 'top',
  },
};