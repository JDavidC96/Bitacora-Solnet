// app/RealExpensesScreen.js
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { addDoc, collection } from "firebase/firestore";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useUser } from "../context/UserContext";
import { db } from "../firebase/firebaseConfig";
import { realExpensesService } from "../services/realExpensesService";

// ✅ Quitamos material externo: ya no se importa ni se usa
// import AddMaterialModal from "../components/realExpenses/AddMaterialModal";
import AddTramiteModal from "../components/realExpenses/AddTramiteModal";
import AddViaticoModal from "../components/realExpenses/AddViaticoModal";

function formatCurrency(value) {
  const num = Number(value) || 0;
  try {
    return "$ " + num.toLocaleString("es-CO");
  } catch {
    return "$ " + num.toString();
  }
}

function PhaseSection({ title, color, total, children, expanded, onToggle }) {
  return (
    <View style={styles.phaseContainer}>
      <TouchableOpacity style={styles.phaseHeader} onPress={onToggle}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={[styles.phaseDot, { backgroundColor: color }]} />
          <Text style={styles.phaseTitle}>{title}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.phaseTotal}>{formatCurrency(total)}</Text>
          <Text style={styles.phaseToggle}>
            {expanded ? "Ocultar ▲" : "Ver detalles ▼"}
          </Text>
        </View>
      </TouchableOpacity>
      {expanded && <View style={styles.phaseBody}>{children}</View>}
    </View>
  );
}

