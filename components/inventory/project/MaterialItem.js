// components/inventory/project/MaterialItem.js

import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

/**
 * Calcula la cantidad disponible de un material considerando múltiples nombres de propiedades.
 * Prioriza diferentes nombres de propiedades para compatibilidad con datos históricos.
 * 
 * @function
 * @param {Object} item - Objeto del material del inventario
 * @returns {number} Cantidad disponible del material
 * 
 * @private
 */
function getCantidadDisponible(item) {
  if (!item) return 0;
  // Prioridad de propiedades: cantidadActual → cantidad_disponible → cantidad
  if (typeof item.cantidadActual === "number") return item.cantidadActual;
  if (typeof item.cantidad_disponible === "number") return item.cantidad_disponible;
  if (typeof item.cantidad === "number") return item.cantidad;
  return 0; // Fallback a 0 si no se encuentra ninguna propiedad
}

/**
 * Calcula la cantidad original asignada de un material considerando múltiples nombres de propiedades.
 * Prioriza diferentes nombres de propiedades para compatibilidad con datos históricos.
 * 
 * @function
 * @param {Object} item - Objeto del material del inventario
 * @returns {number} Cantidad original del material
 * 
 * @private
 */
function getCantidadOriginal(item) {
  if (!item) return 0;
  // Prioridad de propiedades: cantidadOriginal → cantidad_original → cantidad
  if (typeof item.cantidadOriginal === "number") return item.cantidadOriginal;
  if (typeof item.cantidad_original === "number") return item.cantidad_original;
  if (typeof item.cantidad === "number") return item.cantidad;
  return 0; // Fallback a 0 si no se encuentra ninguna propiedad
}

/**
 * Componente para mostrar un item individual de material en el inventario de un proyecto.
 * Presenta información detallada del material incluyendo cantidades asignadas, disponibles
 * y usadas, junto con acciones para registrar uso o devoluciones.
 * 
 * @component
 * @example
 * const handleUseMaterial = (material) => {
 *   // Abrir modal para registrar uso del material
 *   setSelectedMaterial(material);
 *   setShowUseModal(true);
 * };
 * 
 * const handleReturnMaterial = (material) => {
 *   // Abrir modal para registrar devolución
 *   setSelectedMaterial(material);
 *   setShowReturnModal(true);
 * };
 * 
 * return (
 *   <MaterialItem
 *     item={materialData}
 *     onUse={() => handleUseMaterial(materialData)}
 *     onReturn={() => handleReturnMaterial(materialData)}
 *     canUse={userCanEditMaterials}
 *   />
 * );
 * 
 * @param {Object} props - Propiedades del componente
 * @param {Object} props.item - Datos del material del inventario
 * @param {string} props.item.nombre - Nombre del material
 * @param {string} [props.item.codigo] - Código/identificador del material
 * @param {string} [props.item.categoria] - Categoría del material
 * @param {string} [props.item.tipo_medida] - Unidad de medida del material
 * @param {number} [props.item.cantidad] - Cantidad total (fallback)
 * @param {number} [props.item.cantidadActual] - Cantidad actual disponible
 * @param {number} [props.item.cantidad_disponible] - Cantidad disponible (formato alternativo)
 * @param {number} [props.item.cantidadOriginal] - Cantidad original asignada
 * @param {number} [props.item.cantidad_original] - Cantidad original (formato alternativo)
 * @param {string} [props.item.updatedBy] - Usuario que actualizó por última vez
 * @param {Date|Object} [props.item.updatedAt] - Fecha de última actualización
 * @param {function} props.onUse - Callback al registrar uso del material
 * @param {function} props.onReturn - Callback al devolver material al inventario general
 * @param {boolean} [props.canUse=false] - Controla si mostrar botones de acción
 * 
 * @returns {React.ReactElement} Item visual de material con acciones
 * 
 * @see InventoryList Componente contenedor de lista de materiales
 * @see getCantidadDisponible Función helper para calcular disponibilidad
 * @see getCantidadOriginal Función helper para calcular cantidad original
 */
