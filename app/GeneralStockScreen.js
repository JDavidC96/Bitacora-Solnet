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

//Contexto de usuario y hooks de datos
import { useUser } from "../context/UserContext";
import { useGeneralInventory } from "../hooks/useGeneralInventory";
import { useProjects } from "../hooks/useProjects";

//Componentes de la pantalla
import AddEditItemModal from "../components/inventory/AddEditItemModal";
import AddItemButton from "../components/inventory/AddItemButton";
import InventoryItem from "../components/inventory/InventoryItem";
import MoveItemModal from "../components/inventory/MoveItemModal";
import SearchHeader from "../components/inventory/SearchHeader";

//Servicios
import { inventoryService } from "../services/inventoryService";

/**
 * Pantalla principal de gestión del inventario general de materiales.
 * 
 * Esta pantalla permite:
 * - Ver todos los materiales disponibles en el inventario general
 * - Agregar, editar y eliminar materiales
 * - Mover materiales del inventario general a proyectos específicos
 * - Buscar y filtrar materiales por nombre, código, categoría, unidad, etc.
 * - Visualizar KPIs del inventario (total items, valor total, stock bajo)
 * - Acceder al detector de duplicados (solo administradores)
 * 
 * Los permisos de acceso varían según el rol del usuario.
 * 
 * @component
 * @example
 * // Navegación desde otras pantallas:
 * // router.push('/GeneralStockScreen')
 * 
 * @returns {JSX.Element} Componente de la pantalla de inventario general
 */
