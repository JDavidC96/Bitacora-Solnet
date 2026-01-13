// app/InventoryHistoryScreen.js

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

/**
 * Pantalla de historial completo de movimientos de inventario.
 * 
 * Esta pantalla proporciona una visión integral de todas las transacciones de inventario:
 * - Entradas de nuevos materiales
 * - Salidas y eliminaciones
 * - Movimientos a proyectos
 * - Materiales externos (compras directas)
 * - Usos en proyectos
 * - Devoluciones al inventario general
 * - Transferencias entre proyectos
 * 
 * Características principales:
 * - Búsqueda inteligente en múltiples campos
 * - Filtrado por tipo de movimiento
 * - Estadísticas en tiempo real
 * - Actualización pull-to-refresh
 * - Diseño con gradiente y tema oscuro
 * 
 * @component
 * @example
 * // Navegación desde otras pantallas:
 * // router.push('/InventoryHistoryScreen')
 * 
 * @returns {JSX.Element} Componente de pantalla de historial de inventario
 */

/* ======================================================
 * UTILIDAD: Resolver nombre del actor
 * ====================================================== */
/**
 * Obtiene el nombre del actor responsable del movimiento
 * Prioriza diferentes campos que pueden contener esta información
 * @param {Object} m - Objeto de movimiento
 * @returns {string} Nombre del usuario o "Sistema" si no se puede determinar
 */
const getActorName = (m) =>
  m.actorNombre ||
  m.usuario ||
  m.createdBy ||
  m.updatedBy ||
  "Sistema";

