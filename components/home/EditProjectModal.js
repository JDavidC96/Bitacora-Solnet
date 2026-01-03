// components/home/EditProjectModal.js
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import ModalBase from "../ModalBase";

export default function EditProjectModal({
  visible,
  project,
  onClose,
  onSave,
  loading = false,
}) {
  const [editedName, setEditedName] = useState("");
  const [editedLocation, setEditedLocation] = useState("");
  const [potenciaAC, setPotenciaAC] = useState("");

  useEffect(() => {
    if (project) {
      setEditedName(project.title || "");
      setEditedLocation(project.ubicacion || "");
      setPotenciaAC(
        project.potenciaAC !== undefined && project.potenciaAC !== null
          ? String(project.potenciaAC)
          : ""
      );
    }
  }, [project]);

  const handleSave = () => {
    if (!editedName.trim()) {
      alert("El nombre del proyecto es requerido");
      return;
    }

    const potenciaParsed =
      potenciaAC !== "" ? Number(potenciaAC) : null;

    if (potenciaParsed !== null && isNaN(potenciaParsed)) {
      alert("La potencia AC debe ser un número válido");
      return;
    }

    onSave({
      title: editedName.trim(),
      ubicacion: editedLocation.trim(),
      potenciaAC: potenciaParsed,
    });
  };

  const handleClose = () => {
    setEditedName("");
    setEditedLocation("");
    setPotenciaAC("");
    onClose();
  };

  if (!project) return null;

  return (
    <ModalBase
      visible={visible}
      title="Editar proyecto"
      onClose={handleClose}
      footer={
        <TouchableOpacity
          style={[styles.confirmButton, loading && styles.disabledButton]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.confirmButtonText}>Guardar cambios</Text>
          )}
        </TouchableOpacity>
      }
    >
      <View style={styles.body}>
        {/* Nombre */}
        <Text style={styles.label}>Nombre</Text>
        <TextInput
          style={styles.input}
          placeholder="Nombre del proyecto"
          placeholderTextColor="#9CA3AF"
          value={editedName}
          onChangeText={setEditedName}
          autoCapitalize="sentences"
        />

        {/* Ubicación */}
        <Text style={styles.label}>Ubicación</Text>
        <TextInput
          style={styles.input}
          placeholder="Ubicación del proyecto"
          placeholderTextColor="#9CA3AF"
          value={editedLocation}
          onChangeText={setEditedLocation}
          autoCapitalize="sentences"
        />

        {/* Potencia AC */}
        <Text style={styles.label}>Potencia total instalada (kW AC)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: 50"
          placeholderTextColor="#9CA3AF"
          value={potenciaAC}
          onChangeText={setPotenciaAC}
          keyboardType="numeric"
        />
      </View>
    </ModalBase>
  );
}

const styles = {
  body: {
    gap: 10,
  },
  label: {
    color: "#E5E7EB",
    fontSize: 13,
    marginBottom: 2,
  },
  input: {
    backgroundColor: "#111827",
    color: "#F9FAFB",
    padding: 12,
    borderRadius: 10,
    marginBottom: 4,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#374151",
  },
  confirmButton: {
    backgroundColor: "#FF7A00",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: "#9CA3AF",
    opacity: 0.7,
  },
  confirmButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "600",
  },
};
