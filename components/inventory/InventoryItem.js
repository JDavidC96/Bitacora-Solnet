// components/inventory/InventoryItem.js

import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function InventoryItem({ item, onEdit, onMove }) {
  return (
    <TouchableOpacity
      style={styles.container}
      onLongPress={onEdit}        
      delayLongPress={220}
    >
      <View style={{ flex: 1 }}>
        {/* Nombre */}
        <Text style={styles.name}>{item.nombre}</Text>

        {/* Código */}
        <Text style={styles.code}>Código: {item.codigo || "—"}</Text>

        {/* Categoría / Unidad */}
        <Text style={styles.meta}>
          {item.categoria || "Sin categoría"} · {item.tipo_medida}
        </Text>

        {/* Precio */}
        <Text style={styles.price}>
          $ {Number(item.precio || 0).toLocaleString("es-CO")}
        </Text>
      </View>

      {/* Cantidad */}
      <View style={styles.qtyBox}>
        <Text style={styles.qty}>{item.cantidad ?? 0}</Text>
        <Text style={styles.qtyLabel}>Stock</Text>

        {/* Botón mover */}
        {onMove && (
          <TouchableOpacity
            style={styles.moveBtn}
            onPress={onMove}
          >
            <Text style={styles.moveText}>Mover</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#1E293B",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#334155",
  },
  name: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "600",
  },
  code: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 2,
  },
  meta: {
    color: "#CBD5E1",
    fontSize: 12,
    marginTop: 2,
  },
  price: {
    color: "#38BDF8",
    fontWeight: "700",
    marginTop: 4,
  },
  qtyBox: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 70,
  },
  qty: {
    color: "#FBBF24",
    fontSize: 20,
    fontWeight: "700",
  },
  qtyLabel: {
    color: "#94A3B8",
    fontSize: 11,
    marginBottom: 6,
  },
  moveBtn: {
    backgroundColor: "#0EA5E9",
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginTop: 4,
  },
  moveText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "600",
  },
});
