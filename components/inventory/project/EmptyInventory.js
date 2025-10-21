import { StyleSheet, Text } from "react-native";

export default function EmptyInventory() {
  return <Text style={styles.empty}>No hay materiales en este proyecto</Text>;
}

const styles = StyleSheet.create({
  empty: { color: "#888", textAlign: "center", marginTop: 20 },
});