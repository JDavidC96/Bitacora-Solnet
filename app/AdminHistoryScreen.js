// app/AdminHistoryScreen.js
import { LinearGradient } from "expo-linear-gradient";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { useUser } from "../context/UserContext";
import { db } from "../firebase/firebaseConfig";
import { usePermissions } from "../hooks/usePermissions";
import { adminHistoryService } from "../services/adminHistoryService";

export default function AdminHistoryScreen() {
  const { role } = useUser();
  const { canProrrogaRole } = usePermissions();
  
  const [combinedHistory, setCombinedHistory] = useState([]);
  const [lastLogins, setLastLogins] = useState([]);
  const [systemStats, setSystemStats] = useState({});
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  // Verificar permisos
  if (!canProrrogaRole) {
    return (
      <LinearGradient colors={["#141E30", "#243B55"]} style={styles.container}>
        <Text style={styles.errorText}>Acceso denegado. Solo administradores pueden ver esta pantalla.</Text>
      </LinearGradient>
    );
  }

  // Cargar datos iniciales
  useEffect(() => {
    loadAllData();
    setupRealtimeListeners();
  }, []);

  const loadAllData = async () => {
    try {
      const [logins, stats, notes] = await Promise.all([
        adminHistoryService.getLastLogins(),
        adminHistoryService.getSystemStats(),
        adminHistoryService.getRecentNotes(20)
      ]);
      setLastLogins(logins);
      setSystemStats(stats);
      
      // Combinar notas con el historial
      setCombinedHistory(prev => {
        const filtered = prev.filter(item => item.type !== 'nota');
        return [...filtered, ...notes].sort((a, b) => 
          new Date(b.fecha?.toDate?.() || b.fecha) - new Date(a.fecha?.toDate?.() || a.fecha)
        );
      });
    } catch (error) {
      console.error('Error cargando datos:', error);
    }
  };

  const setupRealtimeListeners = () => {
    const collections = [
      "historial_herramientas",
      "inventario_movimientos"
    ];

    const unsubscribes = [];

    collections.forEach(collectionName => {
      const q = query(
        collection(db, collectionName),
        orderBy("fecha", "desc")
      );
      
      const unsub = onSnapshot(q, (snap) => {
        const newData = snap.docs.map((d) => ({ 
          id: d.id, 
          ...d.data(),
          type: collectionName
        }));
        
        // Actualizar datos combinados manteniendo el estado anterior
        setCombinedHistory(prev => {
          const otherData = prev.filter(item => item.type !== collectionName && item.type !== 'nota');
          return [...otherData, ...newData].sort((a, b) => 
            new Date(b.fecha?.toDate?.() || b.fecha) - new Date(a.fecha?.toDate?.() || a.fecha)
          );
        });
      });
      
      unsubscribes.push(unsub);
    });

    return () => unsubscribes.forEach(unsub => unsub());
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  const handleSearch = (text) => {
    setSearch(text);
  };

  const filterByTab = (data) => {
    let filtered = data;
    
    if (activeTab === "all") filtered = data;
    else if (activeTab === "inventory") filtered = data.filter(item => item.type === "inventario_movimientos");
    else if (activeTab === "equipment") filtered = data.filter(item => item.type === "historial_herramientas");
    else if (activeTab === "notes") filtered = data.filter(item => item.type === "nota");
    
    // Aplicar búsqueda
    if (search.trim()) {
      filtered = filtered.filter(item =>
        (item.accion && item.accion.toLowerCase().includes(search.toLowerCase())) ||
        (item.herramienta && item.herramienta.toLowerCase().includes(search.toLowerCase())) ||
        (item.usuario && item.usuario.toLowerCase().includes(search.toLowerCase())) ||
        (item.material && item.material.toLowerCase().includes(search.toLowerCase())) ||
        (item.contenido && item.contenido.toLowerCase().includes(search.toLowerCase())) ||
        (item.projectTitle && item.projectTitle.toLowerCase().includes(search.toLowerCase())) ||
        (item.autor && item.autor.toLowerCase().includes(search.toLowerCase()))
      );
    }
    
    return filtered;
  };

  const getCardStyle = (type) => {
    const baseStyle = { backgroundColor: "#2C2C3A", padding: 12, borderRadius: 8, marginBottom: 12, borderLeftWidth: 6 };
    
    const colors = {
      "inventario_movimientos": "#3182CE", 
      "historial_herramientas": "#ECC94B",
      "nota": "#9F7AEA"
    };
    
    return { ...baseStyle, borderLeftColor: colors[type] || "#718096" };
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "inventario_movimientos": return "📦";
      case "historial_herramientas": return "🔧";
      case "nota": return "📝";
      default: return "📄";
    }
  };

  const formatDate = (date) => {
    if (!date) return "Nunca";
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleString();
  };

  const renderHistoryItem = ({ item }) => (
    <View style={getCardStyle(item.type)}>
      <View style={styles.itemHeader}>
        <Text style={styles.typeIcon}>{getTypeIcon(item.type)}</Text>
        <Text style={styles.date}>{formatDate(item.fecha)}</Text>
      </View>
      
      {item.type === "inventario_movimientos" && (
        <>
          <Text style={styles.detail}>{item.accion || "Movimiento de inventario"}</Text>
          {item.material && <Text style={styles.subDetail}>📦 {item.material}</Text>}
          {item.usuario && <Text style={styles.subDetail}>👤 {item.usuario}</Text>}
          {item.cantidad && <Text style={styles.subDetail}>📊 Cantidad: {item.cantidad}</Text>}
        </>
      )}
      
      {item.type === "historial_herramientas" && (
        <>
          <Text style={styles.detail}>{item.accion}</Text>
          {item.herramienta && <Text style={styles.subDetail}>🔧 {item.herramienta}</Text>}
          {item.usuario && <Text style={styles.subDetail}>👤 {item.usuario}</Text>}
        </>
      )}
      
      {item.type === "nota" && (
        <>
          <Text style={styles.detail}>📝 Nota en: {item.projectTitle}</Text>
          {item.contenido && <Text style={styles.subDetail}>💬 {item.contenido}</Text>}
          {item.autor && <Text style={styles.subDetail}>👤 {item.autor}</Text>}
          {item.tipo && <Text style={styles.subDetail}>🏷️ Tipo: {item.tipo}</Text>}
        </>
      )}
    </View>
  );

  const renderLoginItem = ({ item }) => (
    <View style={[styles.card, { borderLeftColor: item.lastLogin ? "#48BB78" : "#E53E3E" }]}>
      <Text style={styles.detail}>👤 {item.email}</Text>
      {item.nombre && <Text style={styles.subDetail}>Nombre: {item.nombre}</Text>}
      <Text style={styles.subDetail}>Rol: {item.role}</Text>
      <Text style={styles.subDetail}>
        Último login: {item.lastLogin ? formatDate(item.lastLogin) : "Nunca"}
      </Text>
    </View>
  );

  const filteredData = filterByTab(combinedHistory);

  return (
    <LinearGradient colors={["#141E30", "#243B55"]} style={styles.container}>
      <Text style={styles.title}>📊 Panel de Administrador</Text>
      <Text style={styles.subtitle}>Historial completo de actividades del sistema</Text>

      {/* Barra de búsqueda */}
      <TextInput
        style={styles.searchBar}
        placeholder="Buscar en todo el historial..."
        placeholderTextColor="#AAA"
        value={search}
        onChangeText={handleSearch}
      />

      {/* Tabs de filtro */}
      <View style={styles.tabsContainer}>
        {["all", "inventory", "equipment", "notes", "users"].map(tab => (
          <Text
            key={tab}
            style={[
              styles.tab,
              activeTab === tab && styles.activeTab
            ]}
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

      {/* Estadísticas */}
      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          📈 Estadísticas: 
          Usuarios: {systemStats.usuarios || 0} | 
          Inventario: {systemStats.inventario_movimientos || 0} | 
          Herramientas: {systemStats.historial_herramientas || 0}
        </Text>
      </View>

      {activeTab === "users" ? (
        <FlatList
          data={lastLogins}
          keyExtractor={(item) => item.uid}
          renderItem={renderLoginItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#48BB78"]}
            />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No hay usuarios registrados.</Text>
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
            <Text style={styles.emptyText}>
              {search ? "No se encontraron registros para la búsqueda." : "No hay registros recientes."}
            </Text>
          }
        />
      )}
    </LinearGradient>
  );
}

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
  card: {
    backgroundColor: "#2C2C3A",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 6,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  typeIcon: {
    fontSize: 16,
  },
  date: { 
    color: "#aaa", 
    fontSize: 12 
  },
  detail: { 
    color: "#fff", 
    fontSize: 16, 
    fontWeight: "bold",
    marginBottom: 4 
  },
  subDetail: { 
    color: "#ddd", 
    marginTop: 2,
    fontSize: 14
  },
  emptyText: { 
    color: "#FFF", 
    textAlign: "center", 
    marginTop: 20,
    fontSize: 16
  },
  errorText: {
    color: "#FFF",
    fontSize: 18,
    textAlign: "center",
    marginTop: 100,
    padding: 20,
  },
});