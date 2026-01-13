// components/inventory/equipment/AddEquipmentModal.js
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity } from "react-native";
import DropdownSelect from "../../DropdownSelect";
import ModalBase from "../../ModalBase";

/**
 * Modal para agregar nuevas herramientas/equipos al inventario.
 * Captura información básica como nombre, estado y número de serie,
 * con validación de campos requeridos y manejo de estados de carga.
 * 
 * @component
 * @example
 * const handleSaveEquipment = async (equipmentData) => {
 *   try {
 *     await saveEquipmentToBackend(equipmentData);
 *     console.log('Herramienta guardada:', equipmentData);
 *   } catch (error) {
 *     console.error('Error guardando herramienta:', error);
 *   }
 * };
 * 
 * return (
 *   <AddEquipmentModal
 *     visible={isModalVisible}
 *     onSave={handleSaveEquipment}
 *     onClose={() => setModalVisible(false)}
 *     loading={isSaving}
 *   />
 * );
 * 
 * @param {Object} props - Propiedades del componente
 * @param {boolean} props.visible - Controla la visibilidad del modal
 * @param {function} props.onSave - Callback al guardar el equipo con los datos del formulario
 * @param {function} props.onClose - Callback al cerrar el modal
 * @param {boolean} [props.loading=false] - Indica si está en proceso de guardado
 * 
 * @returns {React.ReactElement} Modal para agregar nueva herramienta
 * 
 * @see ModalBase Componente base de modal reutilizable
 * @see DropdownSelect Componente de selector desplegable para estados
 */
export default function AddEquipmentModal({
  visible,
  onSave,
  onClose,
  loading = false
}) {
  // Estado del formulario
  const [form, setForm] = useState({
    nombre: "",
    estado: "Nueva",
    serial: ""
  });

  /**
   * Valida y procesa el guardado de la nueva herramienta.
   * Verifica que el nombre no esté vacío antes de llamar al callback.
   * 
   * @function
   * @returns {void}
   * 
   * @fires onSave Con los datos validados del equipo
   */
  const handleSave = () => {
    // Validación: nombre requerido
    if (!form.nombre.trim()) {
      alert("Debes ingresar el nombre de la herramienta");
      return;
    }

    // Enviar datos validados al componente padre
    onSave({
      nombre: form.nombre.trim(),
      estado: form.estado,
      serial: form.serial.trim() || null // Convertir string vacío a null
    });
  };

  /**
   * Cierra el modal y restablece el formulario a valores iniciales.
   * 
   * @function
   * @returns {void}
   * 
   * @fires onClose Para notificar al componente padre
   */
  const handleClose = () => {
    setForm({ 
      nombre: "", 
      estado: "Nueva", // Valor por defecto
      serial: "" 
    });
    onClose();
  };

  return (
    <ModalBase
      visible={visible}
      title="➕ Nueva Herramienta"
      onClose={handleClose}
      footer={
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.disabledButton]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveButtonText}>Guardar</Text>
          )}
        </TouchableOpacity>
      }
    >
      {/* Campo: Nombre de la herramienta (requerido) */}
      <TextInput
        style={styles.input}
        placeholder="Nombre herramienta"
        placeholderTextColor="#AAA"
        value={form.nombre}
        onChangeText={(text) => setForm(prev => ({ ...prev, nombre: text }))}
        editable={!loading}
        autoCapitalize="words"
        autoCorrect={true}
      />

      {/* Selector: Estado de la herramienta */}
      <DropdownSelect
        data={[
          { label: "Nueva", value: "Nueva" },
          { label: "Usada", value: "Usada" },
          { label: "Reparación", value: "Reparación" },
        ]}
        value={form.estado}
        placeholder="Estado"
        onChange={(val) => setForm(prev => ({ ...prev, estado: val }))}
        disabled={loading}
      />

      {/* Campo: Número de serie (opcional) */}
      <TextInput
        style={styles.input}
        placeholder="Serial (opcional)"
        placeholderTextColor="#AAA"
        value={form.serial}
        onChangeText={(text) => setForm(prev => ({ ...prev, serial: text }))}
        editable={!loading}
        autoCapitalize="characters"
        autoCorrect={false}
      />
    </ModalBase>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#CCC", // Gris claro
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    color: "#000",
  },
  saveButton: {
    backgroundColor: "#5A67D8", // Índigo
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#718096", // Gris azulado
    opacity: 0.7,
  },
  saveButtonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
  },
});