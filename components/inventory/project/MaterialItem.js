import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function MaterialItem({ 
  item, 
  role, 
  onUpdate, 
  onMove,
  canMove 
}) {
  return (
    <View style={styles.item}>
      <Text style={styles.itemName}>{item.nombre}</Text>
      <Text style={styles.itemDetails}>
        {item.cantidad} {item.tipo_medida}
      </Text>
      {item.updatedBy && (
        <Text style={styles.itemStamp}>
          Última actualización por {item.updatedBy}
        </Text>
      )}
      <TouchableOpacity
        style={styles.updateButton}
        onPress={() => onUpdate(item)}
      >
        <Text style={styles.updateButtonText}>✏️ Actualizar</Text>
      </TouchableOpacity>

      {canMove && item.cantidad > 0 && (
        <TouchableOpacity
          style={[styles.updateButton, { backgroundColor: "#805AD5" }]}
          onPress={() => onMove(item)}
        >
          <Text style={styles.updateButtonText}>🔀 Mover sobrante</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    padding: 12,
    backgroundColor: "rgba(44,44,58,0.9)",
    borderRadius: 8,
    marginBottom: 10,
  },
  itemName: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
  itemDetails: { color: "#AAA", marginTop: 4 },
  itemStamp: { color: "#38B2AC", fontSize: 12, marginTop: 4 },
  updateButton: {
    backgroundColor: "#3182CE",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 8,
    alignItems: "center",
  },
  updateButtonText: { color: "#FFF", fontWeight: "600" },
});