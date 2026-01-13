// components/inventory/DuplicateGroupCard.js

import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";

/**
 * Componente de tarjeta para mostrar un grupo de ítems duplicados en el inventario.
 * Agrupa ítems con nombres similares y permite visualizarlos, editarlos individualmente
 * o fusionar todo el grupo en un solo registro.
 * 
 * @component
 * @example
 * const handleEditItem = (item) => {
 *   // Abrir modal de edición para el ítem específico
 *   setSelectedItem(item);
 *   setShowEditModal(true);
 * };
 * 
 * const handleMergeGroup = (group) => {
 *   // Ejecutar lógica de fusión del grupo
 *   mergeDuplicateItems(group.items);
 * };
 * 
 * return (
 *   <DuplicateGroupCard
 *     group={duplicateGroup}
 *     onEditItem={handleEditItem}
 *     onMergeGroup={handleMergeGroup}
 *   />
 * );
 * 
 * @param {Object} props - Propiedades del componente
 * @param {Object} props.group - Grupo de ítems duplicados
 * @param {string} props.group.categoria - Categoría del grupo de ítems
 * @param {string} props.group.normalizedName - Nombre normalizado que identifica el grupo
 * @param {Array<Object>} props.group.items - Lista de ítems duplicados en el grupo
 * @param {string} props.group.items[].id - ID único del ítem
 * @param {string} props.group.items[].nombre - Nombre del ítem
 * @param {string} [props.group.items[].codigo] - Código/identificador del ítem
 * @param {string} [props.group.items[].tipo_medida] - Unidad de medida del ítem
 * @param {number} [props.group.items[].cantidad] - Cantidad en stock del ítem
 * @param {function} [props.onEditItem] - Callback al hacer tap en un ítem individual para editarlo
 * @param {function} [props.onMergeGroup] - Callback al presionar el botón de fusionar grupo
 * 
 * @returns {React.ReactElement} Tarjeta visual de grupo de duplicados
 */
export default function DuplicateGroupCard({ group, onEditItem, onMergeGroup }) {
  // Desestructurar propiedades del grupo
  const { categoria, normalizedName, items } = group;

  return (
    <View style={styles.container}>
      {/* Encabezado: Categoría, nombre y contador */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>
          {categoria} · {normalizedName}
        </Text>
        <Text style={styles.count}>{items.length} ítems</Text>
      </View>

      {/* Lista de ítems duplicados (sin scroll interno) */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        scrollEnabled={false} // Desactiva scroll interno ya que está dentro de otro scroll
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.itemRow}
            onPress={() => onEditItem && onEditItem(item)}
            disabled={!onEditItem} // Deshabilita si no hay callback
          >
            <View style={{ flex: 1 }}>
              {/* Nombre principal del ítem */}
              <Text style={styles.name}>{item.nombre}</Text>
              {/* Metadatos: código y unidad de medida */}
              <Text style={styles.meta}>
                Código: {item.codigo || "—"} · Unidad: {item.tipo_medida || "—"}
              </Text>
            </View>
            {/* Columna derecha: cantidad en stock */}
            <View style={styles.rightBox}>
              <Text style={styles.qty}>{item.cantidad ?? 0}</Text>
              <Text style={styles.qtyLabel}>Stock</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Botón para fusionar todo el grupo (condicional) */}
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
    backgroundColor: "#020617", // Azul oscuro casi negro
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1E293B", // Borde azul oscuro
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  title: {
    color: "#F9FAFB", // Blanco
    fontWeight: "700",
    fontSize: 14,
  },
  count: {
    color: "#E5E7EB", // Gris claro
    fontSize: 12,
  },
  itemRow: {
    flexDirection: "row",
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: "#111827", // Separador oscuro
  },
  name: {
    color: "#E5E7EB", // Gris claro
    fontSize: 13,
    fontWeight: "600",
  },
  meta: {
    color: "#9CA3AF", // Gris medio
    fontSize: 11,
    marginTop: 2,
  },
  rightBox: {
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8, // Separación de la información principal
  },
  qty: {
    color: "#FBBF24", // Amarillo para destacar cantidad
    fontWeight: "700",
  },
  qtyLabel: {
    color: "#9CA3AF", // Gris medio
    fontSize: 10,
  },
  mergeBtn: {
    marginTop: 8,
    alignSelf: "flex-end", // Alineado a la derecha
    backgroundColor: "#0EA5E9", // Azul cielo
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  mergeText: {
    color: "#F9FAFB", // Blanco
    fontSize: 12,
    fontWeight: "600",
  },
});