export default function InventoryHistoryScreen() {
  const router = useRouter();
  
  // Hook para obtener historial de movimientos
  const { movements, loading, error, refreshHistory } = useInventoryHistory();

  // Estados para búsqueda y filtrado
  const [searchQuery, setSearchQuery] = useState(""); // Texto de búsqueda
  const [typeFilter, setTypeFilter] = useState("all"); // Filtro por tipo de movimiento
  const [refreshing, setRefreshing] = useState(false); // Estado de refresco manual

  /* ==============================
   * DEFINICIÓN DE TIPOS DE MOVIMIENTO
   * ============================== */
  const movementTypes = [
    { key: "all", label: "Todos", color: "#CBD5E1" }, // Gris claro - todos los tipos
    { key: "entrada", label: "Entradas", color: "#22C55E" }, // Verde - nuevas adquisiciones
    { key: "salida", label: "Salidas", color: "#EF4444" }, // Rojo - eliminaciones
    { key: "movimiento", label: "Ingreso a Proyecto", color: "#3B82F6" }, // Azul - asignación a proyectos
    { key: "entrada_externa", label: "Material Externo", color: "#0EA5E9" }, // Azul claro - compras directas
    { key: "uso", label: "Uso", color: "#FACC15" }, // Amarillo - consumo en proyectos
    { key: "devolucion", label: "Devolución", color: "#14B8A6" }, // Turquesa - retornos al inventario
    { key: "transferencia", label: "Transferencias", color: "#A855F7" }, // Púrpura - movimientos entre proyectos
  ];

  /* ==============================
   * CÁLCULO DE ESTADÍSTICAS (KPIs)
   * ============================== */
  const stats = useMemo(() => {
    // Inicializar contadores para cada tipo de movimiento
    const s = {
      total: movements.length, // Total de movimientos
      entrada: 0,             // Entradas de material
      salida: 0,              // Salidas/eliminaciones
      movimiento: 0,          // Movimientos a proyectos
      entrada_externa: 0,     // Materiales externos
      uso: 0,                 // Usos en proyectos
      devolucion: 0,          // Devoluciones
      transferencia: 0,       // Transferencias entre proyectos
    };

    // Contar movimientos por tipo
    movements.forEach((m) => {
      if (s[m.tipo] !== undefined) s[m.tipo]++;
    });

    return s;
  }, [movements]);

  /* ==============================
   * FILTRO Y BÚSQUEDA DE MOVIMIENTOS
   * ============================== */
  const filteredMovements = useMemo(() => {
    const q = normalize(searchQuery); // Normalizar búsqueda (minúsculas, sin acentos)

    return movements
      .filter((m) => {
        const actor = getActorName(m); // Obtener nombre del actor

        // Búsqueda en múltiples campos
        const matchesSearch =
          normalize(m.material || "").includes(q) || // Nombre del material
          normalize(actor).includes(q) ||             // Nombre del usuario
          normalize(m.origen || "").includes(q) ||    // Origen del movimiento
          normalize(m.destino || "").includes(q) ||   // Destino del movimiento
          normalize(m.notas || "").includes(q);       // Notas adicionales

        // Filtrado por tipo
        const matchesType = typeFilter === "all" || m.tipo === typeFilter;

        return matchesSearch && matchesType;
      })
      // Ordenar por fecha descendente (más reciente primero)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [movements, searchQuery, typeFilter]);

  /* ==============================
   * MANEJO DE REFRESCO MANUAL
   * ============================== */
  const onRefresh = async () => {
    setRefreshing(true);
    await refreshHistory(); // Actualizar datos desde Firestore
    setRefreshing(false);
  };

  /* ==============================
   * MANEJO DE ESTADO DE ERROR
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
   * INTERFAZ DE USUARIO PRINCIPAL
   * ============================== */
  return (
    <LinearGradient colors={["#0F172A", "#1E293B"]} style={{ flex: 1 }}>
      <View style={styles.container}>
        {/* Botón de retroceso */}
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Volver</Text>
        </TouchableOpacity>

        {/* Título principal */}
        <Text style={styles.title}>Historial de Movimientos</Text>

        {/* Componente de búsqueda */}
        <SearchHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          placeholder="Buscar… material, usuario, proyecto…"
        />

        {/* Filtros por tipo de movimiento (horizontal scroll) */}
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
                    backgroundColor: item.color, // Color del tipo seleccionado
                  },
                ]}
                onPress={() => setTypeFilter(item.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.typeText,
                    typeFilter === item.key && { color: "#000" }, // Texto negro sobre color
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Panel de estadísticas (KPIs) */}
        <View style={styles.statsBox}>
          {/* Tarjeta de total general */}
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>

          {/* Tarjetas por tipo de movimiento */}
          {movementTypes
            .filter((t) => t.key !== "all") // Excluir "Todos" de las estadísticas específicas
            .map((t) => (
              <View
                key={t.key}
                style={[styles.statCard, { borderLeftColor: t.color }]} // Borde de color según tipo
              >
                <Text style={[styles.statNumber, { color: t.color }]}>
                  {stats[t.key]}
                </Text>
                <Text style={styles.statLabel}>{t.label}</Text>
              </View>
            ))}
        </View>

        {/* Lista principal de movimientos */}
        <FlatList
          data={filteredMovements}
          keyExtractor={(item) => item.id} // ID único de Firestore
          renderItem={({ item }) => (
            <HistoryItem
              movement={{
                ...item,
                actorNombre: getActorName(item), // Asegurar nombre del actor
              }}
            />
          )}
          contentContainerStyle={styles.listPad}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#3B82F6"]} // Color del indicador en iOS
              tintColor="#3B82F6"   // Color del indicador en Android
              progressBackgroundColor="#1E293B" // Fondo del indicador
            />
          }
          ListEmptyComponent={
            // Mensaje cuando no hay resultados
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                {searchQuery || typeFilter !== "all"
                  ? "No se encontraron movimientos con los filtros actuales"
                  : "No hay movimientos registrados"}
              </Text>
            </View>
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
  /**
   * Contenedor principal
   */
  container: {
    flex: 1,
    padding: 18,
    paddingTop: 50, // Espacio para barra de estado
  },

  /**
   * Enlace de retroceso
   */
  back: { 
    color: "#CBD5E1", // Gris claro
    fontSize: 15, 
    marginBottom: 12 
  },

  /**
   * Título principal
   */
  title: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 22,
    marginBottom: 20,
    textAlign: "center",
  },

  /**
   * Contenedor para filtros de tipo (scroll horizontal)
   */
  typeFilterRow: { 
    marginBottom: 12 
  },

  /**
   * Badge individual para tipo de movimiento
   */
  typeBadge: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: "#334155", // Gris azulado oscuro
    borderRadius: 20, // Forma completamente redondeada
    marginRight: 8,
  },

  /**
   * Texto dentro del badge
   */
  typeText: { 
    color: "#FFF", 
    fontWeight: "600" 
  },

  /**
   * Contenedor de estadísticas (KPIs)
   */
  statsBox: {
    flexDirection: "row",
    flexWrap: "wrap", // Permitir múltiples filas en pantallas pequeñas
    backgroundColor: "rgba(255,255,255,0.05)", // Fondo semitransparente
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
  },

  /**
   * Tarjeta individual de estadística
   */
  statCard: {
    width: "33%", // 3 por fila (responsive)
    paddingVertical: 10,
    borderLeftWidth: 2,
    borderLeftColor: "#475569", // Color por defecto del borde
    alignItems: "center",
  },

  /**
   * Número en tarjeta de estadística
   */
  statNumber: { 
    color: "#FFF", 
    fontWeight: "700", 
    fontSize: 16 
  },

  /**
   * Etiqueta en tarjeta de estadística
   */
  statLabel: { 
    color: "#94A3B8", // Gris azulado claro
    fontSize: 11 
  },

  /**
   * Padding inferior para lista (evita cortes)
   */
  listPad: { 
    paddingBottom: 50 
  },

  /**
   * Contenedor de estado vacío
   */
  emptyState: {
    paddingVertical: 40,
    alignItems: "center",
  },

  /**
   * Texto de estado vacío
   */
  emptyText: {
    color: "#94A3B8",
    textAlign: "center",
    fontSize: 14,
  },

  /**
   * Contenedor de error
   */
  errorBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  /**
   * Título de error
   */
  errorTitle: {
    color: "#F87171", // Rojo anaranjado
    fontSize: 20,
    fontWeight: "700",
  },

  /**
   * Descripción de error
   */
  errorDesc: {
    color: "#DDD", // Gris claro
    marginVertical: 10,
    textAlign: "center",
  },

  /**
   * Botón de reintento
   */
  retryBtn: {
    backgroundColor: "#3B82F6", // Azul
    padding: 12,
    borderRadius: 10,
    marginTop: 16,
  },

  /**
   * Texto del botón de reintento
   */
  retryText: { 
    color: "#FFF", 
    fontWeight: "700" 
  },
});
