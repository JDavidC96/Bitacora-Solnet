// screens/NoVinculantesScreen.js
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { doc, getDoc } from "firebase/firestore";

// Ajusta según tu proyecto:
import { useUser } from "../context/UserContext";
import { db } from "../firebase/firebaseConfig";

import {
  getNoVinculantesConstants,
  updateNoVinculantesConstants,
} from "../services/noVinculantesService";

import { exportCuadroNaranjaPdf } from "../services/noVinculantesPdfService";

/**
 * PANTALLA DE CÁLCULO PARA PROYECTOS NO VINCULANTES
 * 
 * Descripción:
 * Esta pantalla permite calcular y generar propuestas técnicas y económicas para
 * proyectos de energía solar fotovoltaica (no vinculantes). Incluye:
 * - Cálculo de dimensionamiento del sistema fotovoltaico
 * - Generación de cuadro naranja con especificaciones técnicas
 * - Exportación a PDF con información del cliente
 * - Gestión de constantes de precio (solo administradores/ingenieros)
 * 
 * Funcionalidades principales:
 * 1. Ingreso de datos iniciales (consumo, rendimiento, panel, costo kWh)
 * 2. Selección entre microinversores o inversor central
 * 3. Captura de información del cliente
 * 4. Cálculo automático de dimensionamiento y costos
 * 5. Visualización de cuadro naranja con resultados
 * 6. Exportación a PDF con leyendas y datos del cliente
 * 7. Configuración de constantes A y B para fórmula de precio
 * 
 * Fórmulas implementadas:
 * - kWp a instalar = (Consumo * 12) / Rendimiento
 * - Número de paneles = ceil(kWp / (PanelW / 1000))
 * - Número de microinversores = ceil(#paneles / 4)
 * - Área paneles = #paneles * 2.7 * 1.05
 * - Precio proyecto = A * (Potencia pico)^(1 - B)
 * 
 * Roles de usuario:
 * - Administrador/Ingeniero: Puede editar constantes A y B
 * - Otros roles: Solo pueden usar la calculadora y generar PDFs
 * 
 * @component
 * @example
 * return <NoVinculantesScreen />
 */

const ceil = (n) => Math.ceil(Number(n) || 0);

/**
 * Convierte texto a número, soportando formatos con separadores decimales
 * @param {string|number} txt - Valor a convertir
 * @returns {number} Número convertido (0 si no es válido)
 */
function toNum(txt) {
  if (txt === null || txt === undefined) return 0;
  const s = String(txt).replace(/\./g, "").replace(",", "."); // soporta 1.021,43
  const v = Number(s);
  return Number.isFinite(v) ? v : 0;
}

/**
 * Formatea un valor como moneda COP
 * @param {number} value - Valor a formatear
 * @param {number} decimals - Decimales a mostrar
 * @returns {string} Valor formateado en pesos colombianos
 */
function formatCOP(value, decimals = 0) {
  const v = Number(value) || 0;
  try {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(v);
  } catch {
    const fixed = decimals ? v.toFixed(decimals) : Math.round(v).toString();
    return `$ ${fixed}`;
  }
}

/**
 * Formatea un número con separadores de miles
 * @param {number} value - Valor a formatear
 * @param {number} decimals - Decimales a mostrar
 * @returns {string} Número formateado
 */
