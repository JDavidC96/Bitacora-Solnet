// app/DuplicateDetectorScreen.js

import { useRouter } from "expo-router";
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

//Importaciones de contextos y hooks personalizados
import { useUser } from "../context/UserContext";
import { useGeneralInventory } from "../hooks/useGeneralInventory";

//Importaciones de componentes
import AddEditItemModal from "../components/inventory/AddEditItemModal";
import DuplicateGroupCard from "../components/inventory/duplicates/DuplicateGroupCard";
import MergeDuplicateModal from "../components/inventory/duplicates/MergeDuplicateModal";

//Importaciones de servicios y utilitarios
import { inventoryService } from "../services/inventoryService";
import { findDuplicateGroups } from "../utils/findDuplicates";

/**
 * Pantalla de detección y gestión de duplicados en el inventario.
 * 
 * Esta pantalla permite a los administradores:
 * - Detectar grupos de ítems con nombres similares (potenciales duplicados)
 * - Identificar conflictos de códigos (mismo código asignado a diferentes ítems)
 * - Ver ítems sin código o sin categoría
 * - Editar ítems individualmente para corregir datos
 * - Fusionar grupos de duplicados en un solo ítem maestro
 * 
 * @component
 * @example
 * // Navegación desde otras pantallas:
 * // router.push('/DuplicateDetectorScreen')
 * 
 * @returns {JSX.Element} Componente de la pantalla de detección de duplicados
 */
