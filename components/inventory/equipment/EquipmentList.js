// components/inventory/equipment/EquipmentList.js
import { FlatList, StyleSheet, Text, View } from "react-native";
import EquipmentItem from "./EquipmentItem";

export default function EquipmentList({
  equipment = [],
  onLoan,
  onTransfer,
  onReturn,
  onDelete,
  onEdit,
  canEdit = false,
  isAdmin = false,
  canLongPressEdit = false,
  loading = false,
  emptyMessage = "No hay herramientas"
}) {
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando herramientas...</Text>
      </View>
    );
  }

  if (equipment.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={equipment}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => (
        <EquipmentItem
          item={item}
          onLoan={() => onLoan(item)}
          onTransfer={() => onTransfer(item)}
          onReturn={() => onReturn(item)}
          onDelete={() => onDelete(item)}
          onLongPress={() => onEdit?.(item)}
          canEdit={canEdit}
          isAdmin={isAdmin}
          canLongPressEdit={canLongPressEdit}
        />
      )}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: 20 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
  loadingText: { color: "#FFF", fontSize: 16 },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
  emptyText: { color: "#FFF", fontSize: 16, textAlign: "center" },
});
