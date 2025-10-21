import { StyleSheet, Text, TouchableOpacity } from "react-native";

export default function AddMaterialButton({ onPress }) {
  return (
    <TouchableOpacity style={styles.addButton} onPress={onPress}>
      <Text style={styles.addButtonText}>➕ Agregar Material</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  addButton: {
    backgroundColor: "#055bfaff",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 16,
  },
  addButtonText: { color: "#ffffffff", fontSize: 16, fontWeight: "bold" },
});