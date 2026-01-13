// components/inventory/equipment/TransferEquipmentModal.js
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from "react-native";
import DropdownSelect from "../../DropdownSelect";
import ModalBase from "../../ModalBase";

/**
 * Modal para transferir una herramienta/equipo entre diferentes miembros del personal.
 * Permite reasignar una herramienta que ya está en préstamo a otra persona,
 * manteniendo el historial de transferencias en el sistema.
 * 
 * @component
 * @example
 * const handleTransferEquipment = async (newPerson) => {
 *   try {
 *     await transferEquipmentToPerson(selectedEquipment.id, newPerson.id, {
 *       transferDate: new Date(),
 *       previousOwner: selectedEquipment.prestadaA.nombre
 *     });
 *     console.log('Herramienta transferida a:', newPerson.nombre);
 *   } catch (error) {
 *     console.error('Error en transferencia:', error);
 *   }
 * };
 * 
 * return (
 *   <TransferEquipmentModal
 *     visible={isModalVisible}
 *     personnel={availablePersonnel}
 *     onTransfer={handleTransferEquipment}
 *     onClose={() => setModalVisible(false)}
 *     loading={isProcessing}
 *   />
 * );
 * 
 * @param {Object} props - Propiedades del componente
 * @param {boolean} props.visible - Controla la visibilidad del modal
 * @param {Array<Object>} [props.personnel=[]] - Lista de personal disponible para transferencia
 * @param {string} props.personnel[].id - ID único de la persona
 * @param {string} props.personnel[].nombre - Nombre de la persona
 * @param {string} props.personnel[].estado - Estado actual de la persona
 * @param {string} [props.personnel[].cargo] - Cargo/rol de la persona
 * @param {function} props.onTransfer - Callback al confirmar la transferencia
 * @param {function} props.onClose - Callback al cerrar el modal
 * @param {boolean} [props.loading=false] - Indica si está procesando la transferencia
 * 
 * @returns {React.ReactElement} Modal para transferencia de herramientas
 * 
 * @see ModalBase Componente base de modal reutilizable
 * @see DropdownSelect Componente de selector desplegable para selección
 * @see EquipmentItem Componente que dispara la apertura de este modal
 * @see LoanEquipmentModal Modal complementario para préstamos iniciales
 */
export default function TransferEquipmentModal({
  visible,
  personnel = [],
  onTransfer,
  onClose,
  loading = false
}) {
  // Estado para la nueva persona asignada
  const [newOwner, setNewOwner] = useState(null);

  /**
   * Valida y procesa la transferencia de la herramienta.
   * Verifica que se haya seleccionado una nueva persona antes de llamar al callback.
   * 
   * @function
   * @returns {void}
   * 
   * @fires onTransfer Con la nueva persona seleccionada
   */
  const handleTransfer = () => {
    // Validación: nueva persona requerida
    if (!newOwner) {
      alert("Selecciona nueva persona a asignar");
      return;
    }
    
    // Enviar nueva persona seleccionada al componente padre
    onTransfer(newOwner);
  };

  /**
   * Cierra el modal y restablece la selección.
   * 
   * @function
   * @returns {void}
   * 
   * @fires onClose Para notificar al componente padre
   */
  const handleClose = () => {
    setNewOwner(null);
    onClose();
  };

  /**
   * Filtra personal disponible para transferencia (excluyendo al dueño actual).
   * Este filtrado debería hacerse en el componente padre basado en la herramienta seleccionada.
   * 
   * @constant
   * @type {Array<Object>}
   */
  const availablePersonnel = personnel.filter(person => 
    person.estado === "libre" || person.estado === "asignado"
  );

  return (
    <ModalBase
      visible={visible}
      title="Transferir Herramienta"
      onClose={handleClose}
      footer={
        <TouchableOpacity
          style={[
            styles.transferButton,
            (!newOwner || loading) && styles.disabledButton
          ]}
          onPress={handleTransfer}
          disabled={!newOwner || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.transferButtonText}>Transferir</Text>
          )}
        </TouchableOpacity>
      }
    >
      {/* Información sobre la transferencia */}
      <Text style={styles.infoText}>
        Selecciona la nueva persona a quien transferir la herramienta.
        La transferencia mantendrá la herramienta en estado de préstamo.
      </Text>

      {/* Selector: Nueva persona asignada */}
      <DropdownSelect
        data={availablePersonnel.map((p) => ({ 
          label: `${p.nombre}${p.cargo ? ` (${p.cargo})` : ''} - ${p.estado}`, 
          value: p.id 
        }))}
        value={newOwner?.id}
        placeholder="Selecciona nueva persona"
        onChange={(val) => {
          const persona = availablePersonnel.find((p) => p.id === val);
          setNewOwner(persona);
        }}
        disabled={loading}
        searchable={availablePersonnel.length > 5}
      />

      {/* Información de selección actual */}
      {newOwner && (
        <Text style={styles.selectionInfo}>
          Nueva asignación: 👤 {newOwner.nombre}
          {newOwner.cargo && ` (${newOwner.cargo})`}
        </Text>
      )}

      {/* Mensaje si no hay personal disponible */}
      {availablePersonnel.length === 0 && (
        <Text style={styles.warningText}>
          ⚠️ No hay personal disponible para transferencia
        </Text>
      )}

      {/* Consideraciones importantes */}
      <Text style={styles.considerations}>
        📝 Consideraciones:
        {'\n'}• La herramienta permanecerá en estado de préstamo
        {'\n'}• Se registrará el historial de transferencia
        {'\n'}• El dueño anterior será notificado
      </Text>
    </ModalBase>
  );
}

const styles = StyleSheet.create({
  transferButton: {
    backgroundColor: "#ECC94B", // Amarillo para transferencias
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#718096", // Gris azulado cuando deshabilitado
    opacity: 0.7,
  },
  transferButtonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  infoText: {
    color: "#4A5568", // Gris azulado oscuro
    fontSize: 14,
    marginBottom: 16,
    textAlign: "center",
    lineHeight: 20,
  },
  selectionInfo: {
    color: "#2D3748", // Gris oscuro
    fontSize: 15,
    marginTop: 16,
    textAlign: "center",
    fontWeight: "600",
    backgroundColor: "rgba(236, 201, 75, 0.1)", // Amarillo claro de fondo
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ECC94B",
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
  considerations: {
    color: "#4A5568", // Gris azulado oscuro
    fontSize: 13,
    marginTop: 16,
    backgroundColor: "rgba(45, 55, 72, 0.05)",
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    lineHeight: 20,
  },
});