export default function GeneralStockScreen() {
  const router = useRouter();

  // Hooks para obtener datos
  const { items: rawItems, loading } = useGeneralInventory(); // Inventario general
  const items = rawItems || []; // Asegura que items sea siempre un array
  
  const { projects } = useProjects(); // Lista de proyectos disponibles
  const { role, user } = useUser(); // Información del usuario actual

  // Permisos basados en el rol
  const isAdmin = role === "Administrador" || role === "Administrativo"; // Permisos administrativos completos
  const canEdit = role === "Administrador" || role === "Administrativo" || 
                  role === "Almacenista" || role === "Supervisor" || role === "Ingeniero"; // Permisos de edición

  // Estados para filtros
  const [searchQuery, setSearchQuery] = useState(""); // Texto de búsqueda
  const [filterCategoria, setFilterCategoria] = useState("Todos"); // Filtro por categoría
  const [filterUnidad, setFilterUnidad] = useState("Todos"); // Filtro por unidad de medida
  const [showLowStock, setShowLowStock] = useState(false); // Mostrar solo stock bajo
  const [showWithoutCode, setShowWithoutCode] = useState(false); // Mostrar solo items sin código

  // Estados para modales
  const [addEditVisible, setAddEditVisible] = useState(false); // Modal agregar/editar
  const [moveModalVisible, setMoveModalVisible] = useState(false); // Modal mover material
  const [selectedItem, setSelectedItem] = useState(null); // Ítem seleccionado para mover
  const [editingItem, setEditingItem] = useState(null); // Ítem seleccionado para editar

  const [actionLoading, setActionLoading] = useState(false); // Estado de carga para operaciones

  // --- Cálculo de KPIs (Métricas clave) ---

  /**
   * Total de ítems en el inventario
   */
  const totalItems = items.length;

  /**
   * Valor total del inventario (cantidad × precio)
   */
  const totalValue = items.reduce(
    (sum, i) => sum + Number(i.precio || 0) * Number(i.cantidad || 0),
    0
  );

  /**
   * Ítems con stock por debajo del mínimo establecido
   */
  const lowStockItems = items.filter(
    (i) => i.minimo && Number(i.cantidad) < Number(i.minimo)
  );

  // --- Handlers para operaciones ---

  /**
   * Abre el modal de edición para un ítem específico
   * @param {Object} item - Ítem a editar
   */
  const handleEditItem = (item) => {
    setEditingItem(item);
    setAddEditVisible(true);
  };

  /**
   * Abre el modal para mover un ítem a un proyecto
   * @param {Object} item - Ítem a mover
   */
  const handleMoveItem = (item) => {
    setSelectedItem(item);
    setMoveModalVisible(true);
  };

  /**
   * Confirma y ejecuta el movimiento de material del inventario general a un proyecto
   * @param {Object} moveData - Datos del movimiento
   * @param {number} moveData.cantidad - Cantidad a mover
   * @param {string} moveData.proyectoDestino - ID del proyecto destino
   */
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
        proyectoDestinoTitle: projects.find((p) => p.id === moveData.proyectoDestino)?.title,
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

  /**
   * Elimina un ítem del inventario general (con confirmación)
   * @param {Object} item - Ítem a eliminar
   */
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

  // --- Filtrado de la lista de ítems ---

  /**
   * Aplica todos los filtros activos a la lista de ítems
   * Ordena por categoría → nombre → código
   */
  const filtered = items
    .filter((item) => {
      const q = searchQuery.toLowerCase();
      
      // Filtro de búsqueda por nombre, código o categoría
      const matchSearch =
        item.nombre?.toLowerCase().includes(q) ||
        item.codigo?.toLowerCase().includes(q) ||
        item.categoria?.toLowerCase().includes(q);

      if (!matchSearch) return false;

      // Filtro por categoría
      if (filterCategoria !== "Todos" && item.categoria !== filterCategoria)
        return false;

      // Filtro por unidad de medida
      if (filterUnidad !== "Todos" && item.tipo_medida !== filterUnidad)
        return false;

      // Filtro de stock bajo
      if (showLowStock && !(item.minimo && item.cantidad < item.minimo))
        return false;

      // Filtro de items sin código
      if (showWithoutCode && item.codigo) return false;

      return true;
    })
    .sort((a, b) => {
      // Ordenar por: categoría → nombre → código
      if (a.categoria !== b.categoria)
        return a.categoria.localeCompare(b.categoria);
      if (a.nombre !== b.nombre)
        return a.nombre.localeCompare(b.nombre);
      return (a.codigo || "").localeCompare(b.codigo || "");
    });

  return (
    <View style={styles.container}>
      {/* --- Sección de KPIs (Métricas clave) --- */}
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

      {/* --- Botón para detectar duplicados (solo administradores) --- */}
      {isAdmin && (
        <TouchableOpacity
          style={styles.dupBtn}
          onPress={() => router.push("/DuplicateDetectorScreen")}
        >
          <Text style={styles.dupText}>Detectar duplicados</Text>
        </TouchableOpacity>
      )}

      {/* --- Barra de búsqueda --- */}
      <SearchHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder="Buscar por nombre, código o categoría..."
      />

      {/* --- Filtros principales --- */}
      <View style={styles.filters}>
        {/* Filtro por categoría (con rotación cíclica) */}
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

        {/* Filtro por unidad de medida (con rotación cíclica) */}
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

      {/* --- Filtros avanzados (solo administradores) --- */}
      {isAdmin && (
        <View style={styles.adminFilters}>
          {/* Filtro para mostrar solo stock bajo */}
          <TouchableOpacity
            style={[
              styles.switchBtn,
              showLowStock && styles.switchActive,
            ]}
            onPress={() => setShowLowStock(!showLowStock)}
          >
            <Text style={styles.switchText}>Stock bajo</Text>
          </TouchableOpacity>

          {/* Filtro para mostrar solo ítems sin código */}
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

      {/* --- Botón para agregar nuevo ítem --- */}
      {canEdit && <AddItemButton onPress={() => setAddEditVisible(true)} />}

      {/* --- Lista de ítems (o indicador de carga) --- */}
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

      {/* --- Modales --- */}

      {/* Modal para agregar/editar ítems */}
      <AddEditItemModal
        visible={addEditVisible}
        onClose={() => {
          setAddEditVisible(false);
          setEditingItem(null);
        }}
        item={editingItem}
        onSaved={() => {}}
      />

      {/* Modal para mover ítems a proyectos */}
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

// Estilos de la pantalla (tema oscuro)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A", // Azul oscuro
    padding: 12,
    paddingTop: 30, // Espacio para status bar
  },
  kpiRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  kpiCard: {
    backgroundColor: "rgba(255,255,255,0.06)", // Fondo semitransparente
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
    color: "#94A3B8", // Gris azulado
  },
  filters: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 8,
  },
  filterBtn: {
    backgroundColor: "#1E293B", // Fondo azul más oscuro
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  filterText: {
    color: "#E2E8F0", // Gris muy claro
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
    backgroundColor: "#0EA5E9", // Azul brillante cuando activo
    borderColor: "#0EA5E9",
  },
  switchText: {
    textAlign: "center",
    color: "#FFF",
    fontSize: 12,
  },
  dupBtn: {
    alignSelf: "flex-end",
    backgroundColor: "#0EA5E9", // Azul brillante
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 6,
  },
  dupText: {
    color: "#F9FAFB", // Blanco puro
    fontSize: 12,
    fontWeight: "600",
  },
  loadingContainer: {
    marginTop: 50,
    alignItems: "center",
  },
});
