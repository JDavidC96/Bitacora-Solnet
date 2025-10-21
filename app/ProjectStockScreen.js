import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useUser } from "../context/UserContext";

// Hooks
import { useInventoryModals } from "../hooks/useInventoryModals";
import { useInventoryPermissions } from "../hooks/useInventoryPermissions";
import { useProjectInventory } from "../hooks/useProjectInventory";
import { useProjects } from "../hooks/useProjects";

// Componentes
import AddMaterialButton from "../components/inventory/project/AddMaterialButton";
import EmptyInventory from "../components/inventory/project/EmptyInventory";
import MaterialItem from "../components/inventory/project/MaterialItem";
import SearchHeader from "../components/inventory/SearchHeader";

// Modales
import AddMaterialModal from "../components/inventory/project/AddMaterialModal";
import MoveMaterialModal from "../components/inventory/project/MoveMaterialModal";
import UpdateUsageModal from "../components/inventory/project/UpdateUsageModal";

// Servicios
import { inventoryService } from "../services/inventoryService";

export default function ProjectStockScreen() {
  const params = useLocalSearchParams();
  const { role, user } = useUser();

  // Procesar parámetros correctamente
  const [processedParams, setProcessedParams] = useState({ projectId: null, title: '' });
  const prevParamsRef = useRef();

  useEffect(() => {
    // Evitar procesamiento si los parámetros no han cambiado
    const paramsString = JSON.stringify(params);
    if (prevParamsRef.current === paramsString) {
      return;
    }
    
    prevParamsRef.current = paramsString;
    
    console.log('🔍 ProjectStockScreen - Parámetros recibidos:', params);
    
    // Buscar projectId en diferentes propiedades
    const projectId = Array.isArray(params.projectId) ? params.projectId[0] : params.projectId;
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    const title = Array.isArray(params.title) ? params.title[0] : params.title;
    
    // Usar projectId primero, si no está usar id
    const finalProjectId = projectId || id;
    
    setProcessedParams({
      projectId: finalProjectId && finalProjectId !== 'undefined' ? finalProjectId : null,
      title: title || 'Proyecto sin nombre'
    });
  }, [params]);

  // Estados
  const [searchQuery, setSearchQuery] = useState("");

  // Hooks personalizados - usar processedParams.projectId
  const { items, loading: inventoryLoading, error: inventoryError } = useProjectInventory(processedParams.projectId);
  const { projects: proyectos, loading: projectsLoading } = useProjects();
  const { canAdd, canMove } = useInventoryPermissions(role);
  const {
    selectedItem,
    loading: modalLoading,
    setLoading: setModalLoading,
    modals,
    openUpdateModal,
    openMoveModal,
    openAddModal,
    closeAll,
    closeModal
  } = useInventoryModals();

  // Función para registrar en el historial
  const registerHistory = async (movementData) => {
    try {
      await inventoryService.registerMovement({
        ...movementData,
        usuario: user?.email,
        fecha: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error registrando en historial:', error);
    }
  };

  // Filtrado, deduplicación Y ORDENAMIENTO ALFABÉTICO
  const filteredItems = items
    .filter((item) =>
      item.nombre?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    // ORDENAR ALFABÉTICAMENTE ASCENDENTE (A-Z)
    .sort((a, b) => a.nombre?.localeCompare(b.nombre));

  const dedupedItems = Array.from(new Map(filteredItems.map((i) => [i.idDoc, i])).values());

  // Handlers para los modales que registran en historial
  const handleAddMaterial = async (materialData) => {
    setModalLoading(true);
    try {
      // Agregar material al proyecto
      await inventoryService.addProjectMaterial(processedParams.projectId, materialData);
      
      // Registrar en historial
      await registerHistory({
        material: materialData.nombre,
        tipo: 'entrada',
        cantidad: materialData.cantidad,
        origen: 'Inventario General',
        destino: processedParams.title,
        notas: 'Agregado directamente al proyecto'
      });
      
      closeModal('add');
    } catch (error) {
      console.error('Error agregando material:', error);
      Alert.alert('Error', 'No se pudo agregar el material');
    } finally {
      setModalLoading(false);
    }
  };

  const handleUpdateUsage = async (updateData) => {
    setModalLoading(true);
    try {
      // Actualizar uso del material
      await inventoryService.updateMaterialUsage(
        processedParams.projectId,
        selectedItem.idDoc,
        updateData
      );
      
      // Registrar en historial
      await registerHistory({
        material: selectedItem.nombre,
        tipo: 'salida',
        cantidad: updateData.cantidadUsada,
        origen: processedParams.title,
        destino: 'Uso en proyecto',
        notas: updateData.notas || 'Material utilizado'
      });
      
      closeModal('update');
    } catch (error) {
      console.error('Error actualizando uso:', error);
      Alert.alert('Error', 'No se pudo actualizar el uso');
    } finally {
      setModalLoading(false);
    }
  };

  const handleMoveMaterial = async (moveData) => {
    setModalLoading(true);
    try {
      // Mover material
      await inventoryService.moveMaterial(
        processedParams.projectId,
        selectedItem.idDoc,
        moveData
      );
      
      // Registrar en historial
      const proyectoDestino = proyectos.find(p => p.id === moveData.proyectoDestino)?.title;
      
      await registerHistory({
        material: selectedItem.nombre,
        tipo: 'movimiento',
        cantidad: moveData.cantidad,
        origen: processedParams.title,
        destino: proyectoDestino || 'Proyecto destino',
        notas: 'Transferencia entre proyectos'
      });
      
      closeModal('move');
    } catch (error) {
      console.error('Error moviendo material:', error);
      Alert.alert('Error', 'No se pudo mover el material');
    } finally {
      setModalLoading(false);
    }
  };

  // Mostrar loading si no hay projectId válido
  if (!processedParams.projectId) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>No se pudo cargar el inventario</Text>
        <Text style={styles.debugText}>
          ProjectId recibido: {processedParams.projectId}
        </Text>
        <Text style={styles.debugText}>
          Parámetros: {JSON.stringify(params)}
        </Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={["#38A169", "#48BB78", "#81E6D9"]} style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.title}>📦 Inventario de {processedParams.title}</Text>
        <Text style={styles.subtitle}>ID: {processedParams.projectId}</Text>

        <SearchHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          placeholder="Buscar material..."
        />

        {canAdd && (
          <AddMaterialButton onPress={openAddModal} />
        )}

        {inventoryLoading ? (
          <Text style={styles.empty}>Cargando inventario...</Text>
        ) : dedupedItems.length === 0 ? (
          <EmptyInventory />
        ) : (
          <FlatList
            data={dedupedItems}
            keyExtractor={(item) => String(item.idDoc)}
            renderItem={({ item }) => (
              <MaterialItem
                item={item}
                onUpdate={openUpdateModal}
                onMove={openMoveModal}
                canMove={canMove}
              />
            )}
          />
        )}
      </View>

      {/* Modales - pasar processedParams.projectId y handlers actualizados */}
      <UpdateUsageModal
        visible={modals.update}
        onClose={() => closeModal('update')}
        selectedItem={selectedItem}
        projectId={processedParams.projectId}
        user={user}
        loading={modalLoading}
        setLoading={setModalLoading}
        onSave={handleUpdateUsage} // ✅ Nuevo handler con historial
      />

      <MoveMaterialModal
        visible={modals.move}
        onClose={() => closeModal('move')}
        selectedItem={selectedItem}
        projectId={processedParams.projectId}
        role={role}
        proyectos={proyectos}
        loading={modalLoading}
        setLoading={setModalLoading}
        onMove={handleMoveMaterial} // ✅ Nuevo handler con historial
      />

      <AddMaterialModal
        visible={modals.add}
        onClose={() => closeModal('add')}
        projectId={processedParams.projectId}
        user={user}
        loading={modalLoading}
        setLoading={setModalLoading}
        onSave={handleAddMaterial} // ✅ Nuevo handler con historial
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E1E2F',
    padding: 20,
  },
  errorText: {
    color: '#F56565',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  debugText: {
    color: '#CCC',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  title: { 
    color: "#FFF", 
    fontSize: 20, 
    marginBottom: 8, 
    fontWeight: "bold",
    textAlign: "center" 
  },
  subtitle: {
    color: "#E2E8F0",
    fontSize: 14,
    marginBottom: 16,
    textAlign: "center",
  },
  empty: { 
    color: "#888", 
    textAlign: "center", 
    marginTop: 20 
  },
});