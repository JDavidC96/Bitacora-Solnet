import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useGeneralInventory } from "../../../hooks/useGeneralInventory";
import normalize from "../../../utils/normalize";

export default function AddExternalMaterialModal({
  visible,
  onClose,
  onAdd,
  loading,
}) {
  const { items: catalogRaw, loading: loadingCatalog } = useGeneralInventory();
  const catalog = catalogRaw || [];

  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [cantidad, setCantidad] = useState("");

  useEffect(() => {
    if (!visible) {
      setSearch("");
      setCantidad("");
      setSelectedItem(null);
    }
  }, [visible]);

  // ------------------------------
  // AUTOCOMPLETADO
  // ------------------------------
  const filtered = useMemo(() => {
    const q = normalize(search);
    if (!q) return [];

    return catalog
      .filter((item) => {
        const name = normalize(item.nombre);
        const code = normalize(item.codigo || "");
        const cat = normalize(item.categoria || "");
        return name.includes(q) || code.includes(q) || cat.includes(q);
      })
      .slice(0, 25);
  }, [search, catalog]);

  // ------------------------------
  // GUARDAR
  // ------------------------------
  const handleAdd = () => {
    if (!selectedItem) {
      return Alert.alert(
        "No existe",
        "Este material no existe en el inventario general. Solicite al administrador crearlo."
      );
    }

    if (!cantidad || Number(cantidad) <= 0) {
      return Alert.alert("Error", "Ingrese una cantidad válida.");
    }

    onAdd({ material: selectedItem, cantidad: Number(cantidad) });
  };

  // Item en la lista
  const renderOption = ({ item }) => (
    <TouchableOpacity
      style={styles.option}
      onPress={() => {
        setSelectedItem(item);
        setSearch(item.nombre);
      }}
    >
      <Text style={styles.optionName}>{item.nombre}</Text>
      {item.codigo ? <Text style={styles.optionCode}>Código: {item.codigo}</Text> : null}
      <Text style={styles.optionInfo}>{item.categoria} - {item.tipo_medida}</Text>
    </TouchableOpacity>
  );

  // ------------------------------
  // 🔵 LOADING OVERLAY
  // ------------------------------
  const LoadingOverlay = () => (
    <View style={styles.loadingOverlay}>
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text style={styles.loadingText}>Guardando...</Text>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.modalBox}>
          <Text style={styles.title}>Material Externo</Text>

          <TextInput
            style={styles.input}
            placeholder="Buscar material..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
            editable={!loading}
          />

          {loadingCatalog && <ActivityIndicator color="#38BDF8" style={{ marginBottom: 10 }} />}

          {filtered.length > 0 && !selectedItem && (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              renderItem={renderOption}
              style={styles.list}
            />
          )}

          {selectedItem && (
            <View style={styles.selectedBox}>
              <Text style={styles.selectedName}>{selectedItem.nombre}</Text>
              {selectedItem.codigo ? (
                <Text style={styles.selectedCode}>Código: {selectedItem.codigo}</Text>
              ) : null}
              <Text style={styles.selectedInfo}>
                {selectedItem.categoria} - {selectedItem.tipo_medida}
              </Text>
            </View>
          )}

          <TextInput
            style={styles.input}
            placeholder="Cantidad"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
            value={cantidad}
            onChangeText={setCantidad}
            editable={!loading}
          />

          {/* BOTONES */}
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.btn, styles.cancel]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.btnText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.confirm]}
              onPress={handleAdd}
              disabled={loading}
            >
              <Text style={styles.btnText}>
                {loading ? "Guardando..." : "Agregar"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Overlay al guardar */}
        {loading && <LoadingOverlay />}
      </View>
    </Modal>
  );
}

// ================================ ESTILOS ================================
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalBox: {
    width: "100%",
    backgroundColor: "#1E293B",
    borderRadius: 10,
    padding: 16,
  },
  title: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
  },
  input: {
    backgroundColor: "#0F172A",
    color: "#FFF",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155",
    marginBottom: 10,
  },
  list: { maxHeight: 150, marginBottom: 10 },
  option: {
    backgroundColor: "#0F172A",
    padding: 10,
    borderRadius: 6,
    marginBottom: 6,
  },
  optionName: { color: "#FFF", fontWeight: "600" },
  optionCode: { color: "#93C5FD", fontSize: 12 },
  optionInfo: { color: "#CBD5E1", fontSize: 12 },
  selectedBox: {
    padding: 12,
    backgroundColor: "#0F172A",
    borderRadius: 8,
    marginBottom: 10,
  },
  selectedName: { color: "#FFF", fontWeight: "700", fontSize: 15 },
  selectedCode: { color: "#93C5FD", marginTop: 4 },
  selectedInfo: { color: "#CBD5E1", marginTop: 4 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  btn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 4,
  },
  cancel: { backgroundColor: "#64748B" },
  confirm: { backgroundColor: "#0EA5E9" },
  btnText: { color: "#FFF", fontWeight: "600" },

  // LOADING OVERLAY
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingBox: {
    backgroundColor: "#1E293B",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  loadingText: {
    color: "#FFF",
    marginTop: 10,
    fontWeight: "600",
  },
});
