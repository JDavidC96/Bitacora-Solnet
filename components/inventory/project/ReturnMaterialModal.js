import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity } from "react-native";
import ModalBase from "../../ModalBase";

export default function ReturnMaterialModal({
  visible,
  onClose,
  item,
  onConfirm,
  loading,
}) {
  const [cantidad, setCantidad] = useState("");

  const handle = () => {
    if (!cantidad || Number(cantidad) <= 0) {
      Alert.alert("Error", "Cantidad inválida.");
      return;
    }
    if (Number(cantidad) > Number(item.cantidadActual)) {
      Alert.alert("Error", "No puede devolver más de lo que hay.");
      return;
    }
    onConfirm(Number(cantidad));
  };

  if (!item) return null;

  return (
    <ModalBase
      visible={visible}
      title="Devolver material"
      onClose={onClose}
      footer={
        <TouchableOpacity style={styles.btn} onPress={handle} disabled={loading}>
          <Text style={styles.btnText}>
            {loading ? "Procesando..." : "Devolver"}
          </Text>
        </TouchableOpacity>
      }
    >
      <Text style={styles.label}>Material: {item.nombre}</Text>
      <Text style={styles.label}>Disponible: {item.cantidadActual}</Text>

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
  label: { color: "#FFF", marginBottom: 6 },
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
  btnText: { color: "#FFF", fontWeight: "700" },
});
