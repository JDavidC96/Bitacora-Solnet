// components/inventory/project/ReturnMaterialModal.js
import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity } from "react-native";
import ModalBase from "../../ModalBase";

/**
 * Modal para devolver materiales del inventario
 * 
 * @component
 * @param {Object} props - Propiedades del componente
 * @param {boolean} props.visible - Controla la visibilidad del modal
 * @param {Function} props.onClose - Función que se ejecuta al cerrar el modal
 * @param {Object} props.item - Objeto que representa el material a devolver
 * @param {string} props.item.nombre - Nombre del material
 * @param {number|string} props.item.cantidadActual - Cantidad actual disponible del material
 * @param {Function} props.onConfirm - Función que se ejecuta al confirmar la devolución
 * @param {boolean} props.loading - Indica si está en proceso de envío de datos
 * @returns {JSX.Element|null} Modal para devolución de materiales o null si no hay item
 * 
 * @example
 * <ReturnMaterialModal
 *   visible={isModalVisible}
 *   onClose={() => setIsModalVisible(false)}
 *   item={selectedMaterial}
 *   onConfirm={(cantidad) => handleReturn(cantidad)}
 *   loading={isLoading}
 * />
 */
export default function ReturnMaterialModal({
  visible,
  onClose,
  item,
  onConfirm,
  loading,
}) {
  const [cantidad, setCantidad] = useState("");

  /**
   * Maneja la acción de confirmar la devolución
   * Realiza validaciones de cantidad antes de ejecutar onConfirm
   * 
   * @function handle
   * @returns {void}
   */
  const handle = () => {
    // Validar que la cantidad sea válida y positiva
    if (!cantidad || Number(cantidad) <= 0) {
      Alert.alert("Error", "Cantidad inválida.");
      return;
    }
    
    // Validar que la cantidad a devolver no exceda la cantidad actual
    if (Number(cantidad) > Number(item.cantidadActual)) {
      Alert.alert("Error", "No puede devolver más de lo que hay.");
      return;
    }
    
    // Ejecutar la función de confirmación con la cantidad convertida a número
    onConfirm(Number(cantidad));
  };

  // Si no hay item, no renderizar nada
  if (!item) return null;

  return (
    <ModalBase
      visible={visible}
      title="Devolver material"
      onClose={onClose}
      footer={
        <TouchableOpacity 
          style={styles.btn} 
          onPress={handle} 
          disabled={loading}
        >
          <Text style={styles.btnText}>
            {loading ? "Procesando..." : "Devolver"}
          </Text>
        </TouchableOpacity>
      }
    >
      {/* Información del material */}
      <Text style={styles.label}>Material: {item.nombre}</Text>
      <Text style={styles.label}>Disponible: {item.cantidadActual}</Text>

      {/* Campo de entrada para la cantidad a devolver */}
      <TextInput
        style={styles.input}
        placeholder="Cantidad a devolver"
        placeholderTextColor="#888"
        keyboardType="numeric"
        value={cantidad}
        onChangeText={setCantidad}
      />
    </ModalBase>
  );
}

const styles = StyleSheet.create({
  label: { 
    color: "#FFF", 
    marginBottom: 6 
  },
  input: {
    backgroundColor: "#1E1E2F",
    padding: 8,
    borderRadius: 8,
    color: "#FFF",
    marginTop: 8,
  },
  btn: {
    backgroundColor: "#3182CE",
    padding: 12,
    borderRadius: 8,
  },
  btnText: { 
    color: "#FFF", 
    fontWeight: "700" 
  },
});