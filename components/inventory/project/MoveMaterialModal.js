import { addDoc, collection, doc, getDoc, getDocs, updateDoc } from "firebase/firestore";
import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity } from "react-native";
import { db } from "../../../firebase/firebaseConfig";
import DropdownSelect from "../../DropdownSelect";
import ModalBase from "../../ModalBase";

export default function MoveMaterialModal({
  visible,
  onClose,
  selectedItem,
  projectId,
  role,
  proyectos,
  loading,
  setLoading
}) {
  const [moveCantidad, setMoveCantidad] = useState("");
  const [destino, setDestino] = useState("general");
  const [proyectoDestino, setProyectoDestino] = useState(null);

  const rolesConPermisoMover = ["Administrador", "Ingeniero", "Supervisor", "Almacenista"];

  const handleMove = async () => {
    if (!selectedItem || !moveCantidad) return;
    
    const cantidadInt = parseFloat(moveCantidad);
    if (isNaN(cantidadInt) || cantidadInt <= 0) {
      Alert.alert("Error", "Ingresa una cantidad válida");
      return;
    }
    
    if (cantidadInt > selectedItem.cantidad) {
      Alert.alert("Error", "No puedes mover más de lo disponible");
      return;
    }

    if (destino === "general" && !rolesConPermisoMover.includes(role)) {
      Alert.alert("Permiso denegado", "No puedes mover al inventario general");
      return;
    }

    try {
      setLoading(true);
      const refActual = doc(db, "proyectos", projectId, "inventario", selectedItem.idDoc);
      const snap = await getDoc(refActual);
      
      if (!snap.exists()) {
        Alert.alert("Error", "El material ya no existe en este proyecto");
        return;
      }

      await updateDoc(refActual, { cantidad: selectedItem.cantidad - cantidadInt });

      if (destino === "general") {
        await moveToGeneralInventory(selectedItem, cantidadInt);
      } else if (destino === "proyecto" && proyectoDestino) {
        await moveToProject(selectedItem, cantidadInt, proyectoDestino);
      }

      Alert.alert("Éxito", "Movimiento realizado con éxito");
      onClose();
      setMoveCantidad("");
      setProyectoDestino(null);
    } catch (error) {
      Alert.alert("Error", "No se pudo mover el material");
      console.error("Error moviendo material:", error);
    } finally {
      setLoading(false);
    }
  };

  const moveToGeneralInventory = async (item, cantidad) => {
    const colDestino = collection(db, "inventario_general");
    const snapGen = await getDocs(colDestino);
    const existente = snapGen.docs.find((d) => d.data().nombre === item.nombre);

    if (existente) {
      await updateDoc(doc(db, "inventario_general", existente.id), {
        cantidad: existente.data().cantidad + cantidad,
        ultimaModificacion: new Date(),
      });
    } else {
      await addDoc(colDestino, {
        nombre: item.nombre,
        cantidad: cantidad,
        tipo_medida: item.tipo_medida || "Unidad",
        notas: item.notas || "",
        ultimaModificacion: new Date(),
      });
    }
  };

  const moveToProject = async (item, cantidad, proyectoId) => {
    const colDestino = collection(db, `proyectos/${proyectoId}/inventario`);
    const snapProj = await getDocs(colDestino);
    const existente = snapProj.docs.find((d) => d.data().nombre === item.nombre);

    if (existente) {
      await updateDoc(doc(db, `proyectos/${proyectoId}/inventario`, existente.id), {
        cantidad: existente.data().cantidad + cantidad,
        ultimaModificacion: new Date(),
      });
    } else {
      await addDoc(colDestino, {
        nombre: item.nombre,
        cantidad: cantidad,
        tipo_medida: item.tipo_medida || "Unidad",
        notas: item.notas || "",
        ultimaModificacion: new Date(),
      });
    }
  };

  return (
    <ModalBase
      visible={visible}
      title={`Mover ${selectedItem?.nombre}`}
      onClose={onClose}
      footer={
        <TouchableOpacity style={styles.saveButton} onPress={handleMove} disabled={loading}>
          <Text style={styles.saveButtonText}>✅ Confirmar</Text>
        </TouchableOpacity>
      }
    >
      <TextInput
        style={styles.input}
        placeholder="Cantidad a mover"
        placeholderTextColor="#aaa"
        keyboardType="numeric"
        value={moveCantidad}
        onChangeText={setMoveCantidad}
      />

      <DropdownSelect
        data={[
          { label: "Inventario General", value: "general" },
          { label: "Otro Proyecto", value: "proyecto" },
        ]}
        value={destino}
        onChange={setDestino}
      />

      {destino === "proyecto" && (
        <DropdownSelect
          data={proyectos
            .filter((p) => p.id !== projectId && (p.progress || 0) < 1)
            .map((p) => ({ label: p.title, value: p.id }))}
          value={proyectoDestino}
          onChange={setProyectoDestino}
          placeholder="Selecciona proyecto destino"
        />
      )}
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