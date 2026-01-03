// app/AdminHistoryScreen.js
import { LinearGradient } from "expo-linear-gradient";
import {
  collection,
  collectionGroup,
  getDocs,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { db } from "../firebase/firebaseConfig";
import { usePermissions } from "../hooks/usePermissions";
import { adminHistoryService } from "../services/adminHistoryService";

/* ======================================================
 * HELPERS FECHA
 * ====================================================== */
const toDateSafe = (value) => {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate();
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const formatDate = (value) => {
  const d = toDateSafe(value);
  return d ? d.toLocaleString() : "—";
};

const resolveNoteDate = (item) => {
  if (item.timestamp) return new Date(Number(item.timestamp));
  if (item.createdAt) return new Date(item.createdAt);
  if (item.fechaISO && item.hora)
    return new Date(`${item.fechaISO} ${item.hora}`);
  return item.fechaISO || null;
};

/* ======================================================
 * COMPONENT
 * ====================================================== */
export default function AdminHistoryScreen() {
  const { canProrrogaRole } = usePermissions();

  const [combinedHistory, setCombinedHistory] = useState([]);
  const [lastLogins, setLastLogins] = useState([]);
  const [systemStats, setSystemStats] = useState({});
  const [projectNames, setProjectNames] = useState({});

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  /* ======================================================
   * PERMISOS
   * ====================================================== */
  if (!canProrrogaRole) {
    return (
      <LinearGradient colors={["#141E30", "#243B55"]} style={styles.container}>
        <Text style={styles.errorText}>
          Acceso denegado. Solo administradores pueden ver esta pantalla.
        </Text>
      </LinearGradient>
    );
  }

  /* ======================================================
   * CARGA INICIAL
   * ====================================================== */
  useEffect(() => {
    loadInitialData();
    const cleanup = setupRealtimeListeners();
    return cleanup;
  }, []);

  const loadInitialData = async () => {
    try {
      const [logins, stats, projectsSnap] = await Promise.all([
        adminHistoryService.getLastLogins(),
        adminHistoryService.getSystemStats(),
        getDocs(collection(db, "proyectos")),
      ]);

      setLastLogins(logins);
      setSystemStats(stats);

      const map = {};
      projectsSnap.docs.forEach((d) => {
        map[d.id] = d.data().title || d.data().nombre || "Proyecto";
      });
      setProjectNames(map);
    } catch (err) {
      console.error("Error cargando datos admin:", err);
    }
  };

  /* ======================================================
   * REALTIME LISTENERS
   * ====================================================== */
  const setupRealtimeListeners = () => {
    const unsubscribes = [];

    // INVENTARIO
    unsubscribes.push(
      onSnapshot(
        query(
          collection(db, "inventario_movimientos"),
          orderBy("fecha", "desc")
        ),
        (snap) => {
          const data = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
            type: "inventario_movimientos",
          }));
          setCombinedHistory((prev) => [
            ...prev.filter((i) => i.type !== "inventario_movimientos"),
            ...data,
          ]);
        }
      )
    );

    // HERRAMIENTAS
    unsubscribes.push(
      onSnapshot(
        query(
          collection(db, "historial_herramientas"),
          orderBy("fecha", "desc")
        ),
        (snap) => {
          const data = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
            type: "historial_herramientas",
          }));
          setCombinedHistory((prev) => [
            ...prev.filter((i) => i.type !== "historial_herramientas"),
            ...data,
          ]);
        }
      )
    );

    // NOTAS (collectionGroup)
    unsubscribes.push(
      onSnapshot(
        query(collectionGroup(db, "notas"), orderBy("fechaISO", "desc")),
        (snap) => {
          const notes = snap.docs.map((d) => {
            const parts = d.ref.path.split("/");
            const projectId = parts[1];
            return {
              id: d.id,
              projectId,
              ...d.data(),
              type: "nota",
            };
          });

          setCombinedHistory((prev) => [
            ...prev.filter((i) => i.type !== "nota"),
            ...notes,
          ]);
        }
      )
    );

    return () => unsubscribes.forEach((u) => u());
  };

  /* ======================================================
   * REFRESH
   * ====================================================== */
  const onRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  };

  /* ======================================================
   * FILTROS + BUSQUEDA
   * ====================================================== */
  const filteredData = useMemo(() => {
    let data = [...combinedHistory];

    if (activeTab === "inventory")
      data = data.filter((i) => i.type === "inventario_movimientos");
    else if (activeTab === "equipment")
      data = data.filter((i) => i.type === "historial_herramientas");
    else if (activeTab === "notes")
      data = data.filter((i) => i.type === "nota");

    if (search.trim()) {
      const s = search.toLowerCase();
      data = data.filter((i) =>
        [
          i.material,
          i.herramienta,
          i.usuario,
          i.actorNombre,
          i.autor,
          i.texto,
          i.nota,
          i.descripcion,
          projectNames[i.projectId],
        ]
          .filter(Boolean)
          .some((v) => v.toLowerCase().includes(s))
      );
    }

    return data.sort(
      (a, b) =>
        toDateSafe(resolveNoteDate(b) || b.fecha)?.getTime?.() -
        toDateSafe(resolveNoteDate(a) || a.fecha)?.getTime?.()
    );
  }, [combinedHistory, activeTab, search, projectNames]);

  /* ======================================================
   * RENDERS
   * ====================================================== */
  const renderHistoryItem = ({ item }) => {
    const noteText =
      item.contenido ||
      item.texto ||
      item.nota ||
      item.descripcion ||
      item.mensaje ||
      item.detalle;

    return (
      <View style={getCardStyle(item.type)}>
        <Text style={styles.date}>
          {formatDate(resolveNoteDate(item) || item.fecha)}
        </Text>

        {item.type === "nota" && (
          <>
            <Text style={styles.detail}>
              📝 Nota – {projectNames[item.projectId] || "Proyecto"}
            </Text>
            {noteText && (
              <Text style={styles.noteContent}>{noteText}</Text>
            )}
            {item.autor && (
              <Text style={styles.subDetail}>👤 {item.autor}</Text>
            )}
          </>
        )}

        {item.type === "inventario_movimientos" && (
          <>
            <Text style={styles.detail}>
              {item.tipo || item.accion || "Movimiento de inventario"}
            </Text>
            {item.material && (
              <Text style={styles.subDetail}>📦 {item.material}</Text>
            )}
            {(item.usuario || item.actorNombre) && (
              <Text style={styles.subDetail}>
                👤 {item.usuario || item.actorNombre}
              </Text>
            )}
          </>
        )}

        {item.type === "historial_herramientas" && (
          <>
            <Text style={styles.detail}>{item.accion}</Text>
            {item.herramienta && (
              <Text style={styles.subDetail}>🔧 {item.herramienta}</Text>
            )}
            {item.usuario && (
              <Text style={styles.subDetail}>👤 {item.usuario}</Text>
            )}
          </>
        )}
      </View>
    );
  };

  const renderUserItem = ({ item }) => {
    const isActive = !!item.lastLogin;

    return (
      <View
        style={[
          styles.userCard,
          { borderLeftColor: isActive ? "#48BB78" : "#E53E3E" },
        ]}
      >
        <View style={styles.userHeader}>
          <Text style={styles.userEmail}>👤 {item.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{item.role}</Text>
          </View>
        </View>

        {item.nombre && (
          <Text style={styles.userName}>🧾 {item.nombre}</Text>
        )}

        <Text style={styles.userMeta}>
          🕒 Último login:{" "}
          {item.lastLogin ? formatDate(item.lastLogin) : "Nunca"}
        </Text>

        {item.lastActivity && (
          <Text style={styles.userMeta}>
            ⚡ Última actividad: {formatDate(item.lastActivity)}
          </Text>
        )}
      </View>
    );
  };

  /* ======================================================
   * UI
   * ====================================================== */
  return (
    <LinearGradient colors={["#141E30", "#243B55"]} style={styles.container}>
      <Text style={styles.title}>📊 Panel de Administrador</Text>
      <Text style={styles.subtitle}>
        Historial completo de actividades del sistema
      </Text>

      <TextInput
        style={styles.searchBar}
        placeholder="Buscar en todo el historial..."
        placeholderTextColor="#AAA"
        value={search}
        onChangeText={setSearch}
      />

      <View style={styles.tabsContainer}>
        {["all", "inventory", "equipment", "notes", "users"].map((tab) => (
          <Text
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            {tab === "all" && "Todos"}
            {tab === "inventory" && "📦 Inventario"}
            {tab === "equipment" && "🔧 Herramientas"}
            {tab === "notes" && "📝 Notas"}
            {tab === "users" && "👥 Usuarios"}
          </Text>
        ))}
      </View>

      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          📈 Usuarios: {systemStats.usuarios || 0} | Inventario:{" "}
          {systemStats.inventario_movimientos || 0} | Herramientas:{" "}
          {systemStats.historial_herramientas || 0}
        </Text>
      </View>

      {activeTab === "users" ? (
        <FlatList
          data={lastLogins}
          keyExtractor={(item) => item.uid}
          renderItem={renderUserItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#48BB78"]}
            />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No hay usuarios.</Text>
          }
        />
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id}
          renderItem={renderHistoryItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#48BB78"]}
            />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No hay registros.</Text>
          }
        />
      )}
    </LinearGradient>
  );
}

