// components/inventory/HistoryItem.js
// Tarjeta profesional para historial de movimientos

import { StyleSheet, Text, View } from "react-native";

// Íconos visuales por tipo de movimiento
const typeIcons = {
  entrada: "⬆️",              // entrada al inventario general
  salida: "⬇️",               // salida del inventario general
  movimiento: "📦",           // inventario general → proyecto
  entrada_externa: "🛒",      // comprado directamente
  uso: "🧰",                  // uso dentro del proyecto
  devolucion: "↩️",           // proyecto → general
  transferencia: "🔀",        // entre proyectos
};

// Colores por tipo (borde y título)
const typeColors = {
  entrada: "#22C55E",
  salida: "#EF4444",
  movimiento: "#3B82F6",
  entrada_externa: "#0EA5E9",
  uso: "#FACC15",
  devolucion: "#14B8A6",
  transferencia: "#A855F7",
};

export default function HistoryItem({ movement }) {
  const {
    tipo,
    material,
    codigo,
    cantidad,
    unidad,
    origen,
    destino,
    usuario,
    notas,
    timestamp,
  } = movement;

  const icon = typeIcons[tipo] || "📄";
  const color = typeColors[tipo] || "#64748B";

  const fecha = timestamp
    ? new Date(timestamp?.toDate?.() || timestamp).toLocaleString()
    : "—";

  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      {/* Header con tipo + icono */}
      <View style={styles.headerRow}>
        <Text style={[styles.type, { color }]}>{icon} {tipo}</Text>
        <Text style={styles.date}>{fecha}</Text>
      </View>

      {/* Material */}
      <Text style={styles.material}>{material}</Text>

      {codigo ? (
        <Text style={styles.code}>Código: {codigo}</Text>
      ) : null}

      <Text style={styles.qty}>
        Cantidad: <Text style={{ color: "#FFF" }}>{cantidad}</Text>{" "}
        {unidad || ""}
      </Text>

      {/* Origen -> destino */}
      <Text style={styles.route}>
        {origen || "—"} <Text style={styles.arrow}>→</Text> {destino || "—"}
      </Text>

      {/* Usuario */}
      <Text style={styles.user}>Usuario: {usuario || "—"}</Text>

      {/* Notas */}
      {notas ? <Text style={styles.notes}>📝 {notas}</Text> : null}
    </View>
  );
}

// =================== ESTILOS ===================
const styles = StyleSheet.create({
  card: {
    backgroundColor: "#1E293B",
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderLeftWidth: 4,
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  type: {
    fontSize: 15,
    fontWeight: "700",
  },

  date: {
    color: "#94A3B8",
    fontSize: 12,
  },

  material: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
    marginBottom: 2,
  },

  code: {
    color: "#93C5FD",
    fontSize: 13,
    marginBottom: 4,
  },

  qty: {
    color: "#CBD5E1",
    fontSize: 14,
    marginBottom: 6,
  },

  route: {
    color: "#E2E8F0",
    fontSize: 14,
    marginBottom: 4,
  },

  arrow: {
    color: "#64748B",
  },

  user: {
    color: "#A5B4FC",
    fontSize: 13,
    marginBottom: 6,
  },

  notes: {
    color: "#F8FAFC",
    fontSize: 13,
    fontStyle: "italic",
    marginTop: 4,
  },
});
