// app/PersonalHistoryScreen.js
import { LinearGradient } from "expo-linear-gradient";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, View } from "react-native";
import { db } from "../firebase/firebaseConfig";

export default function PersonalHistoryScreen() {
  const [historial, setHistorial] = useState([]);
  const [search, setSearch] = useState("");

  /* =====================================================
   * LISTENER HISTORIAL (MODELO NUEVO)
   * ===================================================== */
  useEffect(() => {
    const q = query(
      collection(db, "historial_personal"),
      orderBy("fechaInicio", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setHistorial(data);
    });

    return () => unsub();
  }, []);

  /* =====================================================
   * FILTRO
   * ===================================================== */
  const filteredData = useMemo(() => {
    if (!search.trim()) return historial;

    const q = search.toLowerCase();
    return historial.filter(
      (item) =>
        item.nombre?.toLowerCase().includes(q) ||
        item.destino?.toLowerCase().includes(q)
    );
  }, [historial, search]);

  /* =====================================================
   * RENDER ITEM
   * ===================================================== */
  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.title}>👤 {item.nombre}</Text>
      <Text style={styles.subtitle}>📍 {item.destino}</Text>

      <Text style={styles.date}>
        Inicio:{" "}
        {new Date(item.fechaInicio).toLocaleString("es-CO", {
          timeZone: "America/Bogota",
        })}
      </Text>

      {item.fechaFin ? (
        <Text style={styles.date}>
          Fin:{" "}
          {new Date(item.fechaFin).toLocaleString("es-CO", {
            timeZone: "America/Bogota",
          })}
        </Text>
      ) : (
        <Text style={[styles.date, styles.inProgress]}>
          ⏳ En curso
        </Text>
      )}
    </View>
  );

  return (
    <LinearGradient colors={["#4e54c8", "#8f94fb"]} style={styles.container}>
      <Text style={styles.header}>Historial General</Text>

      <TextInput
        style={styles.searchBar}
        placeholder="Buscar por nombre o destino..."
        placeholderTextColor="#AAA"
        value={search}
        onChangeText={setSearch}
      />

      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={
          <Text style={styles.empty}>No hay historial registrado.</Text>
        }
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: {
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
  title: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  subtitle: { color: "#D1D5DB", marginTop: 2 },
  date: { color: "#E5E7EB", marginTop: 6 },
  inProgress: { color: "#FBBF24", fontWeight: "600" },
  empty: { color: "#FFF", textAlign: "center", marginTop: 20 },
});
