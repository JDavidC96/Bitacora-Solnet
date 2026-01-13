// app/BudgetStatsScreen.js
// ============================================================================
// PANTALLA DE ESTADÍSTICAS DE PRESUPUESTO
// Propósito: Visualización analítica del presupuesto vs gastos reales
//            Muestra KPIs, gráficos comparativos y distribución por fases
// ============================================================================

// ----------------------------------------------------------------------------
// IMPORTACIONES
// ----------------------------------------------------------------------------

// Componente para fondos con gradiente
import { LinearGradient } from "expo-linear-gradient";

// Navegación de Expo Router
import { useLocalSearchParams, useRouter } from "expo-router";

// Hooks de React
import { useEffect, useMemo, useState } from "react";

// Componentes de React Native
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Servicios para datos de presupuesto y gastos reales
import { budgetService } from "../services/budgetService";
import realExpensesService from "../services/realExpensesService";

// Componentes de gráficos
import BudgetComparisonChart from "../components/charts/BudgetComparisonChart";
import PieChartSimple from "../components/charts/PieChartSimple";

// Paleta de colores del tema
import colors from "../theme/colors";

/* ============================================================================
 * COMPONENTE PRINCIPAL: BudgetStatsScreen
 * ============================================================================ */
export default function BudgetStatsScreen() {
  // ==========================================================================
  // HOOKS Y CONFIGURACIÓN INICIAL
  // ==========================================================================
  
  // Navegación programática
  const router = useRouter();
  
  // Parámetros de la ruta (projectId y title)
  const params = useLocalSearchParams();

  /**
   * Normaliza los parámetros de la ruta
   * - Convierte arrays a strings cuando sea necesario
   * - Proporciona valores por defecto
   * - Usa useMemo para evitar recalculos innecesarios
   */
  const { projectId, title } = useMemo(() => {
    // Normalizar projectId (puede venir como array o string)
    const pId = Array.isArray(params.projectId)
      ? params.projectId[0]
      : params.projectId;
    
    // Normalizar title (puede venir como array o string)
    const t = Array.isArray(params.title) ? params.title[0] : params.title;

    return {
      projectId: pId && pId !== "undefined" ? pId : null, // Validar projectId
      title: t || "Proyecto sin nombre", // Valor por defecto
    };
  }, [params.projectId, params.title]); // Dependencias del useMemo

  // ==========================================================================
  // ESTADOS
  // ==========================================================================
  
  // Datos del presupuesto planificado
  const [budget, setBudget] = useState(null);
  
  // Datos de gastos reales ejecutados
  const [realData, setRealData] = useState(null);
  
  // Estado de carga
  const [loading, setLoading] = useState(true);

  // ==========================================================================
  // EFECTO: CARGA DE DATOS
  // Se ejecuta cuando se dispone del projectId
  // ==========================================================================
  useEffect(() => {
    // Validar que exista projectId
    if (!projectId) return;

    /**
     * Función asíncrona para cargar datos de presupuesto y gastos reales
     */
    const load = async () => {
      setLoading(true); // Activar indicador de carga
      try {
        // Cargar en paralelo: presupuesto planificado y gastos reales
        const b = await budgetService.getBudgetByProject(projectId);
        const r = await realExpensesService.getProjectFinancialData(projectId);

        // Actualizar estados
        setBudget(b || null);
        setRealData(r || null);
      } catch (err) {
        console.error("Error cargando estadísticas:", err);
        // Mantener estados null en caso de error
      } finally {
        setLoading(false); // Desactivar indicador de carga
      }
    };

    // Ejecutar carga
    load();
  }, [projectId]); // Se ejecuta cuando cambia projectId

  // ==========================================================================
  // CÁLCULOS Y TRANSFORMACIONES DE DATOS
  // ==========================================================================

  // Total del presupuesto planificado
  const totalPresupuesto = budget?.totalGeneral || 0;
  
  // Total de gastos reales ejecutados
  const totalReal = realData?.totalReal || 0;
  
  // Diferencia entre presupuesto y real (positiva = ahorro, negativa = sobrecosto)
  const diferencia = totalPresupuesto - totalReal;
  
  // Porcentaje de ejecución (cuánto se ha gastado vs lo presupuestado)
  const porcentajeEjecucion =
    totalPresupuesto > 0 ? (totalReal / totalPresupuesto) * 100 : 0;

  /**
   * Extraer totales por fase del presupuesto planificado
   */
  const fasesPresupuesto = {
    fase1: budget?.fases?.fase1?.total || 0,
    fase2: budget?.fases?.fase2?.total || 0,
    fase3: budget?.fases?.fase3?.total || 0,
    fase4: budget?.fases?.fase4?.total || 0,
  };

  /**
   * Extraer totales por fase de los gastos reales
   */
  const fasesReal = {
    fase1: realData?.realesPorFase?.fase1 || 0,
    fase2: realData?.realesPorFase?.fase2 || 0,
    fase3: realData?.realesPorFase?.fase3 || 0,
    fase4: realData?.realesPorFase?.fase4 || 0,
  };

  // ==========================================================================
  // RENDERIZADO: ESTADOS DE CARGA
  // ==========================================================================

  // Estado 1: Cargando datos
  if (loading) {
    return (
      <LinearGradient colors={["#1A365D", "#2C5282"]} style={styles.container}>
        <View style={styles.centerContent}>
          {/* Spinner de carga */}
          <ActivityIndicator size="large" color="#FFF" />
          <Text style={styles.loadingText}>Cargando estadísticas...</Text>
        </View>
      </LinearGradient>
    );
  }

  // Estado 2: No hay presupuesto configurado
  if (!budget) {
    return (
      <LinearGradient colors={["#1A365D", "#2C5282"]} style={styles.container}>
        <View style={styles.centerContent}>
          {/* Título del proyecto */}
          <Text style={styles.title}>{title}</Text>
          
          {/* Mensaje informativo */}
          <Text style={styles.subtitle}>
            Este proyecto aún no tiene presupuesto.
          </Text>
          
          {/* Botón para volver */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  // ==========================================================================
  // RENDERIZADO PRINCIPAL (cuando hay datos)
  // ==========================================================================
  return (
    <LinearGradient colors={["#1A365D", "#2C5282"]} style={styles.container}>
      {/* ScrollView para contenido extensible */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* ====================================================================
         * SECCIÓN: HEADER
         * Contiene navegación y título del proyecto
         * ==================================================================== */}
        <View style={styles.header}>
          {/* Enlace para volver */}
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>‹ Volver</Text>
          </TouchableOpacity>
          
          {/* Título de la pantalla */}
          <Text style={styles.title}>Estadísticas del presupuesto</Text>
          
          {/* Subtítulo con nombre del proyecto */}
          <Text style={styles.subtitle}>{title}</Text>
        </View>

        {/* ====================================================================
         * SECCIÓN: KPI GLOBAL
         * Muestra el indicador principal (gráfico de pastel) y valores clave
         * ==================================================================== */}
        <View style={styles.kpiGlobal}>
          {/* Gráfico de pastel con porcentaje de ejecución */}
          <PieChartSimple 
            percentage={porcentajeEjecucion} 
            size={140} 
          />

          {/* Bloque de texto con valores clave */}
          <View style={styles.kpiTextBlock}>
            {/* Presupuesto planificado */}
            <Text style={styles.kpiText}>
              Presupuesto: ${totalPresupuesto.toLocaleString("es-CO")}
            </Text>
            
            {/* Gasto real ejecutado */}
            <Text style={styles.kpiText}>
              Gasto real: ${totalReal.toLocaleString("es-CO")}
            </Text>
            
            {/* Diferencia (color dinámico según valor) */}
            <Text
              style={[
                styles.kpiText,
                { 
                  color: diferencia < 0 ? "#F56565" : "#68D391" // Rojo si negativo, verde si positivo
                },
              ]}
            >
              Diferencia: ${diferencia.toLocaleString("es-CO")}
            </Text>
          </View>
        </View>

        {/* ====================================================================
         * SECCIÓN: GRÁFICA DE LÍNEAS COMPARATIVA
         * Muestra presupuesto vs real por fases
         * ==================================================================== */}
        <BudgetComparisonChart
          presupuestoPorFase={fasesPresupuesto}
          realPorFase={fasesReal}
        />

        {/* ====================================================================
         * SECCIÓN: DISTRIBUCIÓN POR FASE
         * Tabla detallada de valores por fase
         * ==================================================================== */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Distribución por fases</Text>

          {/* Mapear cada fase (fase1, fase2, fase3, fase4) */}
          {Object.keys(fasesPresupuesto).map((fase, idx) => {
            const total = fasesPresupuesto[fase];
            return (
              <View key={fase} style={styles.row}>
                {/* Etiqueta de la fase */}
                <Text style={styles.label}>Fase {idx + 1}</Text>
                
                {/* Valor formateado */}
                <Text style={styles.value}>
                  ${total.toLocaleString("es-CO")}
                </Text>
              </View>
            );
          })}
        </View>

        {/* ====================================================================
         * SECCIÓN: AIU E IMPUESTOS
         * Muestra porcentajes de Administración, Imprevistos y Utilidad
         * ==================================================================== */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>AIU e impuestos</Text>
          
          {/* Administración */}
          <Text style={styles.aiuLine}>
            Administración: {budget.porcentajes?.administracion ?? 0}%
          </Text>
          
          {/* Imprevistos */}
          <Text style={styles.aiuLine}>
            Imprevistos: {budget.porcentajes?.imprevistos ?? 0}%
          </Text>
          
          {/* Utilidad */}
          <Text style={styles.aiuLine}>
            Utilidad: {budget.porcentajes?.utilidad ?? 0}%
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

/* ============================================================================
 * ESTILOS
 * Diseño con gradiente azul y tarjetas semitransparentes
 * ============================================================================ */

const styles = StyleSheet.create({
  // Contenedor principal con gradiente azul
  container: { 
    flex: 1, 
    backgroundColor: colors.background // Color de fondo del tema
  },
  
  // Contenedor centrado para estados de carga/error
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24, // Padding lateral
  },
  
  // Texto de carga
  loadingText: { 
    marginTop: 12, 
    fontSize: 16, 
    color: "#E2E8F0" // Gris azulado claro
  },

  // Contenedor del contenido scrollable
  scrollContent: { 
    padding: 16, 
    paddingBottom: 32 // Espacio extra al final para scroll
  },

  // Header de la pantalla
  header: { 
    marginBottom: 16 
  },
  
  // Enlace de "volver"
  backLink: { 
    color: "#E2E8F0", 
    fontSize: 14, 
    marginBottom: 8 
  },
  
  // Título principal
  title: { 
    fontSize: 20, 
    fontWeight: "700", 
    color: "#FFF" 
  },
  
  // Subtítulo
  subtitle: { 
    fontSize: 14, 
    color: "#CBD5F5", // Azul claro
    marginTop: 4 
  },

  // Botón para volver (en estado de error)
  backButton: {
    marginTop: 16,
    backgroundColor: "#3182CE", // Azul
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  
  // Texto del botón de volver
  backButtonText: { 
    color: "#FFF", 
    fontSize: 15, 
    fontWeight: "600" 
  },

  // Contenedor de KPI global (gráfico + texto)
  kpiGlobal: {
    alignItems: "center", // Centrado horizontal
    marginBottom: 24,
  },
  
  // Bloque de texto del KPI
  kpiTextBlock: {
    marginTop: 12,
    alignItems: "center",
  },
  
  // Texto del KPI
  kpiText: {
    color: "#E2E8F0",
    fontSize: 13,
    marginTop: 4,
  },

  // Tarjetas de contenido
  card: {
    backgroundColor: "rgba(15,23,42,0.9)", // Azul muy oscuro semitransparente
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.4)", // Borde sutil
  },

  // Título de sección dentro de tarjetas
  sectionTitle: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },

  // Fila para distribución de elementos (etiqueta + valor)
  row: {
    flexDirection: "row",
    justifyContent: "space-between", // Etiqueta a la izquierda, valor a la derecha
    marginVertical: 4, // Espacio vertical entre filas
  },

  // Etiqueta en las filas
  label: { 
    color: "#CBD5E0" // Gris azulado claro
  },
  
  // Valor en las filas
  value: { 
    color: "#E2E8F0", // Blanco azulado
    fontWeight: "600" // Seminegrita
  },

  // Línea de información de AIU
  aiuLine: {
    fontSize: 13,
    color: "#E2E8F0",
    marginTop: 4,
  },
});

// ============================================================================
// FIN DEL ARCHIVO BudgetStatsScreen.js
// ============================================================================