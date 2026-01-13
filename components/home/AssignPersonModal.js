// components/home/AssignPersonModal.js
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import DropdownSelect from '../DropdownSelect';
import ModalBase from '../ModalBase';

/**
 * Modal para asignar personal disponible a un proyecto específico.
 * Muestra una lista filtrada de trabajadores con estado "libre" y permite
 * seleccionar uno para asignarlo al proyecto actual.
 * 
 * @component
 * @example
 * const handleAssign = (personId) => {
 *   console.log('Persona asignada:', personId);
 *   // Enviar asignación al backend
 * };
 * 
 * return (
 *   <AssignPersonModal
 *     visible={isModalVisible}
 *     project={selectedProject}
 *     personal={availableStaff}
 *     onClose={() => setIsModalVisible(false)}
 *     onAssign={handleAssign}
 *     loading={isAssigning}
 *   />
 * );
 * 
 * @param {Object} props - Propiedades del componente
 * @param {boolean} props.visible - Controla la visibilidad del modal
 * @param {Object|null} props.project - Proyecto al que se asignará el personal
 * @param {string} props.project.title - Título del proyecto para mostrar
 * @param {Array<Object>} props.personal - Lista completa de personal disponible
 * @param {string} props.personal[].id - Identificador único de la persona
 * @param {string} props.personal[].nombre - Nombre completo de la persona
 * @param {string} props.personal[].cargo - Cargo/rol de la persona
 * @param {string} props.personal[].estado - Estado actual ("libre" o "asignado")
 * @param {function} props.onClose - Función callback cuando se cierra el modal
 * @param {function} props.onAssign - Función callback para asignar la persona seleccionada
 * @param {boolean} [props.loading=false] - Indica si está en proceso de asignación
 * 
 * @returns {React.ReactElement|null} Modal de asignación o null si no hay proyecto
 * 
 * @see ModalBase Componente base de modal utilizado
 * @see DropdownSelect Componente de selector desplegable para personal
 */
export default function AssignPersonModal({ 
  visible, 
  project, 
  personal, 
  onClose, 
  onAssign,
  loading = false 
}) {
  // Estado para la persona seleccionada
  const [selectedPerson, setSelectedPerson] = useState(null);

  /**
   * Limpia la selección cuando el modal se cierra.
   * Se ejecuta cada vez que cambia la visibilidad del modal.
   * 
   * @effect
   * @listens visible
   */
  useEffect(() => {
    if (!visible) {
      setSelectedPerson(null);
    }
  }, [visible]);

  /**
   * Filtra el personal para mostrar solo aquellos con estado "libre".
   * 
   * @constant
   * @type {Array<Object>}
   */
  const personalLibre = personal.filter(p => p.estado === "libre");

  /**
   * Transforma la lista de personal libre al formato requerido por DropdownSelect.
   * Combina nombre y cargo para la etiqueta de visualización.
   * 
   * @constant
   * @type {Array<Object>}
   */
  const dropdownData = personalLibre.map(p => ({
    label: `${p.nombre} (${p.cargo})`,  // Formato: "Nombre (Cargo)"
    value: p.id,
  }));

  /**
   * Valida y procesa la asignación del personal seleccionado.
   * 
   * @function
   * @returns {void}
   * 
   * @fires onAssign Con el ID de la persona seleccionada
   */
  const handleAssign = () => {
    if (!selectedPerson) {
      alert('Por favor selecciona una persona');
      return;
    }
    onAssign(selectedPerson);
  };

  // Validación: no renderizar si no hay proyecto
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
      {/* Estado: Sin personal disponible */}
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
        /* Estado: Con personal disponible */
        <View style={styles.body}>
          <Text style={styles.label}>Selecciona una persona</Text>
          <DropdownSelect
            data={dropdownData}
            value={selectedPerson}
            placeholder="Selecciona personal..."
            onChange={setSelectedPerson}
            searchable={true}  // Permite búsqueda en listas largas
            disabled={loading}
          />
        </View>
      )}
    </ModalBase>
  );
}

// Estilos del componente
const styles = {
  body: {
    gap: 10, // Espaciado uniforme entre elementos
  },
  label: {
    color: '#E5E7EB',
    fontSize: 13,
    marginBottom: 4,
  },
  confirmButton: {
    backgroundColor: '#10B981', // Verde para acción positiva
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: '#6B7280', // Gris cuando está deshabilitado
    opacity: 0.7,
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 24, // Espaciado vertical para estado vacío
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
};