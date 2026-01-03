// app/InventoryHistoryScreen.js
// ✔ Historial completo y consistente
// ✔ Soporta datos viejos y nuevos
// ✔ Nombre humano SIEMPRE visible

import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import normalize from "../utils/normalize";

// Hooks
import { useInventoryHistory } from "../hooks/useInventoryHistory";

// Componentes
import HistoryItem from "../components/inventory/HistoryItem";
import SearchHeader from "../components/inventory/SearchHeader";

/* ======================================================
 * Resolver nombre humano del movimiento (CLAVE)
 * ====================================================== */
const getActorName = (m) =>
  m.actorNombre ||
  m.usuario ||
  m.createdBy ||
  m.updatedBy ||
  "Sistema";

export default function InventoryHistoryScreen() {
  const router = useRouter();
  const { movements, loading, error, refreshHistory } = useInventoryHistory();

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  /* ==============================
   * TIPOS DE MOVIMIENTO
   * ============================== */
  const movementTypes = [
    { key: "all", label: "Todos", color: "#CBD5E1" },
    { key: "entrada", label: "Entradas", color: "#22C55E" },
    { key: "salida", label: "Salidas", color: "#EF4444" },
    { key: "movimiento", label: "Ingreso a Proyecto", color: "#3B82F6" },
    { key: "entrada_externa", label: "Material Externo", color: "#0EA5E9" },
    { key: "uso", label: "Uso", color: "#FACC15" },
    { key: "devolucion", label: "Devolución", color: "#14B8A6" },
    { key: "transferencia", label: "Transferencias", color: "#A855F7" },
  ];

  /* ==============================
   * KPIs
   * ============================== */
  const stats = useMemo(() => {
    const s = {
      total: movements.length,
      entrada: 0,
      salida: 0,
      movimiento: 0,
      entrada_externa: 0,
      uso: 0,
      devolucion: 0,
      transferencia: 0,
    };

    movements.forEach((m) => {
      if (s[m.tipo] !== undefined) s[m.tipo]++;
    });

    return s;
  }, [movements]);

  /* ==============================
   * FILTRO + BÚSQUEDA
   * ============================== */
  const filteredMovements = useMemo(() => {
    const q = normalize(searchQuery);

    return movements
      .filter((m) => {
        const actor = getActorName(m);

        const matchesSearch =
          normalize(m.material || "").includes(q) ||
          normalize(actor).includes(q) ||
          normalize(m.origen || "").includes(q) ||
          normalize(m.destino || "").includes(q) ||
          normalize(m.notas || "").includes(q);

        const matchesType = typeFilter === "all" || m.tipo === typeFilter;

        return matchesSearch && matchesType;
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [movements, searchQuery, typeFilter]);

  /* ==============================
   * REFRESH
   * ============================== */
  const onRefresh = async () => {
    setRefreshing(true);
    await refreshHistory();
    setRefreshing(false);
  };

  /* ==============================
   * ERROR
   * ============================== */
  if (error) {
    return (
      <LinearGradient colors={["#334155", "#1E293B"]} style={{ flex: 1 }}>
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Error cargando historial</Text>
          <Text style={styles.errorDesc}>{error.message}</Text>

          <TouchableOpacity style={styles.retryBtn} onPress={refreshHistory}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  /* ==============================
   * UI
   * ============================== */
  return (
    <LinearGradient colors={["#0F172A", "#1E293B"]} style={{ flex: 1 }}>
      <View style={styles.container}>
        {/* Back */}
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Volver</Text>
        </TouchableOpacity>

        {/* Título */}
        <Text style={styles.title}>Historial de Movimientos</Text>

        {/* Buscador */}
        <SearchHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          placeholder="Buscar… material, usuario, proyecto…"
        />

        {/* Filtros */}
        <View style={styles.typeFilterRow}>
          <FlatList
            data={movementTypes}
            horizontal
            keyExtractor={(i) => i.key}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.typeBadge,
                  typeFilter === item.key && {
                    backgroundColor: item.color,
                  },
                ]}
                onPress={() => setTypeFilter(item.key)}
              >
                <Text
                  style={[
                    styles.typeText,
                    typeFilter === item.key && { color: "#000" },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* KPIs */}
        <View style={styles.statsBox}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>

          {movementTypes
            .filter((t) => t.key !== "all")
            .map((t) => (
              <View
                key={t.key}
                style={[styles.statCard, { borderLeftColor: t.color }]}
              >
                <Text style={[styles.statNumber, { color: t.color }]}>
                  {stats[t.key]}
                </Text>
                <Text style={styles.statLabel}>{t.label}</Text>
              </View>
            ))}
        </View>

        {/* Lista */}
        <FlatList
          data={filteredMovements}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <HistoryItem
              movement={{
                ...item,
                actorNombre: getActorName(item), // 👈 AQUÍ CLAVE
              }}
            />
          )}
          contentContainerStyle={styles.listPad}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#3B82F6"]}
              tintColor="#3B82F6"
            />
          }
        />
      </View>
    </LinearGradient>
  );
}

/* ======================================================
 * ESTILOS
 * ====================================================== */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 18,
    paddingTop: 50,
  },
  back: { color: "#CBD5E1", fontSize: 15, marginBottom: 12 },
  title: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 22,
    marginBottom: 20,
    textAlign: "center",
  },

  typeFilterRow: { marginBottom: 12 },
  typeBadge: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: "#334155",
    borderRadius: 20,
    marginRight: 8,
  },
  typeText: { color: "#FFF", fontWeight: "600" },

  statsBox: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
  },
  statCard: {
    width: "33%",
    paddingVertical: 10,
    borderLeftWidth: 2,
    borderLeftColor: "#475569",
    alignItems: "center",
  },
  statNumber: { color: "#FFF", fontWeight: "700", fontSize: 16 },
  statLabel: { color: "#94A3B8", fontSize: 11 },

  listPad: { paddingBottom: 50 },

  errorBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorTitle: {
    color: "#F87171",
    fontSize: 20,
    fontWeight: "700",
  },
  errorDesc: {
    color: "#DDD",
    marginVertical: 10,
    textAlign: "center",
  },
  retryBtn: {
    backgroundColor: "#3B82F6",
    padding: 12,
    borderRadius: 10,
    marginTop: 16,
  },
  retryText: { color: "#FFF", fontWeight: "700" },
});
