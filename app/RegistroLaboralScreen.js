/**
 * PANTALLA DE REGISTRO LABORAL
 * 
 * Descripción:
 * Pantalla para visualizar el registro detallado de horas laborales del personal.
 * Proporciona tanto una vista general de resumen por persona como el detalle de jornadas individuales.
 * Incluye funcionalidad de exportación a Excel y soporta desglose de diferentes tipos de horas.
 * 
 * Características principales:
 * 1. Vista general de resumen por persona con desglose de horas por tipo
 * 2. Vista detallada de jornadas individuales
 * 3. Exportación de registros a Excel
 * 4. Control de permisos por rol (solo Admin y Administrativo)
 * 5. Carga de datos específicos por persona o general
 * 6. Cálculo de diferentes tipos de horas (normales, extras, nocturnas, dominicales, etc.)
 * 
 * Tipos de horas manejados:
 * - Horas Normales (hn): Horas regulares diurnas
 * - Horas Extras (he): Horas extra diurnas
 * - Horas Nocturnas (hnn): Horas regulares nocturnas (6pm-6am)
 * - Horas Extras Nocturnas (hen): Horas extra nocturnas
 * - Horas Dominicales/Festivas (hd): Horas dominicales o festivas diurnas
 * - Horas Dominicales Nocturnas (hdn): Horas dominicales o festivas nocturnas
 * - Horas Extras Dominicales (hde): Horas extra dominicales/festivas diurnas
 * - Horas Extras Dominicales Nocturnas (hden): Horas extra dominicales/festivas nocturnas
 * 
 * Permisos por rol:
 * - Administrador: Acceso completo a toda la información
 * - Administrativo: Acceso completo a toda la información
 * - Otros roles: Sin acceso a esta pantalla
 * 
 * @component
 * @returns {JSX.Element} Pantalla de registro laboral
 * 
 * @example
 * <RegistroLaboralScreen />
 */

// Importaciones de React Native y librerías
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useUser } from "../context/UserContext";
import { horasLaboralesService } from "../services/horasLaboralesService";
import { exportRegistroLaboralExcel } from "../utils/exportExcelRegistroLaboral";
import { formatDateLocal } from "../utils/formatDateLocal";

/**
 * Componente principal de registro laboral
 * 
 * @function RegistroLaboralScreen
 * @returns {JSX.Element} Pantalla de registro laboral renderizada
 */
