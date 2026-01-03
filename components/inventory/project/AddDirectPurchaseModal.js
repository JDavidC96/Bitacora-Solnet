// components/inventory/project/AddDirectPurchaseModal.js

import { collection, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { db } from "../../../firebase/firebaseConfig";
import ModalBase from "../../ModalBase";

export default function AddDirectPurchaseModal({
  visible,
  onClose,
  onSave,
  loading,
  setLoading,
  user,
}) {
  // Catálogo
  const [catalogItems, setCatalogItems] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  // UI
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);

  // Cantidad y notas
  const [cantidad, setCantidad] = useState("");
  const [notas, setNotas] = useState("");

  useEffect(() => {
    if (visible) {
      loadCatalog();
      reset();
    }
  }, [visible]);

  const loadCatalog = async () => {
    setCatalogLoading(true);
    try {
      const snap = await getDocs(collection(db, "inventario_general"));
      const items = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setCatalogItems(items);
    } catch (err) {
      console.error("Error cargando catálogo:", err);
      Alert.alert("Error", "No se pudo cargar el inventario general.");
    }
    setCatalogLoading(false);
  };

  const reset = () => {
    setSearchQuery("");
    setSelectedItem(null);
    setCantidad("");
    setNotas("");
  };

  // Filtrar items del catálogo
  const filteredItems = catalogItems.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.nombre?.toLowerCase().includes(q) ||
      item.codigo?.toLowerCase().includes(q)
    );
  });

  const handleSelect = (item) => {
    setSelectedItem(item);
    setSearchQuery(item.nombre);
  };

  const handleSave = async () => {
    if (!selectedItem) {
      Alert.alert(
        "Item no encontrado",
        "Solicite al administrador crear el nuevo item."
      );
      return;
    }

    if (!cantidad || Number(cantidad) <= 0) {
      Alert.alert("Error", "La cantidad debe ser válida.");
      return;
    }

    const payload = {
      nombre: selectedItem.nombre,
      cantidadOriginal: Number(cantidad),
      cantidadActual: Number(cantidad),
      tipo_medida: selectedItem.tipo_medida,
      precioUnitario: Number(selectedItem.precio),
      precioTotal: Number(selectedItem.precio) * Number(cantidad),
      codigo: selectedItem.codigo || "",
      notas,
      idGeneral: selectedItem.id, // 🔒 Siempre viene del catálogo
      usuario: user?.email || "Sistema",
      fromPurchase: true,
    };

    try {
      setLoading(true);
      await onSave(payload);
      onClose();
      reset();
    } catch (err) {
      console.error("Error compra directa:", err);
      Alert.alert("Error", "No se pudo registrar la compra directa.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalBase
      visible={visible}
      title="Compra directa para el proyecto"
      onClose={() => {
        reset();
        onClose();
      }}
      footer={
        <TouchableOpacity
          style={[
            styles.addBtn,
            (!selectedItem || loading) && { opacity: 0.6 },
          ]}
          onPress={handleSave}
          disabled={!selectedItem || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.addText}>Agregar al proyecto</Text>
          )}
        </TouchableOpacity>
      }
    >
      {/* Buscador */}
      <TextInput
        style={styles.input}
        placeholder="Buscar por nombre o código..."
        placeholderTextColor="#999"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {catalogLoading ? (
        <ActivityIndicator color="#FFF" />
      ) : filteredItems.length > 0 ? (
        <FlatList
          data={filteredItems}
          keyboardShouldPersistTaps="handled"
          style={{ maxHeight: 220 }}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.itemRow,
                item.id === selectedItem?.id && styles.itemSelected,
              ]}
              onPress={() => handleSelect(item)}
            >
              <View>
                <Text style={styles.itemName}>{item.nombre}</Text>
                <Text style={styles.meta}>
                  Código: {item.codigo} · {item.tipo_medida}
                </Text>
              </View>

              <Text style={styles.itemPrice}>
                ${Number(item.precio).toLocaleString("es-CO")}
              </Text>
            </TouchableOpacity>
          )}
        />
      ) : (
        <View style={styles.noResults}>
          <Text style={styles.noResultsText}>
            Solicite al administrador crear el nuevo item.
          </Text>
        </View>
      )}

      {/* Cantidad y notas */}
      <TextInput
        style={styles.input}
        placeholder="Cantidad"
        placeholderTextColor="#999"
        keyboardType="numeric"
        value={cantidad}
        onChangeText={setCantidad}
      />

      <TextInput
        style={[styles.input, { height: 70 }]}
        placeholder="Notas (opcional)"
        placeholderTextColor="#999"
        multiline
        value={notas}
        onChangeText={setNotas}
      />
    </ModalBase>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: "#1E1E2F",
    borderRadius: 10,
    padding: 12,
    color: "#FFF",
    marginBottom: 12,
  },
  itemRow: {
    backgroundColor: "rgba(15,23,42,0.9)",
    padding: 12,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.3)",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  itemSelected: {
    borderColor: "#0EA5E9",
  },
  itemName: {
    color: "#FFF",
    fontWeight: "700",
  },
  itemPrice: {
    color: "#FACC15",
    fontWeight: "700",
  },
  meta: {
    color: "#AAA",
    fontSize: 12,
  },
  noResults: {
    backgroundColor: "#1E1E2F",
    padding: 20,
    borderRadius: 8,
    alignItems: "center",
  },
  noResultsText: {
    color: "#F87171",
    fontWeight: "600",
  },
  addBtn: {
    backgroundColor: "#0EA5E9",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  addText: {
    color: "#FFF",
    fontWeight: "700",
  },
});
