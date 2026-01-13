// components/inventory/HistoryItem.js
// Tarjeta profesional para historial de movimientos

import { StyleSheet, Text, View } from "react-native";

/**
 * Mapeo de íconos visuales por tipo de movimiento
 * @constant {Object}
 */
const typeIcons = {
  entrada: "⬆️",              // entrada al inventario general
  salida: "⬇️",               // salida del inventario general
  movimiento: "📦",           // inventario general → proyecto
  entrada_externa: "🛒",      // comprado directamente
  uso: "🧰",                  // uso dentro del proyecto
  devolucion: "↩️",           // proyecto → general
  transferencia: "🔀",        // entre proyectos
};

/**
 * Colores por tipo de movimiento (borde y título)
 * @constant {Object}
 */
const typeColors = {
  entrada: "#22C55E",
  salida: "#EF4444",
  movimiento: "#3B82F6",
  entrada_externa: "#0EA5E9",
  uso: "#FACC15",
  devolucion: "#14B8A6",
  transferencia: "#A855F7",
};

/**
 * Componente de tarjeta para mostrar un movimiento individual del historial
 * Muestra información detallada de cada movimiento con colores e íconos según el tipo
 * 
 * @component
 * @param {Object} props - Propiedades del componente
 * @param {Object} props.movement - Objeto que representa el movimiento
 * @param {string} props.movement.tipo - Tipo de movimiento (entrada, salida, uso, etc.)
 * @param {string} props.movement.material - Nombre del material
 * @param {string} props.movement.codigo - Código del material
 * @param {number} props.movement.cantidad - Cantidad movida
 * @param {string} props.movement.unidad - Unidad de medida
 * @param {string} props.movement.origen - Origen del movimiento
 * @param {string} props.movement.destino - Destino del movimiento
 * @param {string} props.movement.usuario - Usuario que realizó el movimiento
 * @param {string} props.movement.notas - Notas adicionales
 * @param {Date|Object} props.movement.timestamp - Fecha y hora del movimiento
 * @returns {JSX.Element} Tarjeta estilizada con información del movimiento
 * 
 * @example
 * // Uso básico
 * <HistoryItem
 *   movement={{
 *     tipo: "entrada",
 *     material: "Cemento",
 *     cantidad: 100,
 *     unidad: "kg",
 *     origen: "Proveedor XYZ",
 *     destino: "Almacén Central",
 *     usuario: "admin",
 *     timestamp: new Date()
 *   }}
 * />
 */
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

  // Obtener ícono y color según el tipo de movimiento
  const icon = typeIcons[tipo] || "📄";
  const color = typeColors[tipo] || "#64748B";

  // Formatear fecha del timestamp
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

      {/* Nombre del material */}
      <Text style={styles.material}>{material}</Text>

      {/* Código del material (opcional) */}
      {codigo ? (
        <Text style={styles.code}>Código: {codigo}</Text>
      ) : null}

      {/* Cantidad y unidad */}
      <Text style={styles.qty}>
        Cantidad: <Text style={{ color: "#FFF" }}>{cantidad}</Text>{" "}
        {unidad || ""}
      </Text>

      {/* Ruta: Origen → Destino */}
      <Text style={styles.route}>
        {origen || "—"} <Text style={styles.arrow}>→</Text> {destino || "—"}
      </Text>

      {/* Usuario que realizó el movimiento */}
      <Text style={styles.user}>Usuario: {usuario || "—"}</Text>

      {/* Notas adicionales (opcional) */}
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