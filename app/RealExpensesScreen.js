/**
 * PANTALLA DE GASTOS REALES DEL PROYECTO
 * 
 * Descripción:
 * Pantalla para visualizar y gestionar los gastos reales de un proyecto organizados por fases.
 * Permite ver materiales, viáticos, trámites y mano de obra de cada fase con control de permisos por rol.
 * 
 * Características principales:
 * 1. Organización de gastos por 4 fases del proyecto
 * 2. Control de visibilidad basado en roles de usuario
 * 3. Visualización expandible/colapsable de fases e items
 * 4. Exportación de reportes por fase a Excel
 * 5. Agregar nuevos viáticos y trámites (con permisos)
 * 6. Resumen financiero general del proyecto
 * 7. Diseño con gradiente y cards para mejor legibilidad
 * 
 * Estructura de fases:
 * - Fase 1: Equipos y Estructura (materiales)
 * - Fase 2: Sistema Eléctrico (materiales)
 * - Fase 3: Instalación y Puesta en Servicio (viáticos + mano de obra)
 * - Fase 4: Trámites y Otros (trámites)
 * 
 * Permisos por rol:
 * - Administrador/Administrativo: Acceso completo a todas las fases
 * - Supervisor: Solo puede ver Fase 3 (viáticos y mano de obra)
 * - Ingeniero: Puede agregar viáticos y trámites
 * - Otros roles: Acceso limitado o sin acceso
 * 
 * Flujo de datos:
 * Proyecto → [Carga datos financieros] → [Agrupa por fase] → [Visualiza con permisos]
 * 
 * @component
 * @returns {JSX.Element} Pantalla de gastos reales del proyecto
 * 
 * @example
 * <RealExpensesScreen />
 */

// Importaciones de React Navigation y UI
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

// Contextos, configuraciones y servicios
import { useUser } from "../context/UserContext";
import { db } from "../firebase/firebaseConfig";
import { realExpensesService } from "../services/realExpensesService";

// Componentes específicos de gastos reales
import AddTramiteModal from "../components/realExpenses/AddTramiteModal";
import AddViaticoModal from "../components/realExpenses/AddViaticoModal";

// Utilidades de exportación
import { exportRealExpensesPhaseReport } from "../utils/exportRealExpensesPhaseReport";

/**
 * Formatea un valor numérico a moneda colombiana
 * 
 * @function formatCurrency
 * @param {number|string} value - Valor a formatear
 * @returns {string} Valor formateado como moneda COP
 * 
 * @example
 * formatCurrency(1000000) // "$ 1.000.000"
 */
function formatCurrency(value) {
  const num = Number(value) || 0;
  try {
    return "$ " + num.toLocaleString("es-CO");
  } catch {
    return "$ " + num.toString();
  }
}

/**
 * Componente de sección de fase con diseño en columna
 * 
 * @component
 * @param {Object} props - Propiedades del componente
 * @param {string} props.title - Título de la fase
 * @param {string} props.color - Color del punto indicador
 * @param {number} props.total - Total de la fase
 * @param {React.ReactNode} props.children - Contenido de la fase (items)
 * @param {boolean} props.expanded - Estado expandido/colapsado
 * @param {Function} props.onToggle - Función para alternar estado
 * @returns {JSX.Element} Sección de fase renderizada
 * 
 * @description
 * Estructura en columna:
 * - Línea 1: Punto + Título
 * - Línea 2: Total (debajo del título)
 * - Línea 3: Toggle (debajo del total)
 */
function PhaseSection({ title, color, total, children, expanded, onToggle }) {
  return (
    <View style={styles.phaseContainer}>
      {/* Header clickeable para expandir/colapsar */}
      <TouchableOpacity style={styles.phaseHeader} onPress={onToggle}>
        {/* Línea 1: Punto + Título */}
        <View style={styles.phaseTitleRow}>
          <View style={[styles.phaseDot, { backgroundColor: color }]} />
          <Text style={styles.phaseTitle} numberOfLines={2}>
            {title}
          </Text>
        </View>

        {/* Línea 2: Total de la fase */}
        <Text style={styles.phaseTotal}>{formatCurrency(total)}</Text>

        {/* Línea 3: Indicador de toggle */}
        <Text style={styles.phaseToggle}>
          {expanded ? "Ocultar ▲" : "Ver detalles ▼"}
        </Text>
      </TouchableOpacity>

      {/* Contenido de la fase (visible cuando expanded = true) */}
      {expanded && <View style={styles.phaseBody}>{children}</View>}
    </View>
  );
}

