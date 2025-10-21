import { addDoc, collection } from "firebase/firestore";
import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity } from "react-native";
import { db } from "../../../firebase/firebaseConfig";
import DropdownSelect from "../../DropdownSelect";
import ModalBase from "../../ModalBase";

export default function AddMaterialModal({
  visible,
  onClose,
  projectId,
  user,
  loading,
  setLoading
}) {
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevaCantidad, setNuevaCantidad] = useState("");
  const [nuevaUnidad, setNuevaUnidad] = useState("Unidad");

  const handleAdd = async () => {
    if (!nuevoNombre.trim() || !nuevaCantidad) {
      Alert.alert("Error", "Completa todos los campos");
      return;
    }
    
    if (isNaN(nuevaCantidad)) {
      Alert.alert("Error", "La cantidad debe ser un número");
      return;
    }

    try {
      setLoading(true);
      await addDoc(collection(db, "proyectos", projectId, "inventario"), {
        nombre: nuevoNombre,
        cantidad: parseFloat(nuevaCantidad),
        tipo_medida: nuevaUnidad,
        createdAt: new Date().toISOString(),
        createdBy: user?.email || "Desconocido",
      });
      
      setNuevoNombre("");
      setNuevaCantidad("");
      setNuevaUnidad("Unidad");
      onClose();
    } catch (error) {
      Alert.alert("Error", "No se pudo agregar el material");
      console.error("Error al agregar material:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalBase
      visible={visible}
      title="➕ Agregar nuevo material"
      onClose={onClose}
      footer={
        <TouchableOpacity style={styles.saveButton} onPress={handleAdd} disabled={loading}>
          <Text style={styles.saveText}>Guardar</Text>
        </TouchableOpacity>
      }
    >
      <TextInput
        style={styles.input}
        placeholder="Nombre del material"
        placeholderTextColor="#aaa"
        value={nuevoNombre}
        onChangeText={setNuevoNombre}
      />
      <TextInput
        style={styles.input}
        placeholder="Cantidad"
        placeholderTextColor="#aaa"
        keyboardType="numeric"
        value={nuevaCantidad}
        onChangeText={setNuevaCantidad}
      />

      <DropdownSelect
        data={[
          { label: "Unidad", value: "Unidad" },
          { label: "Metros", value: "Metros" },
        ]}
        value={nuevaUnidad}
        onChange={setNuevaUnidad}
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
  saveText: { color: "#FFF", fontWeight: "bold" },
});