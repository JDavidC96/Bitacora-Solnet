import { addDoc, collection, deleteDoc, doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useUser } from "../context/UserContext"; // Acceder al rol del usuario
import { db } from "../firebase/firebaseConfig";

export default function PersonalScreen() {
  const { role } = useUser(); // rol actual
  const [personal, setPersonal] = useState([]);
  const [nombre, setNombre] = useState("");
  const [cargo, setCargo] = useState("");
  const [showForm, setShowForm] = useState(false);

  // Escuchar cambios en la colección "personal"
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "personal"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setPersonal(data);
    });
    return () => unsubscribe();
  }, []);

  // Agregar nueva persona (solo admin/ingeniero)
  const handleAdd = async () => {
    if (!nombre.trim() || !cargo.trim()) {
      Alert.alert("Error", "Debes ingresar nombre y cargo");
      return;
    }

    try {
      await addDoc(collection(db, "personal"), {
        nombre,
        cargo,
        estado: "libre",
        proyectoAsignado: null,
      });
      setNombre("");
      setCargo("");
      setShowForm(false);
    } catch (error) {
      console.error("Error agregando personal:", error);
    }
  };

  // Eliminar persona (solo admin)
  const handleDelete = async (id, nombre) => {
    Alert.alert("Confirmar", `¿Eliminar a ${nombre}?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "personal", id));
          } catch (error) {
            console.error("Error eliminando personal:", error);
          }
        },
      },
    ]);
  };

  // Renderizar cada persona
  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.nombre}</Text>
        <Text style={styles.role}>{item.cargo}</Text>
        <Text style={{ color: item.estado === "libre" ? "lime" : "red" }}>
          {item.estado === "libre"
            ? "🟢 Libre"
            : `🔴 Ocupado en ${item.proyectoAsignado || "un proyecto"}`}
        </Text>
      </View>

      {/* Solo admin puede eliminar */}
      {(role === "Administrador") && (
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDelete(item.id, item.nombre)}
        >
          <Text style={styles.deleteText}>🗑️</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gestión de Personal</Text>

      {/* Solo admin/ingeniero pueden crear */}
      {(role === "Administrador" || role === "Ingeniero") && (
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: showForm ? "#E53E3E" : "#38B2AC" },
          ]}
          onPress={() => setShowForm(!showForm)}
        >
          <Text style={styles.buttonText}>
            {showForm ? "❌ Cancelar" : "➕ Crear Persona"}
          </Text>
        </TouchableOpacity>
      )}

      {/* Formulario de creación */}
      {showForm && (role === "Administrador" || role === "Ingeniero") && (
        <View style={styles.formBox}>
          <TextInput
            style={styles.input}
            placeholder="Nombre"
            placeholderTextColor="#aaa"
            value={nombre}
            onChangeText={setNombre}
          />
          <TextInput
            style={styles.input}
            placeholder="Cargo"
            placeholderTextColor="#aaa"
            value={cargo}
            onChangeText={setCargo}
          />
          <TouchableOpacity style={styles.button} onPress={handleAdd}>
            <Text style={styles.buttonText}>✅ Guardar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Lista del personal (todos la ven) */}
      <FlatList
        data={personal}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 100 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1E1E2F", padding: 16 },
  title: {
    fontSize: 22,
    color: "#FFF",
    marginBottom: 12,
    fontWeight: "bold",
    textAlign: "center",
  },
  formBox: {
    backgroundColor: "#2C2C3A",
    padding: 16,
    borderRadius: 10,
    marginBottom: 20,
  },
  input: {
    backgroundColor: "#1E1E2F",
    color: "#FFF",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  button: {
    backgroundColor: "#38B2AC",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
  },
  buttonText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
  card: {
    backgroundColor: "#2C2C3A",
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  name: { color: "#FFF", fontSize: 18, fontWeight: "bold" },
  role: { color: "#aaa", fontSize: 14, marginBottom: 6 },
  deleteBtn: {
    backgroundColor: "#E53E3E",
    borderRadius: 6,
    padding: 8,
  },
  deleteText: { color: "#FFF", fontSize: 18 },
});
