// app/EquipmentStockScreen.js
import { LinearGradient } from "expo-linear-gradient";
import { collection, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useUser } from "../context/UserContext";
import { db } from "../firebase/firebaseConfig";

// Componentes modulares
import AddEquipmentModal from "../components/inventory/equipment/AddEquipmentModal";
import AssignEquipmentModal from "../components/inventory/equipment/AssignEquipmentModal";
import EditEquipmentModal from "../components/inventory/equipment/EditEquipmentModal";
import EquipmentHeader from "../components/inventory/equipment/EquipmentHeader";
import EquipmentList from "../components/inventory/equipment/EquipmentList";
import LoanEquipmentModal from "../components/inventory/equipment/LoanEquipmentModal";
import TransferEquipmentModal from "../components/inventory/equipment/TransferEquipmentModal";

// Servicios
import { equipmentService } from "../services/equipmentService";

/**
 * Pantalla principal de gestión de inventario de herramientas/equipos.
 *
 * - KPIs (como GeneralStockScreen): total items, total unidades, valor total, asignadas, prestadas
 * - Long-press para editar: SOLO Administrador e Ingeniero
 */
export default function EquipmentStockScreen() {
  // Contexto de usuario
  const { role, user } = useUser();

  // Estados para datos
  const [equipment, setEquipment] = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [loading, setLoading] = useState(false);

  // Estados para controlar visibilidad de modales
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [loanModalVisible, setLoanModalVisible] = useState(false);
  const [transferModalVisible, setTransferModalVisible] = useState(false);

  // Modal editar (long-press)
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Permisos
  const isAdmin = role === "Administrador"; // Solo administrador elimina
  const canEdit = ["Administrador", "Almacenista", "Supervisor", "Tecnico", "Ingeniero"].includes(role); // Puede agregar
  const canManage = ["Administrador", "Ingeniero", "Supervisor"].includes(role); // Puede asignar/transferir
  const canLongPressEdit = ["Administrador", "Ingeniero"].includes(role); // SOLO estos editan con long-press

  /**
   * Suscripciones en tiempo real a Firestore:
   * - herramientas
   * - personal
   */
  useEffect(() => {
    const unsubEquipment = onSnapshot(collection(db, "herramientas"), (snapshot) => {
      const unique = Array.from(
        new Map(snapshot.docs.map((d) => [d.id, { id: d.id, ...d.data() }])).values()
      );
      setEquipment(unique);
    });

    const unsubPersonnel = onSnapshot(collection(db, "personal"), (snapshot) => {
      const unique = Array.from(
        new Map(snapshot.docs.map((d) => [d.id, { id: d.id, ...d.data() }])).values()
      );
      setPersonnel(unique);
    });

    return () => {
      unsubEquipment();
      unsubPersonnel();
    };
  }, []);

  // ---------------------------
  // KPIs (como GeneralStockScreen)
  // ---------------------------

  const totalItems = equipment.length;

  // Si cada documento es 1 herramienta, esto te da igual que totalItems.
  // Si manejas "cantidad", aquí te suma todo (si no existe, asume 1).
  const totalUnits = equipment.reduce((sum, e) => sum + Number(e.cantidad ?? 1), 0);

  // Valor total (precio opcional)
  const totalValue = equipment.reduce((sum, e) => {
    const precio = Number(e.precio || 0);
    const cantidad = Number(e.cantidad ?? 1);
    return sum + precio * cantidad;
  }, 0);

  const assignedCount = equipment.filter((e) => !!e.asignadaA).length;
  const loanedCount = equipment.filter((e) => !!e.prestadaA).length;

  // ---------------------------
  // Handlers
  // ---------------------------

  const handleAddEquipment = async (equipmentData) => {
    setLoading(true);
    try {
      await equipmentService.addEquipment(equipmentData, user);
      setAddModalVisible(false);
      Alert.alert("Éxito", "Herramienta agregada correctamente");
    } catch (error) {
      console.error("Error agregando herramienta:", error);
      Alert.alert("Error", error.message || "No se pudo agregar la herramienta");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignEquipment = async (equipmentItem, person) => {
    setLoading(true);
    try {
      await equipmentService.assignEquipment(equipmentItem.id, person, user);
      setAssignModalVisible(false);
      Alert.alert("Éxito", "Herramienta asignada correctamente");
    } catch (error) {
      console.error("Error asignando herramienta:", error);
      Alert.alert("Error", error.message || "No se pudo asignar la herramienta");
    } finally {
      setLoading(false);
    }
  };

  const handleLoanEquipment = async (equipmentItem, person) => {
    setLoading(true);
    try {
      await equipmentService.loanEquipment(equipmentItem.id, person, user);
      setLoanModalVisible(false);
      Alert.alert("Éxito", "Préstamo registrado correctamente");
    } catch (error) {
      console.error("Error prestando herramienta:", error);
      Alert.alert("Error", error.message || "No se pudo registrar el préstamo");
    } finally {
      setLoading(false);
    }
  };

  const handleTransferEquipment = async (newOwner) => {
    setLoading(true);
    try {
      await equipmentService.transferEquipment(selectedEquipment.id, newOwner, user);
      setTransferModalVisible(false);
      setSelectedEquipment(null);
      Alert.alert("Éxito", "Herramienta transferida correctamente");
    } catch (error) {
      console.error("Error transfiriendo herramienta:", error);
      Alert.alert("Error", error.message || "No se pudo transferir la herramienta");
    } finally {
      setLoading(false);
    }
  };

  const handleReturnEquipment = async (item) => {
    if (!item?.prestadaA) return;

    try {
      await equipmentService.returnEquipment(item.id, user);
      Alert.alert("Éxito", "Devolución registrada correctamente");
    } catch (error) {
      console.error("Error devolviendo herramienta:", error);
      Alert.alert("Error", error.message || "No se pudo registrar la devolución");
    }
  };

  const handleDeleteEquipment = async (item) => {
    Alert.alert("Eliminar", "¿Seguro deseas eliminar esta herramienta?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            await equipmentService.deleteEquipment(item.id, user);
            Alert.alert("Éxito", "Herramienta eliminada correctamente");
          } catch (error) {
            console.error("Error eliminando herramienta:", error);
            Alert.alert("Error", error.message || "No se pudo eliminar la herramienta");
          }
        },
      },
    ]);
  };

  // --- Edición (long-press) ---

  const openEditModal = (item) => {
    if (!canLongPressEdit) return;
    setEditingItem(item);
    setEditModalVisible(true);
  };

  const handleEditEquipment = async (updates) => {
    if (!editingItem?.id) return;

    setLoading(true);
    try {
      await equipmentService.editEquipment(editingItem.id, updates, user);
      Alert.alert("Éxito", "Herramienta actualizada correctamente");
      setEditModalVisible(false);
      setEditingItem(null);
    } catch (error) {
      console.error("Error editando herramienta:", error);
      Alert.alert("Error", error.message || "No se pudo editar la herramienta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={["#0f2027", "#203a43", "#2c5364"]} style={styles.container}>
      {/* KPIs (igual idea que GeneralStockScreen) */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiNumber}>{totalItems}</Text>
          <Text style={styles.kpiLabel}>Items</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiNumber}>{totalUnits}</Text>
          <Text style={styles.kpiLabel}>Unidades</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiNumber}>${totalValue.toLocaleString("es-CO")}</Text>
          <Text style={styles.kpiLabel}>Valor total</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiNumber}>{assignedCount}</Text>
          <Text style={styles.kpiLabel}>Asignadas</Text>
        </View>

        <View style={[styles.kpiCard, { borderColor: "#F87171" }]}>
          <Text style={[styles.kpiNumber, { color: "#F87171" }]}>{loanedCount}</Text>
          <Text style={styles.kpiLabel}>Prestadas</Text>
        </View>
      </View>

      {/* Encabezado con acciones */}
      <EquipmentHeader onAddPress={() => setAddModalVisible(true)} onAssignPress={() => setAssignModalVisible(true)} />

      {/* Lista */}
      <EquipmentList
        equipment={equipment}
        onLoan={(item) => {
          setSelectedEquipment(item);
          setLoanModalVisible(true);
        }}
        onTransfer={(item) => {
          setSelectedEquipment(item);
          setTransferModalVisible(true);
        }}
        onReturn={handleReturnEquipment}
        onDelete={handleDeleteEquipment}
        canEdit={canEdit}
        isAdmin={isAdmin}
        canLongPressEdit={canLongPressEdit}
        onEdit={openEditModal}
        emptyMessage="No hay herramientas registradas"
      />

      {/* Modales */}
      <AddEquipmentModal
        visible={addModalVisible}
        onSave={handleAddEquipment}
        onClose={() => setAddModalVisible(false)}
        loading={loading}
      />

      <AssignEquipmentModal
        visible={assignModalVisible}
        equipment={equipment}
        personnel={personnel}
        onAssign={handleAssignEquipment}
        onClose={() => setAssignModalVisible(false)}
        loading={loading}
      />

      <LoanEquipmentModal
        visible={loanModalVisible}
        equipment={equipment}
        personnel={personnel}
        onLoan={handleLoanEquipment}
        onClose={() => setLoanModalVisible(false)}
        loading={loading}
      />

      <TransferEquipmentModal
        visible={transferModalVisible}
        personnel={personnel}
        onTransfer={handleTransferEquipment}
        onClose={() => {
          setTransferModalVisible(false);
          setSelectedEquipment(null);
        }}
        loading={loading}
      />

      <EditEquipmentModal
        visible={editModalVisible}
        item={editingItem}
        onSave={handleEditEquipment}
        onClose={() => {
          setEditModalVisible(false);
          setEditingItem(null);
        }}
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

  // KPIs (copiado en espíritu de GeneralStockScreen)
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
    fontSize: 15,
    fontWeight: "700",
    color: "#FFF",
    textAlign: "center",
  },
  kpiLabel: {
    fontSize: 11,
    color: "#94A3B8",
    textAlign: "center",
  },
});
