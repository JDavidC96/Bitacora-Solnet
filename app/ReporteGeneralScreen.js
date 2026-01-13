/**
 * PANTALLA DE REPORTE GENERAL DE HORAS LABORALES
 * 
 * Descripción:
 * Pantalla para visualizar y exportar reportes generales de horas laborales del personal.
 * Permite filtrar registros por quincena o rango de fechas personalizado, ver resúmenes
 * por persona y exportar los datos filtrados a Excel.
 * 
 * Características principales:
 * 1. Visualización de reporte general de horas con filtros avanzados
 * 2. Filtros por quincena (1ra: días 1-15, 2da: 16-fin de mes)
 * 3. Filtros por rango de fechas personalizado (con prioridad sobre quincena)
 * 4. Resumen por persona con horas normales, extras y totales
 * 5. Detalle de jornadas individuales con información completa
 * 6. Exportación a Excel de los datos filtrados
 * 7. Control de permisos por rol (solo Admin y Administrativo)
 * 
 * Flujo de filtros:
 * 1. Rango de fechas manual tiene prioridad sobre quincena
 * 2. Si hay fechas manuales, se ignora la selección de quincena
 * 3. Si no hay fechas manuales, se aplica filtro por quincena seleccionada
 * 4. Sin filtros = muestra todos los registros
 * 
 * Permisos por rol:
 * - Administrador: Acceso completo
 * - Administrativo: Acceso completo
 * - Otros roles: Sin acceso a esta pantalla
 * 
 * @component
 * @returns {JSX.Element} Pantalla de reporte general de horas
 * 
 * @example
 * <ReporteGeneralScreen />
 */

// Importaciones de React Native y librerías
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useUser } from "../context/UserContext";
import { horasLaboralesService } from "../services/horasLaboralesService";
import { exportReporteGeneralExcel } from "../utils/exportReporteGeneralExcel";
import { formatDateLocal } from "../utils/formatDateLocal";

/**
 * Componente principal de reporte general de horas
 * 
 * @function ReporteGeneralScreen
 * @returns {JSX.Element} Pantalla de reporte general renderizada
 */
