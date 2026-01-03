// components/inventory/DuplicateGroupCard.js

import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function DuplicateGroupCard({ group, onEditItem, onMergeGroup }) {
  const { categoria, normalizedName, items } = group;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>
          {categoria} · {normalizedName}
        </Text>
        <Text style={styles.count}>{items.length} ítems</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.itemRow}
            onPress={() => onEditItem && onEditItem(item)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.nombre}</Text>
              <Text style={styles.meta}>
                Código: {item.codigo || "—"} · Unidad: {item.tipo_medida || "—"}
              </Text>
            </View>
            <View style={styles.rightBox}>
              <Text style={styles.qty}>{item.cantidad ?? 0}</Text>
              <Text style={styles.qtyLabel}>Stock</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      {onMergeGroup && (
        <TouchableOpacity
          style={styles.mergeBtn}
          onPress={() => onMergeGroup(group)}
        >
          <Text style={styles.mergeText}>Fusionar grupo</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#020617",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  title: {
    color: "#F9FAFB",
    fontWeight: "700",
    fontSize: 14,
  },
  count: {
    color: "#E5E7EB",
    fontSize: 12,
  },
  itemRow: {
    flexDirection: "row",
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: "#111827",
  },
  name: {
    color: "#E5E7EB",
    fontSize: 13,
    fontWeight: "600",
  },
  meta: {
    color: "#9CA3AF",
    fontSize: 11,
    marginTop: 2,
  },
  rightBox: {
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  qty: {
    color: "#FBBF24",
    fontWeight: "700",
  },
  qtyLabel: {
    color: "#9CA3AF",
    fontSize: 10,
  },
  mergeBtn: {
    marginTop: 8,
    alignSelf: "flex-end",
    backgroundColor: "#0EA5E9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  mergeText: {
    color: "#F9FAFB",
    fontSize: 12,
    fontWeight: "600",
  },
});
