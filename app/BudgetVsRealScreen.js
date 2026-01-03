// app/BudgetVsRealScreen.js
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

import FaseKpiCard from "../components/charts/FaseKpiCard";

export default function BudgetVsRealScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const { projectId, title } = useMemo(() => {
    const id = Array.isArray(params.projectId)
      ? params.projectId[0]
      : params.projectId;
    const t = Array.isArray(params.title) ? params.title[0] : params.title;

    return {
      projectId: id && id !== "undefined" ? id : null,
      title: t || "Proyecto sin nombre",
    };
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [budget, setBudget] = useState(null);
  const [gastos, setGastos] = useState(null);
  const [gastosPorFase, setGastosPorFase] = useState({
    fase1: 0,
    fase2: 0,
    fase3: 0,
    fase4: 0,
  });

  // Clasificador simple de fase para materiales (fallback)
  const classifyFase = (item) => {
    const name = (item?.nombre || item?.concepto || "").toLowerCase();

    if (
      name.includes("panel") ||
      name.includes("módulo") ||
      name.includes("modulo") ||
      name.includes("rail") ||
      name.includes("perfil") ||
      name.includes("estructura")
    )
      return "fase1";

    if (
      name.includes("cable") ||
      name.includes("breaker") ||
      name.includes("tubería") ||
      name.includes("tubo") ||
      name.includes("conduit")
    )
      return "fase2";

    if (item?.concepto || item?.categoria) return "fase3";

    return "fase4";
  };

  // ==========================================================
  // Cargar presupuesto + gastos + mano de obra real
  // ==========================================================
  const loadData = async () => {
    if (!projectId) return;

    setLoading(true);

    try {
      // Presupuesto
      const b = await budgetService.getBudgetByProject(projectId);

      // Gastos reales completos (incluye mano de obra real)
      const r = await realExpensesService.getProjectFinancialData(projectId);

      // Blindajes por si algún array viene undefined
      const manoObraRealDetalle = Array.isArray(r?.manoObraRealDetalle)
        ? r.manoObraRealDetalle
        : [];
      const materiales = Array.isArray(r?.materiales) ? r.materiales : [];
      const viaticos = Array.isArray(r?.viaticos) ? r.viaticos : [];
      const realesPorFase = r?.realesPorFase || {
        fase1: 0,
        fase2: 0,
        fase3: 0,
        fase4: 0,
      };

      // Horas de mano de obra real (si el service trae totalHoras)
      // Si tu service no trae totalHoras dentro del detalle, deja 0.
      const totalHorasReales = manoObraRealDetalle.reduce(
        (acc, h) => acc + Number(h?.totalHoras || 0),
        0
      );

      // Totales individuales
      const totalMateriales = materiales.reduce(
        (acc, m) => acc + Number(m?.total || 0),
        0
      );

      const totalViaticos = viaticos.reduce(
        (acc, v) => acc + Number(v?.valor || 0),
        0
      );

      // Mano de obra monetizada ya viene del service
      const totalManoObraReal = Number(r?.totalManoObraReal || 0);

      // Total real del proyecto
      const totalReal = Number(r?.totalReal || 0);

      // Clasificación por fases (fallback, aunque ya viene de realesPorFase)
      const faseTotals = {
        fase1: Number(realesPorFase.fase1 || 0),
        fase2: Number(realesPorFase.fase2 || 0),
        fase3: Number(realesPorFase.fase3 || 0),
        fase4: Number(realesPorFase.fase4 || 0),
      };

      setBudget(b || null);

      setGastos({
        ...(r || {}),
        materiales,
        viaticos,
        manoObraRealDetalle,

        totalMateriales,
        totalViaticos,
        totalReal,
        totalHorasReales,
        totalManoObraReal,
      });

      setGastosPorFase(faseTotals);
    } catch (error) {
      console.error("Error cargando BudgetVsReal:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  if (loading) {
    return (
      <LinearGradient colors={["#1A365D", "#2C5282"]} style={styles.center}>
        <ActivityIndicator size="large" color="#FFF" />
        <Text style={styles.loadingText}>Cargando comparativo...</Text>
      </LinearGradient>
    );
  }

  if (!budget) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          No existe presupuesto para este proyecto.
        </Text>
      </View>
    );
  }

  // Resumen global
  const totalPresupuesto = Number(budget?.totalGeneral || 0);
  const totalReal = Number(gastos?.totalReal || 0);

  const diferencia = totalPresupuesto - totalReal;
  const ejecucion =
    totalPresupuesto > 0 ? (totalReal / totalPresupuesto) * 100 : 0;

  return (
    <LinearGradient colors={["#1A365D", "#2C5282"]} style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner}>
        {/* Header */}
        <View style={styles.headerCard}>
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.headerSubtitle}>
            Comparativo Presupuesto vs Real
          </Text>
        </View>

        {/* RESUMEN GENERAL */}
        <View style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>Resumen General</Text>

          <View style={styles.row}>
            <Text style={styles.label}>Presupuesto Total</Text>
            <Text style={styles.value}>
              ${totalPresupuesto.toLocaleString("es-CO")}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Gasto Real</Text>
            <Text style={styles.value}>
              ${totalReal.toLocaleString("es-CO")}
            </Text>
          </View>

          {/* KPI: Horas reales totales */}
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

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.totalLabel}>Diferencia</Text>
            <Text
              style={[
                styles.totalValue,
                diferencia < 0 ? styles.negative : styles.positive,
              ]}
            >
              ${diferencia.toLocaleString("es-CO")}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>% Ejecutado</Text>
            <Text style={styles.value}>{ejecucion.toFixed(1)}%</Text>
          </View>

          {/* BOTÓN A ESTADÍSTICAS */}
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

        {/* KPI POR FASE */}
        <Text style={styles.sectionTitle}>Análisis por Fase</Text>

        <FaseKpiCard
          title="Fase 1: Equipos y Estructura"
          presupuesto={Number(budget?.fases?.fase1?.total || 0)}
          real={Number(gastosPorFase?.fase1 || 0)}
        />

        <FaseKpiCard
          title="Fase 2: Sistema Eléctrico"
          presupuesto={Number(budget?.fases?.fase2?.total || 0)}
          real={Number(gastosPorFase?.fase2 || 0)}
        />

        <FaseKpiCard
          title="Fase 3: Estudios y Servicios (incluye mano de obra)"
          presupuesto={Number(budget?.fases?.fase3?.total || 0)}
          real={Number(gastosPorFase?.fase3 || 0)}
        />

        <FaseKpiCard
          title="Fase 4: Trámites / Otros"
          presupuesto={Number(budget?.fases?.fase4?.total || 0)}
          real={Number(gastosPorFase?.fase4 || 0)}
        />
      </ScrollView>
    </LinearGradient>
  );
}

