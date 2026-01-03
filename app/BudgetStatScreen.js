// app/BudgetStatsScreen.js
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { budgetService } from "../services/budgetService";
import realExpensesService from "../services/realExpensesService";

import BudgetComparisonChart from "../components/charts/BudgetComparisonChart";
import PieChartSimple from "../components/charts/PieChartSimple";

import colors from "../theme/colors";

export default function BudgetStatsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const { projectId, title } = useMemo(() => {
    const pId = Array.isArray(params.projectId)
      ? params.projectId[0]
      : params.projectId;
    const t = Array.isArray(params.title) ? params.title[0] : params.title;

    return {
      projectId: pId && pId !== "undefined" ? pId : null,
      title: t || "Proyecto sin nombre",
    };
  }, [params.projectId, params.title]);

  const [budget, setBudget] = useState(null);
  const [realData, setRealData] = useState(null);
  const [loading, setLoading] = useState(true);

  // ==============================
  // CARGA DE DATOS
  // ==============================
  useEffect(() => {
    if (!projectId) return;

    const load = async () => {
      setLoading(true);
      try {
        const b = await budgetService.getBudgetByProject(projectId);
        const r = await realExpensesService.getProjectFinancialData(projectId);

        setBudget(b || null);
        setRealData(r || null);
      } catch (err) {
        console.error("Error cargando estadísticas:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [projectId]);

  // ==============================
  // CÁLCULOS
  // ==============================
  const totalPresupuesto = budget?.totalGeneral || 0;
  const totalReal = realData?.totalReal || 0;
  const diferencia = totalPresupuesto - totalReal;
  const porcentajeEjecucion =
    totalPresupuesto > 0 ? (totalReal / totalPresupuesto) * 100 : 0;

  const fasesPresupuesto = {
    fase1: budget?.fases?.fase1?.total || 0,
    fase2: budget?.fases?.fase2?.total || 0,
    fase3: budget?.fases?.fase3?.total || 0,
    fase4: budget?.fases?.fase4?.total || 0,
  };

  const fasesReal = {
    fase1: realData?.realesPorFase?.fase1 || 0,
    fase2: realData?.realesPorFase?.fase2 || 0,
    fase3: realData?.realesPorFase?.fase3 || 0,
    fase4: realData?.realesPorFase?.fase4 || 0,
  };

  // ==============================
  // ESTADOS DE CARGA
  // ==============================
  if (loading) {
    return (
      <LinearGradient colors={["#1A365D", "#2C5282"]} style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#FFF" />
          <Text style={styles.loadingText}>Cargando estadísticas...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (!budget) {
    return (
      <LinearGradient colors={["#1A365D", "#2C5282"]} style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>
            Este proyecto aún no tiene presupuesto.
          </Text>
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

  // ==============================
  // RENDER
  // ==============================
  return (
    <LinearGradient colors={["#1A365D", "#2C5282"]} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>‹ Volver</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Estadísticas del presupuesto</Text>
          <Text style={styles.subtitle}>{title}</Text>
        </View>

        {/* KPI GLOBAL */}
        <View style={styles.kpiGlobal}>
          <PieChartSimple percentage={porcentajeEjecucion} size={140} />

          <View style={styles.kpiTextBlock}>
            <Text style={styles.kpiText}>
              Presupuesto: ${totalPresupuesto.toLocaleString("es-CO")}
            </Text>
            <Text style={styles.kpiText}>
              Gasto real: ${totalReal.toLocaleString("es-CO")}
            </Text>
            <Text
              style={[
                styles.kpiText,
                { color: diferencia < 0 ? "#F56565" : "#68D391" },
              ]}
            >
              Diferencia: ${diferencia.toLocaleString("es-CO")}
            </Text>
          </View>
        </View>

        {/* GRÁFICA DE LÍNEAS */}
        <BudgetComparisonChart
          presupuestoPorFase={fasesPresupuesto}
          realPorFase={fasesReal}
        />

        {/* DISTRIBUCIÓN POR FASE */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Distribución por fases</Text>

          {Object.keys(fasesPresupuesto).map((fase, idx) => {
            const total = fasesPresupuesto[fase];
            return (
              <View key={fase} style={styles.row}>
                <Text style={styles.label}>Fase {idx + 1}</Text>
                <Text style={styles.value}>
                  ${total.toLocaleString("es-CO")}
                </Text>
              </View>
            );
          })}
        </View>

        {/* AIU */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>AIU e impuestos</Text>
          <Text style={styles.aiuLine}>
            Administración: {budget.porcentajes?.administracion ?? 0}%
          </Text>
          <Text style={styles.aiuLine}>
            Imprevistos: {budget.porcentajes?.imprevistos ?? 0}%
          </Text>
          <Text style={styles.aiuLine}>
            Utilidad: {budget.porcentajes?.utilidad ?? 0}%
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

/* ==============================
   ESTILOS
============================== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  loadingText: { marginTop: 12, fontSize: 16, color: "#E2E8F0" },

  scrollContent: { padding: 16, paddingBottom: 32 },

  header: { marginBottom: 16 },
  backLink: { color: "#E2E8F0", fontSize: 14, marginBottom: 8 },
  title: { fontSize: 20, fontWeight: "700", color: "#FFF" },
  subtitle: { fontSize: 14, color: "#CBD5F5", marginTop: 4 },

  backButton: {
    marginTop: 16,
    backgroundColor: "#3182CE",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  backButtonText: { color: "#FFF", fontSize: 15, fontWeight: "600" },

  kpiGlobal: {
    alignItems: "center",
    marginBottom: 24,
  },
  kpiTextBlock: {
    marginTop: 12,
    alignItems: "center",
  },
  kpiText: {
    color: "#E2E8F0",
    fontSize: 13,
    marginTop: 4,
  },

  card: {
    backgroundColor: "rgba(15,23,42,0.9)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.4)",
  },

  sectionTitle: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 4,
  },

  label: { color: "#CBD5E0" },
  value: { color: "#E2E8F0", fontWeight: "600" },

  aiuLine: {
    fontSize: 13,
    color: "#E2E8F0",
    marginTop: 4,
  },
});