export default function MaterialItem({
  item,
  onUse,
  onReturn,
  canUse = false,
}) {
  // Calcular cantidades usando funciones helper
  const original = getCantidadOriginal(item);
  const disponible = getCantidadDisponible(item);
  const usado = original - disponible; // Material consumido

  return (
    <View style={styles.card}>
      {/* Sección de información del material */}
      <View style={{ flex: 1 }}>
        {/* Nombre principal del material */}
        <Text style={styles.name}>{item.nombre}</Text>
        
        {/* Código y categoría del material */}
        <Text style={styles.meta}>
          Código: {item.codigo || "—"} · {item.categoria || "Sin categoría"}
        </Text>
        
        {/* Unidad de medida del material */}
        <Text style={styles.meta}>
          Unidad: {item.tipo_medida || "Unidad"}
        </Text>

        {/* Badges con métricas de cantidad */}
        <View style={styles.row}>
          {/* Badge: Cantidad original asignada */}
          <View style={styles.badge}>
            <Text style={styles.badgeLabel}>Asignado</Text>
            <Text style={styles.badgeValue}>{original}</Text>
          </View>
          
          {/* Badge: Cantidad actual disponible */}
          <View style={styles.badge}>
            <Text style={styles.badgeLabel}>Disponible</Text>
            <Text style={styles.badgeValue}>{disponible}</Text>
          </View>
          
          {/* Badge: Cantidad usada (calculada) */}
          <View style={styles.badge}>
            <Text style={styles.badgeLabel}>Usado</Text>
            <Text style={styles.badgeValue}>{usado}</Text>
          </View>
        </View>

        {/* Información de última actualización (si existe) */}
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

      {/* Sección de acciones (condicional) */}
      {canUse && (
        <View style={styles.actions}>
          {/* Botón: Registrar uso del material (deshabilitado si no hay disponibilidad) */}
          <TouchableOpacity
            style={[
              styles.actionBtn,
              disponible <= 0 && { opacity: 0.4 },
            ]}
            disabled={disponible <= 0}
            onPress={onUse}
            accessibilityLabel={`Registrar uso de ${item.nombre}`}
            accessibilityHint={`Registra consumo de ${disponible} ${item.tipo_medida || 'unidades'} disponibles`}
          >
            <Text style={styles.actionText}>Registrar uso</Text>
          </TouchableOpacity>

          {/* Botón: Devolver material al inventario general */}
          <TouchableOpacity
            style={[
              styles.actionBtn,
              styles.secondaryBtn,
              disponible <= 0 && { opacity: 0.4 },
            ]}
            disabled={disponible <= 0}
            onPress={onReturn}
            accessibilityLabel={`Devolver ${item.nombre} al inventario general`}
            accessibilityHint={`Devuelve material no utilizado al inventario central`}
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
    backgroundColor: "#020617", // Azul muy oscuro
    borderWidth: 1,
    borderColor: "#1E293B", // Borde azul oscuro
    marginBottom: 10,
  },
  name: {
    color: "#F9FAFB", // Blanco
    fontSize: 15,
    fontWeight: "700",
  },
  meta: {
    color: "#9CA3AF", // Gris medio
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
    backgroundColor: "#0B1120", // Azul oscuro ligeramente más claro
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 6,
    marginRight: 4,
    borderWidth: 1,
    borderColor: "#1F2937", // Borde gris azulado oscuro
    alignItems: "center",
  },
  badgeLabel: {
    color: "#9CA3AF", // Gris medio
    fontSize: 11,
  },
  badgeValue: {
    color: "#F9FAFB", // Blanco
    fontSize: 14,
    fontWeight: "700",
  },
  stamp: {
    color: "#38BDF8", // Azul claro para información de auditoría
    fontSize: 11,
    marginTop: 4,
  },
  actions: {
    justifyContent: "space-between",
    marginLeft: 8,
  },
  actionBtn: {
    backgroundColor: "#22C55E", // Verde para acción primaria (usar)
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  secondaryBtn: {
    backgroundColor: "#0EA5E9", // Azul para acción secundaria (devolver)
  },
  actionText: {
    color: "#022C22", // Verde oscuro para texto sobre fondo verde claro
    fontSize: 11,
    fontWeight: "700",
  },
  secondaryText: {
    color: "#EFF6FF", // Azul muy claro para texto sobre fondo azul
    fontSize: 11,
    fontWeight: "700",
  },
});