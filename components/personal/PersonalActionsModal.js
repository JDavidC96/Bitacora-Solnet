// components/personal/PersonalActionsModal.js
import { useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function PersonalActionsModal({
  visible,
  selectedPerson,
  onAssignToWarehouse,
  onAssignToRetie,
  onAssignToOffice,
  onAssignManual,      
  onRelease,
  onExportExcel,       
  onClose,
}) {
  const [manualModal, setManualModal] = useState(false);
  const [manualProject, setManualProject] = useState("");

  if (!visible || !selectedPerson) return null;

  const handleManualSave = () => {
    if (!manualProject.trim()) return;
    onAssignManual(selectedPerson, manualProject.trim());
    setManualProject("");
    setManualModal(false);
  };

  return (
    <Modal animationType="fade" transparent visible={true}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>
            Opciones para {selectedPerson.nombre}
          </Text>

          {selectedPerson.estado === "libre" ? (
            <>
              <TouchableOpacity
                style={styles.button}
                onPress={() => onAssignToWarehouse(selectedPerson)}
              >
                <Text style={styles.buttonText}>🏗️ Ocupar en Bodega</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.button}
                onPress={() => onAssignToOffice(selectedPerson)}
              >
                <Text style={styles.buttonText}>🏢 Ocupar en Oficina</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.button}
                onPress={() => onAssignToRetie(selectedPerson)}
              >
                <Text style={styles.buttonText}>🔍 Visita RETIE</Text>
              </TouchableOpacity>

              {/* ASIGNAR MANUAL */}
              <TouchableOpacity
                style={[styles.button, { backgroundColor: "#3182CE" }]}
                onPress={() => setManualModal(true)}
              >
                <Text style={styles.buttonText}>✏️ Proyecto no listado</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.button, { backgroundColor: "#48BB78" }]}
              onPress={() => onRelease(selectedPerson)}
            >
              <Text style={styles.buttonText}>✅ Liberar</Text>
            </TouchableOpacity>
          )}

          {/* EXPORTAR HORAS A EXCEL */}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#F59E0B" }]}
            onPress={() => onExportExcel(selectedPerson)}
          >
            <Text style={styles.buttonText}>📤 Exportar Excel de horas</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>

        {/* MODAL TEXTO PROYECTO MANUAL */}
        {manualModal && (
          <View style={styles.manualOverlay}>
            <View style={styles.manualBox}>
              <Text style={styles.manualTitle}>Proyecto no listado</Text>

              <TextInput
                style={styles.input}
                placeholder="Nombre del proyecto..."
                placeholderTextColor="#AAA"
                value={manualProject}
                onChangeText={setManualProject}
              />

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleManualSave}
              >
                <Text style={styles.saveButtonText}>Guardar</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setManualModal(false)}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    backgroundColor: "#1F2937",
    padding: 20,
    width: "80%",
    borderRadius: 14,
  },
  title: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#4F46E5",
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 16,
  },
  cancelText: {
    color: "#D1D5DB",
    textAlign: "center",
    marginTop: 12,
  },
  manualOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
  },
  manualBox: {
    width: "80%",
    backgroundColor: "#1F2937",
    padding: 20,
    borderRadius: 12,
  },
  manualTitle: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#111827",
    color: "#FFF",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: "#10B981",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  saveButtonText: {
    color: "#022C22",
    fontSize: 16,
    fontWeight: "700",
  },
});
