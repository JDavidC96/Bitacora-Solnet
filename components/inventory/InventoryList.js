// components/inventory/InventoryList.js
import { FlatList, StyleSheet, Text, View } from 'react-native';
import InventoryItem from './InventoryItem';

export default function InventoryList({
  items = [],
  loading = false,
  onEditItem,
  onDeleteItem,
  onMoveItem,
  canEdit = false,
  emptyMessage = "No hay ítems"
}) {
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando inventario...</Text>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <InventoryItem
          item={item}
          onEdit={() => onEditItem(item)}
          onDelete={() => onDeleteItem(item.id, item)} // Pasar item completo
          onMove={() => onMoveItem(item)}
          canEdit={canEdit}
        />
      )}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    color: '#FFF',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    color: '#FFF',
    fontSize: 16,
    textAlign: 'center',
  },
});