/**
 * Componente de item de gasto (material, viático, trámite o mano de obra)
 * 
 * @component
 * @param {Object} props - Propiedades del componente
 * @param {Object} props.item - Datos del gasto
 * @param {string} props.type - Tipo de gasto (material, viatico, tramite, manoObra)
 * @param {boolean} props.expanded - Estado expandido para mostrar detalles
 * @param {Function} props.onToggle - Función para alternar estado de detalles
 * @returns {JSX.Element} Card de gasto renderizada
 * 
 * @description
 * Muestra información específica según el tipo:
 * - Material: nombre, cantidad, precio unitario, total
 * - Viático: concepto, categoría, valor
 * - Trámite: concepto, valor
 * - Mano de obra: total agregado, horas normales/extra, factor
 */
function ExpenseItemCard({ item, type, expanded, onToggle }) {
  // Variables para mostrar según el tipo
  let title = "";
  let amount = 0;
  let subtitle = "";
  let extraLines = [];

  // Obtener fecha del item (priorizando diferentes campos posibles)
  const fecha = item.fecha || item.fechaInicio || item.createdAt;

  switch (type) {
    case "material": {
      title = item.nombre || "Material";
      const unit = item.precioUnitario ?? item.costoUnitario ?? item.precio ?? 0;
      amount = item.total ?? (Number(unit) * Number(item.cantidad || 0)) ?? 0;

      subtitle = `Cant: ${item.cantidad || 0} · C. unit: ${formatCurrency(unit)}`;

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

    case "manoObra": {
      // ✅ Item virtual SOLO UI (resumen agregado de mano de obra)
      title = "Mano de obra (agregado)";
      amount = Number(item.total || 0);

      const th = Number(item.totalHorasManoObra || 0);
      const hn = Number(item.totalHorasNormales || 0);
      const he = Number(item.totalHorasExtras || 0);
      const factor = Number(item.extraFactor || 1.25);

      subtitle = `Horas: ${th} (Norm: ${hn} / Extra: ${he})`;
      extraLines = [`Factor horas extra: x${factor}`];
      break;
    }

    default:
      title = "Gasto";
      amount = item.total || item.valor || 0;
      subtitle = "";
      extraLines = [
        fecha ? `Fecha: ${new Date(fecha).toLocaleDateString()}` : null,
      ];
  }

  return (
    <TouchableOpacity style={styles.itemCard} onPress={onToggle}>
      {/* Header con título y monto */}
      <View style={styles.itemHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.itemTitle}>{title}</Text>
          {!!subtitle && <Text style={styles.itemSubtitle}>{subtitle}</Text>}
        </View>
        <Text style={styles.itemAmount}>{formatCurrency(amount)}</Text>
      </View>
      
      {/* Etiqueta del tipo de gasto */}
      <Text style={styles.itemTypeLabel}>{type.toUpperCase()}</Text>
      
      {/* Detalles adicionales (visible cuando expanded = true) */}
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

/**
 * Componente principal de gastos reales del proyecto
 * 
 * @function RealExpensesScreen
 * @returns {JSX.Element} Pantalla de gastos reales renderizada
 */
export default function RealExpensesScreen() {
  // ==================== PARÁMETROS Y CONTEXTOS ====================
  
  // Hook para obtener parámetros de navegación
  const params = useLocalSearchParams();
  const router = useRouter();
  const { role } = useUser();

  /**
   * Extrae y procesa parámetros del proyecto de forma segura
   * Maneja casos donde los parámetros pueden venir como arrays o strings
   */
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

  // ==================== ESTADOS PRINCIPALES ====================
  
  const [data, setData] = useState(null);           // Datos financieros del proyecto
  const [loading, setLoading] = useState(true);     // Estado de carga inicial

  // ==================== PERMISOS POR ROL ====================
  
  const canSeeAll = ["Administrador", "Administrativo"].includes(role);
  const canSeePhase3 = canSeeAll || role === "Supervisor";

  // ==================== ESTADOS DE UI ====================
  
  /**
   * Estados expandidos de cada fase (por defecto según permisos)
   * @type {[Object, Function]}
   */
  const [expandedPhase, setExpandedPhase] = useState(() => ({
    fase1: canSeeAll ? true : false,   // Fase 1 visible solo si tiene permiso
    fase2: false,
    fase3: true,                       // Fase 3 siempre visible si tiene permiso
    fase4: false,
  }));

  /**
   * Estados expandidos de items individuales
   * @type {[Object, Function]}
   */
  const [expandedItems, setExpandedItems] = useState({});
  
  /**
   * Estados de visibilidad de modales
   * @type {[boolean, Function]}
   */
  const [showViaticoModal, setShowViaticoModal] = useState(false);
  const [showTramiteModal, setShowTramiteModal] = useState(false);
  
  /**
   * Estado de carga durante operaciones de guardado
   * @type {[boolean, Function]}
   */
  const [saving, setSaving] = useState(false);

  // ==================== CARGA DE DATOS ====================
  
  /**
   * Carga los datos financieros del proyecto desde Firestore
   * 
   * @async
   */
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

  /**
   * Efecto para cargar datos al montar el componente o cambiar projectId
   */
  useEffect(() => {
    loadData();
  }, [projectId]);

  /**
   * Efecto para recargar datos cuando la pantalla recibe foco
   */
  useFocusEffect(
    useCallback(() => {
      if (projectId) loadData();
    }, [projectId])
  );

  // ==================== AGRUPACIÓN DE DATOS POR FASE ====================
  
  /**
   * Agrupa los datos financieros por fase según permisos
   * 
   * @type {Object}
   * @property {Array} fase1 - Materiales de fase 1
   * @property {Array} fase2 - Materiales de fase 2
   * @property {Array} fase3 - Viáticos + mano de obra (resumen)
   * @property {Array} fase4 - Trámites
   */
  const groupedByPhase = useMemo(() => {
    if (!data) return { fase1: [], fase2: [], fase3: [], fase4: [] };

    const fase1 = data.materiales.filter((m) => m.fase === "fase1");
    const fase2 = data.materiales.filter((m) => m.fase === "fase2");

    // ✅ Item virtual SOLO UI (resumen agregado de mano de obra)
    const manoObraSummary = {
      id: "mano-obra-summary",
      tipo: "manoObra",
      fase: "fase3",
      total: Number(data.totalManoObraReal || 0),
      totalHorasManoObra: Number(data.totalHorasManoObra || 0),
      totalHorasNormales: Number(data.totalHorasNormales || 0),
      totalHorasExtras: Number(data.totalHorasExtras || 0),
      extraFactor: Number(data.extraFactor || 1.25),
    };

    const fase3 = [...data.viaticos, manoObraSummary];
    const fase4 = data.tramites || [];

    // Restringir acceso según permisos
    if (!canSeeAll) return { fase1: [], fase2: [], fase3, fase4: [] };
    return { fase1, fase2, fase3, fase4 };
  }, [data, canSeeAll]);

  // ==================== FUNCIONES AUXILIARES ====================
  
  /**
   * Alterna estado expandido de un item individual
   * 
   * @param {string} key - Clave única del item
   */
  const toggleItem = (key) => {
    setExpandedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  /**
   * Calcula los totales por categoría para una fase específica
   * 
   * @param {string} phaseKey - Clave de la fase (fase1, fase2, fase3, fase4)
   * @returns {Object} Totales por categoría
   * @property {number} materiales - Total materiales
   * @property {number} viaticos - Total viáticos
   * @property {number} tramites - Total trámites
   * @property {number} manoObra - Total mano de obra
   * @property {number} totalFase - Total general de la fase
   */
  const computePhaseTotals = (phaseKey) => {
    const items = groupedByPhase[phaseKey] || [];

    let materiales = 0;
    let viaticos = 0;
    let tramites = 0;
    let manoObra = 0;

    for (const item of items) {
      const tipo = item.tipo;

      if (tipo === "material") {
        const unit = Number(
          item.precioUnitario ?? item.costoUnitario ?? item.precio ?? 0
        );
        const qty = Number(item.cantidad || 0);
        materiales += Number(item.total ?? unit * qty ?? 0);
      } else if (tipo === "viatico") {
        viaticos += Number(item.valor || 0);
      } else if (tipo === "tramite") {
        tramites += Number(item.valor || 0);
      } else if (tipo === "manoObra") {
        manoObra += Number(item.total || 0);
      }
    }

    return {
      materiales,
      viaticos,
      tramites,
      manoObra,
      totalFase: materiales + viaticos + tramites + manoObra,
    };
  };

  /**
   * Exporta reporte de una fase específica a Excel
   * 
   * @async
   * @param {string} phaseKey - Clave de la fase a exportar
   */
  const handleExportPhase = async (phaseKey) => {
    try {
      const totals = computePhaseTotals(phaseKey);
      const items = groupedByPhase[phaseKey] || [];

      const res = await exportRealExpensesPhaseReport({
        phaseKey,
        projectTitle: title || "",
        items,
        totals,
      });

      if (!res.ok) {
        Alert.alert("Error", res.message || "No se pudo exportar el reporte.");
      }
    } catch (err) {
      console.error("Error exportando fase:", err);
      Alert.alert("Error", "No se pudo exportar el reporte.");
    }
  };

  // ==================== MANEJO DE FORMULARIOS ====================
  
  /**
   * Maneja la adición de un nuevo viático
   * 
   * @async
   * @param {Object} form - Datos del viático
   * @param {string} form.concepto - Concepto del viático
   * @param {string} form.categoria - Categoría del viático
   * @param {number} form.valor - Valor del viático
   * @param {string} form.notas - Notas adicionales
   */
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
      await loadData(); // Recargar datos para reflejar cambios
    } catch (error) {
      console.error("Error agregando viático:", error);
      Alert.alert("Error", "No se pudo guardar el viático.");
    } finally {
      setSaving(false);
    }
  };

  /**
   * Maneja la adición de un nuevo trámite
   * 
   * @async
   * @param {Object} form - Datos del trámite
   * @param {string} form.concepto - Concepto del trámite
   * @param {number} form.valor - Valor del trámite
   * @param {string} form.notas - Notas adicionales
   */
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
      await loadData(); // Recargar datos para reflejar cambios
    } catch (error) {
      console.error("Error agregando trámite:", error);
      Alert.alert("Error", "No se pudo guardar el trámite.");
    } finally {
      setSaving(false);
    }
  };

  // ==================== RENDER PRINCIPAL ====================
  
  return (
    <LinearGradient colors={["#0f172a", "#020617"]} style={styles.container}>
      {/* Header con título y navegación */}
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

      {/* Estados de carga y sin datos */}
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
        /* Contenido principal con todas las fases */
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* FASE 1 - Equipos y Estructura (solo para canSeeAll) */}
          {canSeeAll && (
            <PhaseSection
              title="Fase 1 - Equipos y Estructura"
              color="#22c55e" // Verde
              total={data.realesPorFase.fase1}
              expanded={expandedPhase.fase1}
              onToggle={() =>
                setExpandedPhase((prev) => ({ ...prev, fase1: !prev.fase1 }))
              }
            >
              {/* Botón para exportar reporte de Fase 1 */}
              <TouchableOpacity
                style={styles.reportButton}
                onPress={() => handleExportPhase("fase1")}
              >
                <Text style={styles.reportButtonText}>📄 Reporte Fase 1</Text>
              </TouchableOpacity>

              {/* Lista de materiales de Fase 1 */}
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

          {/* FASE 2 - Sistema Eléctrico (solo para canSeeAll) */}
          {canSeeAll && (
            <PhaseSection
              title="Fase 2 - Sistema Eléctrico"
              color="#3b82f6" // Azul
              total={data.realesPorFase.fase2}
              expanded={expandedPhase.fase2}
              onToggle={() =>
                setExpandedPhase((prev) => ({ ...prev, fase2: !prev.fase2 }))
              }
            >
              {/* Botón para exportar reporte de Fase 2 */}
              <TouchableOpacity
                style={styles.reportButton}
                onPress={() => handleExportPhase("fase2")}
              >
                <Text style={styles.reportButtonText}>📄 Reporte Fase 2</Text>
              </TouchableOpacity>

              {/* Lista de materiales de Fase 2 */}
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

          {/* FASE 3 - Instalación y Puesta en Servicio (para canSeePhase3) */}
          {canSeePhase3 ? (
            <PhaseSection
              title="Fase 3 - Instalación y Puesta en Servicio"
              color="#eab308" // Amarillo
              total={data.realesPorFase.fase3}
              expanded={expandedPhase.fase3}
              onToggle={() =>
                setExpandedPhase((prev) => ({ ...prev, fase3: !prev.fase3 }))
              }
            >
              {/* Botón para exportar reporte de Fase 3 */}
              <TouchableOpacity
                style={styles.reportButton}
                onPress={() => handleExportPhase("fase3")}
              >
                <Text style={styles.reportButtonText}>📄 Reporte Fase 3</Text>
              </TouchableOpacity>

              {/* Lista de viáticos y mano de obra de Fase 3 */}
              {groupedByPhase.fase3.length === 0 ? (
                <Text style={styles.emptyText}>Sin gastos registrados.</Text>
              ) : (
                groupedByPhase.fase3.map((item, idx) => {
                  const type = item.tipo;
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
          ) : null}

          {/* FASE 4 - Trámites y Otros (solo para canSeeAll) */}
          {canSeeAll && (
            <PhaseSection
              title="Fase 4 - Trámites y Otros"
              color="#f97316" // Naranja
              total={data.realesPorFase.fase4}
              expanded={expandedPhase.fase4}
              onToggle={() =>
                setExpandedPhase((prev) => ({ ...prev, fase4: !prev.fase4 }))
              }
            >
              {/* Botón para exportar reporte de Fase 4 */}
              <TouchableOpacity
                style={styles.reportButton}
                onPress={() => handleExportPhase("fase4")}
              >
                <Text style={styles.reportButtonText}>📄 Reporte Fase 4</Text>
              </TouchableOpacity>

              {/* Lista de trámites de Fase 4 */}
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

          {/* RESUMEN FINANCIERO GENERAL */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Resumen general</Text>

            {/* Resumen completo para canSeeAll */}
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
                    Total general
                  </Text>
                  <Text style={[styles.summaryValue, { fontWeight: "700" }]}>
                    {formatCurrency(data.totalReal)}
                  </Text>
                </View>
              </>
            ) : (
              /* Resumen limitado para otros roles */
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

      {/* FAB (Floating Action Button) para agregar gastos */}
      <View style={styles.fabWrapper}>
        <TouchableOpacity
          style={styles.fabButton}
          onPress={() => {
            const options = [
              { text: "Viático", onPress: () => setShowViaticoModal(true) },
            ];

            // Trámite solo Admin/Administrativo/Ingeniero
            if (["Administrador", "Administrativo", "Ingeniero"].includes(role)) {
              options.push({
                text: "Trámite",
                onPress: () => setShowTramiteModal(true),
              });
            }

            options.push({ text: "Cancelar", style: "cancel" });

            Alert.alert(
              "Agregar gasto",
              "¿Qué tipo de gasto deseas agregar?",
              options
            );
          }}
        >
          <Text style={styles.fabText}>＋</Text>
        </TouchableOpacity>
      </View>

      {/* Modales para agregar gastos */}
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

// ==================== ESTILOS DEL COMPONENTE ====================

/**
 * Estilos del componente
 * 
 * @constant {Object} styles
 */
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 40, paddingHorizontal: 16, paddingBottom: 12 },
  backText: { color: "#9CA3AF", marginBottom: 4 },
  headerTitle: { color: "#F9FAFB", fontSize: 22, fontWeight: "700" },
  headerSubtitle: { color: "#9CA3AF", fontSize: 14 },
  loadingContainer: { flex: 1, paddingTop: 40, alignItems: "center" },
  loadingText: { color: "#D1D5DB", marginTop: 8 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 80 },

  // Estilos para secciones de fase
  phaseContainer: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: "rgba(15,23,42,0.85)",
    borderWidth: 1,
    borderColor: "rgba(55,65,81,0.6)",
  },
  phaseHeader: {
    flexDirection: "column",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  phaseTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  phaseDot: { width: 10, height: 10, borderRadius: 999, marginRight: 8 },
  phaseTitle: { color: "#E5E7EB", fontSize: 15, fontWeight: "600" },
  phaseTotal: {
    color: "#F9FAFB",
    fontSize: 15,
    fontWeight: "600",
    marginTop: 6,
  },
  phaseToggle: { color: "#9CA3AF", fontSize: 12, marginTop: 2 },
  phaseBody: { paddingHorizontal: 8, paddingBottom: 8 },

  // Botón de reporte
  reportButton: {
    marginTop: 8,
    marginBottom: 8,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "rgba(148,163,184,0.12)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.25)",
  },
  reportButtonText: {
    color: "#E5E7EB",
    fontSize: 13,
    fontWeight: "700",
  },

  // Texto para lista vacía
  emptyText: { color: "#9CA3AF", fontSize: 13, padding: 8 },

  // Estilos para cards de items
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

  // Estilos para resumen financiero
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

  // Estilos para FAB (Floating Action Button)
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