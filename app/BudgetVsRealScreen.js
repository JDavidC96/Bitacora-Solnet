// app/BudgetVsRealScreen.js
// ============================================================================
// PANTALLA DE COMPARATIVO PRESUPUESTO VS GASTOS REALES
// Propósito: Comparación detallada entre presupuesto planificado y ejecución real
//            Incluye análisis por fases, KPIs y métricas de desempeño financiero
// ============================================================================

// ----------------------------------------------------------------------------
// IMPORTACIONES
// ----------------------------------------------------------------------------


// Componente para fondos con gradiente
import { LinearGradient } from "expo-linear-gradient";

// Navegación de Expo Router
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";

// Hooks de React
import { useCallback, useMemo, useState } from "react";

// Componentes de React Native
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Servicios para datos financieros
import { budgetService } from "../services/budgetService"; // Presupuesto planificado
import realExpensesService from "../services/realExpensesService"; // Gastos reales ejecutados

// Componente personalizado para KPIs por fase
import FaseKpiCard from "../components/charts/FaseKpiCard";

/* ============================================================================
 * COMPONENTE PRINCIPAL: BudgetVsRealScreen
 * ============================================================================ */
export default function BudgetVsRealScreen() {
  // ==========================================================================
  // HOOKS Y CONFIGURACIÓN INICIAL
  // ==========================================================================
  
  // Navegación programática
  const router = useRouter();
  
  // Parámetros de la ruta
  const params = useLocalSearchParams();

  /**
   * Normaliza y valida los parámetros de la ruta
   * - Convierte arrays a strings cuando sea necesario
   * - Proporciona valores por defecto
   * - Valida que projectId no sea "undefined" (caso especial de Expo Router)
   */
  const { projectId, title } = useMemo(() => {
    // Normalizar projectId (puede venir como array desde query params)
    const id = Array.isArray(params.projectId)
      ? params.projectId[0]  // Tomar primer elemento si es array
      : params.projectId;
    
    // Normalizar título
    const t = Array.isArray(params.title) ? params.title[0] : params.title;

    return {
      projectId: id && id !== "undefined" ? id : null, // Filtrar "undefined" string
      title: t || "Proyecto sin nombre", // Valor por defecto
    };
  }, [params]); // Dependencia: se recalcula cuando cambian los params

  // ==========================================================================
  // ESTADOS
  // ==========================================================================
  
  // Estado de carga
  const [loading, setLoading] = useState(true);
  
  // Datos del presupuesto planificado
  const [budget, setBudget] = useState(null);
  
  // Datos de gastos reales (consolidados)
  const [gastos, setGastos] = useState(null);
  
  // Gastos agrupados por fase
  const [gastosPorFase, setGastosPorFase] = useState({
    fase1: 0,
    fase2: 0,
    fase3: 0,
    fase4: 0,
  });

  // ==========================================================================
  // FUNCIÓN UTILITARIA: CLASIFICACIÓN DE FASE (FALLBACK)
  // ==========================================================================
  
  /**
   * Clasifica un ítem/material en una fase basándose en su nombre/categoría
   * Útil cuando el servicio no proporciona clasificación automática
   * @param {Object} item - Item o material a clasificar
   * @returns {string} - Clave de fase (fase1, fase2, fase3, fase4)
   */
  const classifyFase = (item) => {
    // Obtener nombre del item (con fallbacks para diferentes estructuras de datos)
    const name = (item?.nombre || item?.concepto || "").toLowerCase();

    // ========================================================================
    // LÓGICA DE CLASIFICACIÓN BASADA EN PALABRAS CLAVE
    // ========================================================================
    
    // FASE 1: Equipos y estructura
    if (
      name.includes("panel") ||
      name.includes("módulo") ||
      name.includes("modulo") ||
      name.includes("rail") ||
      name.includes("perfil") ||
      name.includes("estructura")
    )
      return "fase1";

    // FASE 2: Sistema eléctrico
    if (
      name.includes("cable") ||
      name.includes("breaker") ||
      name.includes("tubería") ||
      name.includes("tubo") ||
      name.includes("conduit")
    )
      return "fase2";

    // FASE 3: Estudios y servicios (incluye mano de obra)
    // Si tiene concepto o categoría específica, va a fase3
    if (item?.concepto || item?.categoria) return "fase3";

    // FASE 4: Trámites y otros (default)
    return "fase4";
  };

  // ==========================================================================
  // FUNCIÓN PRINCIPAL: CARGA DE DATOS
  // ==========================================================================
  
  /**
   * Carga todos los datos necesarios para la comparativa:
   * 1. Presupuesto planificado
   * 2. Gastos reales (materiales, viáticos, mano de obra)
   * 3. Clasificación por fases
   */
  const loadData = async () => {
    // Validar que exista projectId
    if (!projectId) return;

    // Activar estado de carga
    setLoading(true);

    try {
      // ======================================================================
      // PASO 1: CARGAR PRESUPUESTO PLANIFICADO
      // ======================================================================
      const b = await budgetService.getBudgetByProject(projectId);

      // ======================================================================
      // PASO 2: CARGAR GASTOS REALES COMPLETOS
      // Incluye materiales, viáticos y mano de obra real
      // ======================================================================
      const r = await realExpensesService.getProjectFinancialData(projectId);

      // ======================================================================
      // PASO 3: PREPARAR DATOS CON VALORES POR DEFECTO SEGUROS
      // ======================================================================
      
      // Mano de obra real (detallada por trabajador/horas)
      const manoObraRealDetalle = Array.isArray(r?.manoObraRealDetalle)
        ? r.manoObraRealDetalle
        : [];
      
      // Materiales reales
      const materiales = Array.isArray(r?.materiales) ? r.materiales : [];
      
      // Viáticos reales
      const viaticos = Array.isArray(r?.viaticos) ? r.viaticos : [];
      
      // Gastos por fase (si vienen del servicio)
      const realesPorFase = r?.realesPorFase || {
        fase1: 0,
        fase2: 0,
        fase3: 0,
        fase4: 0,
      };

      // ======================================================================
      // PASO 4: CÁLCULO DE MÉTRICAS CONSOLIDADAS
      // ======================================================================
      
      // Total de horas reales trabajadas
      const totalHorasReales = manoObraRealDetalle.reduce(
        (acc, h) => acc + Number(h?.totalHoras || 0),
        0
      );

      // Total de materiales
      const totalMateriales = materiales.reduce(
        (acc, m) => acc + Number(m?.total || 0),
        0
      );

      // Total de viáticos
      const totalViaticos = viaticos.reduce(
        (acc, v) => acc + Number(v?.valor || 0),
        0
      );

      // Mano de obra real (valor monetario, ya viene calculado del servicio)
      const totalManoObraReal = Number(r?.totalManoObraReal || 0);

      // Total real del proyecto (suma de todos los gastos)
      const totalReal = Number(r?.totalReal || 0);

      // ======================================================================
      // PASO 5: CLASIFICACIÓN POR FASES (usando datos del servicio o fallback)
      // ======================================================================
      const faseTotals = {
        fase1: Number(realesPorFase.fase1 || 0),
        fase2: Number(realesPorFase.fase2 || 0),
        fase3: Number(realesPorFase.fase3 || 0),
        fase4: Number(realesPorFase.fase4 || 0),
      };

      // ======================================================================
      // PASO 6: ACTUALIZAR ESTADOS
      // ======================================================================
      
      // Presupuesto planificado
      setBudget(b || null);

      // Gastos reales consolidados (con todas las métricas calculadas)
      setGastos({
        ...(r || {}),                // Mantener datos originales del servicio
        materiales,                  // Lista de materiales
        viaticos,                    // Lista de viáticos
        manoObraRealDetalle,         // Detalle de mano de obra
        
        // Métricas calculadas
        totalMateriales,
        totalViaticos,
        totalReal,
        totalHorasReales,
        totalManoObraReal,
      });

      // Gastos agrupados por fase
      setGastosPorFase(faseTotals);
      
    } catch (error) {
      // Manejo de errores (log en consola, sin interrumpir UI)
      console.error("Error cargando BudgetVsReal:", error);
    } finally {
      // Desactivar estado de carga (siempre se ejecuta)
      setLoading(false);
    }
  };

  // ==========================================================================
  // EFECTO: EJECUTAR CARGA DE DATOS
  // ==========================================================================
  useFocusEffect(
  useCallback(() => {
    if (projectId) loadData();
  }, [projectId])
);

  // ==========================================================================
  // RENDERIZADO: ESTADOS DE CARGA
  // ==========================================================================

  // Estado 1: Cargando datos
  if (loading) {
    return (
      <LinearGradient colors={["#1A365D", "#2C5282"]} style={styles.center}>
        {/* Spinner de carga */}
        <ActivityIndicator size="large" color="#FFF" />
        <Text style={styles.loadingText}>Cargando comparativo...</Text>
      </LinearGradient>
    );
  }

  // Estado 2: No hay presupuesto configurado
  if (!budget) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          No existe presupuesto para este proyecto.
        </Text>
      </View>
    );
  }

  // ==========================================================================
  // CÁLCULOS PARA RESUMEN GLOBAL
  // ==========================================================================

  // Total del presupuesto planificado
  const totalPresupuesto = Number(budget?.totalGeneral || 0);
  
  // Total de gastos reales ejecutados
  const totalReal = Number(gastos?.totalReal || 0);
  
  // Diferencia (presupuesto - real)
  const diferencia = totalPresupuesto - totalReal;
  
  // Porcentaje de ejecución (cuánto se ha gastado del presupuesto)
  const ejecucion =
    totalPresupuesto > 0 ? (totalReal / totalPresupuesto) * 100 : 0;

  // ==========================================================================
  // RENDERIZADO PRINCIPAL (cuando hay datos)
  // ==========================================================================
  return (
    <LinearGradient colors={["#1A365D", "#2C5282"]} style={styles.container}>
      {/* ScrollView para contenido extensible */}
      <ScrollView contentContainerStyle={styles.inner}>
        
        {/* ====================================================================
         * SECCIÓN: HEADER INFORMATIVO
         * ==================================================================== */}
        <View style={styles.headerCard}>
          {/* Título del proyecto */}
          <Text style={styles.headerTitle}>{title}</Text>
          
          {/* Subtítulo descriptivo */}
          <Text style={styles.headerSubtitle}>
            Comparativo Presupuesto vs Real
          </Text>
        </View>

        {/* ====================================================================
         * SECCIÓN: RESUMEN GENERAL
         * Muestra las métricas financieras clave del proyecto
         * ==================================================================== */}
        <View style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>Resumen General</Text>

          {/* Presupuesto total planificado */}
          <View style={styles.row}>
            <Text style={styles.label}>Presupuesto Total</Text>
            <Text style={styles.value}>
              ${totalPresupuesto.toLocaleString("es-CO")}
            </Text>
          </View>

          {/* Gasto real ejecutado */}
          <View style={styles.row}>
            <Text style={styles.label}>Gasto Real</Text>
            <Text style={styles.value}>
              ${totalReal.toLocaleString("es-CO")}
            </Text>
          </View>

          {/* KPI: Horas totales trabajadas (métrica de productividad) */}
          <View style={styles.row}>
            <Text style={styles.label}>Horas trabajadas (reales)</Text>
            <Text style={styles.value}>{gastos?.totalHorasReales || 0}</Text>
          </View>

          {/* KPI: Costo real de mano de obra */}
          <View style={styles.row}>
            <Text style={styles.label}>Costo mano de obra real</Text>
            <Text style={styles.value}>
              ${(gastos?.totalManoObraReal || 0).toLocaleString("es-CO")}
            </Text>
          </View>

          {/* Línea divisoria */}
          <View style={styles.divider} />

          {/* DIFERENCIA (métrica clave con color dinámico) */}
          <View style={styles.row}>
            <Text style={styles.totalLabel}>Diferencia</Text>
            <Text
              style={[
                styles.totalValue,
                // Color rojo si diferencia negativa (sobrecosto)
                // Color verde si diferencia positiva (ahorro)
                diferencia < 0 ? styles.negative : styles.positive,
              ]}
            >
              ${diferencia.toLocaleString("es-CO")}
            </Text>
          </View>

          {/* Porcentaje de ejecución */}
          <View style={styles.row}>
            <Text style={styles.label}>% Ejecutado</Text>
            <Text style={styles.value}>{ejecucion.toFixed(1)}%</Text>
          </View>

          {/* ================================================================
           * BOTÓN PARA VER ESTADÍSTICAS DETALLADAS
           * Navega a la pantalla de estadísticas avanzadas
           * ================================================================ */}
          <TouchableOpacity
            style={styles.statsButton}
            onPress={() =>
              router.push({
                pathname: "/BudgetStatScreen",
                params: { projectId, title },
              })
            }
          >
            <Text style={styles.statsButtonText}>
              Ver estadísticas del presupuesto
            </Text>
          </TouchableOpacity>
        </View>

        {/* ====================================================================
         * SECCIÓN: ANÁLISIS POR FASE
         * Muestra tarjetas comparativas para cada fase del proyecto
         * ==================================================================== */}
        <Text style={styles.sectionTitle}>Análisis por Fase</Text>

        {/* FASE 1: Equipos y estructura */}
        <FaseKpiCard
          title="Fase 1: Equipos y Estructura"
          presupuesto={Number(budget?.fases?.fase1?.total || 0)}
          real={Number(gastosPorFase?.fase1 || 0)}
        />

        {/* FASE 2: Sistema eléctrico */}
        <FaseKpiCard
          title="Fase 2: Sistema Eléctrico"
          presupuesto={Number(budget?.fases?.fase2?.total || 0)}
          real={Number(gastosPorFase?.fase2 || 0)}
        />

        {/* FASE 3: Estudios y servicios (incluye mano de obra) */}
        <FaseKpiCard
          title="Fase 3: Estudios y Servicios (incluye mano de obra)"
          presupuesto={Number(budget?.fases?.fase3?.total || 0)}
          real={Number(gastosPorFase?.fase3 || 0)}
        />

        {/* FASE 4: Trámites / Otros */}
        <FaseKpiCard
          title="Fase 4: Trámites / Otros"
          presupuesto={Number(budget?.fases?.fase4?.total || 0)}
          real={Number(gastosPorFase?.fase4 || 0)}
        />
      </ScrollView>
    </LinearGradient>
  );
}

