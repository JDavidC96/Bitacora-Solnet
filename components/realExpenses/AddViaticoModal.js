// components/realExpenses/AddViaticoModal.js
import { useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function AddViaticoModal({
  visible,
  loading,
  onClose,
  onConfirm,
}) {
  const [concepto, setConcepto] = useState("");
  const [categoria, setCategoria] = useState("");
  const [valor, setValor] = useState("");
  const [notas, setNotas] = useState("");

  if (!visible) return null;

  const resetForm = () => {
  setConcepto("");
  setCategoria("");
  setValor("");
  setNotas("");
};


  const handleSave = () => {
    if (!concepto.trim()) return;
    onConfirm({
      concepto: concepto.trim(),
      categoria,
      valor,
      notas,
    });
    resetForm();
  };

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Agregar viático</Text>

          <TextInput
            style={styles.input}
            placeholder="Concepto"
            placeholderTextColor="#9CA3AF"
            value={concepto}
            onChangeText={setConcepto}
          />

          <TextInput
            style={styles.input}
            placeholder="Categoría (gasolina, alimentación, etc.)"
            placeholderTextColor="#9CA3AF"
            value={categoria}
            onChangeText={setCategoria}
          />

          <TextInput
            style={styles.input}
            placeholder="Valor"
            placeholderTextColor="#9CA3AF"
            value={valor}
            onChangeText={setValor}
            keyboardType="numeric"
          />

          <TextInput
            style={[styles.input, { height: 70 }]}
            placeholder="Notas (opcional)"
            placeholderTextColor="#9CA3AF"
            value={notas}
            onChangeText={setNotas}
            multiline
          />

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => {
              resetForm();  
              onClose();
              }}
            >

            <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, loading && { opacity: 0.6 }]}
              onPress={() => {
                handleSave();
                resetForm();
              }}
              disabled={loading}
            >
              <Text style={styles.saveText}>
                {loading ? "Guardando..." : "Guardar"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: "90%",
    backgroundColor: "#020617",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(55,65,81,0.9)",
  },
  title: {
    color: "#E5E7EB",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "rgba(55,65,81,0.8)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: "#F9FAFB",
    marginBottom: 10,
    fontSize: 14,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  cancelText: {
    color: "#9CA3AF",
  },
  saveBtn: {
    backgroundColor: "#22C55E",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  saveText: {
    color: "#022C22",
    fontWeight: "700",
  },
});