export default function ReporteGeneralScreen() {
  // ==================== CONTEXTO Y PERMISOS ====================
  
  // Contexto de usuario para control de permisos
  const { role } = useUser();

  // ==================== ESTADOS PRINCIPALES ====================
  
  const [todosRegistros, setTodosRegistros] = useState([]);           // Todos los registros sin filtrar
  const [registrosFiltrados, setRegistrosFiltrados] = useState([]);   // Registros después de aplicar filtros
  const [resumenPersonas, setResumenPersonas] = useState([]);         // Resumen agrupado por persona
  const [loading, setLoading] = useState(false);                      // Estado de carga

  // ==================== ESTADOS DE FILTROS ====================
  
  const [quincena, setQuincena] = useState(null);   // "q1", "q2" o null (sin quincena seleccionada)
  const [fromDate, setFromDate] = useState("");     // Fecha inicial en formato YYYY-MM-DD
  const [toDate, setToDate] = useState("");         // Fecha final en formato YYYY-MM-DD

  // ==================== PERMISOS POR ROL ====================
  
  const isAdmin = role === "Administrador";
  const isAdministrativo = role === "Administrativo";
  const tienePermisos = isAdmin || isAdministrativo;

  // ==================== CARGA DE DATOS ====================
  
  /**
   * Efecto para cargar todos los registros al montar el componente
   * Solo se ejecuta si el usuario tiene permisos
   */
  useEffect(() => {
    if (tienePermisos) {
      cargarRegistros();
    }
  }, [role]);

  /**
   * Carga todos los registros laborales del sistema
   * 
   * @async
   */
  const cargarRegistros = async () => {
    try {
      setLoading(true);
      const data = await horasLaboralesService.getRegistros();
      setTodosRegistros(data);
      
      // Aplicar filtros iniciales (sin filtros por defecto)
      aplicarFiltros(data, { quincena: null, from: "", to: "" });
    } catch (error) {
      console.error("Error cargando registros:", error);
      Alert.alert("Error", "No se pudo cargar el reporte general.");
    } finally {
      setLoading(false);
    }
  };

  // ==================== LÓGICA DE FILTRADO ====================
  
  /**
   * Calcula el rango de fechas para una quincena específica
   * Basado en el mes y año actual
   * 
   * @param {string} q - Quincena a calcular ("q1" o "q2")
   * @returns {Object} Objeto con fecha inicio y fin de la quincena
   * @property {Date} start - Fecha de inicio de la quincena
   * @property {Date} end - Fecha de fin de la quincena
   */
  const calcularRangoQuincena = (q) => {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = hoy.getMonth(); // 0-11 (enero = 0)

    if (q === "q1") {
      // Primera quincena: días 1 al 15 del mes actual
      return {
        start: new Date(year, month, 1, 0, 0, 0),
        end: new Date(year, month, 15, 23, 59, 59),
      };
    }

    // Segunda quincena: días 16 al último día del mes actual
    const lastDay = new Date(year, month + 1, 0).getDate(); // Último día del mes
    return {
      start: new Date(year, month, 16, 0, 0, 0),
      end: new Date(year, month, lastDay, 23, 59, 59),
    };
  };

  /**
   * Aplica los filtros seleccionados a los registros
   * 
   * @param {Array} baseRegistros - Registros base a filtrar (default: todosRegistros)
   * @param {Object} opts - Opciones de filtro
   * @param {string|null} opts.quincena - Quincena seleccionada ("q1", "q2" o null)
   * @param {string} opts.from - Fecha inicial en formato YYYY-MM-DD
   * @param {string} opts.to - Fecha final en formato YYYY-MM-DD
   */
  const aplicarFiltros = (baseRegistros = todosRegistros, opts) => {
    const { quincena: q, from, to } = opts;

    let filtered = [...baseRegistros];

    // 1) Prioridad: Rango manual de fechas
    if (from && to) {
      const start = new Date(from);
      const end = new Date(to);
      
      // Validar que las fechas sean válidas
      if (!isNaN(start) && !isNaN(end)) {
        filtered = filtered.filter((r) => {
          const fechaInicio = new Date(r.fechaInicio);
          return fechaInicio >= start && fechaInicio <= end;
        });
      }
    } else if (q === "q1" || q === "q2") {
      // 2) Si no hay rango manual, usar quincena seleccionada
      const { start, end } = calcularRangoQuincena(q);
      filtered = filtered.filter((r) => {
        const fechaInicio = new Date(r.fechaInicio);
        return fechaInicio >= start && fechaInicio <= end;
      });
    }

    // Actualizar estados con resultados filtrados
    setRegistrosFiltrados(filtered);
    
    // Calcular resumen por persona
    const resumen = horasLaboralesService.agruparPorPersona(filtered);
    setResumenPersonas(resumen);
  };

  // ==================== MANEJO DE INTERACCIÓN ====================
  
  /**
   * Aplica los filtros actuales a los registros
   */
  const handleAplicarFiltros = () => {
    aplicarFiltros(todosRegistros, {
      quincena,
      from: fromDate,
      to: toDate,
    });
  };

  /**
   * Limpia todos los filtros y muestra todos los registros
   */
  const handleLimpiarFiltros = () => {
    setQuincena(null);
    setFromDate("");
    setToDate("");
    aplicarFiltros(todosRegistros, {
      quincena: null,
      from: "",
      to: "",
    });
  };

  /**
   * Exporta los registros filtrados a Excel
   * 
   * @async
   */
  const handleExport = async () => {
    const { ok, message } = await exportReporteGeneralExcel(registrosFiltrados);
    if (!ok) {
      Alert.alert("Exportación", message || "No se pudo exportar el Excel.");
    }
  };

  // ==================== VERIFICACIÓN DE PERMISOS ====================
  
  // Si el usuario no tiene permisos, mostrar pantalla de acceso denegado
  if (!tienePermisos) {
    return (
      <LinearGradient colors={["#1f2933", "#111827"]} style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.title}>Reporte general de horas</Text>
          <Text style={styles.noAccess}>
            Solo Administradores y Administrativos pueden ver esta pantalla.
          </Text>
        </View>
      </LinearGradient>
    );
  }

  // ==================== COMPONENTES DE RENDERIZADO ====================
  
  /**
   * Renderiza un item del resumen por persona
   * 
   * @param {Object} param0 - Objeto con el item a renderizar
   * @param {Object} param0.item - Datos de la persona para el resumen
   * @returns {JSX.Element} Card de resumen renderizada
   */
  const renderResumen = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.cardName}>{item.nombre}</Text>
      <Text style={styles.cardText}>Normales: {item.horasNormales}</Text>
      <Text style={styles.cardText}>Extras: {item.horasExtras}</Text>
      <Text style={styles.cardText}>Total: {item.totalHoras}</Text>
    </View>
  );

  /**
   * Renderiza un item detallado de jornada
   * 
   * @param {Object} param0 - Objeto con el item a renderizar
   * @param {Object} param0.item - Datos de la jornada
   * @returns {JSX.Element} Fila de jornada renderizada
   */
  const renderItem = ({ item }) => (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowName}>{item.nombre}</Text>
        <Text style={styles.rowDetail}>
          {item.destino || "-"} ({item.tipoAsignacion || "n/a"})
        </Text>
        <Text style={styles.rowDates}>
          {formatDateLocal(item.fechaInicio)} →{" "}
          {item.fechaFin ? formatDateLocal(item.fechaFin) : "En curso"}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={styles.rowHours}>{item.horasNormales || 0}h</Text>
        <Text style={styles.rowExtras}>+{item.horasExtras || 0} extra</Text>
      </View>
    </View>
  );

  // ==================== RENDER PRINCIPAL ====================
  
  return (
    <LinearGradient colors={["#111827", "#1f2933"]} style={styles.container}>
      {/* Título de la pantalla */}
      <Text style={styles.title}>Reporte general de horas</Text>

      {/* ==================== SECCIÓN DE FILTROS ==================== */}
      <View style={styles.filtersBox}>
        <Text style={styles.filtersTitle}>Filtros</Text>

        {/* Botones de selección de quincena */}
        <View style={styles.quincenaRow}>
          <TouchableOpacity
            style={[
              styles.quincenaButton,
              quincena === "q1" && styles.quincenaButtonActive,
            ]}
            onPress={() => setQuincena(quincena === "q1" ? null : "q1")}
          >
            <Text
              style={[
                styles.quincenaText,
                quincena === "q1" && styles.quincenaTextActive,
              ]}
            >
              1ª quincena (1–15)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.quincenaButton,
              quincena === "q2" && styles.quincenaButtonActive,
            ]}
            onPress={() => setQuincena(quincena === "q2" ? null : "q2")}
          >
            <Text
              style={[
                styles.quincenaText,
                quincena === "q2" && styles.quincenaTextActive,
              ]}
            >
              2ª quincena (16–fin)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Instrucción sobre prioridad de filtros */}
        <Text style={styles.filtersHint}>
          Si llenas fechas manuales, se ignora la quincena.
        </Text>

        {/* Inputs para rango de fechas personalizado */}
        <View style={styles.dateRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Desde (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              placeholder="2025-02-01"
              placeholderTextColor="#6B7280"
              value={fromDate}
              onChangeText={setFromDate}
            />
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Hasta (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              placeholder="2025-02-15"
              placeholderTextColor="#6B7280"
              value={toDate}
              onChangeText={setToDate}
            />
          </View>
        </View>

        {/* Botones de acción para filtros */}
        <View style={styles.filtersButtonsRow}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={handleAplicarFiltros}
          >
            <Text style={styles.filterButtonText}>Aplicar filtros</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.filterButtonSecondary}
            onPress={handleLimpiarFiltros}
          >
            <Text style={styles.filterButtonSecondaryText}>Limpiar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ==================== BOTÓN DE EXPORTACIÓN ==================== */}
      <TouchableOpacity
        style={styles.exportButton}
        onPress={handleExport}
        disabled={registrosFiltrados.length === 0}
      >
        <Text style={styles.exportText}>Exportar Excel</Text>
      </TouchableOpacity>

      {/* ==================== SECCIÓN DE RESUMEN ==================== */}
      <Text style={styles.section}>
        Resumen por persona ({resumenPersonas.length})
      </Text>
      
      {loading && todosRegistros.length === 0 ? (
        // Indicador de carga inicial
        <ActivityIndicator color="#fff" style={{ marginVertical: 16 }} />
      ) : resumenPersonas.length === 0 ? (
        // Mensaje cuando no hay datos
        <Text style={styles.emptyText}>No hay datos en este rango.</Text>
      ) : (
        // Lista horizontal de resúmenes
        <FlatList
          data={resumenPersonas}
          keyExtractor={(i) =>
            i.personalId || i.nombre || Math.random().toString()
          }
          horizontal
          renderItem={renderResumen}
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* ==================== SECCIÓN DE DETALLE ==================== */}
      <Text style={styles.section}>
        Detalle de jornadas ({registrosFiltrados.length})
      </Text>

      {loading && todosRegistros.length === 0 ? (
        // Indicador de carga inicial
        <ActivityIndicator color="#fff" style={{ marginTop: 16 }} />
      ) : registrosFiltrados.length === 0 ? (
        // Mensaje cuando no hay registros
        <Text style={styles.emptyText}>No hay registros para mostrar.</Text>
      ) : (
        // Lista vertical de jornadas detalladas
        <FlatList
          data={registrosFiltrados}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          style={{ marginTop: 8 }}
        />
      )}
    </LinearGradient>
  );
}

