// components/personal/PersonalActionsModal.js
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function PersonalActionsModal({
  visible,
  selectedPerson,
  onAssignToWarehouse,
  onAssignToRetie,
  onRelease,
  onClose
}) {
  if (!visible || !selectedPerson) return null;

  return (
    <Modal animationType="slide" transparent visible={true}>
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
                onPress={() => onAssignToRetie(selectedPerson)}
              >
                <Text style={styles.buttonText}>🔍 Ocupar en Visita RETIE</Text>
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

          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    backgroundColor: "#2C2C3A",
    padding: 20,
    borderRadius: 12,
    width: "80%",
  },
  title: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#5A67D8",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelText: {
    color: "#CCC",
    textAlign: "center",
    marginTop: 8,
  },
});