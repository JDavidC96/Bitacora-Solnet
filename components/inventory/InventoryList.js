// components/inventory/InventoryList.js

import { FlatList, StyleSheet, Text, View } from 'react-native';
import InventoryItem from './InventoryItem';

/**
 * Componente contenedor que renderiza una lista de items del inventario usando FlatList.
 * Maneja estados de carga, listas vacías y propaga propiedades a cada InventoryItem.
 * Optimizado para rendimiento con virtualización de lista y extracción de claves.
 * 
 * @component
 * @example
 * const handleEditItem = (item) => {
 *   // Abrir modal de edición para el item específico
 *   setSelectedItem(item);
 *   setShowEditModal(true);
 * };
 * 
 * const handleDeleteItem = async (itemId, itemData) => {
 *   // Confirmar y procesar eliminación
 *   const confirmed = await confirmDelete(itemData.nombre);
 *   if (confirmed) {
 *     await deleteInventoryItem(itemId);
 *   }
 * };
 * 
 * return (
 *   <InventoryList
 *     items={inventoryItems}
 *     loading={isLoading}
 *     onEditItem={handleEditItem}
 *     onDeleteItem={handleDeleteItem}
 *     onMoveItem={handleMoveItem}
 *     canEdit={userCanEdit}
 *     emptyMessage="No se encontraron items en el inventario"
 *   />
 * );
 * 
 * @param {Object} props - Propiedades del componente
 * @param {Array<Object>} [props.items=[]] - Lista de items del inventario a mostrar
 * @param {string|number} props.items[].id - Identificador único del item
 * @param {string} props.items[].nombre - Nombre del item
 * @param {string} [props.items[].codigo] - Código/identificador del item
 * @param {string} [props.items[].categoria] - Categoría del item
 * @param {number} [props.items[].cantidad] - Cantidad disponible
 * @param {string} [props.items[].tipo_medida] - Unidad de medida
 * @param {number} [props.items[].precio] - Precio unitario
 * @param {string} [props.items[].notas] - Notas adicionales
 * @param {boolean} [props.loading=false] - Indica si está cargando los datos
 * @param {function} props.onEditItem - Callback al solicitar edición de un item
 * @param {function} props.onDeleteItem - Callback al solicitar eliminación de un item
 * @param {function} props.onMoveItem - Callback al solicitar movimiento de un item
 * @param {boolean} [props.canEdit=false] - Controla si mostrar botones de edición en items
 * @param {string} [props.emptyMessage="No hay ítems"] - Mensaje personalizado para lista vacía
 * 
 * @returns {React.ReactElement} Lista de items de inventario con manejo de estados
 * 
 * @see InventoryItem Componente de item individual de inventario
 * @see FlatList Componente de lista virtualizada de React Native
 * @see AddMaterialButton Botón para agregar nuevos items
 * @see MoveItemModal Modal para mover items entre ubicaciones
 */
export default function InventoryList({
  items = [],
  loading = false,
  onEditItem,
  onDeleteItem,
  onMoveItem,
  canEdit = false,
  emptyMessage = "No hay ítems"
}) {
  // Estado: Cargando datos
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando inventario...</Text>
      </View>
    );
  }

  // Estado: Lista vacía
  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  // Estado: Lista con datos
  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <InventoryItem
          item={item}
          onEdit={() => onEditItem(item)}
          onDelete={() => onDeleteItem(item.id, item)} // Pasar ambos: ID y datos completos
          onMove={() => onMoveItem(item)}
          canEdit={canEdit}
        />
      )}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      /**
       * Propiedades de performance recomendadas para listas grandes:
       * - initialNumToRender: 10 (items iniciales a renderizar)
       * - maxToRenderPerBatch: 10 (máximo por lote de renderizado)
       * - windowSize: 21 (ventana de renderizado en viewports)
       * - removeClippedSubviews: true (Android, mejora rendimiento)
       * - getItemLayout: (data, index) => ({length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index})
       */
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: 20, // Espacio inferior para mejor scroll
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
  loadingText: {
    color: "#FFF", // Texto blanco para temas oscuros
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
  emptyText: {
    color: "#FFF", // Texto blanco para temas oscuros
    fontSize: 16,
    textAlign: "center",
  },
});