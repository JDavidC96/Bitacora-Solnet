import { LinearGradient } from "expo-linear-gradient";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, View } from "react-native";
import { db } from "../firebase/firebaseConfig";

export default function EquipmentHistoryScreen() {
  const [historial, setHistorial] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const q = query(
      collection(db, "historial_herramientas"),
      orderBy("fecha", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setHistorial(data);
      setFilteredData(data);
    });
    return () => unsub();
  }, []);

  const handleSearch = (text) => {
    setSearch(text);
    if (text.trim() === "") {
      setFilteredData(historial);
    } else {
      const filtered = historial.filter(
        (item) =>
          (item.accion &&
            item.accion.toLowerCase().includes(text.toLowerCase())) ||
          (item.herramienta &&
            item.herramienta.toLowerCase().includes(text.toLowerCase())) ||
          (item.usuario &&
            item.usuario.toLowerCase().includes(text.toLowerCase()))
      );
      setFilteredData(filtered);
    }
  };

  const getCardStyle = (accion) => {
    if (!accion) return { backgroundColor: "#2C2C3A" };
    if (accion.includes("agregó")) return { borderLeftColor: "#A0AEC0" }; // gris
    if (accion.includes("asignado")) return { borderLeftColor: "#3182CE" }; // azul
    if (accion.includes("prestado")) return { borderLeftColor: "#ECC94B" }; // amarillo
    if (accion.includes("devuelto")) return { borderLeftColor: "#48BB78" }; // verde
    if (accion.includes("transferido")) return { borderLeftColor: "#9F7AEA" }; // morado
    if (accion.includes("eliminó")) return { borderLeftColor: "#E53E3E" }; // rojo
    return { borderLeftColor: "#2C2C3A" };
  };

  const renderItem = ({ item }) => (
    <View style={[styles.card, getCardStyle(item.accion)]}>
      <Text style={styles.date}>
        {new Date(item.fecha).toLocaleString()}
      </Text>
      <Text style={styles.detail}>{item.accion}</Text>
      <Text style={styles.subDetail}>🔧 {item.herramienta}</Text>
      {item.usuario && <Text style={styles.subDetail}>👤 {item.usuario}</Text>}
    </View>
  );

  return (
    <LinearGradient colors={["#141E30", "#243B55"]} style={styles.container}>
      <Text style={styles.title}>📜 Historial de Herramientas</Text>

      {/* Barra de búsqueda */}
      <TextInput
        style={styles.searchBar}
        placeholder="Buscar por acción, herramienta o usuario..."
        placeholderTextColor="#AAA"
        value={search}
        onChangeText={handleSearch}
      />

      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={
          <Text style={{ color: "#FFF", textAlign: "center", marginTop: 20 }}>
            No se encontraron registros.
          </Text>
        }
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: {
    fontSize: 22,
    color: "#fff",
    marginBottom: 16,
    marginTop: 30,
    fontWeight: "bold",
    textAlign: "center",
  },
  searchBar: {
    backgroundColor: "#FFF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    fontSize: 16,
    color: "#000",
  },
  card: {
    backgroundColor: "#2C2C3A",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 6,
  },
  date: { color: "#aaa", fontSize: 12, marginBottom: 6 },
  detail: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  subDetail: { color: "#ddd", marginTop: 2 },
});
