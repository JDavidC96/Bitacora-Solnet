// app/EquipmentStockScreen.js
import { LinearGradient } from "expo-linear-gradient";
import { collection, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Alert, StyleSheet } from "react-native";
import { useUser } from "../context/UserContext";
import { db } from "../firebase/firebaseConfig";

// Componentes modulares
import AddEquipmentModal from "../components/inventory/equipment/AddEquipmentModal";
import AssignEquipmentModal from "../components/inventory/equipment/AssignEquipmentModal";
import EquipmentHeader from "../components/inventory/equipment/EquipmentHeader";
import EquipmentList from "../components/inventory/equipment/EquipmentList";
import LoanEquipmentModal from "../components/inventory/equipment/LoanEquipmentModal";
import TransferEquipmentModal from "../components/inventory/equipment/TransferEquipmentModal";

// Servicios
import { equipmentService } from "../services/equipmentService";

export default function EquipmentStockScreen() {
  const { role, user } = useUser();
  
  // Estados
  const [equipment, setEquipment] = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [loading, setLoading] = useState(false);

  // Modales
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [loanModalVisible, setLoanModalVisible] = useState(false);
  const [transferModalVisible, setTransferModalVisible] = useState(false);

  // Permisos
  const isAdmin = role === "Administrador";
  const canEdit = ["Administrador", "Almacenista", "Supervisor", "Tecnico", "Ingeniero"].includes(role);
  const canManage = ["Administrador", "Ingeniero", "Supervisor"].includes(role);

  // Cargar datos
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

  // Handlers
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

  const handleAssignEquipment = async (equipment, person) => {
    setLoading(true);
    try {
      await equipmentService.assignEquipment(equipment.id, person, user);
      setAssignModalVisible(false);
      Alert.alert("Éxito", "Herramienta asignada correctamente");
    } catch (error) {
      console.error("Error asignando herramienta:", error);
      Alert.alert("Error", error.message || "No se pudo asignar la herramienta");
    } finally {
      setLoading(false);
    }
  };

  const handleLoanEquipment = async (equipment, person) => {
    setLoading(true);
    try {
      await equipmentService.loanEquipment(equipment.id, person, user);
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

  return (
    <LinearGradient colors={["#0f2027", "#203a43", "#2c5364"]} style={styles.container}>
      
      <EquipmentHeader
        onAddPress={() => setAddModalVisible(true)}
        onAssignPress={() => setAssignModalVisible(true)}
      />

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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
});