function ExpenseItemCard({ item, type, expanded, onToggle }) {
  let title = "";
  let amount = 0;
  let subtitle = "";
  let extraLines = [];

  const fecha = item.fecha || item.fechaInicio || item.createdAt;

  switch (type) {
    case "material": {
      title = item.nombre || "Material";

      const unit =
        item.precioUnitario ?? item.costoUnitario ?? item.precio ?? 0;

      amount =
        item.total ?? (Number(unit) * Number(item.cantidad || 0)) ?? 0;

      subtitle = `Cant: ${item.cantidad || 0} · C. unit: ${formatCurrency(
        unit
      )}`;

      extraLines = [
        item.codigo ? `Código: ${item.codigo}` : null,
        item.notas ? `Notas: ${item.notas}` : null,
        fecha ? `Fecha: ${new Date(fecha).toLocaleDateString()}` : null,
      ];
      break;
    }

    case "viatico":
      title = item.concepto || "Viático";
      amount = item.valor || 0;
      subtitle = item.categoria ? `Categoría: ${item.categoria}` : "";
      extraLines = [
        item.usuario ? `Registrado por: ${item.usuario}` : null,
        item.notas ? `Notas: ${item.notas}` : null,
        fecha ? `Fecha: ${new Date(fecha).toLocaleDateString()}` : null,
      ];
      break;

    case "tramite":
      title = item.concepto || "Trámite";
      amount = item.valor || 0;
      subtitle = "";
      extraLines = [
        item.notas ? `Notas: ${item.notas}` : null,
        fecha ? `Fecha: ${new Date(fecha).toLocaleDateString()}` : null,
      ];
      break;

    case "manoObra":
      // tolerante a ambos formatos
      title = item.personalNombre || item.nombre || "Mano de obra";
      amount = item.total || item.costoTotal || 0;

      if (item.totalHoras != null) {
        subtitle = `Total horas: ${item.totalHoras || 0} · Tarifa/h: ${formatCurrency(
          item.tarifaHora || 0
        )}`;
      } else {
        subtitle = `H. normales: ${item.horasNormales || 0} · H. extra: ${
          item.horasExtras || 0
        }`;
      }

      extraLines = [
        item.rol ? `Rol: ${item.rol}` : null,
        item.fechaInicio
          ? `Desde: ${new Date(item.fechaInicio).toLocaleString()}`
          : null,
        item.fechaFin ? `Hasta: ${new Date(item.fechaFin).toLocaleString()}` : null,
      ];
      break;

    default:
      title = "Gasto";
      amount = item.total || item.valor || 0;
      subtitle = "";
      extraLines = [fecha ? `Fecha: ${new Date(fecha).toLocaleDateString()}` : null];
  }

  return (
    <TouchableOpacity style={styles.itemCard} onPress={onToggle}>
      <View style={styles.itemHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.itemTitle}>{title}</Text>
          {!!subtitle && <Text style={styles.itemSubtitle}>{subtitle}</Text>}
        </View>
        <Text style={styles.itemAmount}>{formatCurrency(amount)}</Text>
      </View>
      <Text style={styles.itemTypeLabel}>{type.toUpperCase()}</Text>
      {expanded && (
        <View style={styles.itemExtra}>
          {extraLines
            .filter((l) => !!l)
            .map((l, idx) => (
              <Text key={idx} style={styles.itemExtraText}>
                {l}
              </Text>
            ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function RealExpensesScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { role } = useUser();

  const { projectId, title } = useMemo(() => {
    return {
      projectId:
        Array.isArray(params.projectId) && params.projectId[0] !== "undefined"
          ? params.projectId[0]
          : params.projectId !== "undefined"
          ? params.projectId
          : null,
      title: Array.isArray(params.title) ? params.title[0] : params.title,
    };
  }, [params.projectId, params.title]);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const canSeeAll = ["Administrador", "Administrativo"].includes(role);

  const [expandedPhase, setExpandedPhase] = useState(() => ({
    fase1: canSeeAll ? true : false,
    fase2: false,
    fase3: true,
    fase4: false,
  }));

  const [expandedItems, setExpandedItems] = useState({});
  const [showViaticoModal, setShowViaticoModal] = useState(false);
  const [showTramiteModal, setShowTramiteModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const result = await realExpensesService.getProjectFinancialData(projectId);
      setData(result);
    } catch (error) {
      console.error("Error cargando gastos reales:", error);
      Alert.alert("Error", "No se pudo cargar la información financiera.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  // ✅ RECARGAR AL VOLVER A ESTA PANTALLA (sin cerrar la app)
  useFocusEffect(
    useCallback(() => {
      if (projectId) loadData();
    }, [projectId])
  );

  const groupedByPhase = useMemo(() => {
    if (!data) return { fase1: [], fase2: [], fase3: [], fase4: [] };

    const fase1 = data.materiales.filter((m) => m.fase === "fase1");
    const fase2 = data.materiales.filter((m) => m.fase === "fase2");
    const fase3 = [
      ...data.viaticos,
      ...(data.personal || []),
      ...(data.manoObra || []),
    ];
    const fase4 = data.tramites || [];

    if (!canSeeAll) return { fase1: [], fase2: [], fase3, fase4: [] };

    return { fase1, fase2, fase3, fase4 };
  }, [data, canSeeAll]);

  const toggleItem = (key) => {
    setExpandedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAddViatico = async (form) => {
    if (!projectId) return;
    setSaving(true);
    try {
      const valor = Number(form.valor) || 0;
      await addDoc(collection(db, "proyectos", projectId, "viaticos"), {
        concepto: form.concepto,
        categoria: form.categoria || "",
        valor,
        fecha: new Date().toISOString(),
        notas: form.notas || "",
      });

      setShowViaticoModal(false);
      await loadData();
    } catch (error) {
      console.error("Error agregando viático:", error);
      Alert.alert("Error", "No se pudo guardar el viático.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddTramite = async (form) => {
    if (!projectId) return;
    setSaving(true);
    try {
      const valor = Number(form.valor) || 0;
      await addDoc(collection(db, "proyectos", projectId, "gastosTramites"), {
        concepto: form.concepto,
        valor,
        fecha: new Date().toISOString(),
        notas: form.notas || "",
      });

      setShowTramiteModal(false);
      await loadData();
    } catch (error) {
      console.error("Error agregando trámite:", error);
      Alert.alert("Error", "No se pudo guardar el trámite.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <LinearGradient colors={["#0f172a", "#020617"]} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>◀ Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gastos Reales</Text>
        <Text style={styles.headerSubtitle}>{title}</Text>

        {!canSeeAll && (
          <Text style={[styles.headerSubtitle, { marginTop: 4 }]}>
            Vista limitada: solo Fase 3
          </Text>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22c55e" />
          <Text style={styles.loadingText}>Cargando información...</Text>
        </View>
      ) : !data ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>No hay datos de gastos aún.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {canSeeAll && (
            <PhaseSection
              title="Fase 1 - Equipos y Estructura"
              color="#22c55e"
              total={data.realesPorFase.fase1}
              expanded={expandedPhase.fase1}
              onToggle={() =>
                setExpandedPhase((prev) => ({ ...prev, fase1: !prev.fase1 }))
              }
            >
              {groupedByPhase.fase1.length === 0 ? (
                <Text style={styles.emptyText}>Sin gastos registrados.</Text>
              ) : (
                groupedByPhase.fase1.map((m) => {
                  const key = `material-${m.id}`;
                  return (
                    <ExpenseItemCard
                      key={key}
                      item={m}
                      type="material"
                      expanded={!!expandedItems[key]}
                      onToggle={() => toggleItem(key)}
                    />
                  );
                })
              )}
            </PhaseSection>
          )}

          {canSeeAll && (
            <PhaseSection
              title="Fase 2 - Sistema Eléctrico"
              color="#3b82f6"
              total={data.realesPorFase.fase2}
              expanded={expandedPhase.fase2}
              onToggle={() =>
                setExpandedPhase((prev) => ({ ...prev, fase2: !prev.fase2 }))
              }
            >
              {groupedByPhase.fase2.length === 0 ? (
                <Text style={styles.emptyText}>Sin gastos registrados.</Text>
              ) : (
                groupedByPhase.fase2.map((m) => {
                  const key = `material-${m.id}`;
                  return (
                    <ExpenseItemCard
                      key={key}
                      item={m}
                      type="material"
                      expanded={!!expandedItems[key]}
                      onToggle={() => toggleItem(key)}
                    />
                  );
                })
              )}
            </PhaseSection>
          )}

          <PhaseSection
            title="Fase 3 - Instalación y Puesta en Servicio"
            color="#eab308"
            total={data.realesPorFase.fase3}
            expanded={expandedPhase.fase3}
            onToggle={() =>
              setExpandedPhase((prev) => ({ ...prev, fase3: !prev.fase3 }))
            }
          >
            {groupedByPhase.fase3.length === 0 ? (
              <Text style={styles.emptyText}>Sin gastos registrados.</Text>
            ) : (
              groupedByPhase.fase3.map((item, idx) => {
                let type = "viatico";
                if (item.tipo === "personal") type = "manoObra";
                if (item.tipo === "manoObra") type = "manoObra";

                const key = `${type}-${item.id || idx}`;
                return (
                  <ExpenseItemCard
                    key={key}
                    item={item}
                    type={type}
                    expanded={!!expandedItems[key]}
                    onToggle={() => toggleItem(key)}
                  />
                );
              })
            )}
          </PhaseSection>

          {canSeeAll && (
            <PhaseSection
              title="Fase 4 - Trámites y Otros"
              color="#f97316"
              total={data.realesPorFase.fase4}
              expanded={expandedPhase.fase4}
              onToggle={() =>
                setExpandedPhase((prev) => ({ ...prev, fase4: !prev.fase4 }))
              }
            >
              {groupedByPhase.fase4.length === 0 ? (
                <Text style={styles.emptyText}>Sin gastos registrados.</Text>
              ) : (
                groupedByPhase.fase4.map((t) => {
                  const key = `tramite-${t.id}`;
                  return (
                    <ExpenseItemCard
                      key={key}
                      item={t}
                      type="tramite"
                      expanded={!!expandedItems[key]}
                      onToggle={() => toggleItem(key)}
                    />
                  );
                })
              )}
            </PhaseSection>
          )}

          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Resumen general</Text>

            {canSeeAll ? (
              <>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Fase 1</Text>
                  <Text style={styles.summaryValue}>
                    {formatCurrency(data.realesPorFase.fase1)}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Fase 2</Text>
                  <Text style={styles.summaryValue}>
                    {formatCurrency(data.realesPorFase.fase2)}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Fase 3</Text>
                  <Text style={styles.summaryValue}>
                    {formatCurrency(data.realesPorFase.fase3)}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Fase 4</Text>
                  <Text style={styles.summaryValue}>
                    {formatCurrency(data.realesPorFase.fase4)}
                  </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { fontWeight: "700" }]}>
                    Total Real
                  </Text>
                  <Text style={[styles.summaryValue, { fontWeight: "700" }]}>
                    {formatCurrency(data.totalReal)}
                  </Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Fase 3</Text>
                  <Text style={styles.summaryValue}>
                    {formatCurrency(data.realesPorFase.fase3)}
                  </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { fontWeight: "700" }]}>
                    Total visible
                  </Text>
                  <Text style={[styles.summaryValue, { fontWeight: "700" }]}>
                    {formatCurrency(data.realesPorFase.fase3)}
                  </Text>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      )}

      <View style={styles.fabWrapper}>
        <TouchableOpacity
          style={styles.fabButton}
          onPress={() => {
            Alert.alert("Agregar gasto", "¿Qué tipo de gasto deseas agregar?", [
              { text: "Viático", onPress: () => setShowViaticoModal(true) },
              { text: "Trámite", onPress: () => setShowTramiteModal(true) },
              { text: "Cancelar", style: "cancel" },
            ]);
          }}
        >
          <Text style={styles.fabText}>＋</Text>
        </TouchableOpacity>
      </View>

      <AddViaticoModal
        visible={showViaticoModal}
        loading={saving}
        onClose={() => setShowViaticoModal(false)}
        onConfirm={handleAddViatico}
      />

      <AddTramiteModal
        visible={showTramiteModal}
        loading={saving}
        onClose={() => setShowTramiteModal(false)}
        onConfirm={handleAddTramite}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 40, paddingHorizontal: 16, paddingBottom: 12 },
  backText: { color: "#9CA3AF", marginBottom: 4 },
  headerTitle: { color: "#F9FAFB", fontSize: 22, fontWeight: "700" },
  headerSubtitle: { color: "#9CA3AF", fontSize: 14 },
  loadingContainer: { flex: 1, paddingTop: 40, alignItems: "center" },
  loadingText: { color: "#D1D5DB", marginTop: 8 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 80 },

  phaseContainer: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: "rgba(15,23,42,0.85)",
    borderWidth: 1,
    borderColor: "rgba(55,65,81,0.6)",
  },
  phaseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  phaseDot: { width: 10, height: 10, borderRadius: 999, marginRight: 8 },
  phaseTitle: { color: "#E5E7EB", fontSize: 15, fontWeight: "600" },
  phaseTotal: { color: "#F9FAFB", fontSize: 15, fontWeight: "600" },
  phaseToggle: { color: "#9CA3AF", fontSize: 12 },
  phaseBody: { paddingHorizontal: 8, paddingBottom: 8 },

  emptyText: { color: "#9CA3AF", fontSize: 13, padding: 8 },

  itemCard: {
    backgroundColor: "#020617",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(55,65,81,0.8)",
  },
  itemHeader: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  itemTitle: { color: "#F9FAFB", fontSize: 14, fontWeight: "600" },
  itemSubtitle: { color: "#9CA3AF", fontSize: 12 },
  itemAmount: { color: "#22C55E", fontWeight: "700", marginLeft: 8 },
  itemTypeLabel: { color: "#6B7280", fontSize: 11 },
  itemExtra: { marginTop: 4 },
  itemExtraText: { color: "#9CA3AF", fontSize: 12 },

  summaryCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "rgba(55,65,81,0.9)",
  },
  summaryTitle: {
    color: "#F9FAFB",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  summaryLabel: { color: "#D1D5DB", fontSize: 13 },
  summaryValue: { color: "#F9FAFB", fontSize: 13 },
  summaryDivider: {
    height: 1,
    backgroundColor: "rgba(75,85,99,0.8)",
    marginVertical: 6,
  },

  fabWrapper: { position: "absolute", right: 20, bottom: 24 },
  fabButton: {
    width: 60,
    height: 60,
    borderRadius: 999,
    backgroundColor: "#22C55E",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 8,
  },
  fabText: { color: "#022C22", fontSize: 32, fontWeight: "900", marginTop: -2 },
});
