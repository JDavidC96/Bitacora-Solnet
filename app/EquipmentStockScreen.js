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

/**
 * Pantalla principal de gestión de inventario de herramientas/equipos.
 * 
 * Esta pantalla permite:
 * - Ver todas las herramientas disponibles en el sistema
 * - Agregar nuevas herramientas al inventario
 * - Asignar herramientas a personal específico
 * - Registrar préstamos temporales de herramientas
 * - Transferir herramientas entre personal
 * - Registrar devoluciones de herramientas prestadas
 * - Eliminar herramientas del inventario (solo administradores)
 * 
 * Los permisos de acceso varían según el rol del usuario.
 * 
 * @component
 * @example
 * // Navegación desde otras pantallas:
 * // router.push('/EquipmentStockScreen')
 * 
 * @returns {JSX.Element} Componente de la pantalla de stock de equipos
 */
export default function EquipmentStockScreen() {
  // Contexto de usuario
  const { role, user } = useUser();
  
  // Estados para datos
  const [equipment, setEquipment] = useState([]); // Lista de herramientas/equipos
  const [personnel, setPersonnel] = useState([]); // Lista de personal disponible
  const [selectedEquipment, setSelectedEquipment] = useState(null); // Herramienta seleccionada para acciones
  const [loading, setLoading] = useState(false); // Estado de carga para operaciones

  // Estados para controlar visibilidad de modales
  const [addModalVisible, setAddModalVisible] = useState(false); // Modal agregar herramienta
  const [assignModalVisible, setAssignModalVisible] = useState(false); // Modal asignar herramienta
  const [loanModalVisible, setLoanModalVisible] = useState(false); // Modal préstamo herramienta
  const [transferModalVisible, setTransferModalVisible] = useState(false); // Modal transferir herramienta

  // Definición de permisos basados en el rol del usuario
  const isAdmin = role === "Administrador"; // Solo administrador puede eliminar
  const canEdit = ["Administrador", "Almacenista", "Supervisor", "Tecnico", "Ingeniero"].includes(role); // Puede editar/agregar
  const canManage = ["Administrador", "Ingeniero", "Supervisor"].includes(role); // Puede asignar/transferir

  /**
   * Suscripciones en tiempo real a las colecciones de Firestore
   * - 'herramientas': obtiene el inventario de equipos
   * - 'personal': obtiene la lista de personal disponible
   * 
   * Utiliza Map para asegurar unicidad de documentos (evita duplicados)
   */
  useEffect(() => {
    // Suscripción a herramientas
    const unsubEquipment = onSnapshot(collection(db, "herramientas"), (snapshot) => {
      const unique = Array.from(
        new Map(snapshot.docs.map((d) => [d.id, { id: d.id, ...d.data() }])).values()
      );
      setEquipment(unique);
    });

    // Suscripción a personal
    const unsubPersonnel = onSnapshot(collection(db, "personal"), (snapshot) => {
      const unique = Array.from(
        new Map(snapshot.docs.map((d) => [d.id, { id: d.id, ...d.data() }])).values()
      );
      setPersonnel(unique);
    });

    // Limpieza de suscripciones al desmontar el componente
    return () => {
      unsubEquipment();
      unsubPersonnel();
    };
  }, []);

  // --- Handlers para operaciones con herramientas ---

  /**
   * Agrega una nueva herramienta al inventario
   * @param {Object} equipmentData - Datos de la herramienta a agregar
   */
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

  /**
   * Asigna una herramienta a un miembro del personal de forma permanente
   * @param {Object} equipment - Herramienta a asignar
   * @param {Object} person - Personal al que se asigna la herramienta
   */
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

  /**
   * Registra un préstamo temporal de una herramienta
   * @param {Object} equipment - Herramienta a prestar
   * @param {Object} person - Personal que recibe el préstamo
   */
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

  /**
   * Transfiere una herramienta de un dueño actual a uno nuevo
   * @param {Object} newOwner - Nuevo dueño de la herramienta
   */
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

  /**
   * Registra la devolución de una herramienta prestada
   * @param {Object} item - Herramienta a devolver
   */
  const handleReturnEquipment = async (item) => {
    if (!item?.prestadaA) return; // Verifica que esté prestada
    
    try {
      await equipmentService.returnEquipment(item.id, user);
      Alert.alert("Éxito", "Devolución registrada correctamente");
    } catch (error) {
      console.error("Error devolviendo herramienta:", error);
      Alert.alert("Error", error.message || "No se pudo registrar la devolución");
    }
  };

  /**
   * Elimina una herramienta del inventario (solo administradores)
   * @param {Object} item - Herramienta a eliminar
   */
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
    // Fondo con gradiente de azules/verdes oscuros
    <LinearGradient colors={["#0f2027", "#203a43", "#2c5364"]} style={styles.container}>
      
      {/* Encabezado con botones de acciones principales */}
      <EquipmentHeader
        onAddPress={() => setAddModalVisible(true)}
        onAssignPress={() => setAssignModalVisible(true)}
      />

      {/* Lista principal de herramientas */}
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

      {/* --- Modales para diferentes operaciones --- */}

      {/* Modal para agregar nueva herramienta */}
      <AddEquipmentModal
        visible={addModalVisible}
        onSave={handleAddEquipment}
        onClose={() => setAddModalVisible(false)}
        loading={loading}
      />

      {/* Modal para asignar herramienta a personal */}
      <AssignEquipmentModal
        visible={assignModalVisible}
        equipment={equipment}
        personnel={personnel}
        onAssign={handleAssignEquipment}
        onClose={() => setAssignModalVisible(false)}
        loading={loading}
      />

      {/* Modal para registrar préstamo temporal */}
      <LoanEquipmentModal
        visible={loanModalVisible}
        equipment={equipment}
        personnel={personnel}
        onLoan={handleLoanEquipment}
        onClose={() => setLoanModalVisible(false)}
        loading={loading}
      />

      {/* Modal para transferir herramienta entre personal */}
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

// Estilos de la pantalla
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
});