export default function DuplicateDetectorScreen() {
  const router = useRouter();
  
  // Hooks para obtener datos
  const { items, loading, refresh } = useGeneralInventory();
  const { role, user } = useUser();
  
  // Verifica si el usuario tiene permisos de administrador
  const isAdmin = role === "Administrador" || role === "Administrativo";

  // Estados para modal de edición
  const [editItem, setEditItem] = useState(null); // Ítem seleccionado para edición
  const [editVisible, setEditVisible] = useState(false); // Visibilidad modal edición

  // Estados para modal de fusión
  const [mergeGroup, setMergeGroup] = useState(null); // Grupo de duplicados a fusionar
  const [mergeVisible, setMergeVisible] = useState(false); // Visibilidad modal fusión
  const [merging, setMerging] = useState(false); // Estado de proceso de fusión

  /**
   * Detecta y agrupa duplicados en el inventario usando el utilitario findDuplicateGroups
   * @returns {Object} Objeto con diferentes tipos de duplicados y problemas
   */
  const { nameGroups, codeConflicts, withoutCode, withoutCategory } =
    useMemo(() => findDuplicateGroups(items), [items]);

  /**
   * Abre el modal para editar un ítem
   * @param {Object} item - Ítem a editar
   */
  const openEdit = (item) => {
    setEditItem(item);
    setEditVisible(true);
  };

  /**
   * Abre el modal para fusionar un grupo de duplicados
   * @param {Object} group - Grupo de duplicados detectados
   */
  const openMergeGroup = (group) => {
    setMergeGroup(group);
    setMergeVisible(true);
  };

  /**
   * Ejecuta la fusión de un grupo de duplicados, manteniendo el ítem maestro
   * @param {Object} masterItem - Ítem que se conservará como maestro después de la fusión
   */
  const handleConfirmMerge = async (masterItem) => {
    if (!mergeGroup || !masterItem) return;

    try {
      setMerging(true);

      // Filtra los duplicados (excluyendo el ítem maestro)
      const duplicates = mergeGroup.items.filter(
        (it) => it.id !== masterItem.id
      );

      if (duplicates.length === 0) {
        Alert.alert("Sin duplicados", "No hay ítems para fusionar en este grupo.");
        setMerging(false);
        return;
      }

      // Ejecuta la fusión a través del servicio
      await inventoryService.mergeDuplicateGroup({
        masterItem,
        duplicates,
        usuario: user?.email || "Sistema", // Registra quién realizó la fusión
      });

      // Refresca los datos después de la fusión
      await refresh();
      setMergeVisible(false);
      setMergeGroup(null);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", error.message || "No se pudo completar la fusión.");
    } finally {
      setMerging(false);
    }
  };

  // Verificación de permisos - solo administradores pueden acceder
  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Detección de duplicados</Text>
        <Text style={styles.subTitle}>
          Solo los administradores pueden acceder a esta pantalla.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Encabezado con navegación */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Detección de duplicados</Text>
        <View style={{ width: 50 }} /> {/* Espaciador para centrar el título */}
      </View>

      {/* Resumen estadístico de problemas detectados */}
      <View style={styles.summaryRow}>
        <View className="summaryCard" style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{nameGroups.length}</Text>
          <Text style={styles.summaryLabel}>Grupos por nombre</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryNumber, { color: "#F97373" }]}>
            {codeConflicts.length}
          </Text>
          <Text style={styles.summaryLabel}>Conflictos de código</Text>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{withoutCode.length}</Text>
          <Text style={styles.summaryLabel}>Sin código</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{withoutCategory.length}</Text>
          <Text style={styles.summaryLabel}>Sin categoría</Text>
        </View>
      </View>

      {/* Lista principal de grupos de duplicados por nombre */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#FFF" />
        </View>
      ) : (
        <FlatList
          data={nameGroups}
          keyExtractor={(g) => g.key}
          renderItem={({ item: group }) => (
            <DuplicateGroupCard
              group={group}
              onEditItem={openEdit}
              onMergeGroup={openMergeGroup}
            />
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              No se encontraron grupos de posibles duplicados.
            </Text>
          }
          ListHeaderComponent={
            <View style={{ marginBottom: 10 }}>
              <Text style={styles.sectionTitle}>Grupos por nombre similar</Text>
            </View>
          }
        />
      )}

      {/* Sección de conflictos de código (mismo código para diferentes ítems) */}
      {!loading && codeConflicts.length > 0 && (
        <View style={styles.block}>
          <Text style={styles.sectionTitle}>Conflictos de código</Text>
          {codeConflicts.map((conflict) => (
            <View key={conflict.codigo} style={styles.conflictCard}>
              <Text style={styles.conflictCode}>{conflict.codigo}</Text>
              {conflict.items.map((it) => (
                <TouchableOpacity
                  key={it.id}
                  onPress={() => openEdit(it)}
                  style={styles.conflictItemRow}
                >
                  <Text style={styles.conflictItemText}>
                    {it.nombre} · {it.categoria || "Sin categoría"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      )}

      {/* Sección de ítems con datos incompletos */}
      {!loading && (
        <View style={styles.block}>
          {/* Ítems sin código */}
          {withoutCode.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Ítems sin código</Text>
              {withoutCode.slice(0, 5).map((it) => (
                <TouchableOpacity
                  key={it.id}
                  onPress={() => openEdit(it)}
                  style={styles.smallRow}
                >
                  <Text style={styles.smallText}>
                    {it.nombre} · {it.categoria || "Sin categoría"}
                  </Text>
                </TouchableOpacity>
              ))}
              {withoutCode.length > 5 && (
                <Text style={styles.moreText}>
                  +{withoutCode.length - 5} más...
                </Text>
              )}
            </>
          )}

          {/* Ítems sin categoría */}
          {withoutCategory.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Ítems sin categoría</Text>
              {withoutCategory.slice(0, 5).map((it) => (
                <TouchableOpacity
                  key={it.id}
                  onPress={() => openEdit(it)}
                  style={styles.smallRow}
                >
                  <Text style={styles.smallText}>
                    {it.nombre} · Código: {it.codigo || "—"}
                  </Text>
                </TouchableOpacity>
              ))}
              {withoutCategory.length > 5 && (
                <Text style={styles.moreText}>
                  +{withoutCategory.length - 5} más...
                </Text>
              )}
            </>
          )}
        </View>
      )}

      {/* Modal para editar ítems individualmente */}
      <AddEditItemModal
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        item={editItem}
        onSaved={refresh}
      />

      {/* Modal para fusionar grupos de duplicados */}
      <MergeDuplicateModal
        visible={mergeVisible}
        onClose={() => {
          if (merging) return; // Previene cierre durante proceso de fusión
          setMergeVisible(false);
          setMergeGroup(null);
        }}
        group={mergeGroup}
        onConfirm={handleConfirmMerge}
        merging={merging}
      />
    </View>
  );
}

// Estilos de la pantalla (tema oscuro)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617", // Fondo azul oscuro
    paddingTop: 36, // Espacio para status bar
    paddingHorizontal: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  backText: {
    color: "#38BDF8", // Azul brillante para enlace de volver
    fontSize: 14,
  },
  title: {
    color: "#F9FAFB", // Blanco puro
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  subTitle: {
    color: "#9CA3AF", // Gris claro
    textAlign: "center",
    marginTop: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space_between", // Nota: debería ser "space-between" (con guión)
    marginBottom: 6,
  },
  summaryCard: {
    flex: 1,
    marginHorizontal: 4,
    padding: 10,
    backgroundColor: "#020617", // Mismo color de fondo
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1F2937", // Borde gris oscuro
  },
  summaryNumber: {
    color: "#F9FAFB",
    fontSize: 18,
    fontWeight: "700",
  },
  summaryLabel: {
    color: "#9CA3AF",
    fontSize: 11,
    marginTop: 2,
  },
  loadingBox: {
    marginTop: 30,
    alignItems: "center",
  },
  sectionTitle: {
    color: "#E5E7EB", // Gris muy claro
    fontWeight: "700",
    marginBottom: 6,
    fontSize: 14,
  },
  emptyText: {
    color: "#9CA3AF",
    marginTop: 20,
    textAlign: "center",
  },
  block: {
    marginTop: 10,
    paddingVertical: 8,
  },
  conflictCard: {
    backgroundColor: "#0F172A", // Azul más oscuro para tarjetas de conflicto
    borderRadius: 8,
    padding: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#1E293B", // Borde azul oscuro
  },
  conflictCode: {
    color: "#F97373", // Rojo anaranjado para destacar conflictos
    fontWeight: "700",
    marginBottom: 4,
  },
  conflictItemRow: {
    paddingVertical: 3,
  },
  conflictItemText: {
    color: "#E5E7EB",
    fontSize: 12,
  },
  smallRow: {
    paddingVertical: 3,
  },
  smallText: {
    color: "#CBD5F5", // Azul muy claro
    fontSize: 12,
  },
  moreText: {
    color: "#9CA3AF",
    fontSize: 11,
    marginTop: 2,
  },
});
