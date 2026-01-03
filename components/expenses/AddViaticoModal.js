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

export default function AddViaticoModal({
  visible,
  onClose,
  onSave,
  loading,
}) {
  const [concepto, setConcepto] = useState("");
  const [categoria, setCategoria] = useState("Transporte");
  const [valor, setValor] = useState("");
  const [soporteURL, setSoporteURL] = useState("");

  const handleSave = () => {
    if (!concepto.trim() || !valor) {
      Alert.alert("Error", "Debes ingresar concepto y valor.");
      return;
    }
    const num = Number(valor);
    if (isNaN(num) || num <= 0) {
      Alert.alert("Error", "El valor debe ser un número válido.");
      return;
    }

    onSave({
      concepto: concepto.trim(),
      categoria,
      valor: num,
      soporteURL: soporteURL.trim(),
    });

    setConcepto("");
    setCategoria("Transporte");
    setValor("");
    setSoporteURL("");
  };

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
      <Text style={styles.label}>Concepto</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej: Almuerzo cuadrilla"
        placeholderTextColor="#aaa"
        value={concepto}
        onChangeText={setConcepto}
      />

      <Text style={styles.label}>Categoría</Text>
      <DropdownSelect
        data={[
          { label: "Transporte", value: "Transporte" },
          { label: "Alimentación", value: "Alimentación" },
          { label: "Hotel / Alojamiento", value: "Hotel" },
          { label: "Herramientas menores", value: "Herramientas" },
          { label: "Material menor", value: "Material menor" },
          { label: "Imprevistos", value: "Imprevistos" },
          { label: "Otro", value: "Otro" },
        ]}
        value={categoria}
        onChange={setCategoria}
      />

      <Text style={styles.label}>Valor (COP)</Text>
      <TextInput
        style={styles.input}
        placeholder="0"
        placeholderTextColor="#aaa"
        keyboardType="numeric"
        value={valor}
        onChangeText={setValor}
      />

      <Text style={styles.label}>Link Soporte (Drive) (opcional)</Text>
      <TextInput
        style={styles.input}
        placeholder="https://drive.google.com/..."
        placeholderTextColor="#aaa"
        value={soporteURL}
        onChangeText={setSoporteURL}
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
