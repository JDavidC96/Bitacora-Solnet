// components/inventory/project/AddMaterialModal.js
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useGeneralInventory } from "../../../hooks/useGeneralInventory";
import ModalBase from "../../ModalBase";

function normalize(text) {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export default function AddMaterialModal({
  visible,
  onClose,
  onAdd,
  loading,
}) {
  const { items: catalogItems, loading: loadingCatalog } = useGeneralInventory();
  

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [cantidad, setCantidad] = useState("");

  useEffect(() => {
    if (!visible) {
      setSearch("");
      setSelected(null);
      setCantidad("");
    }
  }, [visible]);

  const filtered = useMemo(() => {
    const q = normalize(search);
    if (!q) return catalogItems.slice(0, 25);
    return catalogItems
      .filter((item) => {
        const name = normalize(item.nombre);
        const code = normalize(item.codigo);
        const cat = normalize(item.categoria);
        return name.includes(q) || code.includes(q) || cat.includes(q);
      })
      .slice(0, 40);
  }, [search, catalogItems]);

  const handleConfirm = () => {
    if (!selected) {
      alert("Debe seleccionar un material del inventario general.");
      return;
    }

    const qty = Number(cantidad);
    if (!qty || qty <= 0) {
      alert("Ingrese una cantidad válida mayor a 0.");
      return;
    }

    const disponible = Number(selected.cantidad || 0);
    if (qty > disponible) {
      alert(
        `No hay suficiente stock en inventario general.\nDisponible: ${disponible}`
      );
      return;
    }

    onAdd &&
      onAdd({
        material: selected,
        cantidad: qty,
      });
  };

  return (
    <ModalBase
      visible={visible}
      onClose={onClose}
      title="Agregar material al proyecto"
      footer={
        <TouchableOpacity
          style={[styles.btn, (loading || !selected) && { opacity: 0.7 }]}
          disabled={loading || !selected}
          onPress={handleConfirm}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.btnText}>Agregar al proyecto</Text>
          )}
        </TouchableOpacity>
      }
    >
      <Text style={styles.label}>Buscar en inventario general</Text>
      <TextInput
        style={styles.input}
        placeholder="Nombre, código o categoría..."
        placeholderTextColor="#6B7280"
        value={search}
        onChangeText={setSearch}
      />

      {loadingCatalog ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#FFF" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          style={styles.list}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const isSelected = selected?.id === item.id;
            return (
              <TouchableOpacity
                style={[
                  styles.itemRow,
                  isSelected && styles.itemRowSelected,
                ]}
                onPress={() => setSelected(item)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.nombre}</Text>
                  <Text style={styles.itemMeta}>
                    Código: {item.codigo || "—"} ·{" "}
                    {item.categoria || "Sin categoría"}
                  </Text>
                  <Text style={styles.itemMeta}>
                    Unidad: {item.tipo_medida || "Unidad"} · Stock:{" "}
                    {item.cantidad ?? 0}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              No se encontraron materiales. Si el material no existe en el
              inventario general, solicite al administrador crearlo.
            </Text>
          }
        />
      )}

      {selected && (
        <View style={styles.selectedBox}>
          <Text style={styles.selectedTitle}>Material seleccionado</Text>
          <Text style={styles.selectedName}>{selected.nombre}</Text>
          <Text style={styles.selectedMeta}>
            Código: {selected.codigo || "—"} ·{" "}
            {selected.categoria || "Sin categoría"}
          </Text>
          <Text style={styles.selectedMeta}>
            Unidad: {selected.tipo_medida || "Unidad"} · Stock disponible:{" "}
            {selected.cantidad ?? 0}
          </Text>

          <Text style={styles.label}>Cantidad a asignar al proyecto</Text>
          <TextInput
            style={styles.input}
            placeholder="Cantidad"
            placeholderTextColor="#6B7280"
            keyboardType="numeric"
            value={cantidad}
            onChangeText={setCantidad}
          />
        </View>
      )}
    </ModalBase>
  );
}

const styles = StyleSheet.create({
  label: {
    color: "#E5E7EB",
    fontSize: 13,
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#111827",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: "#F9FAFB",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  loadingBox: {
    paddingVertical: 16,
    alignItems: "center",
  },
  list: {
    maxHeight: 220,
    marginBottom: 8,
  },
  itemRow: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "#020617",
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  itemRowSelected: {
    borderColor: "#0EA5E9",
    backgroundColor: "#0B1120",
  },
  itemName: {
    color: "#F9FAFB",
    fontWeight: "600",
    fontSize: 13,
  },
  itemMeta: {
    color: "#9CA3AF",
    fontSize: 11,
    marginTop: 2,
  },
  emptyText: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
  selectedBox: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  selectedTitle: {
    color: "#E5E7EB",
    fontWeight: "700",
    marginBottom: 4,
  },
  selectedName: {
    color: "#F9FAFB",
    fontWeight: "600",
    fontSize: 13,
  },
  selectedMeta: {
    color: "#9CA3AF",
    fontSize: 11,
    marginTop: 2,
    marginBottom: 2,
  },
  btn: {
    backgroundColor: "#0EA5E9",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  btnText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 14,
  },
});
