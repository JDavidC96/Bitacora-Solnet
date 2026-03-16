// components/inventory/InventoryItem.js

import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

/**
 * Componente que representa un ítem individual del inventario.
 *
 * Además del stock real, muestra dos badges informativos opcionales:
 * - 🟣 "+Xres"  → cantidad reservada para proyectos (púrpura)
 * - 🟠 "+Xcam"  → cantidad cargada en la camioneta (naranja)
 *
 * Acciones disponibles (visibles solo si se pasan los callbacks):
 * - Long press → Editar
 * - Botón "Mover"    → Mover al inventario de un proyecto (descuenta stock)
 * - Botón "Reservar" → Reservar para un proyecto (solo informativo)
 * - Botón "🚐"       → Gestionar carga en camioneta
 *
 * @component
 * @param {Object}   props
 * @param {Object}   props.item               - Material del inventario
 * @param {boolean}  [props.canEdit]          - Habilita acciones de edición
 * @param {Function} [props.onEdit]           - Callback al hacer long press
 * @param {Function} [props.onDelete]         - Callback para eliminar
 * @param {Function} [props.onMove]           - Callback para mover a proyecto
 * @param {Function} [props.onReserve]        - Callback para reservar
 * @param {Function} [props.onTruck]          - Callback para gestionar camioneta
 * @param {number}   [props.cantidadReservada=0] - Total reservado (badge púrpura)
 * @param {number}   [props.cantidadCamioneta=0] - Total en camioneta (badge naranja)
 */