/* ------------------------- ESTILOS ------------------------- */
const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: 16 },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1A365D",
    paddingHorizontal: 16,
  },

  loadingText: { marginTop: 10, color: "#FFF" },
  errorText: { color: "#FEB2B2", fontSize: 16, textAlign: "center" },

  headerCard: {
    backgroundColor: "rgba(15,23,42,0.9)",
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderColor: "rgba(148,163,184,0.5)",
    borderWidth: 1,
  },
  headerTitle: { fontSize: 20, color: "#FFF", fontWeight: "700" },
  headerSubtitle: { color: "#CBD5E0", marginTop: 4 },

  summaryCard: {
    backgroundColor: "rgba(15,23,42,0.9)",
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderColor: "rgba(148,163,184,0.4)",
    borderWidth: 1,
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

  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148,163,184,0.3)",
    marginVertical: 8,
  },

  label: { color: "#E2E8F0" },
  value: { color: "#CBD5E0", fontWeight: "600" },

  totalLabel: { color: "#FFF", fontWeight: "700" },
  totalValue: { fontWeight: "700", fontSize: 16 },
  positive: { color: "#68D391" },
  negative: { color: "#F56565" },

  // Botón a BudgetStats
  statsButton: {
    marginTop: 14,
    backgroundColor: "#2B6CB0",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.4)",
  },
  statsButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
