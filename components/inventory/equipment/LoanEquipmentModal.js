// components/inventory/equipment/LoanEquipmentModal.js
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from "react-native";
import DropdownSelect from "../../DropdownSelect";
import ModalBase from "../../ModalBase";

/**
 * Modal para registrar el préstamo de herramientas/equipos a miembros del personal.
 * Permite seleccionar una herramienta disponible y una persona para registrar
 * el préstamo temporal en el sistema de inventario.
 * 
 * @component
 * @example
 * const handleLoanEquipment = async (equipment, person) => {
 *   try {
 *     await loanEquipmentToPerson(equipment.id, person.id, {
 *       loanDate: new Date(),
 *       expectedReturn: calculateReturnDate()
 *     });
 *     console.log('Herramienta prestada:', equipment.nombre, 'a', person.nombre);
 *   } catch (error) {
 *     console.error('Error registrando préstamo:', error);
 *   }
 * };
 * 
 * return (
 *   <LoanEquipmentModal
 *     visible={isModalVisible}
 *     equipment={availableEquipment}
 *     personnel={availablePersonnel}
 *     onLoan={handleLoanEquipment}
 *     onClose={() => setModalVisible(false)}
 *     loading={isProcessing}
 *   />
 * );
 * 
 * @param {Object} props - Propiedades del componente
 * @param {boolean} props.visible - Controla la visibilidad del modal
 * @param {Array<Object>} [props.equipment=[]] - Lista de herramientas disponibles para préstamo
 * @param {string} props.equipment[].id - ID único de la herramienta
 * @param {string} props.equipment[].nombre - Nombre de la herramienta
 * @param {boolean} [props.equipment[].prestadaA] - Indica si ya está prestada (no debería aparecer)
 * @param {Array<Object>} [props.personnel=[]] - Lista de personal disponible para préstamo
 * @param {string} props.personnel[].id - ID único de la persona
 * @param {string} props.personnel[].nombre - Nombre de la persona
 * @param {string} props.personnel[].estado - Estado actual de la persona
 * @param {function} props.onLoan - Callback al confirmar el préstamo
 * @param {function} props.onClose - Callback al cerrar el modal
 * @param {boolean} [props.loading=false] - Indica si está procesando el préstamo
 * 
 * @returns {React.ReactElement} Modal para préstamo de herramientas
 * 
 * @see ModalBase Componente base de modal reutilizable
 * @see DropdownSelect Componente de selector desplegable para selecciones
 * @see EquipmentItem Componente que dispara la apertura de este modal
 * @see ReturnEquipmentModal Modal para gestionar devoluciones
 */
export default function LoanEquipmentModal({
  visible,
  equipment = [],
  personnel = [],
  onLoan,
  onClose,
  loading = false
}) {
  // Estados para las selecciones
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [selectedPerson, setSelectedPerson] = useState(null);

  /**
   * Valida y procesa el registro del préstamo.
   * Verifica que ambos selectores tengan valores antes de llamar al callback.
   * 
   * @function
   * @returns {void}
   * 
   * @fires onLoan Con la herramienta y persona seleccionadas
   */
  const handleLoan = () => {
    // Validación: ambos campos requeridos
    if (!selectedEquipment || !selectedPerson) {
      alert("Selecciona herramienta y persona");
      return;
    }
    
    // Validación adicional: verificar que la herramienta no esté ya prestada
    if (selectedEquipment.prestadaA) {
      alert(`La herramienta "${selectedEquipment.nombre}" ya está prestada a ${selectedEquipment.prestadaA.nombre}`);
      return;
    }
    
    // Enviar datos seleccionados al componente padre
    onLoan(selectedEquipment, selectedPerson);
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

  /**
   * Filtra herramientas que no estén prestadas actualmente.
   * 
   * @constant
   * @type {Array<Object>}
   */
  const availableEquipment = equipment.filter(item => !item.prestadaA);

  /**
   * Filtra personal que esté disponible (estado "libre").
   * 
   * @constant
   * @type {Array<Object>}
   */
  const availablePersonnel = personnel.filter(person => person.estado === "libre");

  return (
    <ModalBase
      visible={visible}
      title="Prestar Herramienta"
      onClose={handleClose}
      footer={
        <TouchableOpacity
          style={[
            styles.loanButton,
            (!selectedEquipment || !selectedPerson || loading) && styles.disabledButton
          ]}
          onPress={handleLoan}
          disabled={!selectedEquipment || !selectedPerson || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.loanButtonText}>Prestar</Text>
          )}
        </TouchableOpacity>
      }
    >
      {/* Selector: Herramienta disponible (no prestada) */}
      <DropdownSelect
        data={availableEquipment.map((h) => ({ 
          label: `${h.nombre}${h.asignada ? ` (${h.asignada.nombre})` : ''}`, 
          value: h.id 
        }))}
        value={selectedEquipment?.id}
        placeholder="Selecciona herramienta"
        onChange={(val) => {
          const herramienta = availableEquipment.find((h) => h.id === val);
          setSelectedEquipment(herramienta);
        }}
        disabled={loading}
        searchable={availableEquipment.length > 5}
      />

      {/* Selector: Personal disponible (estado libre) */}
      <DropdownSelect
        data={availablePersonnel.map((p) => ({ 
          label: `${p.nombre} (${p.cargo || p.rol || 'Sin cargo'})`, 
          value: p.id 
        }))}
        value={selectedPerson?.id}
        placeholder="Selecciona persona"
        onChange={(val) => {
          const persona = availablePersonnel.find((p) => p.id === val);
          setSelectedPerson(persona);
        }}
        disabled={loading}
        searchable={availablePersonnel.length > 5}
      />

      {/* Información de selección actual */}
      {(selectedEquipment || selectedPerson) && (
        <Text style={styles.selectionInfo}>
          {selectedEquipment && `📦 ${selectedEquipment.nombre}`}
          {selectedEquipment && selectedPerson && ' → '}
          {selectedPerson && `👤 ${selectedPerson.nombre}`}
        </Text>
      )}

      {/* Información sobre disponibilidad */}
      {availableEquipment.length === 0 && (
        <Text style={styles.warningText}>
          ⚠️ No hay herramientas disponibles para préstamo
        </Text>
      )}
      
      {availablePersonnel.length === 0 && (
        <Text style={styles.warningText}>
          ⚠️ No hay personal disponible para préstamo
        </Text>
      )}
    </ModalBase>
  );
}

const styles = StyleSheet.create({
  loanButton: {
    backgroundColor: "#805AD5", // Púrpura para préstamos
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#718096", // Gris azulado cuando deshabilitado
    opacity: 0.7,
  },
  loanButtonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  selectionInfo: {
    color: "#4A5568", // Gris azulado oscuro
    fontSize: 14,
    marginTop: 16,
    textAlign: "center",
    fontWeight: "500",
    backgroundColor: "rgba(128, 90, 213, 0.1)", // Púrpura claro de fondo
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#805AD5",
  },
  warningText: {
    color: "#E53E3E", // Rojo para advertencias
    fontSize: 14,
    marginTop: 12,
    textAlign: "center",
    fontStyle: "italic",
    backgroundColor: "rgba(229, 62, 62, 0.1)",
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E53E3E",
  },
});