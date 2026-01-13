// components/expenses/AddViaticoModal.js
import { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity
} from "react-native";
import DropdownSelect from "../DropdownSelect";
import ModalBase from "../ModalBase";

/**
 * Modal para agregar nuevos viáticos/expensas al proyecto.
 * Permite capturar información como concepto, categoría, valor y soporte digital.
 * Incluye validación de datos y manejo de estados de carga.
 * 
 * @component
 * @example
 * const handleSave = (viaticoData) => {
 *   console.log('Viático guardado:', viaticoData);
 *   // Enviar datos al backend
 * };
 * 
 * return (
 *   <AddViaticoModal
 *     visible={isModalVisible}
 *     onClose={() => setIsModalVisible(false)}
 *     onSave={handleSave}
 *     loading={isSaving}
 *   />
 * );
 * 
 * @param {Object} props - Propiedades del componente
 * @param {boolean} props.visible - Controla la visibilidad del modal
 * @param {function} props.onClose - Función callback cuando se cierra el modal
 * @param {function} props.onSave - Función callback para guardar el viático
 * @param {boolean} [props.loading=false] - Indica si está en proceso de guardado
 * 
 * @returns {React.ReactElement} Modal con formulario para agregar viáticos
 * 
 * @see ModalBase Componente base de modal utilizado
 * @see DropdownSelect Componente de selector desplegable para categorías
 */
export default function AddViaticoModal({
  visible,
  onClose,
  onSave,
  loading,
}) {
  // Estados del formulario
  const [concepto, setConcepto] = useState("");
  const [categoria, setCategoria] = useState("Transporte");
  const [valor, setValor] = useState("");
  const [soporteURL, setSoporteURL] = useState("");

  /**
   * Valida y procesa el guardado del viático.
   * Realiza validaciones básicas antes de llamar a la función onSave.
   * 
   * @function
   * @returns {void}
   * 
   * @fires onSave Con los datos validados del viático
   */
  const handleSave = () => {
    // Validación: campos requeridos
    if (!concepto.trim() || !valor) {
      Alert.alert("Error", "Debes ingresar concepto y valor.");
      return;
    }
    
    // Validación: valor numérico positivo
    const num = Number(valor);
    if (isNaN(num) || num <= 0) {
      Alert.alert("Error", "El valor debe ser un número válido.");
      return;
    }

    // Enviar datos validados al componente padre
    onSave({
      concepto: concepto.trim(),
      categoria,
      valor: num,
      soporteURL: soporteURL.trim(),
    });

    // Resetear formulario después del guardado exitoso
    resetForm();
  };

  /**
   * Restablece todos los campos del formulario a sus valores iniciales.
   * 
   * @function
   * @private
   */
  const resetForm = () => {
    setConcepto("");
    setCategoria("Transporte");
    setValor("");
    setSoporteURL("");
  };

  // Categorías disponibles para viáticos
  const categoriasDisponibles = [
    { label: "Transporte", value: "Transporte" },
    { label: "Alimentación", value: "Alimentación" },
    { label: "Hotel / Alojamiento", value: "Hotel" },
    { label: "Herramientas menores", value: "Herramientas" },
    { label: "Material menor", value: "Material menor" },
    { label: "Imprevistos", value: "Imprevistos" },
    { label: "Otro", value: "Otro" },
  ];

  return (
    <ModalBase
      visible={visible}
      title="Agregar viático"
      onClose={onClose}
      footer={
        <TouchableOpacity
          style={[styles.saveButton, loading && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? "Guardando..." : "💾 Guardar viático"}
          </Text>
        </TouchableOpacity>
      }
    >
      {/* Campo: Concepto */}
      <Text style={styles.label}>Concepto</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej: Almuerzo cuadrilla"
        placeholderTextColor="#aaa"
        value={concepto}
        onChangeText={setConcepto}
        editable={!loading}
      />

      {/* Campo: Categoría */}
      <Text style={styles.label}>Categoría</Text>
      <DropdownSelect
        data={categoriasDisponibles}
        value={categoria}
        onChange={setCategoria}
        disabled={loading}
      />

      {/* Campo: Valor en COP */}
      <Text style={styles.label}>Valor (COP)</Text>
      <TextInput
        style={styles.input}
        placeholder="0"
        placeholderTextColor="#aaa"
        keyboardType="numeric"
        value={valor}
        onChangeText={setValor}
        editable={!loading}
      />

      {/* Campo: Soporte digital (opcional) */}
      <Text style={styles.label}>Link Soporte (Drive) (opcional)</Text>
      <TextInput
        style={styles.input}
        placeholder="https://drive.google.com/..."
        placeholderTextColor="#aaa"
        value={soporteURL}
        onChangeText={setSoporteURL}
        editable={!loading}
      />
    </ModalBase>
  );
}

const styles = StyleSheet.create({
  label: {
    color: "#FFF",
    fontSize: 14,
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    backgroundColor: "#1E1E2F",
    color: "#FFF",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  saveButton: {
    backgroundColor: "#3182CE",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  saveButtonText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 15,
  },
});