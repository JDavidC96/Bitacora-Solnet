// components/inventory/project/MaterialItem.js
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

function getCantidadDisponible(item) {
  if (!item) return 0;
  if (typeof item.cantidadActual === "number") return item.cantidadActual;
  if (typeof item.cantidad_disponible === "number") return item.cantidad_disponible;
  if (typeof item.cantidad === "number") return item.cantidad;
  return 0;
}

function getCantidadOriginal(item) {
  if (!item) return 0;
  if (typeof item.cantidadOriginal === "number") return item.cantidadOriginal;
  if (typeof item.cantidad_original === "number") return item.cantidad_original;
  if (typeof item.cantidad === "number") return item.cantidad;
  return 0;
}

export default function MaterialItem({
  item,
  onUse,
  onReturn,
  canUse = false,
}) {
  const original = getCantidadOriginal(item);
  const disponible = getCantidadDisponible(item);
  const usado = original - disponible;

  return (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.nombre}</Text>
        <Text style={styles.meta}>
          Código: {item.codigo || "—"} · {item.categoria || "Sin categoría"}
        </Text>
        <Text style={styles.meta}>
          Unidad: {item.tipo_medida || "Unidad"}
        </Text>

        <View style={styles.row}>
          <View style={styles.badge}>
            <Text style={styles.badgeLabel}>Asignado</Text>
            <Text style={styles.badgeValue}>{original}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeLabel}>Disponible</Text>
            <Text style={styles.badgeValue}>{disponible}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeLabel}>Usado</Text>
            <Text style={styles.badgeValue}>{usado}</Text>
          </View>
        </View>

        {item.updatedBy && (
          <Text style={styles.stamp}>
            Última actualización por {item.updatedBy}{" "}
            {item.updatedAt
              ? `(${new Date(
                  item.updatedAt?.toDate?.() || item.updatedAt
                ).toLocaleString()})`
              : ""}
          </Text>
        )}
      </View>

      {canUse && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              disponible <= 0 && { opacity: 0.4 },
            ]}
            disabled={disponible <= 0}
            onPress={onUse}
          >
            <Text style={styles.actionText}>Registrar uso</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionBtn,
              styles.secondaryBtn,
              disponible <= 0 && { opacity: 0.4 },
            ]}
            disabled={disponible <= 0}
            onPress={onReturn}
          >
            <Text style={styles.secondaryText}>Devolver</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#1E293B",
    marginBottom: 10,
  },
  name: {
    color: "#F9FAFB",
    fontSize: 15,
    fontWeight: "700",
  },
  meta: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 2,
  },
  row: {
    flexDirection: "row",
    marginTop: 6,
    marginBottom: 4,
  },
  badge: {
    flex: 1,
    backgroundColor: "#0B1120",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 6,
    marginRight: 4,
    borderWidth: 1,
    borderColor: "#1F2937",
    alignItems: "center",
  },
  badgeLabel: {
    color: "#9CA3AF",
    fontSize: 11,
  },
  badgeValue: {
    color: "#F9FAFB",
    fontSize: 14,
    fontWeight: "700",
  },
  stamp: {
    color: "#38BDF8",
    fontSize: 11,
    marginTop: 4,
  },
  actions: {
    justifyContent: "space-between",
    marginLeft: 8,
  },
  actionBtn: {
    backgroundColor: "#22C55E",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  secondaryBtn: {
    backgroundColor: "#0EA5E9",
  },
  actionText: {
    color: "#022C22",
    fontSize: 11,
    fontWeight: "700",
  },
  secondaryText: {
    color: "#EFF6FF",
    fontSize: 11,
    fontWeight: "700",
  },
});
