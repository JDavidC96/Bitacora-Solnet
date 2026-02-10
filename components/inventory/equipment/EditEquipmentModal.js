// components/inventory/equipment/EditEquipmentModal.js
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity } from "react-native";
import DropdownSelect from "../../DropdownSelect";
import ModalBase from "../../ModalBase";

export default function EditEquipmentModal({
  visible,
  item,
  onSave,
  onClose,
  loading = false,
}) {
  const [form, setForm] = useState({
    nombre: "",
    estado: "Nueva",
    serial: "",
    marca: "",
    precio: "",
  });

  useEffect(() => {
    if (!visible) return;
    setForm({
      nombre: item?.nombre ?? "",
      estado: item?.estado ?? "Nueva",
      serial: item?.serial ?? "",
      marca: item?.marca ?? "",
      precio: item?.precio != null ? String(item.precio) : "",
    });
  }, [visible, item]);

  const handleSave = () => {
    if (!form.nombre.trim()) {
      alert("Debes ingresar el nombre de la herramienta");
      return;
    }

    const precioNumRaw = String(form.precio ?? "").replace(",", ".").trim();
    const precioNum = precioNumRaw ? Number(precioNumRaw) : null;
    const precioFinal = precioNumRaw ? (Number.isFinite(precioNum) ? precioNum : null) : null;

    onSave({
      nombre: form.nombre.trim(),
      estado: form.estado,
      serial: form.serial.trim() || null,
      marca: form.marca.trim() || null,
      precio: precioFinal,
    });
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <ModalBase
      visible={visible}
      title="✏️ Editar Herramienta"
      onClose={handleClose}
      footer={
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.disabledButton]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>Guardar cambios</Text>}
        </TouchableOpacity>
      }
    >
      <TextInput
        style={styles.input}
        placeholder="Nombre herramienta"
        placeholderTextColor="#AAA"
        value={form.nombre}
        onChangeText={(text) => setForm((prev) => ({ ...prev, nombre: text }))}
        editable={!loading}
        autoCapitalize="words"
        autoCorrect
      />

      <DropdownSelect
        data={[
          { label: "Nueva", value: "Nueva" },
          { label: "Usada", value: "Usada" },
          { label: "Reparación", value: "Reparación" },
        ]}
        value={form.estado}
        placeholder="Estado"
        onChange={(val) => setForm((prev) => ({ ...prev, estado: val }))}
        disabled={loading}
      />

      <TextInput
        style={styles.input}
        placeholder="Serial (opcional)"
        placeholderTextColor="#AAA"
        value={form.serial}
        onChangeText={(text) => setForm((prev) => ({ ...prev, serial: text }))}
        editable={!loading}
        autoCapitalize="characters"
        autoCorrect={false}
      />

      <TextInput
        style={styles.input}
        placeholder="Marca (opcional)"
        placeholderTextColor="#AAA"
        value={form.marca}
        onChangeText={(text) => setForm((prev) => ({ ...prev, marca: text }))}
        editable={!loading}
        autoCapitalize="words"
        autoCorrect
      />

      <TextInput
        style={styles.input}
        placeholder="Precio (opcional)"
        placeholderTextColor="#AAA"
        value={form.precio}
        onChangeText={(text) => setForm((prev) => ({ ...prev, precio: text }))}
        editable={!loading}
        keyboardType="numeric"
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
    backgroundColor: "#2F855A",
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
