// app/ProjectStockScreen.js — VERSIÓN FINAL COMPLETA

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

import { useLocalSearchParams } from "expo-router";

import { useUser } from "../context/UserContext";
import { useProjectInventory } from "../hooks/useProjectInventory";
import { useProjects } from "../hooks/useProjects";

// COMPONENTES DEL INVENTARIO DEL PROYECTO
import AddExternalMaterialModal from "../components/inventory/project/AddExternalMaterialModal";
import AddMaterialButton from "../components/inventory/project/AddMaterialButton";
import AddMaterialModal from "../components/inventory/project/AddMaterialModal";
import EmptyInventory from "../components/inventory/project/EmptyInventory";
import MaterialItem from "../components/inventory/project/MaterialItem";
import MoveMaterialModal from "../components/inventory/project/MoveMaterialModal";
import UpdateUsageModal from "../components/inventory/project/UpdateUsageModal";

// SERVICIO
import { inventoryService } from "../services/inventoryService";

export default function ProjectStockScreen() {
  const { projectId, title } = useLocalSearchParams();
  const { projects } = useProjects();
  const { role, user } = useUser();

  // ==================== INVENTARIO EN TIEMPO REAL ====================
  const { projectItems: rawItems, loading } = useProjectInventory(projectId);
  const projectItems = rawItems || [];

  // ==================== PERMISOS ====================
  const canAddMaterial = ["Administrador", "Administrativo", "Ingeniero", "Supervisor"].includes(role);
  const canEditUsage = ["Administrador", "Ingeniero", "Supervisor", "Tecnico"].includes(role);

  // ==================== ESTADOS DE MODALES ====================
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [usageModalVisible, setUsageModalVisible] = useState(false);
  const [moveModalVisible, setMoveModalVisible] = useState(false);
  const [externalModalVisible, setExternalModalVisible] = useState(false);

  const [selectedItem, setSelectedItem] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // ============================================================================
  // 1) AGREGAR MATERIAL DESDE INVENTARIO GENERAL
  // ============================================================================
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
  const handleCloseModals = () => {
    if (actionLoading) return;
    setAddModalVisible(false);
    setUsageModalVisible(false);
    setMoveModalVisible(false);
    setExternalModalVisible(false);
    setSelectedItem(null);
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <View style={styles.container}>
      <Text style={styles.projectTitle}>{title}</Text>

      {/* BOTÓN: AGREGAR MATERIAL EXTERNO */}
      {canAddMaterial && (
        <TouchableOpacity
          style={styles.externalBtn}
          onPress={() => setExternalModalVisible(true)}
        >
          <Text style={styles.externalBtnText}>+ Material Externo</Text>
        </TouchableOpacity>
      )}

      {/* BOTÓN: AGREGAR MATERIAL DESDE INVENTARIO GENERAL */}
      {canAddMaterial && (
        <AddMaterialButton onPress={() => setAddModalVisible(true)} />
      )}

      {/* INVENTARIO */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#FFF" />
        </View>
      ) : projectItems.length === 0 ? (
        <EmptyInventory />
      ) : (
        <FlatList
          data={projectItems}
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

      {/* ==================== MODALES ==================== */}

      <AddMaterialModal
        visible={addModalVisible}
        onClose={handleCloseModals}
        onAdd={handleAddMaterial}
        loading={actionLoading}
      />

      <AddExternalMaterialModal
        visible={externalModalVisible}
        onClose={handleCloseModals}
        onAdd={handleAddExternal}
        loading={actionLoading}
      />

      <UpdateUsageModal
        visible={usageModalVisible}
        onClose={handleCloseModals}
        item={selectedItem}
        onUpdate={handleUpdateUsage}
        loading={actionLoading}
      />

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

// ==================== ESTILOS ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
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
    backgroundColor: "#10B981",
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
