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

import { useUser } from "../context/UserContext";
import { useGeneralInventory } from "../hooks/useGeneralInventory";

import AddEditItemModal from "../components/inventory/AddEditItemModal";
import DuplicateGroupCard from "../components/inventory/DuplicateGroupCard";
import MergeDuplicateModal from "../components/inventory/duplicates/MergeDuplicateModal";

import { inventoryService } from "../services/inventoryService";
import { findDuplicateGroups } from "../utils/findDuplicates";

export default function DuplicateDetectorScreen() {
  const router = useRouter();
  const { items, loading, refresh } = useGeneralInventory();
  const { role, user } = useUser();
  const isAdmin = role === "Administrador" || role === "Administrativo";

  const [editItem, setEditItem] = useState(null);
  const [editVisible, setEditVisible] = useState(false);

  const [mergeGroup, setMergeGroup] = useState(null);
  const [mergeVisible, setMergeVisible] = useState(false);
  const [merging, setMerging] = useState(false);

  const { nameGroups, codeConflicts, withoutCode, withoutCategory } =
    useMemo(() => findDuplicateGroups(items), [items]);

  const openEdit = (item) => {
    setEditItem(item);
    setEditVisible(true);
  };

  const openMergeGroup = (group) => {
    setMergeGroup(group);
    setMergeVisible(true);
  };

  const handleConfirmMerge = async (masterItem) => {
    if (!mergeGroup || !masterItem) return;

    try {
      setMerging(true);

      const duplicates = mergeGroup.items.filter(
        (it) => it.id !== masterItem.id
      );

      if (duplicates.length === 0) {
        Alert.alert("Sin duplicados", "No hay ítems para fusionar en este grupo.");
        setMerging(false);
        return;
      }

      await inventoryService.mergeDuplicateGroup({
        masterItem,
        duplicates,
        usuario: user?.email || "Sistema",
      });

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
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Detección de duplicados</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Resumen */}
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

      {/* Conflictos de código */}
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

      {/* Sin código / sin categoría */}
      {!loading && (
        <View style={styles.block}>
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

      {/* Modal edición */}
      <AddEditItemModal
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        item={editItem}
        onSaved={refresh}
      />

      {/* Modal fusión */}
      <MergeDuplicateModal
        visible={mergeVisible}
        onClose={() => {
          if (merging) return;
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
    paddingTop: 36,
    paddingHorizontal: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  backText: {
    color: "#38BDF8",
    fontSize: 14,
  },
  title: {
    color: "#F9FAFB",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  subTitle: {
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space_between",
    marginBottom: 6,
  },
  summaryCard: {
    flex: 1,
    marginHorizontal: 4,
    padding: 10,
    backgroundColor: "#020617",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1F2937",
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
    color: "#E5E7EB",
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
    backgroundColor: "#0F172A",
    borderRadius: 8,
    padding: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  conflictCode: {
    color: "#F97373",
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
    color: "#CBD5F5",
    fontSize: 12,
  },
  moreText: {
    color: "#9CA3AF",
    fontSize: 11,
    marginTop: 2,
  },
});
