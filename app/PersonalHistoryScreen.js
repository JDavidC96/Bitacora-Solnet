import { LinearGradient } from "expo-linear-gradient";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, View } from "react-native";
import { db } from "../firebase/firebaseConfig";

export default function PersonalHistoryScreen() {
  const [historial, setHistorial] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const q = query(
      collection(db, "historial_personal"),
      orderBy("fechaInicio", "desc")
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
          item.nombre.toLowerCase().includes(text.toLowerCase()) ||
          item.destino.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredData(filtered);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.destino}>👤 {item.nombre}</Text>
      <Text style={styles.destino}>📍 {item.destino}</Text>
      <Text style={styles.fechas}>
        Inicio: {new Date(item.fechaInicio).toLocaleString()}
      </Text>
      {item.fechaFin ? (
        <Text style={styles.fechas}>
          Fin: {new Date(item.fechaFin).toLocaleString()}
        </Text>
      ) : (
        <Text style={[styles.fechas, { color: "orange" }]}>
          ⏳ En curso
        </Text>
      )}
    </View>
  );

  return (
    <LinearGradient colors={["#4e54c8", "#8f94fb"]} style={styles.container}>
      <Text style={styles.title}>Historial General</Text>

      {/* Barra de búsqueda */}
      <TextInput
        style={styles.searchBar}
        placeholder="Buscar por nombre o destino..."
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
            No hay historial registrado.
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
    color: "#FFF",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
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
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  destino: { color: "#FFF", fontSize: 16, fontWeight: "600" },
  fechas: { color: "#CCC", marginTop: 4 },
});
