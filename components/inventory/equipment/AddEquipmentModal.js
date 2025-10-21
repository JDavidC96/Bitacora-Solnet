// components/inventory/equipment/AddEquipmentModal.js
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity } from "react-native";
import DropdownSelect from "../../DropdownSelect";
import ModalBase from "../../ModalBase";

export default function AddEquipmentModal({
  visible,
  onSave,
  onClose,
  loading = false
}) {
  const [form, setForm] = useState({
    nombre: "",
    estado: "Nueva",
    serial: ""
  });

  const handleSave = () => {
    if (!form.nombre.trim()) {
      alert("Debes ingresar el nombre de la herramienta");
      return;
    }

    onSave({
      nombre: form.nombre.trim(),
      estado: form.estado,
      serial: form.serial.trim() || null
    });
  };

  const handleClose = () => {
    setForm({ nombre: "", estado: "Nueva", serial: "" });
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
      <TextInput
        style={styles.input}
        placeholder="Nombre herramienta"
        placeholderTextColor="#AAA"
        value={form.nombre}
        onChangeText={(text) => setForm(prev => ({ ...prev, nombre: text }))}
      />

      <DropdownSelect
        data={[
          { label: "Nueva", value: "Nueva" },
          { label: "Usada", value: "Usada" },
          { label: "Reparación", value: "Reparación" },
        ]}
        value={form.estado}
        placeholder="Estado"
        onChange={(val) => setForm(prev => ({ ...prev, estado: val }))}
      />

      <TextInput
        style={styles.input}
        placeholder="Serial (opcional)"
        placeholderTextColor="#AAA"
        value={form.serial}
        onChangeText={(text) => setForm(prev => ({ ...prev, serial: text }))}
      />
    </ModalBase>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#CCC",
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    color: "#000",
  },
  saveButton: {
    backgroundColor: "#5A67D8",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#718096",
    opacity: 0.7,
  },
  saveButtonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
  },
});