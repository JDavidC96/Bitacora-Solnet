import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity } from "react-native";
import { db } from "../../../firebase/firebaseConfig";
import DropdownSelect from "../../DropdownSelect";
import ModalBase from "../../ModalBase";

export default function UpdateUsageModal({
  visible,
  onClose,
  selectedItem,
  projectId,
  user,
  loading,
  setLoading
}) {
  const [cantidadUsada, setCantidadUsada] = useState("");
  const [updateUnidad, setUpdateUnidad] = useState(selectedItem?.tipo_medida || "Unidad");

  const handleUpdate = async () => {
    if (!selectedItem || !cantidadUsada) return;
    
    const usado = parseFloat(cantidadUsada);
    if (isNaN(usado) || usado <= 0) {
      Alert.alert("Error", "Ingresa una cantidad válida");
      return;
    }

    const newCantidad = (selectedItem.cantidad || 0) - usado;
    if (newCantidad < 0) {
      Alert.alert("Error", "No puedes usar más de lo que hay en stock");
      return;
    }

    try {
      setLoading(true);
      const itemRef = doc(db, "proyectos", projectId, "inventario", selectedItem.idDoc);
      const snap = await getDoc(itemRef);
      
      if (!snap.exists()) {
        Alert.alert("Error", "El material ya no existe en este proyecto");
        return;
      }

      await updateDoc(itemRef, {
        cantidad: newCantidad,
        tipo_medida: updateUnidad,
        lastUpdate: new Date().toISOString(),
        updatedBy: user?.email || "Desconocido",
      });

      onClose();
      setCantidadUsada("");
    } catch (error) {
      Alert.alert("Error", "No se pudo actualizar el inventario");
      console.error("Error al actualizar inventario:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalBase
      visible={visible}
      title={`Actualizar uso de ${selectedItem?.nombre}`}
      onClose={onClose}
      footer={
        <TouchableOpacity style={styles.saveButton} onPress={handleUpdate} disabled={loading}>
          <Text style={styles.saveButtonText}>💾 Guardar</Text>
        </TouchableOpacity>
      }
    >
      <TextInput
        style={styles.input}
        placeholder="Cantidad usada"
        placeholderTextColor="#aaa"
        keyboardType="numeric"
        value={cantidadUsada}
        onChangeText={setCantidadUsada}
      />

      <DropdownSelect
        data={[
          { label: "Unidad", value: "Unidad" },
          { label: "Metros", value: "Metros" },
        ]}
        value={updateUnidad}
        onChange={setUpdateUnidad}
      />
    </ModalBase>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: "#1E1E2F",
    color: "#FFF",
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: "#38A169",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    alignItems: "center",
  },
  saveButtonText: { color: "#FFF", fontWeight: "bold" },
});