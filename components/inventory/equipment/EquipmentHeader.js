// components/inventory/equipment/EquipmentHeader.js
import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useUser } from "../../../context/UserContext";

export default function EquipmentHeader({ onAddPress, onAssignPress }) {
  const { role } = useUser();
  const router = useRouter();

  const isAdmin = role === "Administrador";
  const canManage = ["Administrador", "Ingeniero", "Supervisor"].includes(role);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔧 Herramientas ({role})</Text>

      <View style={styles.topButtons}>
        {canManage && (
          <TouchableOpacity
            style={[styles.topButton, { backgroundColor: "#38A169" }]}
            onPress={onAddPress}
          >
            <Text style={styles.topButtonText}>+ Agregar</Text>
          </TouchableOpacity>
        )}

        {canManage && (
          <TouchableOpacity
            style={[styles.topButton, { backgroundColor: "#3182CE" }]}
            onPress={onAssignPress}
          >
            <Text style={styles.topButtonText}>Asignar</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.topButton, { backgroundColor: "#805AD5" }]}
          onPress={() => router.push("/EquipmentHistoryScreen")}
        >
          <Text style={styles.topButtonText}>Historial</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    color: "#FFF",
    marginBottom: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  topButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  topButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  topButtonText: {
    color: "#FFF",
    fontWeight: "bold",
  },
});