/* ======================================================
 * STYLES
 * ====================================================== */
const getCardStyle = (type) => ({
  backgroundColor: "#2C2C3A",
  padding: 12,
  borderRadius: 10,
  marginBottom: 12,
  borderLeftWidth: 6,
  borderLeftColor:
    type === "nota"
      ? "#9F7AEA"
      : type === "inventario_movimientos"
      ? "#3182CE"
      : "#ECC94B",
});

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: {
    fontSize: 24,
    color: "#fff",
    marginBottom: 8,
    marginTop: 40,
    fontWeight: "bold",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#ccc",
    marginBottom: 16,
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
  tabsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 4,
  },
  tab: {
    color: "#FFF",
    padding: 8,
    borderRadius: 6,
    fontSize: 12,
    backgroundColor: "#2C2C3A",
    textAlign: "center",
    flex: 1,
    minWidth: "19%",
  },
  activeTab: {
    backgroundColor: "#5A67D8",
    fontWeight: "bold",
  },
  statsContainer: {
    backgroundColor: "rgba(44,44,58,0.7)",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  statsText: {
    color: "#FFF",
    textAlign: "center",
    fontSize: 12,
  },
  date: {
    color: "#A0AEC0",
    fontSize: 12,
    marginBottom: 6,
  },
  detail: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subDetail: {
    color: "#ddd",
    marginTop: 2,
    fontSize: 14,
  },
  noteContent: {
    color: "#E2E8F0",
    fontSize: 15,
    marginTop: 6,
    marginBottom: 6,
    lineHeight: 20,
  },
  emptyText: {
    color: "#FFF",
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
  },

  /* USERS */
  userCard: {
    backgroundColor: "#1F2933",
    padding: 14,
    borderRadius: 12,
    marginBottom: 14,
    borderLeftWidth: 6,
    elevation: 3,
  },
  userHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  userEmail: {
    color: "#F7FAFC",
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
    marginRight: 8,
  },
  userName: {
    color: "#CBD5E0",
    fontSize: 14,
    marginTop: 4,
  },
  userMeta: {
    color: "#A0AEC0",
    fontSize: 13,
    marginTop: 4,
  },
  roleBadge: {
    backgroundColor: "#4C51BF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "bold",
  },

  errorText: {
    color: "#FFF",
    fontSize: 18,
    textAlign: "center",
    marginTop: 100,
    padding: 20,
  },
});
