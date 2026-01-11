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
  const [potenciaDC, setPotenciaDC] = useState("");
  const [panelesInstalados, setPanelesInstalados] = useState("");

  useEffect(() => {
    if (project) {
      setEditedName(project.title || "");
      setEditedLocation(project.ubicacion || "");

      const ac =
        project.potenciaAC ??
        project.potenciaAcKw ??
        project.potenciaACKw ??
        project.potenciaACKw ??
        null;

      const dc =
        project.potenciaDC ??
        project.potenciaDcKw ??
        project.potenciaDCKw ??
        project.potenciaDcTotalKw ??
        null;

      const pan =
        project.panelesInstalados ??
        project.paneles ??
        project.cantidadPaneles ??
        null;

      setPotenciaAC(ac !== null && ac !== undefined ? String(ac) : "");
      setPotenciaDC(dc !== null && dc !== undefined ? String(dc) : "");
      setPanelesInstalados(pan !== null && pan !== undefined ? String(pan) : "");
    }
  }, [project]);

  const handleSave = () => {
    if (!editedName.trim()) {
      alert("El nombre del proyecto es requerido");
      return;
    }

    const acParsed = potenciaAC !== "" ? Number(String(potenciaAC).replace(",", ".")) : null;
    if (acParsed !== null && (!Number.isFinite(acParsed) || acParsed < 0)) {
      alert("La potencia AC debe ser un número válido (>= 0)");
      return;
    }

    const dcParsed = potenciaDC !== "" ? Number(String(potenciaDC).replace(",", ".")) : null;
    if (dcParsed !== null && (!Number.isFinite(dcParsed) || dcParsed < 0)) {
      alert("La potencia DC debe ser un número válido (>= 0)");
      return;
    }

    const panelesParsed = panelesInstalados !== "" ? parseInt(panelesInstalados, 10) : null;
    if (panelesParsed !== null && (!Number.isFinite(panelesParsed) || panelesParsed < 0)) {
      alert("Paneles instalados debe ser un entero válido (>= 0)");
      return;
    }

    onSave({
      title: editedName.trim(),
      ubicacion: editedLocation.trim(),
      potenciaAC: acParsed,
      potenciaDC: dcParsed,
      panelesInstalados: panelesParsed,
    });
  };

  const handleClose = () => {
    setEditedName("");
    setEditedLocation("");
    setPotenciaAC("");
    setPotenciaDC("");
    setPanelesInstalados("");
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
        <Text style={styles.label}>Potencia total instalada (kW AC) (opcional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: 50"
          placeholderTextColor="#9CA3AF"
          value={potenciaAC}
          onChangeText={setPotenciaAC}
          keyboardType="numeric"
        />

        {/* Potencia DC */}
        <Text style={styles.label}>Potencia total instalada (kW DC) (opcional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: 60"
          placeholderTextColor="#9CA3AF"
          value={potenciaDC}
          onChangeText={setPotenciaDC}
          keyboardType="numeric"
        />

        {/* Paneles */}
        <Text style={styles.label}>Paneles instalados (opcional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: 120"
          placeholderTextColor="#9CA3AF"
          value={panelesInstalados}
          onChangeText={setPanelesInstalados}
          keyboardType="number-pad"
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
