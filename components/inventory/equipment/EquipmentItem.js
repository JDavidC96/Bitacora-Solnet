// components/inventory/equipment/EquipmentItem.js
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function EquipmentItem({
  item,
  onLoan,
  onTransfer,
  onReturn,
  onDelete,
  canEdit = false,
  isAdmin = false
}) {
  return (
    <View style={styles.container}>
      <View style={styles.info}>
        <Text style={styles.name}>{item.nombre}</Text>
        <Text style={styles.detail}>Estado: {item.estado}</Text>
        {item.serial && <Text style={styles.detail}>Serial: {item.serial}</Text>}
        {item.asignada ? (
          <Text style={styles.detail}>Asignada a: {item.asignada.nombre}</Text>
        ) : (
          <Text style={styles.detail}>No asignada</Text>
        )}
        {item.prestadaA && (
          <Text style={[styles.detail, { color: "#3182CE" }]}>
            Prestado a: {item.prestadaA.nombre}
          </Text>
        )}
      </View>

      <View style={styles.actions}>
        {canEdit && (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#3182CE" }]}
            onPress={onLoan}
          >
            <Text style={styles.buttonText}>Prestar</Text>
          </TouchableOpacity>
        )}

        {canEdit && (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#ECC94B" }]}
            onPress={onTransfer}
          >
            <Text style={styles.buttonText}>Transferir</Text>
          </TouchableOpacity>
        )}

        {item.prestadaA && (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#48BB78" }]}
            onPress={onReturn}
          >
            <Text style={styles.buttonText}>Devolver</Text>
          </TouchableOpacity>
        )}

        {isAdmin && (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#E53E3E" }]}
            onPress={onDelete}
          >
            <Text style={styles.buttonText}>Eliminar</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2D3748",
    marginBottom: 4,
  },
  detail: {
    fontSize: 14,
    color: "#4A5568",
    marginBottom: 2,
  },
  actions: {
    flexDirection: "row",
    marginTop: 12,
    gap: 8,
    flexWrap: "wrap",
  },
  button: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    alignItems: "center",
    minWidth: 80,
  },
  buttonText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 14,
  },
});