// app/GeneralStockScreen.js
import { LinearGradient } from "expo-linear-gradient";
import { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';

// Hooks personalizados - desde la raíz
import { useUser } from "../context/UserContext";
import { useGeneralInventory } from "../hooks/useGeneralInventory";
import { useProjects } from "../hooks/useProjects";

// Componentes - desde components/inventory/
import AddEditItemModal from "../components/inventory/AddEditItemModal";
import AddItemButton from "../components/inventory/AddItemButton";
import InventoryList from "../components/inventory/InventoryList";
import MoveItemModal from "../components/inventory/MoveItemModal";
import SearchHeader from "../components/inventory/SearchHeader";

// Servicios - desde la raíz
import { inventoryService } from "../services/inventoryService";

export default function GeneralStockScreen() {
  const { role, user } = useUser(); // Añadir user aquí
  
  // Estados
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [moveModalVisible, setMoveModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(false);

  // Hooks personalizados
  const { items, loading: inventoryLoading } = useGeneralInventory();
  const { projects } = useProjects();

  // Permisos
  const canEdit = ["Administrador", "Almacenista", "Supervisor", "Ingeniero"].includes(role);

  // Handlers
  const handleSaveItem = async (itemData) => {
    setLoading(true);
    try {
      if (editingItem) {
        await inventoryService.updateGeneralItem(editingItem.id, itemData);
        Alert.alert('Éxito', 'Ítem actualizado correctamente');
      } else {
        // ✅ Usar la versión con historial para nuevos items
        await inventoryService.addGeneralItemWithHistory(itemData, user?.email);
        Alert.alert('Éxito', 'Ítem agregado correctamente');
      }
      
      setModalVisible(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Error guardando ítem:', error);
      Alert.alert('Error', error.message || 'No se pudo guardar el ítem');
    } finally {
      setLoading(false);
    }
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setModalVisible(true);
  };

  const handleDeleteItem = async (itemId, item) => { // ✅ Recibir el item completo
    Alert.alert(
      'Eliminar ítem',
      '¿Estás seguro de que quieres eliminar este ítem?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              // ✅ Usar la versión con historial
              await inventoryService.deleteGeneralItemWithHistory(
                itemId, 
                item, 
                user?.email,
                'Eliminación manual'
              );
              Alert.alert('Éxito', 'Ítem eliminado correctamente');
            } catch (error) {
              console.error('Error eliminando ítem:', error);
              Alert.alert('Error', 'No se pudo eliminar el ítem');
            }
          },
        },
      ]
    );
  };

  const handleMoveItem = (item) => {
    setSelectedItem(item);
    setMoveModalVisible(true);
  };

  const handleMoveConfirm = async (moveData) => {
    setLoading(true);
    try {
      // Cambiar a moveToProjectWithHistory
      await inventoryService.moveToProjectWithHistory({
        itemId: selectedItem.id,
        item: selectedItem,
        cantidad: moveData.cantidad,
        proyectoDestino: moveData.proyectoDestino,
        usuario: user?.email,
        proyectoDestinoTitle: projects.find(p => p.id === moveData.proyectoDestino)?.title
      });
      
      setMoveModalVisible(false);
      setSelectedItem(null);
      Alert.alert('Éxito', 'Movimiento realizado correctamente');
    } catch (error) {
      console.error('Error moviendo ítem:', error);
      Alert.alert('Error', error.message || 'No se pudo mover el ítem');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModals = () => {
    setModalVisible(false);
    setMoveModalVisible(false);
    setEditingItem(null);
    setSelectedItem(null);
  };

  // Filtrar Y ORDENAR items alfabéticamente
  const filteredItems = items
    .filter(item =>
      item.nombre?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    // ORDENAR ALFABÉTICAMENTE ASCENDENTE (A-Z)
    .sort((a, b) => a.nombre?.localeCompare(b.nombre));

  return (
    <LinearGradient colors={["#6a11cb", "#2575fc"]} style={styles.container}>
      <Text style={styles.title}>Inventario General ({role})</Text>

      <SearchHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder="Buscar producto..."
      />

      {canEdit && (
        <AddItemButton onPress={() => setModalVisible(true)} />
      )}

      <InventoryList
        items={filteredItems}
        loading={inventoryLoading}
        onEditItem={handleEditItem}
        onDeleteItem={handleDeleteItem} // ✅ Pasar el item completo
        onMoveItem={handleMoveItem}
        canEdit={canEdit}
        emptyMessage="No hay ítems en el inventario general"
      />

      {/* Modal Agregar/Editar Ítem */}
      <AddEditItemModal
        visible={modalVisible}
        editingItem={editingItem}
        onSave={handleSaveItem}
        onClose={handleCloseModals}
        loading={loading}
      />

      {/* Modal Mover Ítem */}
      <MoveItemModal
        visible={moveModalVisible}
        selectedItem={selectedItem}
        projects={projects}
        onMove={handleMoveConfirm}
        onClose={handleCloseModals}
        loading={loading}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 22,
    color: '#FFF',
    marginBottom: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});