function formatNumber(value, decimals = 2) {
  const v = Number(value) || 0;
  try {
    return new Intl.NumberFormat("es-CO", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(v);
  } catch {
    return v.toFixed(decimals);
  }
}

// Leyenda para el PDF exportado
const PDF_LEGEND = `* Estos están sujetos a verificación técnica mediante visita de ingeniería en sitio y simulación detallada del sistema fotovoltaico utilizando el software especializado PVSOL. Cualquier ajuste resultante de esta validación será informado oportunamente para su aprobación.
**El valor total del proyecto contemplado es aproximado, el valor real dependera del diseño detallado y simulación es software especializado PVSOL realizados posterior a la visita de ingenieria en sitio en la cual se identificaran en detalle los requerimientos especificos del cliente.`;

/**
 * Componente principal de la pantalla de proyectos no vinculantes
 * @returns {JSX.Element} Componente renderizado
 */
export default function NoVinculantesScreen() {
  // Contexto de usuario
  const { role, user, loading: userLoading } = useUser();

  // Determina si el usuario puede editar constantes
  const canEditConstants = useMemo(() => {
    return ["Administrador", "Ingeniero"].includes(role);
  }, [role]);

  // Estado para el nombre del usuario desde Firestore
  const [userNombre, setUserNombre] = useState(null);
  const [loadingNombre, setLoadingNombre] = useState(true);

  // Label del usuario activo (combina nombre y email)
  const activeUserLabel = useMemo(() => {
    if (userLoading || loadingNombre) return "Cargando…";
    return userNombre || user?.email || "—";
  }, [userLoading, loadingNombre, userNombre, user?.email]);

  // --- ESTADOS PARA DATOS DE ENTRADA ---
  const [consumoMes, setConsumoMes] = useState("");       // Consumo mensual en kWh
  const [rendimiento, setRendimiento] = useState("");     // Rendimiento anual (kWh/kWp-año)
  const [panelW, setPanelW] = useState("");               // Potencia del panel en W
  const [costoKwh, setCostoKwh] = useState("");           // Costo por kWh

  // --- ESTADOS PARA CONFIGURACIÓN DE INVERSOR ---
  const [modo, setModo] = useState("micro");              // "micro" | "inversor"
  const [inversorKw, setInversorKw] = useState("");       // Potencia del inversor (kW)
  const [microKw, setMicroKw] = useState("");             // Potencia del microinversor (kW)

  // --- ESTADOS PARA INFORMACIÓN DEL CLIENTE ---
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [clienteCiudad, setClienteCiudad] = useState("");
  const [clienteDireccion, setClienteDireccion] = useState("");

  // --- ESTADOS PARA CONSTANTES DE PRECIO ---
  const [loadingConstants, setLoadingConstants] = useState(true);
  const [savingConstants, setSavingConstants] = useState(false);

  const [A, setA] = useState(6155745.12);                 // Constante A de la fórmula
  const [B, setB] = useState(0.12);                       // Constante B de la fórmula

  const [editA, setEditA] = useState("");                 // Valor en edición de A
  const [editB, setEditB] = useState("");                 // Valor en edición de B

  // --- ESTADO PARA EXPORTACIÓN PDF ---
  const [exportingPdf, setExportingPdf] = useState(false);

  /**
   * Efecto para cargar el nombre del usuario desde Firestore
   * Se ejecuta cuando cambia el usuario o su estado de carga
   */
  useEffect(() => {
    let active = true;

    const loadUserNombre = async () => {
      // Esperar a que el contexto de usuario esté listo
      if (userLoading) return;
      
      if (!user?.uid) {
        if (active) {
          setUserNombre(null);
          setLoadingNombre(false);
        }
        return;
      }

      try {
        if (active) setLoadingNombre(true);

        const ref = doc(db, "usuarios_permitidos", user.uid);
        const snap = await getDoc(ref);

        if (!active) return;

        if (snap.exists()) {
          const data = snap.data();
          // Intentar obtener el nombre de diferentes campos posibles
          const nombre = data?.nombre || data?.displayName || data?.email || user.email;
          setUserNombre(nombre);
        } else {
          console.warn("usuarios_permitidos no existe para uid:", user.uid);
          // Usar el email como fallback
          setUserNombre(user.email);
        }
      } catch (e) {
        console.log("Error cargando nombre usuario:", e);
        // Usar email como fallback
        if (active) setUserNombre(user?.email || null);
      } finally {
        if (active) setLoadingNombre(false);
      }
    };

    loadUserNombre();
    return () => {
      active = false;
    };
  }, [user, userLoading]);

  /**
   * Efecto para cargar las constantes A y B desde Firestore
   * Se ejecuta solo al montar el componente
   */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const c = await getNoVinculantesConstants();
        if (!mounted) return;
        setA(c.A);
        setB(c.B);
        setEditA(String(c.A));
        setEditB(String(c.B));
      } catch (e) {
        console.log("Error cargando constantes NV:", e);
      } finally {
        if (mounted) setLoadingConstants(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  /**
   * Memo que calcula todos los resultados basados en los inputs
   * @returns {Object} Objeto con todos los resultados calculados
   */
  const resultados = useMemo(() => {
    const consumo = toNum(consumoMes);
    const rend = toNum(rendimiento);
    const pW = toNum(panelW);
    const costo = toNum(costoKwh);

    const panelKw = pW / 1000;

    // costo energía mes
    const costoEnergiaMes = consumo * costo;

    // kWp a instalar
    const kwpInstalar = rend > 0 ? (consumo * 12) / rend : 0;

    // paneles
    const numPaneles = panelKw > 0 ? ceil(kwpInstalar / panelKw) : 0;

    // potencia paneles pico (kWp)
    const potenciaPico = numPaneles * panelKw;

    // inversor / micro
    const invKw = toNum(inversorKw);
    const micKw = toNum(microKw);

    const numInversores =
      modo === "inversor" && invKw > 0
        ? ceil(kwpInstalar / (invKw * 1.4))
        : 0;

    // Confirmado: # micro = ceil(#paneles/4)
    const numMicros = modo === "micro" ? ceil(numPaneles / 4) : 0;

    // potencia nominal para mostrar en cuadro (misma que el input)
    const potenciaNominalKw =
      modo === "inversor" ? invKw || 0 : modo === "micro" ? micKw || 0 : 0;

    // generación estimada (asumiendo rendimiento anual kWh/kWp-año)
    const generacionAnual = potenciaPico * rend;
    const generacionMensual = generacionAnual / 12;

    // consumo promedio mensual
    const consumoPromMes = consumo;

    // ahorro (según tu fórmula)
    // ahorro = (Potencia pico x rendimiento) / (Consumo x 12)
    // porcentaje:
    const ahorroRatio =
      consumo > 0 ? (potenciaPico * rend) / (consumo * 12) : 0;
    const ahorroPct = ahorroRatio * 100;

    // Área paneles: #paneles * 2.7 * 1.05
    const areaPanelesM2 = numPaneles * 2.7 * 1.05;

    // Precio
    const a = Number(A) || 0;
    const b = Number(B) || 0;
    const exponente = 1 - b;

    const precioProyecto =
      potenciaPico > 0 && a > 0 ? a * Math.pow(potenciaPico, exponente) : 0;

    const precioKwp = potenciaPico > 0 ? precioProyecto / potenciaPico : 0;

    return {
      consumo,
      rend,
      pW,
      costo,
      panelKw,

      costoEnergiaMes,

      kwpInstalar,
      numPaneles,
      potenciaPico,

      potenciaNominalKw,
      numInversores,
      numMicros,

      generacionAnual,
      generacionMensual,
      consumoPromMes,

      ahorroPct,
      areaPanelesM2,

      precioProyecto,
      precioKwp,
    };
  }, [
    consumoMes,
    rendimiento,
    panelW,
    costoKwh,
    modo,
    inversorKw,
    microKw,
    A,
    B,
  ]);

  /**
   * Construye las filas del cuadro naranja para exportar a PDF
   * @returns {Array<{label: string, value: string}>} Array de objetos con etiqueta y valor
   */
  const buildOrangeRows = () => {
    const rows = [];

    rows.push({
      label: "Potencia paneles pico*",
      value: `${formatNumber(resultados.potenciaPico, 2)} kWp`,
    });
    rows.push({
      label: `Panel solar ${resultados.pW || 0}W*`,
      value: `${resultados.numPaneles} UND`,
    });

    // IMPORTANTE: usar "modo" (state), no "resultados.modo"
    if (modo === "inversor") {
      rows.push({
        label: "Potencia en inversor*",
        value: `${formatNumber(resultados.potenciaNominalKw, 2)} kW`,
      });
      rows.push({ label: "Microinversor", value: "—" });
    } else {
      rows.push({ label: "Potencia en inversor*", value: "—" });
      rows.push({
        label: `Microinversor ${formatNumber(resultados.potenciaNominalKw, 2)} kW*`,
        value: `${resultados.numMicros} UND`,
      });
    }

    rows.push({ label: "Batería 5kWh*", value: `1 UND` });
    rows.push({
      label: "Área paneles*",
      value: `${formatNumber(resultados.areaPanelesM2, 3)} m²`,
    });
    rows.push({ label: "Estructura panelessolares*", value: `1 UND` });

    rows.push({
      label: "Generación anual estimada*",
      value: `${formatNumber(resultados.generacionAnual, 0)} kWh/Año`,
    });
    rows.push({
      label: "Generación mensual estimada*",
      value: `${formatNumber(resultados.generacionMensual, 0)} kWh/Mes`,
    });
    rows.push({
      label: "Consumo operador red mensual promedio*",
      value: `${formatNumber(resultados.consumoPromMes, 0)} kWh/Mes`,
    });

    rows.push({
      label: "Ahorro proyectado*",
      value: `${formatNumber(resultados.ahorroPct, 2)} %`,
    });

    rows.push({ label: "Sistema electrico asociado al Servicio*", value: "1 UND" });
    rows.push({ label: "Ingenieria de detalle*", value: "1 UND" });
    rows.push({ label: "Smart Meter*", value: "1 UND" });
    rows.push({ label: "Medidor bidireccional*", value: "1 UND" });
    rows.push({ label: "Certificación RETIE*", value: "1 UND" });
    rows.push({ label: "Acompañamiento tramites UPME*", value: "1 UND" });
    rows.push({ label: "Tramites CREG*", value: "1 UND" });
    rows.push({ label: "Tablero DC*", value: "1 UND" });
    rows.push({ label: "Tablero AC*", value: "1 UND" });

    rows.push({
      label: "Valor del Proyecto**",
      value: formatCOP(resultados.precioProyecto, 0),
    });

    rows.push({
      label: "Precio por kWp**",
      value: formatCOP(resultados.precioKwp, 0),
    });

    return rows;
  };

  /**
   * Maneja la exportación del cuadro naranja a PDF
   * @async
   */
  const handleExportPdf = async () => {
    try {
      setExportingPdf(true);

      const rows = buildOrangeRows();
      
      // Crear objeto con información del cliente
      const clienteInfo = {
        nombre: clienteNombre.trim(),
        telefono: clienteTelefono.trim(),
        ciudad: clienteCiudad.trim(),
        direccion: clienteDireccion.trim(),
      };

      await exportCuadroNaranjaPdf({
        rows,
        userLabel: userNombre || user?.email || "—",
        legendText: PDF_LEGEND,
        title: "DESCRIPCIÓN DEL PROYECTO",
        filename: "no-vinculantes-cuadro.pdf",
        clienteInfo, // Pasamos la info del cliente al PDF
      });

      Alert.alert("Listo", "PDF generado.");
    } catch (e) {
      console.log("Error exportando PDF:", e);
      Alert.alert("Error", e?.message || "No se pudo generar el PDF.");
    } finally {
      setExportingPdf(false);
    }
  };

  /**
   * Guarda las constantes A y B en Firestore
   * @async
   */
  const onSaveConstants = async () => {
    if (!canEditConstants) return;

    const nextA = toNum(editA);
    const nextB = toNum(editB);

    if (!(nextA > 0)) {
      Alert.alert("Dato inválido", "La constante A debe ser mayor a 0.");
      return;
    }
    if (!(nextB >= 0 && nextB < 1)) {
      Alert.alert(
        "Dato inválido",
        "La constante B debe estar entre 0 y 1 (ej: 0.12)."
      );
      return;
    }

    try {
      setSavingConstants(true);
      const updated = await updateNoVinculantesConstants({
        A: nextA,
        B: nextB,
        userId: user?.uid || null,
      });
      setA(updated.A);
      setB(updated.B);
      Alert.alert("Listo", "Constantes actualizadas.");
    } catch (e) {
      console.log("Error guardando constantes NV:", e);
      Alert.alert("Error", "No se pudieron guardar las constantes.");
    } finally {
      setSavingConstants(false);
    }
  };

  /**
   * Restablece las constantes A y B a sus valores por defecto
   */
  const onResetDefaults = () => {
    if (!canEditConstants) return;
    Alert.alert(
      "Restablecer",
      "¿Restablecer constantes a los valores por defecto?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sí",
          style: "destructive",
          onPress: () => {
            setEditA("6155745.12");
            setEditB("0.12");
          },
        },
      ]
    );
  };

  // Pantalla de carga mientras se cargan las constantes
  if (loadingConstants) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.centerText}>Cargando…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {/* Usuario sesión activa (mejorado) */}
        <View style={styles.userActiveBox}>
          <Text style={styles.userActiveText}>
            Usuario: {activeUserLabel}
          </Text>
          {role && (
            <Text style={styles.userRoleText}>
              Rol: {role}
            </Text>
          )}
        </View>

        {/* DATOS INICIALES */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Datos iniciales</Text>

          <Field
            label="Consumo [kWh/mes] (máximo histórico)"
            value={consumoMes}
            onChangeText={setConsumoMes}
            placeholder="4221"
            keyboardType="numeric"
          />

          <Field
            label="Rendimiento (estándar)"
            value={rendimiento}
            onChangeText={setRendimiento}
            placeholder="1400"
            keyboardType="numeric"
          />

          <Field
            label="Panel [W] (ej: 620 / 615 / 605)"
            value={panelW}
            onChangeText={setPanelW}
            placeholder="620"
            keyboardType="numeric"
          />

          <Field
            label="Costo kWh"
            value={costoKwh}
            onChangeText={setCostoKwh}
            placeholder="1021.43"
            keyboardType="numeric"
          />

          <View style={styles.row}>
            <TouchableOpacity
              style={[
                styles.pill,
                modo === "micro" ? styles.pillActive : styles.pillInactive,
              ]}
              onPress={() => setModo("micro")}
            >
              <Text
                style={[
                  styles.pillText,
                  modo === "micro"
                    ? styles.pillTextActive
                    : styles.pillTextInactive,
                ]}
              >
                Microinversor
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.pill,
                modo === "inversor" ? styles.pillActive : styles.pillInactive,
              ]}
              onPress={() => setModo("inversor")}
            >
              <Text
                style={[
                  styles.pillText,
                  modo === "inversor"
                    ? styles.pillTextActive
                    : styles.pillTextInactive,
                ]}
              >
                Inversor
              </Text>
            </TouchableOpacity>
          </View>

          {modo === "micro" ? (
            <Field
              label="Microinversor [kW] (nominal)"
              value={microKw}
              onChangeText={setMicroKw}
              placeholder="2"
              keyboardType="numeric"
            />
          ) : (
            <Field
              label="Inversor [kW] (nominal)"
              value={inversorKw}
              onChangeText={setInversorKw}
              placeholder="2"
              keyboardType="numeric"
            />
          )}
        </View>

        {/* INFORMACIÓN DEL CLIENTE */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Información del Cliente</Text>
          
          <Field
            label="Nombre del Cliente"
            value={clienteNombre}
            onChangeText={setClienteNombre}
            placeholder="Ingrese el nombre completo"
          />
          
          <Field
            label="Teléfono"
            value={clienteTelefono}
            onChangeText={setClienteTelefono}
            keyboardType="phone-pad"
            placeholder="Ej: 3001234567"
          />
          
          <Field
            label="Ciudad"
            value={clienteCiudad}
            onChangeText={setClienteCiudad}
            placeholder="Ej: Bogotá"
          />
          
          <Field
            label="Dirección"
            value={clienteDireccion}
            onChangeText={setClienteDireccion}
            placeholder="Dirección completa"
            multiline={true}
            style={styles.textArea}
          />
        </View>

        {/* CUADRO NARANJA (EN PANTALLA) */}
        <View style={styles.orangeBox}>
          <Text style={styles.orangeTitle}>DESCRIPCIÓN DEL PROYECTO</Text>

          <OrangeRow
            label="Potencia paneles pico*"
            value={`${formatNumber(resultados.potenciaPico, 2)} kWp`}
          />
          <OrangeRow
            label={`Panel solar ${resultados.pW || 0}W*`}
            value={`${resultados.numPaneles} UND`}
          />

          <OrangeRow
            label="Potencia en inversor*"
            value={
              modo === "inversor"
                ? `${formatNumber(resultados.potenciaNominalKw, 2)} kW`
                : "—"
            }
          />
          <OrangeRow
            label={
              modo === "micro"
                ? `Microinversor ${formatNumber(
                    resultados.potenciaNominalKw,
                    2
                  )} kW*`
                : "Microinversor"
            }
            value={modo === "micro" ? `${resultados.numMicros} UND` : "—"}
          />

          <OrangeRow label="Batería 5kWh*" value="1 UND" />
          <OrangeRow
            label="Área paneles*"
            value={`${formatNumber(resultados.areaPanelesM2, 3)} m²`}
          />
          <OrangeRow label="Estructura panelessolares*" value="1 UND" />

          <OrangeRow
            label="Generación anual estimada*"
            value={`${formatNumber(resultados.generacionAnual, 0)} kWh/Año`}
          />
          <OrangeRow
            label="Generación mensual estimada*"
            value={`${formatNumber(resultados.generacionMensual, 0)} kWh/Mes`}
          />
          <OrangeRow
            label="Consumo operador red mensual promedio*"
            value={`${formatNumber(resultados.consumoPromMes, 0)} kWh/Mes`}
          />

          <OrangeRow
            label="Ahorro proyectado*"
            value={`${formatNumber(resultados.ahorroPct, 2)} %`}
          />

          <OrangeRow
            label="Sistema electrico asociado al Servicio*"
            value="1 UND"
          />
          <OrangeRow label="Ingenieria de detalle*" value="1 UND" />
          <OrangeRow label="Smart Meter*" value="1 UND" />
          <OrangeRow label="Medidor bidireccional*" value="1 UND" />
          <OrangeRow label="Certificación RETIE*" value="1 UND" />
          <OrangeRow label="Acompañamiento tramites UPME*" value="1 UND" />
          <OrangeRow label="Tramites CREG*" value="1 UND" />
          <OrangeRow label="Tablero DC*" value="1 UND" />
          <OrangeRow label="Tablero AC*" value="1 UND" />

          <View style={styles.orangeTotalRow}>
            <Text style={styles.orangeTotalLabel}>Valor del Proyecto**</Text>
            <Text style={styles.orangeTotalValue}>
              {formatCOP(resultados.precioProyecto, 0)}
            </Text>
          </View>

          <View style={styles.orangeFootRow}>
            <Text style={styles.orangeFootLabel}>Precio por kWp**</Text>
            <Text style={styles.orangeFootValue}>
              {formatCOP(resultados.precioKwp, 0)}
            </Text>
          </View>
        </View>

        {/* BOTÓN EXPORTAR PDF */}
        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary, { marginBottom: 12 }]}
          onPress={handleExportPdf}
          disabled={exportingPdf}
        >
          {exportingPdf ? (
            <ActivityIndicator />
          ) : (
            <Text style={styles.btnTextPrimary}>Exportar cuadro a PDF</Text>
          )}
        </TouchableOpacity>

        {/* CONSTANTES (solo Admin / Ingeniero) */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Constantes de precio</Text>
          {!canEditConstants ? (
            <Text style={styles.muted}>
              Solo Administrador o Ingeniero puede editar estas constantes.
            </Text>
          ) : (
            <>
              <Field
                label="Constante A"
                value={editA}
                onChangeText={setEditA}
                keyboardType="numeric"
              />
              <Field
                label="Constante B (ej: 0.12)"
                value={editB}
                onChangeText={setEditB}
                keyboardType="numeric"
              />

              <View style={styles.row}>
                <TouchableOpacity
                  style={[styles.btn, styles.btnPrimary]}
                  onPress={onSaveConstants}
                  disabled={savingConstants}
                >
                  {savingConstants ? (
                    <ActivityIndicator />
                  ) : (
                    <Text style={styles.btnTextPrimary}>Guardar</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btn, styles.btnGhost]}
                  onPress={onResetDefaults}
                  disabled={savingConstants}
                >
                  <Text style={styles.btnTextGhost}>Defaults</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          <Text style={styles.smallNote}>
            Fórmula: Precio = A * (Potencia pico)^(1 - B)
          </Text>
        </View>

        <View style={styles.footerSpace} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/**
 * Componente reutilizable para campos de entrada
 * @param {Object} props - Propiedades del componente
 * @param {string} props.label - Etiqueta del campo
 * @param {string} props.value - Valor del campo
 * @param {Function} props.onChangeText - Función para cambiar el valor
 * @param {string} props.keyboardType - Tipo de teclado
 * @param {string} props.placeholder - Texto de placeholder
 * @param {boolean} props.multiline - Si es campo multilínea
 * @param {Object} props.style - Estilos adicionales
 * @returns {JSX.Element} Campo de entrada renderizado
 */
function Field({ label, value, onChangeText, keyboardType = "default", placeholder = "", multiline = false, style }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={[styles.input, multiline && styles.textArea, style]}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor="#999"
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
      />
    </View>
  );
}

/**
 * Componente para una fila del cuadro naranja
 * @param {Object} props - Propiedades del componente
 * @param {string} props.label - Texto de la etiqueta
 * @param {string} props.value - Valor a mostrar
 * @returns {JSX.Element} Fila del cuadro naranja renderizada
 */
function OrangeRow({ label, value }) {
  return (
    <View style={styles.orangeRow}>
      <Text style={styles.orangeLabel} numberOfLines={2}>
        {label}
      </Text>
      <Text style={styles.orangeValue}>{value}</Text>
    </View>
  );
}

// Constantes de color para el cuadro naranja
const ORANGE = "#F57C00";
const ORANGE_LIGHT = "#FFF3E0";

// Estilos de la pantalla
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F2F2" },
  content: { padding: 14, paddingBottom: 40 },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  centerText: { marginTop: 8, color: "#444" },

  userActiveBox: {
    backgroundColor: "#111827",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  userActiveText: { 
    color: "#F9FAFB", 
    fontWeight: "700", 
    fontSize: 14,
    marginBottom: 4 
  },
  userRoleText: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "600",
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },

  field: { marginBottom: 10 },
  label: { fontSize: 12, color: "#444", marginBottom: 6 },
  input: {
    backgroundColor: "#F7F7F7",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    color: "#111",
    minHeight: 44,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 10,
  },

  row: { flexDirection: "row", gap: 10, marginTop: 8 },

  pill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: "center",
    borderWidth: 1,
  },
  pillActive: { backgroundColor: "#FF4500", borderColor: "#FF4500" },
  pillInactive: { backgroundColor: "#fff", borderColor: "#DDD" },
  pillText: { fontWeight: "700" },
  pillTextActive: { color: "#fff" },
  pillTextInactive: { color: "#333" },

  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimary: { backgroundColor: "#FF4500" },
  btnTextPrimary: { color: "#fff", fontWeight: "800" },
  btnGhost: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#DDD" },
  btnTextGhost: { color: "#333", fontWeight: "800" },

  muted: { color: "#666", fontSize: 12 },
  smallNote: { marginTop: 10, color: "#666", fontSize: 12 },

  footerSpace: { height: 20 },

  // ====== CUADRO NARANJA ======
  orangeBox: {
    backgroundColor: ORANGE_LIGHT,
    borderWidth: 2,
    borderColor: ORANGE,
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
  },
  orangeTitle: {
    backgroundColor: ORANGE_LIGHT,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontWeight: "900",
    textAlign: "center",
    color: "#111",
    borderBottomWidth: 2,
    borderBottomColor: ORANGE,
  },
  orangeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F2B37E",
  },
  orangeLabel: { flex: 1, color: "#111", fontWeight: "700", fontSize: 12 },
  orangeValue: { color: "#111", fontWeight: "900", fontSize: 12 },

  orangeTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 2,
    borderTopColor: ORANGE,
    backgroundColor: "#FFE0B2",
  },
  orangeTotalLabel: { flex: 1, color: "#111", fontWeight: "900" },
  orangeTotalValue: { color: "#111", fontWeight: "900" },

  orangeFootRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFE0B2",
    borderTopWidth: 1,
    borderTopColor: "#F2B37E",
  },
  orangeFootLabel: { flex: 1, color: "#111", fontWeight: "900" },
  orangeFootValue: { color: "#111", fontWeight: "900" },
});