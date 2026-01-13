/**
 * PANTALLA DE INVENTARIO DE PROYECTO - VERSIÓN FINAL COMPLETA
 * 
 * Descripción:
 * Pantalla para la gestión completa del inventario asignado a un proyecto específico.
 * Permite agregar materiales (desde inventario general o externos), registrar usos,
 * devolver materiales al inventario general y transferirlos entre proyectos.
 * 
 * Características principales:
 * 1. Visualización en tiempo real del inventario del proyecto
 * 2. Agregar materiales desde el inventario general con control de stock
 * 3. Registrar materiales externos (no provenientes del inventario)
 * 4. Registrar uso/consumo de materiales en el proyecto
 * 5. Devolver materiales al inventario general
 * 6. Transferir materiales entre proyectos activos
 * 7. Control de permisos basado en roles
 * 8. Historial automático de todas las transacciones
 * 9. Búsqueda en tiempo real dentro del inventario del proyecto
 * 
 * Flujo de inventario del proyecto:
 * Materiales → [Asignar a Proyecto] → [Registrar Uso/Consumo] → [Devolver/Transferir]
 * 
 * Estructura de datos:
 * - projectId: ID único del proyecto desde parámetros de navegación
 * - title: Título del proyecto para visualización
 * - projectItems: Array de materiales asignados al proyecto
 * 
 * Permisos por rol:
 * - Administrador/Administrativo/Ingeniero/Supervisor: Agregar materiales
 * - Administrador/Ingeniero/Supervisor/Tecnico: Registrar uso/consumo
 * 
 * @component
 * @returns {JSX.Element} Pantalla de inventario del proyecto
 * 
 * @example
 * <ProjectStockScreen />
 */

// Importaciones de React Native
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Importaciones de navegación
import { useLocalSearchParams } from "expo-router";

// Contextos y hooks personalizados
import { useUser } from "../context/UserContext";
import { useProjectInventory } from "../hooks/useProjectInventory";
import { useProjects } from "../hooks/useProjects";

// Componentes específicos del inventario del proyecto
import AddExternalMaterialModal from "../components/inventory/project/AddExternalMaterialModal";
import AddMaterialButton from "../components/inventory/project/AddMaterialButton";
import AddMaterialModal from "../components/inventory/project/AddMaterialModal";
import EmptyInventory from "../components/inventory/project/EmptyInventory";
import MaterialItem from "../components/inventory/project/MaterialItem";
import MoveMaterialModal from "../components/inventory/project/MoveMaterialModal";
import UpdateUsageModal from "../components/inventory/project/UpdateUsageModal";

// Componente de búsqueda reutilizable
import SearchHeader from "../components/inventory/SearchHeader";

// Servicio de inventario
import { inventoryService } from "../services/inventoryService";

/**
 * Normaliza texto para búsquedas insensibles a mayúsculas y acentos
 * 
 * @function normalize
 * @param {string} text - Texto a normalizar
 * @returns {string} Texto normalizado
 */
