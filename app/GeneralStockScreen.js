import { LinearGradient } from "expo-linear-gradient";
import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Alert, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useUser } from "../context/UserContext";
import { db } from "../firebase/firebaseConfig";

export default function GeneralStockScreen() {
  const { role } = useUser();
  const [items, setItems] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [moveModalVisible, setMoveModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [form, setForm] = useState({ nombre: "", cantidad: "", tipo_medida: "", notas: "" });
  const [moveCantidad, setMoveCantidad] = useState("");
  const [proyectoDestino, setProyectoDestino] = useState(null);

  const canEdit = role === "Administrador" || role === "Almacenista" || role === "Supervisor" || role === "Ingeniero";

  // === Cargar inventario general ===
  const fetchData = async () => {
    try {
      const snapshot = await getDocs(collection(db, "inventario_general"));
      setItems(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));

      // cargar proyectos disponibles
      const proyectosSnap = await getDocs(collection(db, "proyectos"));
      setProyectos(proyectosSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error cargando inventario general:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // === Guardar (crear/editar) ===
  const handleSave = async () => {
    if (!form.nombre || !form.cantidad) {
      Alert.alert("Error", "Debes completar nombre y cantidad");
      return;
    }
    try {
      if (editingItem) {
        const ref = doc(db, "inventario_general", editingItem.id);
        await updateDoc(ref, { ...form, cantidad: parseInt(form.cantidad) });
      } else {
        await addDoc(collection(db, "inventario_general"), {
          ...form,
          cantidad: parseInt(form.cantidad),
          ultimaModificacion: new Date(),
        });
      }
      setModalVisible(false);
      setForm({ nombre: "", cantidad: "", tipo_medida: "", notas: "" });
      setEditingItem(null);
      fetchData();
    } catch (error) {
      console.error("Error guardando ítem:", error);
    }
  };

  // === Eliminar ===
  const handleDelete = async (id) => {
    Alert.alert("Eliminar", "¿Seguro deseas eliminar este ítem?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "inventario_general", id));
            fetchData();
          } catch (error) {
            console.error("Error eliminando ítem:", error);
          }
        },
      },
    ]);
  };

  // === Mover ítem a un proyecto ===
  const handleMove = async () => {
    if (!moveCantidad || !proyectoDestino) {
      Alert.alert("Error", "Debes indicar cantidad y proyecto destino");
      return;
    }

    const cantidadInt = parseInt(moveCantidad);
    if (cantidadInt > selectedItem.cantidad) {
      Alert.alert("Error", "No puedes mover más de lo que hay disponible");
      return;
    }

    try {
      // Restar del inventario general
      const refActual = doc(db, "inventario_general", selectedItem.id);
      await updateDoc(refActual, {
        cantidad: selectedItem.cantidad - cantidadInt,
      });

      // Sumar en el inventario del proyecto destino
      const colDestino = collection(db, `proyectos/${proyectoDestino}/inventario`);
      const snapshot = await getDocs(colDestino);
      const existente = snapshot.docs.find((d) => d.data().nombre === selectedItem.nombre);

      if (existente) {
        await updateDoc(doc(db, `proyectos/${proyectoDestino}/inventario`, existente.id), {
          cantidad: existente.data().cantidad + cantidadInt,
        });
      } else {
        await addDoc(colDestino, {
          ...selectedItem,
          cantidad: cantidadInt,
        });
      }

      Alert.alert("Éxito", "Movimiento realizado con éxito");
      setMoveModalVisible(false);
      setMoveCantidad("");
      setProyectoDestino(null);
      fetchData();
    } catch (error) {
      console.error("Error moviendo ítem:", error);
    }
  };

  return (
    <LinearGradient colors={["#6a11cb", "#2575fc"]} style={styles.container}>
      <Text style={styles.title}>Inventario General ({role})</Text>

      {/* Botón agregar solo si puede editar */}
      {canEdit && (
        <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.addButtonText}>+ Agregar Ítem</Text>
        </TouchableOpacity>
      )}

      {/* Lista de inventario */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.name}>{item.nombre}</Text>
            <Text>Cantidad: {item.cantidad} ({item.tipo_medida})</Text>
            <Text>Notas: {item.notas}</Text>

            {canEdit && (
              <View style={styles.actions}>
                {/* Botón mover */}
                <TouchableOpacity
                  style={styles.moveButton}
                  onPress={() => {
                    setSelectedItem(item);
                    setMoveModalVisible(true);
                  }}
                >
                  <Text style={styles.moveText}>Mover</Text>
                </TouchableOpacity>

                {/* Botón eliminar */}
                <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item.id)}>
                  <Text style={styles.deleteText}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      />

      {/* Modal para agregar/editar */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{editingItem ? "Editar Ítem" : "Nuevo Ítem"}</Text>

            <TextInput
              placeholder="Nombre"
              style={styles.input}
              value={form.nombre}
              onChangeText={(text) => setForm({ ...form, nombre: text.toLowerCase() })}
            />
            <TextInput
              placeholder="Cantidad"
              style={styles.input}
              keyboardType="numeric"
              value={String(form.cantidad)}
              onChangeText={(text) => setForm({ ...form, cantidad: text })}
            />
            <TextInput
              placeholder="Tipo de medida (unidad / metro)"
              style={styles.input}
              value={form.tipo_medida}
              onChangeText={(text) => setForm({ ...form, tipo_medida: text })}
            />
            <TextInput
              placeholder="Notas"
              style={styles.input}
              value={form.notas}
              onChangeText={(text) => setForm({ ...form, notas: text })}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveText}>Guardar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setModalVisible(false);
                  setEditingItem(null);
                }}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para mover */}
      <Modal visible={moveModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Mover Ítem</Text>
            <Text>{selectedItem?.nombre}</Text>

            <TextInput
              placeholder="Cantidad a mover"
              style={styles.input}
              keyboardType="numeric"
              value={moveCantidad}
              onChangeText={setMoveCantidad}
            />

            <Text style={{ marginVertical: 8 }}>Proyecto destino:</Text>
            <FlatList
              data={proyectos}
              keyExtractor={(p) => p.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.projectItem}
                  onPress={() => setProyectoDestino(item.id)}
                >
                  <Text style={{ color: proyectoDestino === item.id ? "blue" : "black" }}>
                    {item.title}
                  </Text>
                </TouchableOpacity>
              )}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.saveButton} onPress={handleMove}>
                <Text style={styles.saveText}>Confirmar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setMoveModalVisible(false);
                  setSelectedItem(null);
                }}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: "bold", color: "#fff", marginBottom: 16 },
  addButton: { backgroundColor: "#fff", padding: 12, borderRadius: 8, marginBottom: 12 },
  addButtonText: { color: "#2575fc", fontWeight: "bold", textAlign: "center" },
  item: { backgroundColor: "rgba(255,255,255,0.9)", padding: 12, borderRadius: 8, marginBottom: 10 },
  name: { fontWeight: "bold", fontSize: 16, marginBottom: 4 },
  actions: { flexDirection: "row", marginTop: 8, justifyContent: "flex-end" },
  moveButton: { marginRight: 12 },
  moveText: { color: "#2575fc", fontWeight: "bold" },
  deleteButton: {},
  deleteText: { color: "red", fontWeight: "bold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContainer: { width: "85%", backgroundColor: "#fff", padding: 20, borderRadius: 10 },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 12 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 6, padding: 8, marginBottom: 10 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end" },
  saveButton: { marginRight: 12 },
  saveText: { color: "#2575fc", fontWeight: "bold" },
  cancelButton: {},
  cancelText: { color: "red", fontWeight: "bold" },
  projectItem: { padding: 8, borderBottomWidth: 1, borderBottomColor: "#ddd" },
});