export default function InventoryItem({
  item,
  onEdit,
  onMove,
  onReserve,
  onTruck,
  cantidadReservada = 0,
  cantidadCamioneta = 0,
}) {
  const isLowStock = item.minimo && Number(item.cantidad) < Number(item.minimo);

  const handleLongPress = () => onEdit?.(item);
  const handleMovePress = () => onMove?.(item);
  const handleReservePress = () => onReserve?.(item);
  const handleTruckPress = () => onTruck?.(item);

  return (
    <TouchableOpacity
      style={[styles.container, isLowStock && styles.lowStockContainer]}
      onLongPress={handleLongPress}
      delayLongPress={220}
      activeOpacity={0.7}
    >
      {/* ──────────── Columna izquierda: info ──────────── */}
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.nombre}</Text>

        <Text style={styles.code}>
          Código: {item.codigo || "—"}
        </Text>

        <Text style={styles.meta}>
          {item.categoria || "Sin categoría"} · {item.tipo_medida}
        </Text>

        <Text style={styles.price}>
          $ {Number(item.precio || 0).toLocaleString("es-CO")}
        </Text>

        {/* Stock mínimo + alerta */}
        {item.minimo != null && (
          <View style={styles.minimoContainer}>
            <Text style={[styles.minimoText, isLowStock && styles.minimoAlert]}>
              Mín: {item.minimo}
            </Text>
            {isLowStock && (
              <Text style={styles.lowStockAlert}>⚠️ Stock bajo</Text>
            )}
          </View>
        )}

        {/* ── Badges informativos ── */}
        {(cantidadReservada > 0 || cantidadCamioneta > 0) && (
          <View style={styles.badgesRow}>
            {cantidadReservada > 0 && (
              <View style={styles.badgeReserva}>
                <Text style={styles.badgeReservaText}>
                  +{cantidadReservada} res
                </Text>
              </View>
            )}
            {cantidadCamioneta > 0 && (
              <View style={styles.badgeCamioneta}>
                <Text style={styles.badgeCamiText}>
                  +{cantidadCamioneta} 🚐
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* ──────────── Columna derecha: stock + acciones ──────────── */}
      <View style={styles.qtyBox}>
        {/* Número de stock */}
        <Text style={[styles.qty, isLowStock && styles.qtyLowStock]}>
          {item.cantidad ?? 0}
        </Text>

        {/* Etiqueta stock + porcentaje vs mínimo */}
        <View style={styles.stockInfo}>
          <Text style={[styles.qtyLabel, isLowStock && styles.qtyLabelLowStock]}>
            {isLowStock ? "¡Bajo!" : "Stock"}
          </Text>
          {item.minimo != null && Number(item.minimo) > 0 && (
            <Text style={styles.stockRatio}>
              {Math.round((Number(item.cantidad) / Number(item.minimo)) * 100)}%
            </Text>
          )}
        </View>

        {/* ── Botones de acción ── */}
        <View style={styles.actionsCol}>
          {onMove && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.btnMove]}
              onPress={handleMovePress}
              activeOpacity={0.8}
            >
              <Text style={styles.actionText}>Mover</Text>
            </TouchableOpacity>
          )}
          {onReserve && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.btnReserve]}
              onPress={handleReservePress}
              activeOpacity={0.8}
            >
              <Text style={styles.actionText}>Reservar</Text>
            </TouchableOpacity>
          )}
          {onTruck && (
            <TouchableOpacity
              style={[
                styles.actionBtn,
                styles.btnTruck,
                cantidadCamioneta > 0 && styles.btnTruckActive,
              ]}
              onPress={handleTruckPress}
              activeOpacity={0.8}
            >
              <Text style={styles.actionText}>
                {cantidadCamioneta > 0 ? "🚐 Cargado" : "🚐"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
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
  lowStockContainer: {
    borderColor: "#F87171",
    borderWidth: 1.5,
    backgroundColor: "rgba(248, 113, 113, 0.05)",
  },

  // ── Columna izquierda ──
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
  minimoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 8,
  },
  minimoText: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "500",
  },
  minimoAlert: {
    color: "#F87171",
    fontWeight: "600",
  },
  lowStockAlert: {
    color: "#FCA5A5",
    fontSize: 11,
    fontWeight: "600",
    backgroundColor: "rgba(248, 113, 113, 0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },

  // ── Badges informativos ──
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 8,
  },
  badgeReserva: {
    backgroundColor: "rgba(124, 58, 237, 0.18)",
    borderWidth: 1,
    borderColor: "#7C3AED",
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeReservaText: {
    color: "#C4B5FD", // Lavanda
    fontSize: 11,
    fontWeight: "700",
  },
  badgeCamioneta: {
    backgroundColor: "rgba(234, 88, 12, 0.18)",
    borderWidth: 1,
    borderColor: "#EA580C",
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeCamiText: {
    color: "#FDBA74", // Naranja claro
    fontSize: 11,
    fontWeight: "700",
  },

  // ── Columna derecha ──
  qtyBox: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 88,
    paddingLeft: 8,
  },
  qty: {
    color: "#FBBF24",
    fontSize: 22,
    fontWeight: "700",
  },
  qtyLowStock: {
    color: "#F87171",
    fontSize: 24,
  },
  stockInfo: {
    alignItems: "center",
    marginBottom: 6,
  },
  qtyLabel: {
    color: "#94A3B8",
    fontSize: 11,
  },
  qtyLabelLowStock: {
    color: "#FCA5A5",
    fontWeight: "600",
  },
  stockRatio: {
    color: "#A5B4FC",
    fontSize: 10,
    marginTop: 1,
    fontWeight: "500",
  },

  // ── Botones de acción ──
  actionsCol: {
    width: "100%",
    gap: 5,
  },
  actionBtn: {
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 6,
    alignItems: "center",
  },
  btnMove: {
    backgroundColor: "#0EA5E9", // Azul
  },
  btnReserve: {
    backgroundColor: "#7C3AED", // Púrpura
  },
  btnTruck: {
    backgroundColor: "#78350F", // Naranja oscuro (inactivo)
    borderWidth: 1,
    borderColor: "#EA580C",
  },
  btnTruckActive: {
    backgroundColor: "#EA580C", // Naranja brillante (hay material cargado)
  },
  actionText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "600",
  },
});