/* ============================================================================
 * ESTILOS
 * Diseño con gradiente azul y tarjetas semitransparentes
 * ============================================================================ */

const styles = StyleSheet.create({
  // Contenedor principal
  container: { 
    flex: 1 
  },
  
  // Contenedor interno del ScrollView
  inner: { 
    padding: 16 
  },

  // Estilos para estados centrados (loading/error)
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1A365D", // Azul oscuro
    paddingHorizontal: 16,
  },

  // Texto de carga
  loadingText: { 
    marginTop: 10, 
    color: "#FFF" 
  },
  
  // Texto de error
  errorText: { 
    color: "#FEB2B2", // Rojo claro
    fontSize: 16, 
    textAlign: "center" 
  },

  // Tarjeta de header
  headerCard: {
    backgroundColor: "rgba(15,23,42,0.9)", // Azul muy oscuro semitransparente
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderColor: "rgba(148,163,184,0.5)", // Borde gris azulado semitransparente
    borderWidth: 1,
  },
  
  // Título del header
  headerTitle: { 
    fontSize: 20, 
    color: "#FFF", 
    fontWeight: "700" 
  },
  
  // Subtítulo del header
  headerSubtitle: { 
    color: "#CBD5E0", // Gris azulado claro
    marginTop: 4 
  },

  // Tarjeta de resumen general
  summaryCard: {
    backgroundColor: "rgba(15,23,42,0.9)",
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderColor: "rgba(148,163,184,0.4)",
    borderWidth: 1,
  },

  // Título de sección
  sectionTitle: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },

  // Fila para elementos alineados horizontalmente
  row: {
    flexDirection: "row",
    justifyContent: "space-between", // Etiqueta izquierda, valor derecha
    marginVertical: 4, // Espacio vertical entre filas
  },

  // Línea divisoria
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148,163,184,0.3)", // Gris azulado muy transparente
    marginVertical: 8,
  },

  // Etiqueta en las filas
  label: { 
    color: "#E2E8F0" // Blanco azulado muy claro
  },
  
  // Valor en las filas
  value: { 
    color: "#CBD5E0", // Gris azulado claro
    fontWeight: "600" // Seminegrita
  },

  // Etiqueta para totales (más destacada)
  totalLabel: { 
    color: "#FFF", 
    fontWeight: "700" 
  },
  
  // Valor para totales
  totalValue: { 
    fontWeight: "700", 
    fontSize: 16 
  },
  
  // Color para valores positivos (ahorro)
  positive: { 
    color: "#68D391" // Verde
  },
  
  // Color para valores negativos (sobrecosto)
  negative: { 
    color: "#F56565" // Rojo
  },

  // Botón para navegar a estadísticas
  statsButton: {
    marginTop: 14,
    backgroundColor: "#2B6CB0", // Azul medio
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.4)", // Borde sutil
  },
  
  // Texto del botón de estadísticas
  statsButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
  },
});

// ============================================================================
// FIN DEL ARCHIVO BudgetVsRealScreen.js
// ============================================================================