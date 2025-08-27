import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import { addDoc, collection, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View, } from "react-native";
import { useUser } from "../context/UserContext";
import { db } from "../firebase/firebaseConfig";

export default function ProjectStockScreen() {
  const { projectId, title } = useLocalSearchParams();
  const { role, user } = useUser();
  const [items, setItems] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [cantidadUsada, setCantidadUsada] = useState("");
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevaCantidad, setNuevaCantidad] = useState("");
  const [nuevaUnidad, setNuevaUnidad] = useState("");

  useEffect(() => {
    if (!projectId) return;

    const q = collection(db, "proyectos", projectId, "inventario");
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ idDoc: d.id, ...d.data() }));
      setItems(data);
    });

    return () => unsub();
  }, [projectId]);

  // === Manejar actualización de material usado ===
  const handleUpdate = async () => {
    if (!selectedItem || !cantidadUsada) return;

    const usado = parseFloat(cantidadUsada);
    if (isNaN(usado) || usado <= 0) {
      alert("Ingresa una cantidad válida");
      return;
    }

    const newCantidad = (selectedItem.cantidad || 0) - usado;
    if (newCantidad < 0) {
      alert("No puedes usar más de lo que hay en stock");
      return;
    }

    try {
      const itemRef = doc(db, "proyectos", projectId, "inventario", selectedItem.idDoc);
      await updateDoc(itemRef, {
        cantidad: newCantidad,
        lastUpdate: new Date().toISOString(),
        updatedBy: user?.email || "Desconocido",
      });

      setModalVisible(false);
      setCantidadUsada("");
      setSelectedItem(null);
    } catch (error) {
      console.error("Error al actualizar inventario:", error);
    }
  };

  // === Manejar agregar nuevo material ===
  const handleAdd = async () => {
    if (!nuevoNombre.trim() || !nuevaCantidad || !nuevaUnidad.trim()) {
      alert("Completa todos los campos");
      return;
    }

    try {
      await addDoc(collection(db, "proyectos", projectId, "inventario"), {
        nombre: nuevoNombre.toLowerCase(),
        cantidad: parseFloat(nuevaCantidad),
        unidad: nuevaUnidad,
        createdAt: new Date().toISOString(),
        createdBy: user?.email || "Desconocido",
      });

      setNuevoNombre("");
      setNuevaCantidad("");
      setNuevaUnidad("");
      setAddModalVisible(false);
    } catch (error) {
      console.error("Error al agregar material:", error);
    }
  };

  const canEdit = ["Administrador", "Supervisor", "Almacenista"].includes(role);
  const canAdd = role === "Almacenista";

  return (
    <LinearGradient colors={["#1E1E2F", "#2C2C3A"]} style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.title}>📦 Inventario de {title}</Text>

        {canAdd && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setAddModalVisible(true)}
          >
            <Text style={styles.addButtonText}>➕ Agregar Material</Text>
          </TouchableOpacity>
        )}

        {items.length === 0 ? (
          <Text style={styles.empty}>No hay materiales en este proyecto</Text>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.idDoc}
            renderItem={({ item }) => (
              <View style={styles.item}>
                <Text style={styles.itemName}>{item.nombre}</Text>
                <Text style={styles.itemDetails}>
                  {item.cantidad} {item.unidad}
                </Text>
                {item.updatedBy && (
                  <Text style={styles.itemStamp}>
                    Última actualización por {item.updatedBy}
                  </Text>
                )}
                {canEdit && (
                  <TouchableOpacity
                    style={styles.updateButton}
                    onPress={() => {
                      setSelectedItem(item);
                      setModalVisible(true);
                    }}
                  >
                    <Text style={styles.updateButtonText}>✏️ Actualizar</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          />
        )}
      </View>

      {/* === Modal para actualizar material === */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              Actualizar uso de {selectedItem?.nombre}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Cantidad usada"
              placeholderTextColor="#aaa"
              keyboardType="numeric"
              value={cantidadUsada}
              onChangeText={setCantidadUsada}
            />
            <TouchableOpacity style={styles.saveButton} onPress={handleUpdate}>
              <Text style={styles.saveButtonText}>💾 Guardar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: "#E53E3E" }]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.saveButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* === Modal para agregar material (solo almacenista) === */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>➕ Agregar nuevo material</Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre del material"
              placeholderTextColor="#aaa"
              value={nuevoNombre}
              onChangeText={setNuevoNombre}
            />
            <TextInput
              style={styles.input}
              placeholder="Cantidad"
              placeholderTextColor="#aaa"
              keyboardType="numeric"
              value={nuevaCantidad}
              onChangeText={setNuevaCantidad}
            />
            <TextInput
              style={styles.input}
              placeholder="Unidad (ej: metros, kg, piezas)"
              placeholderTextColor="#aaa"
              value={nuevaUnidad}
              onChangeText={setNuevaUnidad}
            />
            <TouchableOpacity style={styles.saveButton} onPress={handleAdd}>
              <Text style={styles.saveButtonText}>💾 Guardar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: "#E53E3E" }]}
              onPress={() => setAddModalVisible(false)}
            >
              <Text style={styles.saveButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { color: "#FFF", fontSize: 20, marginBottom: 16, fontWeight: "bold" },
  empty: { color: "#888", textAlign: "center", marginTop: 20 },
  item: {
    padding: 12,
    backgroundColor: "rgba(44,44,58,0.9)",
    borderRadius: 8,
    marginBottom: 10,
  },
  itemName: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
  itemDetails: { color: "#AAA", marginTop: 4 },
  itemStamp: { color: "#38B2AC", fontSize: 12, marginTop: 4 },
  updateButton: {
    backgroundColor: "#3182CE",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 8,
    alignItems: "center",
  },
  updateButtonText: { color: "#FFF", fontWeight: "600" },
  addButton: {
    backgroundColor: "#38A169",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 16,
  },
  addButtonText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },

  // === Modal ===
  modalBackground: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalBox: {
    backgroundColor: "#2C2C3A",
    padding: 20,
    borderRadius: 10,
    width: "80%",
  },
  modalTitle: { color: "#FFF", fontSize: 18, marginBottom: 12 },
  input: {
    backgroundColor: "#1E1E2F",
    color: "#FFF",
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: "#38A169",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    alignItems: "center",
  },
  saveButtonText: { color: "#FFF", fontWeight: "bold" },
});