// ==================== ESTILOS DEL COMPONENTE ====================

/**
 * Estilos del componente
 * 
 * @constant {Object} styles
 */
const styles = StyleSheet.create({
  // Contenedor principal con gradiente
  container: { flex: 1, padding: 16 },
  
  // Estilos para pantalla de acceso denegado
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 12,
  },
  noAccess: {
    color: "#D1D5DB",
    fontSize: 15,
    textAlign: "center",
    marginTop: 8,
  },
  
  // Estilos para sección de filtros
  filtersBox: {
    backgroundColor: "#111827",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  filtersTitle: {
    color: "#E5E7EB",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  
  // Botones de quincena
  quincenaRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  quincenaButton: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#4B5563", // Gris medio
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginRight: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  quincenaButtonActive: {
    backgroundColor: "#10B981", // Verde activo
    borderColor: "#10B981",
  },
  quincenaText: {
    color: "#D1D5DB", // Gris claro
    fontSize: 13,
  },
  quincenaTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  
  // Instrucción sobre filtros
  filtersHint: {
    color: "#9CA3AF", // Gris medio
    fontSize: 12,
    marginBottom: 6,
  },
  
  // Inputs de fechas
  dateRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  label: {
    color: "#D1D5DB",
    fontSize: 12,
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#1F2937", // Gris oscuro
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: "#F9FAFB", // Blanco
    fontSize: 13,
  },
  
  // Botones de acción para filtros
  filtersButtonsRow: {
    flexDirection: "row",
    marginTop: 8,
    justifyContent: "flex-end",
  },
  filterButton: {
    backgroundColor: "#2563EB", // Azul
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    marginLeft: 8,
  },
  filterButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  filterButtonSecondary: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#6B7280", // Gris medio
  },
  filterButtonSecondaryText: {
    color: "#E5E7EB", // Gris claro
    fontSize: 13,
    fontWeight: "500",
  },
  
  // Botón de exportación
  exportButton: {
    backgroundColor: "#10B981", // Verde
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 999,
    alignSelf: "center",
    marginBottom: 12,
  },
  exportText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  
  // Títulos de sección
  section: {
    color: "#E5E7EB",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 6,
  },
  
  // Mensaje cuando no hay datos
  emptyText: {
    color: "#9CA3AF",
    fontSize: 13,
    marginBottom: 10,
  },
  
  // Estilos para cards del resumen
  card: {
    backgroundColor: "#1F2937", // Gris oscuro
    padding: 10,
    borderRadius: 10,
    marginRight: 8,
    minWidth: 150,
  },
  cardName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  cardText: {
    color: "#D1D5DB", // Gris claro
    fontSize: 13,
  },
  
  // Estilos para filas de detalle
  row: {
    backgroundColor: "#111827", // Fondo oscuro
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    flexDirection: "row",
  },
  rowName: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  rowDetail: { color: "#D1D5DB", fontSize: 13, marginTop: 2 },
  rowDates: { color: "#9CA3AF", fontSize: 12, marginTop: 2 },
  rowHours: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  rowExtras: { color: "#FBBF24", fontSize: 13, marginTop: 2 }, // Amarillo para extras
});