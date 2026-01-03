// components/inventory/duplicates/MergeDuplicateModal.js

import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import ModalBase from "../../ModalBase";

export default function MergeDuplicateModal({
  visible,
  onClose,
  group,
  onConfirm,   // (masterItem) => Promise
  merging,
}) {
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (visible && group?.items?.length) {
      setSelected(group.items[0]);
    }
  }, [visible, group]);

  if (!group) return null;

  const handleConfirm = () => {
    if (!selected) return;
    onConfirm && onConfirm(selected);
  };

  return (
    <ModalBase
      visible={visible}
      onClose={onClose}
      title="Fusionar grupo de duplicados"
      footer={
        <TouchableOpacity
          style={[styles.btn, (!selected || merging) && { opacity: 0.6 }]}
          disabled={!selected || merging}
          onPress={handleConfirm}
        >
          {merging ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.btnText}>Fusionar en este ítem</Text>
          )}
        </TouchableOpacity>
      }
    >
      <Text style={styles.info}>
        Elige el ítem principal. Los demás se sumarán a su cantidad y serán
        eliminados del inventario general.
      </Text>

      <Text style={styles.groupTitle}>
        {group.categoria} · {group.normalizedName}
      </Text>

      <FlatList
        data={group.items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isSelected = selected?.id === item.id;
          return (
            <TouchableOpacity
              style={[styles.itemRow, isSelected && styles.itemSelected]}
              onPress={() => setSelected(item)}
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
          );
        }}
      />
    </ModalBase>
  );
}

const styles = StyleSheet.create({
  info: {
    color: "#CBD5F5",
    fontSize: 12,
    marginBottom: 8,
  },
  groupTitle: {
    color: "#E5E7EB",
    fontWeight: "700",
    marginBottom: 6,
  },
  itemRow: {
    flexDirection: "row",
    paddingVertical: 8,
    borderRadius: 8,
    paddingHorizontal: 8,
    marginBottom: 4,
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  itemSelected: {
    borderColor: "#0EA5E9",
    backgroundColor: "#0B1220",
  },
  name: {
    color: "#F9FAFB",
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
  btn: {
    backgroundColor: "#0EA5E9",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  btnText: {
    color: "#FFF",
    fontWeight: "700",
  },
});
