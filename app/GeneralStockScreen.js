// app/GeneralStockScreen.js

import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useRouter } from "expo-router";

import { useUser } from "../context/UserContext";
import { useGeneralInventory } from "../hooks/useGeneralInventory";
import { useProjects } from "../hooks/useProjects";

import AddEditItemModal from "../components/inventory/AddEditItemModal";
import AddItemButton from "../components/inventory/AddItemButton";
import InventoryItem from "../components/inventory/InventoryItem";
import MoveItemModal from "../components/inventory/MoveItemModal";
import SearchHeader from "../components/inventory/SearchHeader";

import { inventoryService } from "../services/inventoryService";

export default function GeneralStockScreen() {
  const router = useRouter();

  // quitamos refresh, y aseguramos que items sea siempre un array
  const { items: rawItems, loading } = useGeneralInventory();
  const items = rawItems || [];

  const { projects } = useProjects();
  const { role, user } = useUser();

  const isAdmin =
    role === "Administrador" || role === "Administrativo";
  const canEdit =
    role === "Administrador" ||
    role === "Administrativo" ||
    role === "Almacenista" ||
    role === "Supervisor" ||
    role === "Ingeniero";

  // Filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategoria, setFilterCategoria] = useState("Todos");
  const [filterUnidad, setFilterUnidad] = useState("Todos");
  const [showLowStock, setShowLowStock] = useState(false);
  const [showWithoutCode, setShowWithoutCode] = useState(false);

  // Modales
  const [addEditVisible, setAddEditVisible] = useState(false);
  const [moveModalVisible, setMoveModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  const [actionLoading, setActionLoading] = useState(false);

  // KPIs
  const totalItems = items.length;
  const totalValue = items.reduce(
    (sum, i) => sum + Number(i.precio || 0) * Number(i.cantidad || 0),
    0
  );
  const lowStockItems = items.filter(
    (i) => i.minimo && Number(i.cantidad) < Number(i.minimo)
  );

  // Abrir modal editar
  const handleEditItem = (item) => {
    setEditingItem(item);
    setAddEditVisible(true);
  };

  // Abrir modal mover
  const handleMoveItem = (item) => {
    setSelectedItem(item);
    setMoveModalVisible(true);
  };

  // Confirmar movimiento (inventario general → proyecto)
  const handleMoveConfirm = async (moveData) => {
    if (!selectedItem) return;

    setActionLoading(true);

    try {
      await inventoryService.moveToProjectWithHistory({
        itemId: selectedItem.id,
        item: selectedItem,
        cantidad: moveData.cantidad,
        proyectoDestino: moveData.proyectoDestino,
        usuario: user?.email,
        proyectoDestinoTitle:
          projects.find((p) => p.id === moveData.proyectoDestino)?.title,
      });

      setMoveModalVisible(false);
      setSelectedItem(null);
      Alert.alert("Éxito", "Material movido correctamente");
    } catch (error) {
      console.error("Error moviendo material:", error);
      Alert.alert("Error", error.message || "No se pudo mover el material.");
    } finally {
      setActionLoading(false);
    }
  };

  // Eliminar material del inventario general
  const handleDeleteItem = (item) => {
    Alert.alert(
      "Eliminar material",
      `¿Eliminar "${item.nombre}" del inventario general?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await inventoryService.deleteGeneralItem(item.id);
            } catch (error) {
              console.error("Error eliminando item:", error);
              Alert.alert("Error", "No se pudo eliminar el material.");
            }
          },
        },
      ]
    );
  };

  // LISTA FILTRADA
  const filtered = items
    .filter((item) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        item.nombre?.toLowerCase().includes(q) ||
        item.codigo?.toLowerCase().includes(q) ||
        item.categoria?.toLowerCase().includes(q);

      if (!matchSearch) return false;

      if (filterCategoria !== "Todos" && item.categoria !== filterCategoria)
        return false;

      if (filterUnidad !== "Todos" && item.tipo_medida !== filterUnidad)
        return false;

      if (showLowStock && !(item.minimo && item.cantidad < item.minimo))
        return false;

      if (showWithoutCode && item.codigo) return false;

      return true;
    })
    .sort((a, b) => {
      if (a.categoria !== b.categoria)
        return a.categoria.localeCompare(b.categoria);
      if (a.nombre !== b.nombre)
        return a.nombre.localeCompare(b.nombre);
      return (a.codigo || "").localeCompare(b.codigo || "");
    });

  return (
    <View style={styles.container}>
      {/* KPIs */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiNumber}>{totalItems}</Text>
          <Text style={styles.kpiLabel}>Items</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiNumber}>
            ${totalValue.toLocaleString("es-CO")}
          </Text>
          <Text style={styles.kpiLabel}>Valor total</Text>
        </View>

        <View style={[styles.kpiCard, { borderColor: "#F87171" }]}>
          <Text style={[styles.kpiNumber, { color: "#F87171" }]}>
            {lowStockItems.length}
          </Text>
          <Text style={styles.kpiLabel}>Stock bajo</Text>
        </View>
      </View>

      {/* Botón duplicados */}
      {isAdmin && (
        <TouchableOpacity
          style={styles.dupBtn}
          onPress={() => router.push("/DuplicateDetectorScreen")}
        >
          <Text style={styles.dupText}>Detectar duplicados</Text>
        </TouchableOpacity>
      )}

      {/* BUSCADOR */}
      <SearchHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder="Buscar por nombre, código o categoría..."
      />

      {/* FILTROS */}
      <View style={styles.filters}>
        {/* Categoría */}
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => {
            const opts = [
              "Todos",
              "Accesorios",
              "Paneles",
              "Inversores",
              "Estructura",
              "Tuberia",
              "Cableado",
              "Electrico",
              "Comunicaciones",
            ];
            const i = opts.indexOf(filterCategoria);
            setFilterCategoria(opts[(i + 1) % opts.length]);
          }}
        >
          <Text style={styles.filterText}>Categoría: {filterCategoria}</Text>
        </TouchableOpacity>

        {/* Unidad */}
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => {
            const opts = ["Todos", "Unidad", "Metro"];
            const i = opts.indexOf(filterUnidad);
            setFilterUnidad(opts[(i + 1) % opts.length]);
          }}
        >
          <Text style={styles.filterText}>Unidad: {filterUnidad}</Text>
        </TouchableOpacity>
      </View>

      {/* FILTROS ADMIN */}
      {isAdmin && (
        <View style={styles.adminFilters}>
          <TouchableOpacity
            style={[
              styles.switchBtn,
              showLowStock && styles.switchActive,
            ]}
            onPress={() => setShowLowStock(!showLowStock)}
          >
            <Text style={styles.switchText}>Stock bajo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.switchBtn,
              showWithoutCode && styles.switchActive,
            ]}
            onPress={() => setShowWithoutCode(!showWithoutCode)}
          >
            <Text style={styles.switchText}>Sin código</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* AGREGAR */}
      {canEdit && <AddItemButton onPress={() => setAddEditVisible(true)} />}

      {/* LISTA DE ITEMS */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#FFF" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <InventoryItem
              item={item}
              canEdit={canEdit}
              onEdit={() => handleEditItem(item)}
              onDelete={() => handleDeleteItem(item)}
              onMove={() => handleMoveItem(item)}
            />
          )}
        />
      )}

      {/* MODALES */}
      <AddEditItemModal
        visible={addEditVisible}
        onClose={() => {
          setAddEditVisible(false);
          setEditingItem(null);
        }}
        item={editingItem}
        onSaved={() => {}}
      />

      <MoveItemModal
        visible={moveModalVisible}
        selectedItem={selectedItem}
        projects={projects}
        onMove={handleMoveConfirm}
        onClose={() => {
          if (!actionLoading) {
            setMoveModalVisible(false);
            setSelectedItem(null);
          }
        }}
        loading={actionLoading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    padding: 12,
    paddingTop: 30,
  },
  kpiRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  kpiCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 10,
    padding: 12,
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
  },
  kpiNumber: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFF",
  },
  kpiLabel: {
    fontSize: 11,
    color: "#94A3B8",
  },
  filters: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 8,
  },
  filterBtn: {
    backgroundColor: "#1E293B",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  filterText: {
    color: "#E2E8F0",
    fontSize: 13,
  },
  adminFilters: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  switchBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#1E293B",
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "#334155",
  },
  switchActive: {
    backgroundColor: "#0EA5E9",
    borderColor: "#0EA5E9",
  },
  switchText: {
    textAlign: "center",
    color: "#FFF",
    fontSize: 12,
  },
  dupBtn: {
    alignSelf: "flex-end",
    backgroundColor: "#0EA5E9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 6,
  },
  dupText: {
    color: "#F9FAFB",
    fontSize: 12,
    fontWeight: "600",
  },
  loadingContainer: {
    marginTop: 50,
    alignItems: "center",
  },
});
