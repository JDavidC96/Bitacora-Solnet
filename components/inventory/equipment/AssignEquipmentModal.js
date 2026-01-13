// components/inventory/equipment/AssignEquipmentModal.js
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from "react-native";
import DropdownSelect from "../../DropdownSelect";
import ModalBase from "../../ModalBase";

/**
 * Modal para asignar herramientas/equipos a miembros del personal.
 * Permite seleccionar una herramienta disponible y una persona
 * para registrar la asignación de recursos en el sistema.
 * 
 * @component
 * @example
 * const handleAssignEquipment = async (equipment, person) => {
 *   try {
 *     await assignEquipmentToPerson(equipment.id, person.id);
 *     console.log('Herramienta asignada:', equipment.nombre, 'a', person.nombre);
 *   } catch (error) {
 *     console.error('Error asignando herramienta:', error);
 *   }
 * };
 * 
 * return (
 *   <AssignEquipmentModal
 *     visible={isModalVisible}
 *     equipment={availableEquipment}
 *     personnel={availablePersonnel}
 *     onAssign={handleAssignEquipment}
 *     onClose={() => setModalVisible(false)}
 *     loading={isAssigning}
 *   />
 * );
 * 
 * @param {Object} props - Propiedades del componente
 * @param {boolean} props.visible - Controla la visibilidad del modal
 * @param {Array<Object>} [props.equipment=[]] - Lista de herramientas disponibles para asignar
 * @param {string} props.equipment[].id - ID único de la herramienta
 * @param {string} props.equipment[].nombre - Nombre de la herramienta
 * @param {Array<Object>} [props.personnel=[]] - Lista de personal disponible para asignación
 * @param {string} props.personnel[].id - ID único de la persona
 * @param {string} props.personnel[].nombre - Nombre de la persona
 * @param {string} props.personnel[].estado - Estado actual de la persona (libre, asignado, etc.)
 * @param {function} props.onAssign - Callback al confirmar la asignación
 * @param {function} props.onClose - Callback al cerrar el modal
 * @param {boolean} [props.loading=false] - Indica si está en proceso de asignación
 * 
 * @returns {React.ReactElement} Modal para asignar herramientas a personal
 * 
 * @see ModalBase Componente base de modal reutilizable
 * @see DropdownSelect Componente de selector desplegable para selecciones
 * @see AddEquipmentModal Modal para agregar nuevas herramientas
 */
export default function AssignEquipmentModal({
  visible,
  equipment = [],
  personnel = [],
  onAssign,
  onClose,
  loading = false
}) {
  // Estados para las selecciones
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [selectedPerson, setSelectedPerson] = useState(null);

  /**
   * Valida y procesa la asignación de la herramienta al personal.
   * Verifica que ambos selectores tengan valores antes de llamar al callback.
   * 
   * @function
   * @returns {void}
   * 
   * @fires onAssign Con la herramienta y persona seleccionadas
   */
  const handleAssign = () => {
    // Validación: ambos campos requeridos
    if (!selectedEquipment || !selectedPerson) {
      alert("Selecciona herramienta y persona");
      return;
    }
    
    // Enviar datos seleccionados al componente padre
    onAssign(selectedEquipment, selectedPerson);
  };

  /**
   * Cierra el modal y restablece las selecciones.
   * 
   * @function
   * @returns {void}
   * 
   * @fires onClose Para notificar al componente padre
   */
  const handleClose = () => {
    setSelectedEquipment(null);
    setSelectedPerson(null);
    onClose();
  };

  return (
    <ModalBase
      visible={visible}
      title="Asignar Herramienta"
      onClose={handleClose}
      footer={
        <TouchableOpacity
          style={[
            styles.assignButton,
            (!selectedEquipment || !selectedPerson || loading) && styles.disabledButton
          ]}
          onPress={handleAssign}
          disabled={!selectedEquipment || !selectedPerson || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.assignButtonText}>Asignar</Text>
          )}
        </TouchableOpacity>
      }
    >
      {/* Selector: Herramienta disponible */}
      <DropdownSelect
        data={equipment.map((h) => ({ 
          label: h.nombre, 
          value: h.id 
        }))}
        value={selectedEquipment?.id}
        placeholder="Selecciona herramienta"
        onChange={(val) => {
          const herramienta = equipment.find((h) => h.id === val);
          setSelectedEquipment(herramienta);
        }}
        disabled={loading}
        searchable={equipment.length > 5} // Habilitar búsqueda en listas largas
      />

      {/* Selector: Personal disponible */}
      <DropdownSelect
        data={personnel.map((p) => ({ 
          label: `${p.nombre} (${p.estado})`, 
          value: p.id 
        }))}
        value={selectedPerson?.id}
        placeholder="Selecciona persona"
        onChange={(val) => {
          const persona = personnel.find((p) => p.id === val);
          setSelectedPerson(persona);
        }}
        disabled={loading}
        searchable={personnel.length > 5} // Habilitar búsqueda en listas largas
      />

      {/* Información adicional de selección (podría expandirse) */}
      {(selectedEquipment || selectedPerson) && (
        <Text style={styles.selectionInfo}>
          {selectedEquipment && `Herramienta: ${selectedEquipment.nombre}`}
          {selectedEquipment && selectedPerson && " · "}
          {selectedPerson && `Persona: ${selectedPerson.nombre}`}
        </Text>
      )}
    </ModalBase>
  );
}

const styles = StyleSheet.create({
  assignButton: {
    backgroundColor: "#3182CE", // Azul
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#718096", // Gris azulado
    opacity: 0.7,
  },
  assignButtonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  selectionInfo: {
    color: "#4A5568", // Gris azulado oscuro
    fontSize: 14,
    marginTop: 12,
    textAlign: "center",
    fontStyle: "italic",
  },
});