export default function RegistroLaboralScreen() {
  // ==================== PARÁMETROS Y CONTEXTOS ====================
  
  // Parámetros de navegación para vista específica de persona
  const params = useLocalSearchParams();
  const personaId = params.personaId || null;          // ID de la persona específica
  const personaNombre = params.nombre || null;         // Nombre de la persona específica

  // Contexto de usuario para control de permisos
  const { role } = useUser();

  // ==================== ESTADOS PRINCIPALES ====================
  
  const [registros, setRegistros] = useState([]);          // Lista de registros laborales
  const [resumenPersonas, setResumenPersonas] = useState([]); // Resumen agrupado por persona
  const [loading, setLoading] = useState(false);          // Estado de carga

  // ==================== PERMISOS POR ROL ====================
  
  const isAdmin = role === "Administrador";
  const isAdministrativo = role === "Administrativo";
  const tienePermisos = isAdmin || isAdministrativo;

  // ==================== CARGA DE DATOS ====================
  
  /**
   * Efecto para cargar datos según permisos y parámetros
   * Se ejecuta cuando cambia el rol o el ID de persona
   */
  useEffect(() => {
    // Solo cargar si el usuario tiene permisos
    if (!tienePermisos) return;

    // Cargar registros específicos de persona o todos
    if (personaId) cargarRegistrosPersona(personaId);
    else cargarRegistros();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, personaId]);

  /**
   * Carga todos los registros laborales del sistema
   * 
   * @async
   */
  const cargarRegistros = async () => {
    try {
      setLoading(true);
      // Obtener todos los registros del servicio
      const data = await horasLaboralesService.getRegistros();
      setRegistros(data);

      // Agrupar registros por persona para el resumen
      const resumen = horasLaboralesService.agruparPorPersona(data);
      setResumenPersonas(resumen);
    } catch (error) {
      Alert.alert("Error", "No se pudo cargar el registro laboral");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Carga registros específicos de una persona
   * 
   * @async
   * @param {string} id - ID de la persona
   */
  const cargarRegistrosPersona = async (id) => {
    try {
      setLoading(true);
      // Obtener registros específicos de la persona
      const data = await horasLaboralesService.getRegistrosPorPersona(id);
      setRegistros(data);

      // Agrupar para resumen (solo tendrá una persona)
      const resumen = horasLaboralesService.agruparPorPersona(data);
      setResumenPersonas(resumen);
    } catch (error) {
      Alert.alert("Error", "No se pudo cargar el registro individual");
    } finally {
      setLoading(false);
    }
  };

  // ==================== EXPORTACIÓN A EXCEL ====================
  
  /**
   * Maneja la exportación de registros a Excel
   * 
   * @async
   */
  const handleExport = async () => {
    const { ok, message } = await exportRegistroLaboralExcel(registros);
    if (!ok) Alert.alert("Error", message || "No se pudo exportar el excel");
  };

  // ==================== VERIFICACIÓN DE PERMISOS ====================
  
  // Si el usuario no tiene permisos, mostrar pantalla de acceso denegado
  if (!tienePermisos) {
    return (
      <LinearGradient colors={["#1f2933", "#111827"]} style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.title}>Registro laboral</Text>
          <Text style={styles.noAccess}>
            No tienes permisos para ver esta información.
          </Text>
        </View>
      </LinearGradient>
    );
  }

  // ==================== CÁLCULO DE DESGLOSE DE HORAS ====================
  
  /**
   * Calcula el desglose detallado de horas a partir de un objeto de registro
   * 
   * @function getBreakdown
   * @param {Object} obj - Objeto de registro con propiedades de horas
   * @returns {Object} Desglose de horas con propiedades individuales y totales
   * 
   * @description
   * Calcula y retorna un objeto con:
   * - Cada tipo de hora individualmente
   * - Total de horas sumando todos los tipos
   * - Total de extras (todo lo no-normal-diurno)
   */
  const getBreakdown = (obj) => {
    // Extraer valores numéricos de cada tipo de hora
    const hn = Number(obj?.horasNormales || 0);               // Horas Normales
    const he = Number(obj?.horasExtras || 0);                 // Horas Extras Diurnas
    const hnn = Number(obj?.horasNocturnas || 0);            // Horas Nocturnas
    const hen = Number(obj?.horasExtrasNocturnas || 0);      // Horas Extras Nocturnas
    const hd = Number(obj?.horasDominicales || 0);           // Horas Dominicales/Festivas Diurnas
    const hdn = Number(obj?.horasDominicalesNocturnas || 0); // Horas Dominicales/Festivas Nocturnas
    const hde = Number(obj?.horasExtrasDominicales || 0);    // Horas Extras Dominicales/Festivas Diurnas
    const hden = Number(obj?.horasExtrasDominicalesNocturnas || 0); // Horas Extras Dominicales/Festivas Nocturnas

    // Calcular total (usando totalHoras si existe, o sumando todos los tipos)
    const total =
      Number(obj?.totalHoras || 0) ||
      hn + he + hnn + hen + hd + hdn + hde + hden;

    // Total de extras (todo lo no-normal-diurno)
    const extrasTotal = he + hen + hde + hden + hd + hdn;

    return {
      hn,
      he,
      hnn,
      hen,
      hd,
      hdn,
      hde,
      hden,
      total,
      extrasTotal,
    };
  };

  // ==================== CÁLCULO DE RESUMEN POR PERSONA ====================
  
  /**
   * Calcula el resumen por persona de forma segura
   * Usa datos del servicio o calcula manualmente si el servicio no incluye todos los tipos
   * 
   * @type {Array}
   */
  const resumenFallback = useMemo(() => {
    // Si estamos viendo una persona específica, no mostrar resumen por persona
    if (personaId) return [];

    // Verificar si el servicio ya devuelve el desglose completo
    const hasAnyNew =
      (resumenPersonas || []).some(
        (r) =>
          r?.horasNocturnas ||
          r?.horasExtrasNocturnas ||
          r?.horasDominicales ||
          r?.horasDominicalesNocturnas ||
          r?.horasExtrasDominicales ||
          r?.horasExtrasDominicalesNocturnas
      );

    // Si ya tiene el desglose completo, usar datos del servicio
    if (hasAnyNew) return resumenPersonas;

    // Fallback: calcular manualmente desde los registros
    const map = new Map();
    
    (registros || []).forEach((r) => {
      const pid = r.personalId || r?.idPersonal || null;
      const name = r.nombre || "Sin nombre";
      const key = pid || name;

      // Inicializar acumulador si no existe
      if (!map.has(key)) {
        map.set(key, {
          personalId: pid || null,
          nombre: name,
          horasNormales: 0,
          horasExtras: 0,
          horasNocturnas: 0,
          horasExtrasNocturnas: 0,
          horasDominicales: 0,
          horasDominicalesNocturnas: 0,
          horasExtrasDominicales: 0,
          horasExtrasDominicalesNocturnas: 0,
          totalHoras: 0,
        });
      }

      const acc = map.get(key);
      const b = getBreakdown(r);

      // Acumular cada tipo de hora
      acc.horasNormales += b.hn;
      acc.horasExtras += b.he;
      acc.horasNocturnas += b.hnn;
      acc.horasExtrasNocturnas += b.hen;
      acc.horasDominicales += b.hd;
      acc.horasDominicalesNocturnas += b.hdn;
      acc.horasExtrasDominicales += b.hde;
      acc.horasExtrasDominicalesNocturnas += b.hden;
      acc.totalHoras += b.total;
    });

    return Array.from(map.values());
  }, [personaId, resumenPersonas, registros]);

  // ==================== COMPONENTES DE RENDERIZADO ====================
  
  /**
   * Renderiza un item del resumen por persona
   * 
   * @param {Object} param0 - Objeto con el item a renderizar
   * @param {Object} param0.item - Datos de la persona para el resumen
   * @returns {JSX.Element} Card de resumen renderizada
   */
  const renderResumen = ({ item }) => {
    const b = getBreakdown(item);

    return (
      <View style={styles.card}>
        <Text style={styles.cardName}>{item.nombre}</Text>

        {/* Desglose detallado de horas */}
        <Text style={styles.cardText}>Normales: {b.hn}</Text>
        <Text style={styles.cardText}>Extra diurnas: {b.he}</Text>
        <Text style={styles.cardText}>Nocturnas: {b.hnn}</Text>
        <Text style={styles.cardText}>Extra nocturnas: {b.hen}</Text>
        <Text style={styles.cardText}>Dom/Fest diurnas: {b.hd}</Text>
        <Text style={styles.cardText}>Dom/Fest nocturnas: {b.hdn}</Text>
        <Text style={styles.cardText}>Extra Dom/Fest diurnas: {b.hde}</Text>
        <Text style={styles.cardText}>Extra Dom/Fest nocturnas: {b.hden}</Text>

        <View style={styles.cardDivider} />
        <Text style={styles.cardTotal}>Total: {b.total}</Text>
      </View>
    );
  };

  /**
   * Renderiza un item detallado de jornada
   * 
   * @param {Object} param0 - Objeto con el item a renderizar
   * @param {Object} param0.item - Datos de la jornada
   * @returns {JSX.Element} Fila de jornada renderizada
   */
  const renderItem = ({ item }) => {
    const b = getBreakdown(item);

    return (
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          {/* Información básica de la persona */}
          <Text style={styles.rowName}>{item.nombre}</Text>
          <Text style={styles.rowDetail}>
            {item.destino || "-"} ({item.tipoAsignacion})
          </Text>
          
          {/* Rango de fechas de la jornada */}
          <Text style={styles.rowDates}>
            {formatDateLocal(item.fechaInicio)} →{" "}
            {item.fechaFin ? formatDateLocal(item.fechaFin) : "En curso"}
          </Text>

          {/* Desglose compacto de horas */}
          <View style={styles.breakdownWrap}>
            <Text style={styles.breakdownText}>N: {b.hn}</Text>
            <Text style={styles.breakdownText}>ED: {b.he}</Text>
            <Text style={styles.breakdownText}>Noc: {b.hnn}</Text>
            <Text style={styles.breakdownText}>EN: {b.hen}</Text>
            <Text style={styles.breakdownText}>D/F: {b.hd}</Text>
            <Text style={styles.breakdownText}>D/F N: {b.hdn}</Text>
            <Text style={styles.breakdownText}>ED/F: {b.hde}</Text>
            <Text style={styles.breakdownText}>ED/F N: {b.hden}</Text>
          </View>
        </View>

        {/* Totales a la derecha */}
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.rowHours}>{b.total}h</Text>
          <Text style={styles.rowExtras}>Extras: {b.extrasTotal}</Text>
        </View>
      </View>
    );
  };

  // ==================== RENDER PRINCIPAL ====================
  
  return (
    <LinearGradient colors={["#111827", "#1f2933"]} style={styles.container}>
      {/* Título de la pantalla */}
      <Text style={styles.title}>
        {personaId ? `Registro laboral — ${personaNombre}` : "Registro laboral"}
      </Text>

      {/* Botón de exportación a Excel */}
      <TouchableOpacity
        style={styles.exportButton}
        onPress={handleExport}
        disabled={registros.length === 0}
      >
        <Text style={styles.exportText}>Exportar Excel</Text>
      </TouchableOpacity>

      {/* Sección de resumen por persona (solo en vista general) */}
      {!personaId && (
        <>
          <Text style={styles.section}>Resumen por persona</Text>
          <FlatList
            data={resumenFallback}
            horizontal
            keyExtractor={(item, index) =>
              item.personalId || `${item.nombre}-${index}`
            }
            renderItem={renderResumen}
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 16 }}
          />
        </>
      )}

      {/* Sección de detalle de jornadas */}
      <Text style={styles.section}>
        {personaId ? "Jornadas" : "Detalle de jornadas"}
      </Text>

      {/* Lista de jornadas o indicador de carga */}
      {loading ? (
        <ActivityIndicator color="#fff" style={{ marginTop: 16 }} />
      ) : (
        <FlatList
          data={registros}
          keyExtractor={(item, index) =>
            item.id ||
            item.idDoc ||
            `${item.personalId || "na"}-${item.fechaInicio || "na"}-${index}`
          }
          renderItem={renderItem}
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
  
  // Título principal
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    marginBottom: 16,
  },
  
  // Botón de exportación
  exportButton: {
    backgroundColor: "#10B981", // Verde esmeralda
    padding: 10,
    borderRadius: 8,
    alignSelf: "center",
    marginBottom: 10,
  },
  exportText: {
    color: "#fff",
    fontWeight: "600",
  },
  
  // Títulos de sección
  section: {
    color: "#E5E7EB",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 10,
  },
  
  // Estilos para cards del resumen
  card: {
    backgroundColor: "#1F2937", // Gris oscuro
    padding: 10,
    borderRadius: 10,
    marginRight: 8,
    minWidth: 190,
  },
  cardName: { color: "#fff", fontSize: 15, fontWeight: "700", marginBottom: 4 },
  cardText: { color: "#D1D5DB", fontSize: 13 },
  cardDivider: { height: 1, backgroundColor: "#374151", marginVertical: 6 },
  cardTotal: { color: "#fff", fontWeight: "800" },
  
  // Estilos para filas de detalle
  row: {
    backgroundColor: "#1F2937",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: "row",
    gap: 10,
  },
  rowName: { color: "#fff", fontSize: 15, fontWeight: "700" },
  rowDetail: { color: "#D1D5DB", fontSize: 13 },
  rowDates: { color: "#9CA3AF", fontSize: 12, marginTop: 2 },
  
  // Contenedor para desglose compacto de horas
  breakdownWrap: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  breakdownText: { color: "#E5E7EB", fontSize: 12 },
  
  // Totales de horas por jornada
  rowHours: { color: "#fff", fontSize: 16, fontWeight: "800" },
  rowExtras: { color: "#FBBF24", fontSize: 13 }, // Amarillo para extras
  
  // Estilos para pantalla de acceso denegado
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  noAccess: { color: "#ccc", marginTop: 8 },
});