// components/personal/PersonalItem.js
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function PersonalItem({
  item,
  onPress,
  onLongPress,
  onDelete,
  role,
}) {
  const isAdmin = role === "Administrador";

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={300}
    >
      <View style={styles.info}>
        <Text style={styles.name}>{item.nombre}</Text>
        <Text style={styles.role}>{item.cargo}</Text>

        <Text
          style={[
            styles.status,
            { color: item.estado === "libre" ? "lime" : "red" },
          ]}
        >
          {item.estado === "libre"
            ? "🟢 Libre"
            : `🔴 Ocupado en ${item.proyectoAsignado || "un proyecto"}`}
        </Text>
      </View>

      {isAdmin && (
        <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
          <Text style={styles.deleteText}>🗑️</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#2C2C3A",
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  info: {
    flex: 1,
  },
  name: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  role: {
    color: "#AAA",
    fontSize: 14,
    marginBottom: 6,
  },
  status: {
    fontSize: 14,
    fontWeight: "600",
  },
  deleteButton: {
    backgroundColor: "#E53E3E",
    borderRadius: 6,
    padding: 8,
  },
  deleteText: {
    color: "#FFF",
    fontSize: 18,
  },
});