function normalize(text) {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Componente principal de inventario del proyecto
 * 
 * @function ProjectStockScreen
 * @returns {JSX.Element} Pantalla de inventario renderizada
 */
export default function ProjectStockScreen() {
  // ==================== PARÁMETROS Y CONTEXTOS ====================
  
  // Obtener parámetros de navegación
  const { projectId, title } = useLocalSearchParams();
  
  // Obtener lista de proyectos y datos de usuario
  const { projects } = useProjects();
  const { role, user } = useUser();

  // ==================== INVENTARIO EN TIEMPO REAL ====================
  /**
   * Hook para obtener el inventario del proyecto en tiempo real
   * @typedef {Object} ProjectInventory
   * @property {Array} projectItems - Lista de materiales del proyecto
   * @property {boolean} loading - Estado de carga
   */
  const { projectItems: rawItems, loading } = useProjectInventory(projectId);
  
  // Asegurar que projectItems sea un array incluso si es null/undefined
  const projectItems = rawItems || [];

  // ==================== PERMISOS POR ROL ====================
  /**
   * Permiso para agregar materiales al proyecto
   * @constant {boolean} canAddMaterial
   */
  const canAddMaterial = ["Administrador", "Administrativo", "Ingeniero", "Supervisor"].includes(role);
  
  /**
   * Permiso para registrar uso/consumo de materiales
   * @constant {boolean} canEditUsage
   */
  const canEditUsage = ["Administrador", "Ingeniero", "Supervisor", "Tecnico"].includes(role);

  // ==================== ESTADOS DE MODALES ====================
  /**
   * Estados de visibilidad para los modales de gestión
   */
  const [addModalVisible, setAddModalVisible] = useState(false);      // Modal agregar desde inventario
  const [usageModalVisible, setUsageModalVisible] = useState(false);   // Modal registrar uso
  const [moveModalVisible, setMoveModalVisible] = useState(false);     // Modal devolver/transferir
  const [externalModalVisible, setExternalModalVisible] = useState(false); // Modal agregar externo

  /**
   * Item seleccionado para acciones específicas
   * @type {[Object|null, Function]}
   */
  const [selectedItem, setSelectedItem] = useState(null);
  
  /**
   * Estado de carga durante acciones asíncronas
   * @type {[boolean, Function]}
   */
  const [actionLoading, setActionLoading] = useState(false);

  // ==================== BÚSQUEDA EN INVENTARIO ====================
  /**
   * Estado para el término de búsqueda en el inventario del proyecto
   * @type {[string, Function]}
   */
  const [searchQuery, setSearchQuery] = useState("");

  /**
   * Filtra los materiales del proyecto basándose en el término de búsqueda
   * Búsqueda insensible a mayúsculas, acentos y espacios
   * 
   * @constant {Array} filteredProjectItems
   */
  
  const filteredProjectItems = useMemo(() => {
  const q = normalize(searchQuery);

  const base = !q
    ? projectItems
    : projectItems.filter((item) => {
        const nombre = normalize(item?.nombre);
        const codigo = normalize(item?.codigo || "");
        const categoria = normalize(item?.categoria || "");

        return (
          nombre.includes(q) ||
          codigo.includes(q) ||
          categoria.includes(q)
        );
      });

  // ORDEN ALFABÉTICO (A → Z)
  return [...base].sort((a, b) =>
    normalize(a?.nombre).localeCompare(normalize(b?.nombre), "es", {
      sensitivity: "base",
    })
  );
}, [projectItems, searchQuery]);


  // ============================================================================
  // 1) AGREGAR MATERIAL DESDE INVENTARIO GENERAL
  // ============================================================================
  /**
   * Maneja la adición de materiales desde el inventario general al proyecto
   * Reduce stock en inventario general y lo asigna al proyecto con historial
   * 
   * @async
   * @param {Object} params - Parámetros de la operación
   * @param {Object} params.material - Objeto del material a agregar
   * @param {string} params.material.id - ID del material
   * @param {string} params.material.nombre - Nombre del material
   * @param {number} params.cantidad - Cantidad a asignar
   * @throws {Error} Si falla la asignación del material
   */
  const handleAddMaterial = async ({ material, cantidad }) => {
    try {
      setActionLoading(true);

      await inventoryService.assignToProjectWithHistory({
        projectId,
        material,
        cantidad,
        usuario: user?.email,
        proyectoTitle: title,
      });

      setAddModalVisible(false);
      setSelectedItem(null);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", error.message || "No se pudo agregar el material.");
    } finally {
      setActionLoading(false);
    }
  };

  // ============================================================================
  // 2) AGREGAR MATERIAL EXTERNO
  // ============================================================================
  /**
   * Maneja la adición de materiales externos (no provenientes del inventario)
   * Los materiales externos no afectan el stock del inventario general
   * 
   * @async
   * @param {Object} params - Parámetros de la operación
   * @param {Object} params.material - Objeto del material externo
   * @param {string} params.material.nombre - Nombre del material
   * @param {string} params.material.categoria - Categoría del material
   * @param {number} params.cantidad - Cantidad a registrar
   * @throws {Error} Si falla el registro del material externo
   */
  const handleAddExternal = async ({ material, cantidad }) => {
    try {
      setActionLoading(true);

      await inventoryService.agregarMaterialExternoAProyecto({
        projectId,
        material,
        cantidad,
        usuario: user.email,
        proyectoTitle: title,
      });

      setExternalModalVisible(false);
    } catch (error) {
      Alert.alert("Error", error.message || "No se pudo registrar el material externo.");
    } finally {
      setActionLoading(false);
    }
  };

  // ============================================================================
  // 3) REGISTRAR USO DE MATERIAL
  // ============================================================================
  /**
   * Maneja el registro de uso/consumo de materiales en el proyecto
   * Reduce la cantidad disponible en el inventario del proyecto
   * Registra el consumo en el historial
   * 
   * @async
   * @param {Object} params - Parámetros de la operación
   * @param {number} params.cantidad - Cantidad utilizada/consumida
   * @throws {Error} Si falla el registro del uso
   */
  const handleUpdateUsage = async ({ cantidad }) => {
    try {
      setActionLoading(true);

      await inventoryService.updateProjectUsage({
        projectId,
        item: selectedItem,
        usedAmount: cantidad,
        usuario: user?.email,
        proyectoTitle: title,
      });

      setUsageModalVisible(false);
      setSelectedItem(null);
    } catch (error) {
      Alert.alert("Error", error.message || "No se pudo registrar el uso.");
    } finally {
      setActionLoading(false);
    }
  };

  // ============================================================================
  // 4) DEVOLVER MATERIAL AL INVENTARIO GENERAL
  // ============================================================================
  /**
   * Maneja la devolución de materiales del proyecto al inventario general
   * Aumenta stock en inventario general y lo reduce en el proyecto
   * 
   * @async
   * @param {Object} params - Parámetros de la operación
   * @param {number} params.cantidad - Cantidad a devolver
   * @throws {Error} Si falla la devolución del material
   */
  const handleReturnMaterial = async ({ cantidad }) => {
    try {
      setActionLoading(true);

      await inventoryService.returnMaterialToGeneral({
        projectId,
        item: selectedItem,
        cantidad,
        usuario: user?.email,
        proyectoTitle: title,
      });

      setMoveModalVisible(false);
      setSelectedItem(null);
    } catch (error) {
      Alert.alert("Error", error.message || "No se pudo devolver el material.");
    } finally {
      setActionLoading(false);
    }
  };

  // ============================================================================
  // 5) TRANSFERIR MATERIAL ENTRE PROYECTOS
  // ============================================================================
  /**
   * Maneja la transferencia de materiales entre proyectos
   * Reduce cantidad en proyecto origen y aumenta en proyecto destino
   * 
   * @async
   * @param {Object} params - Parámetros de la operación
   * @param {number} params.cantidad - Cantidad a transferir
   * @param {string} params.proyectoDestino - ID del proyecto destino
   * @throws {Error} Si falla la transferencia del material
   */
  const handleTransferMaterial = async ({ cantidad, proyectoDestino }) => {
    try {
      setActionLoading(true);

      await inventoryService.transferBetweenProjects({
        origenId: projectId,
        destinoId: proyectoDestino,
        item: selectedItem,
        cantidad,
        usuario: user?.email,
        origenTitle: title,
        destinoTitle: projects.find((p) => p.id === proyectoDestino)?.title || "",
      });

      setMoveModalVisible(false);
      setSelectedItem(null);
    } catch (error) {
      Alert.alert("Error", error.message || "No se pudo transferir material.");
    } finally {
      setActionLoading(false);
    }
  };

  // ============================================================================
  // CERRAR TODOS LOS MODALES
  // ============================================================================
  /**
   * Cierra todos los modales activos y limpia el item seleccionado
   * Previene el cierre si hay una operación en curso
   */
  const handleCloseModals = () => {
    if (actionLoading) return; // Evitar cierre durante operaciones
    setAddModalVisible(false);
    setUsageModalVisible(false);
    setMoveModalVisible(false);
    setExternalModalVisible(false);
    setSelectedItem(null);
  };

  // ============================================================================
  // RENDER PRINCIPAL
  // ============================================================================
  return (
    <View style={styles.container}>
      {/* Título del proyecto */}
      <Text style={styles.projectTitle}>{title}</Text>

      {/* COMPONENTE DE BÚSQUEDA */}
      <SearchHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder="Buscar en inventario del proyecto..."
      />

      {/* BOTÓN: AGREGAR MATERIAL EXTERNO (solo con permisos) */}
      {canAddMaterial && (
        <TouchableOpacity
          style={styles.externalBtn}
          onPress={() => setExternalModalVisible(true)}
        >
          <Text style={styles.externalBtnText}>+ Material Externo</Text>
        </TouchableOpacity>
      )}

      {/* BOTÓN: AGREGAR MATERIAL DESDE INVENTARIO GENERAL (solo con permisos) */}
      {canAddMaterial && (
        <AddMaterialButton onPress={() => setAddModalVisible(true)} />
      )}

      {/* LISTA DE INVENTARIO */}
      {loading ? (
        // Estado de carga
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#FFF" />
        </View>
      ) : filteredProjectItems.length === 0 ? (
        // Inventario vacío o sin resultados de búsqueda
        <EmptyInventory />
      ) : (
        // Lista de materiales del proyecto (filtrados por búsqueda)
        <FlatList
          data={filteredProjectItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MaterialItem
              item={item}
              canUse={canEditUsage}
              onUse={() => {
                setSelectedItem(item);
                setUsageModalVisible(true);
              }}
              onReturn={() => {
                setSelectedItem(item);
                setMoveModalVisible(true);
              }}
            />
          )}
        />
      )}

      {/* ==================== MODALES DE GESTIÓN ==================== */}

      {/* Modal para agregar materiales desde inventario general */}
      <AddMaterialModal
        visible={addModalVisible}
        onClose={handleCloseModals}
        onAdd={handleAddMaterial}
        loading={actionLoading}
      />

      {/* Modal para agregar materiales externos */}
      <AddExternalMaterialModal
        visible={externalModalVisible}
        onClose={handleCloseModals}
        onAdd={handleAddExternal}
        loading={actionLoading}
      />

      {/* Modal para registrar uso/consumo de materiales */}
      <UpdateUsageModal
        visible={usageModalVisible}
        onClose={handleCloseModals}
        item={selectedItem}
        onUpdate={handleUpdateUsage}
        loading={actionLoading}
      />

      {/* Modal para devolver o transferir materiales */}
      <MoveMaterialModal
        visible={moveModalVisible}
        onClose={handleCloseModals}
        item={selectedItem}
        onReturn={handleReturnMaterial}
        onTransfer={handleTransferMaterial}
        projects={projects}
        currentProjectId={projectId}
        loading={actionLoading}
      />
    </View>
  );
}

// ==================== ESTILOS DE LA PANTALLA ====================
/**
 * Estilos del componente
 * 
 * @constant {Object} styles
 * @property {Object} container - Contenedor principal con fondo oscuro
 * @property {Object} projectTitle - Estilo del título del proyecto
 * @property {Object} loadingBox - Contenedor para estado de carga
 * @property {Object} externalBtn - Botón para agregar material externo
 * @property {Object} externalBtnText - Texto del botón externo
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A", // Azul oscuro
    padding: 14,
    paddingTop: 28,
  },
  projectTitle: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  loadingBox: {
    marginTop: 40,
    alignItems: "center",
  },
  externalBtn: {
    backgroundColor: "#10B981", // Verde esmeralda
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  externalBtnText: {
    color: "#FFF",
    textAlign: "center",
    fontWeight: "700",
  },
});