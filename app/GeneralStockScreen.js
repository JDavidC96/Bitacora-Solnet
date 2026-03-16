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

// Contexto y hooks
import { useUser } from "../context/UserContext";
import { useCamioneta } from "../hooks/useCamioneta";
import { useGeneralInventory } from "../hooks/useGeneralInventory";
import { useProjects } from "../hooks/useProjects";
import { useReservas } from "../hooks/useReservas";

// Componentes
import AddEditItemModal from "../components/inventory/AddEditItemModal";
import AddItemButton from "../components/inventory/AddItemButton";
import InventoryItem from "../components/inventory/InventoryItem";
import MoveItemModal from "../components/inventory/MoveItemModal";
import ReserveItemModal from "../components/inventory/ReserveItemModal";
import SearchHeader from "../components/inventory/SearchHeader";
import TruckInventoryModal from "../components/inventory/TruckInventoryModal";
import TruckItemModal from "../components/inventory/TruckItemModal";

// Servicios
import { camionetaService } from "../services/camionetaService";
import { inventoryService } from "../services/inventoryService";
import { reservasService } from "../services/reservasService";

export default function GeneralStockScreen() {
  const router = useRouter();

  // ── Datos en tiempo real ──
  const { items: rawItems, loading } = useGeneralInventory();
  const items = rawItems || [];
  const { projects } = useProjects();
  const { role, user } = useUser();
  const { reservasPorItem, reservasDetalladasPorItem } = useReservas();
  const { camionetaPorItem, itemsCamioneta } = useCamioneta();

  // ── Permisos ──
  const isAdmin = role === "Administrador" || role === "Administrativo";
  const canEdit =
    role === "Administrador" ||
    role === "Administrativo" ||
    role === "Almacenista" ||
    role === "Supervisor" ||
    role === "Ingeniero";

  // ── Filtros ──
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategoria, setFilterCategoria] = useState("Todos");
  const [filterUnidad, setFilterUnidad] = useState("Todos");
  const [showLowStock, setShowLowStock] = useState(false);
  const [showWithoutCode, setShowWithoutCode] = useState(false);

  // ── Modales ──
  const [addEditVisible, setAddEditVisible] = useState(false);
  const [moveModalVisible, setMoveModalVisible] = useState(false);
  const [reserveModalVisible, setReserveModalVisible] = useState(false);
  const [truckModalVisible, setTruckModalVisible] = useState(false);
  const [truckInventoryVisible, setTruckInventoryVisible] = useState(false);

  const [selectedItem, setSelectedItem] = useState(null);
  const [reserveItem, setReserveItem] = useState(null);
  const [truckItem, setTruckItem] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  const [actionLoading, setActionLoading] = useState(false);

  // ── KPIs ──
  const totalItems = items.length;
  const totalValue = items.reduce(
    (sum, i) => sum + Number(i.precio || 0) * Number(i.cantidad || 0),
    0
  );
  const lowStockItems = items.filter(
    (i) => i.minimo && Number(i.cantidad) < Number(i.minimo)
  );

  // ── Handlers de apertura de modales ──
  const handleEditItem = (item) => { setEditingItem(item); setAddEditVisible(true); };
  const handleMoveItem = (item) => { setSelectedItem(item); setMoveModalVisible(true); };
  const handleReserveItem = (item) => { setReserveItem(item); setReserveModalVisible(true); };
  const handleTruckItem = (item) => { setTruckItem(item); setTruckModalVisible(true); };

  // ── Mover a proyecto ──
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
      Alert.alert("Error", error.message || "No se pudo mover el material.");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Crear reserva (descuenta stock inmediatamente) ──
  const handleReserveConfirm = async ({ cantidad, proyectoId, proyectoTitle }) => {
    if (!reserveItem) return;
    setActionLoading(true);
    try {
      await reservasService.crearReserva({
        itemId: reserveItem.id,
        itemNombre: reserveItem.nombre,
        itemCodigo: reserveItem.codigo,
        categoria: reserveItem.categoria,
        tipo_medida: reserveItem.tipo_medida,
        precio: reserveItem.precio,
        proyectoId,
        proyectoTitle,
        cantidad,
      });
      setReserveModalVisible(false);
      setReserveItem(null);
      Alert.alert(
        "Reserva creada",
        `${cantidad} ${reserveItem.tipo_medida || "Unidad"} reservados para "${proyectoTitle}".\nEl stock fue descontado del inventario.`
      );
    } catch (error) {
      Alert.alert("Error", error.message || "No se pudo crear la reserva.");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Transferir reserva al proyecto ──
  const handleTransferirReserva = async ({ reservaId, reserva }) => {
    setActionLoading(true);
    try {
      await reservasService.transferirAlProyecto({ reservaId, reserva });
      Alert.alert(
        "Transferido",
        `${reserva.cantidad} ${reserva.tipo_medida || "Unidad"} de "${reserva.itemNombre}" transferidos al proyecto "${reserva.proyectoTitle}".`
      );
    } catch (error) {
      Alert.alert("Error", error.message || "No se pudo transferir la reserva.");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Cancelar reserva (devuelve stock) ──
  const handleCancelarReserva = async ({ reservaId, reserva }) => {
    setActionLoading(true);
    try {
      await reservasService.cancelarReserva(reservaId, reserva);
      Alert.alert(
        "Reserva cancelada",
        `${reserva.cantidad} ${reserva.tipo_medida || "Unidad"} devueltos al inventario general.`
      );
    } catch (error) {
      Alert.alert("Error", error.message || "No se pudo cancelar la reserva.");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Cargar camioneta ──
  const handleTruckCargar = async ({ cantidad }) => {
    if (!truckItem) return;
    setActionLoading(true);
    try {
      await camionetaService.cargarCamioneta({
        itemId: truckItem.id,
        nombre: truckItem.nombre,
        codigo: truckItem.codigo,
        categoria: truckItem.categoria,
        tipo_medida: truckItem.tipo_medida,
        precio: truckItem.precio,
        cantidad,
      });
      setTruckModalVisible(false);
      setTruckItem(null);
      Alert.alert("Camioneta", `${cantidad} ${truckItem.tipo_medida || "Unidad"} cargados.`);
    } catch (error) {
      Alert.alert("Error", error.message || "No se pudo cargar la camioneta.");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Descargar camioneta → inventario general ──
  const handleTruckDescargarGeneral = async ({ cantidad }) => {
    if (!truckItem) return;
    setActionLoading(true);
    try {
      await camionetaService.descargarAlGeneral({ itemId: truckItem.id, cantidad });
      setTruckModalVisible(false);
      setTruckItem(null);
      Alert.alert("Camioneta", `${cantidad} ${truckItem.tipo_medida || "Unidad"} devueltos al inventario general.`);
    } catch (error) {
      Alert.alert("Error", error.message || "No se pudo descargar la camioneta.");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Descargar camioneta → proyecto ──
  const handleTruckDescargarProyecto = async ({ cantidad, proyectoId, proyectoTitle }) => {
    if (!truckItem) return;
    setActionLoading(true);
    try {
      await camionetaService.descargarAlProyecto({
        itemId: truckItem.id,
        cantidad,
        proyectoId,
        proyectoTitle,
      });
      setTruckModalVisible(false);
      setTruckItem(null);
      Alert.alert("Camioneta", `${cantidad} ${truckItem.tipo_medida || "Unidad"} enviados al proyecto "${proyectoTitle}".`);
    } catch (error) {
      Alert.alert("Error", error.message || "No se pudo descargar al proyecto.");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Descargar desde modal general de camioneta ──
  const handleTruckInvDescargarGeneral = async ({ itemId, cantidad }) => {
    setActionLoading(true);
    try {
      await camionetaService.descargarAlGeneral({ itemId, cantidad });
      Alert.alert("Camioneta", `${cantidad} unidades devueltas al inventario general.`);
    } catch (error) {
      Alert.alert("Error", error.message || "No se pudo descargar.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleTruckInvDescargarProyecto = async ({ itemId, cantidad, proyectoId, proyectoTitle }) => {
    setActionLoading(true);
    try {
      await camionetaService.descargarAlProyecto({ itemId, cantidad, proyectoId, proyectoTitle });
      Alert.alert("Camioneta", `${cantidad} unidades enviadas al proyecto "${proyectoTitle}".`);
    } catch (error) {
      Alert.alert("Error", error.message || "No se pudo descargar al proyecto.");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Eliminar ──
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
              Alert.alert("Error", "No se pudo eliminar el material.");
            }
          },
        },
      ]
    );
  };

  // ── Filtrado ──
  const filtered = items
    .filter((item) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        item.nombre?.toLowerCase().includes(q) ||
        item.codigo?.toLowerCase().includes(q) ||
        item.categoria?.toLowerCase().includes(q);
      if (!matchSearch) return false;
      if (filterCategoria !== "Todos" && item.categoria !== filterCategoria) return false;
      if (filterUnidad !== "Todos" && item.tipo_medida !== filterUnidad) return false;
      if (showLowStock && !(item.minimo && item.cantidad < item.minimo)) return false;
      if (showWithoutCode && item.codigo) return false;
      return true;
    })
    .sort((a, b) => {
      if (a.categoria !== b.categoria) return a.categoria.localeCompare(b.categoria);
      if (a.nombre !== b.nombre) return a.nombre.localeCompare(b.nombre);
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
          <Text style={styles.kpiNumber}>${totalValue.toLocaleString("es-CO")}</Text>
          <Text style={styles.kpiLabel}>Valor total</Text>
        </View>
        <View style={[styles.kpiCard, { borderColor: "#F87171" }]}>
          <Text style={[styles.kpiNumber, { color: "#F87171" }]}>{lowStockItems.length}</Text>
          <Text style={styles.kpiLabel}>Stock bajo</Text>
        </View>
      </View>

      {/* Botones de cabecera */}
      <View style={styles.headerBtns}>
        <TouchableOpacity
          style={styles.truckGlobalBtn}
          onPress={() => setTruckInventoryVisible(true)}
        >
          <Text style={styles.truckGlobalText}>
            🚐 Camioneta{Object.keys(camionetaPorItem).length > 0 ? ` (${Object.keys(camionetaPorItem).length})` : ''}
          </Text>
        </TouchableOpacity>
        {isAdmin && (
          <TouchableOpacity
            style={styles.dupBtn}
            onPress={() => router.push("/DuplicateDetectorScreen")}
          >
            <Text style={styles.dupText}>Detectar duplicados</Text>
          </TouchableOpacity>
        )}
      </View>

      <SearchHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder="Buscar por nombre, código o categoría..."
      />

      <View style={styles.filters}>
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => {
            const opts = ["Todos","Accesorios","Paneles","Inversores","Estructura","Tuberia","Cableado","Electrico","Comunicaciones"];
            setFilterCategoria(opts[(opts.indexOf(filterCategoria) + 1) % opts.length]);
          }}
        >
          <Text style={styles.filterText}>Categoría: {filterCategoria}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => {
            const opts = ["Todos", "Unidad", "Metro"];
            setFilterUnidad(opts[(opts.indexOf(filterUnidad) + 1) % opts.length]);
          }}
        >
          <Text style={styles.filterText}>Unidad: {filterUnidad}</Text>
        </TouchableOpacity>
      </View>

      {isAdmin && (
        <View style={styles.adminFilters}>
          <TouchableOpacity
            style={[styles.switchBtn, showLowStock && styles.switchActive]}
            onPress={() => setShowLowStock(!showLowStock)}
          >
            <Text style={styles.switchText}>Stock bajo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.switchBtn, showWithoutCode && styles.switchActive]}
            onPress={() => setShowWithoutCode(!showWithoutCode)}
          >
            <Text style={styles.switchText}>Sin código</Text>
          </TouchableOpacity>
        </View>
      )}

      {canEdit && <AddItemButton onPress={() => setAddEditVisible(true)} />}

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
              onMove={canEdit ? () => handleMoveItem(item) : undefined}
              onReserve={canEdit ? () => handleReserveItem(item) : undefined}
              onTruck={canEdit ? () => handleTruckItem(item) : undefined}
              cantidadReservada={reservasPorItem[item.id] || 0}
              cantidadCamioneta={camionetaPorItem[item.id] || 0}
            />
          )}
        />
      )}

      {/* ── Modales ── */}

      <AddEditItemModal
        visible={addEditVisible}
        onClose={() => { setAddEditVisible(false); setEditingItem(null); }}
        item={editingItem}
        onSaved={() => {}}
      />

      <MoveItemModal
        visible={moveModalVisible}
        selectedItem={selectedItem}
        projects={projects}
        onMove={handleMoveConfirm}
        onClose={() => { if (!actionLoading) { setMoveModalVisible(false); setSelectedItem(null); } }}
        loading={actionLoading}
      />

      <ReserveItemModal
        visible={reserveModalVisible}
        selectedItem={reserveItem}
        projects={projects}
        reservasActivas={reserveItem ? (reservasDetalladasPorItem[reserveItem.id] || []) : []}
        onReserve={handleReserveConfirm}
        onTransferir={handleTransferirReserva}
        onCancelar={handleCancelarReserva}
        onClose={() => { if (!actionLoading) { setReserveModalVisible(false); setReserveItem(null); } }}
        loading={actionLoading}
      />

      <TruckInventoryModal
        visible={truckInventoryVisible}
        itemsCamioneta={itemsCamioneta}
        projects={projects}
        onDescargarGeneral={handleTruckInvDescargarGeneral}
        onDescargarProyecto={handleTruckInvDescargarProyecto}
        onClose={() => setTruckInventoryVisible(false)}
        loading={actionLoading}
      />

      <TruckItemModal
        visible={truckModalVisible}
        selectedItem={truckItem}
        cantidadEnCamioneta={truckItem ? (camionetaPorItem[truckItem.id] || 0) : 0}
        projects={projects}
        onCargar={handleTruckCargar}
        onDescargarGeneral={handleTruckDescargarGeneral}
        onDescargarProyecto={handleTruckDescargarProyecto}
        onClose={() => { if (!actionLoading) { setTruckModalVisible(false); setTruckItem(null); } }}
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
  kpiNumber: { fontSize: 17, fontWeight: "700", color: "#FFF" },
  kpiLabel: { fontSize: 11, color: "#94A3B8" },
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
  filterText: { color: "#E2E8F0", fontSize: 13 },
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
  switchActive: { backgroundColor: "#0EA5E9", borderColor: "#0EA5E9" },
  switchText: { textAlign: "center", color: "#FFF", fontSize: 12 },
  dupBtn: {
    alignSelf: "flex-end",
    backgroundColor: "#0EA5E9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 6,
  },
  dupText: { color: "#F9FAFB", fontSize: 12, fontWeight: "600" },
  loadingContainer: { marginTop: 50, alignItems: "center" },
  headerBtns: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  truckGlobalBtn: {
    backgroundColor: "#78350F",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#EA580C",
  },
  truckGlobalText: {
    color: "#FDBA74",
    fontSize: 12,
    fontWeight: "700",
  },
});