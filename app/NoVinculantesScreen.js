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
  getNextNumeroProyecto,
  getNoVinculantesConstants,
  updateNoVinculantesConstants,
} from "../services/noVinculantesService";

import {
  exportCuadroNaranjaPdf,
  loadPdfAssets,
} from "../services/noVinculantesPdfService";

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
 * Calcula los 4 indicadores financieros siguiendo exactamente
 * las fórmulas de la hoja "tabla amortizacion" del Excel.
 * IRR/TIR sobre flujos año 0–25, degradación real de paneles,
 * inflación de tarifa, mantenimiento desde año 2.
 */
function calcularIndicadoresFinancieros({
  precioProyecto,
  ahorroAnual,
  generacionAnual,
  consumo,
  costo,
  valorExportacion,
  valorComercializacion,
}) {
  if (precioProyecto <= 0 || ahorroAnual <= 0) {
    return { incentivoTotal: 0, retorno: 0, ahorro25: 0, tirPct: 0 };
  }

  // ── Constantes del Excel ──────────────────────────────────────────────────
  const INFLACION_TARIFA   = 0.05;    // M11
  const DEGR_AÑO1          = 0.02;    // M13
  const DEGR_AÑO2_25       = 0.0055;  // M14
  const PORC_MANTENIMIENTO = 0.01;    // T13
  const INFLACION_MANT     = 0.05;
  const AÑOS_INCENTIVO     = 5;       // M19
  const AÑOS_VIDA          = 25;

  // D4 = costoSinIVA ≈ precioProyecto / 1.29
  const costoSinIVA = precioProyecto / 1.29;

  // O25 = D4 × 35% → incentivo anual = total / 5
  const incentivoTotal   = costoSinIVA * 0.35;
  const incentivoPorAnio = incentivoTotal / AÑOS_INCENTIVO;

  // B26 = consumo anual (T10 = consumo × 12)
  const consumoAnual = consumo * 12;

  // ── Flujos Q año 0-25 ────────────────────────────────────────────────────
  const flujos = new Array(AÑOS_VIDA + 1);
  flujos[0] = -precioProyecto;  // Q25 = -D5

  let genBase   = generacionAnual;  // F26 = D3 (año 1 sin degradar)
  let tarifa    = costo;
  let tarifaExp = valorExportacion;
  let tarifaCom = valorComercializacion;
  let mant      = 0;

  for (let y = 1; y <= AÑOS_VIDA; y++) {

    // ── F columna: producción real ──
    // F26 = D3 (generacionAnual, E26=1 así que sin cambio)
    // F27 = F26 × E27 = F26 × (1 - DEGR_AÑO1) = F26 × 0.98
    // F28 = F27 × (1 - DEGR_AÑO2_25)
    // F29+ = F_prev × (1 - DEGR_AÑO2_25)
    if (y === 1) {
      genBase = generacionAnual;
    } else if (y === 2) {
      genBase = generacionAnual * (1 - DEGR_AÑO1);
    } else {
      genBase = genBase * (1 - DEGR_AÑO2_25);
    }
    const genYear = genBase;

    // ── G: autoconsumo = IF(F>B, B×C, F×C) ──
    const autoY = genYear > consumoAnual
      ? consumoAnual * tarifa
      : genYear * tarifa;

    // ── I: exportación = IF((F-B)×H > 0, valor, 0) ──
    const excY = genYear - consumoAnual;
    const expY = excY * tarifaExp > 0 ? excY * tarifaExp : 0;

    // ── K: comercialización = IF(F>B, F×0.4×J, 0) ──
    const comY = genYear > consumoAnual ? genYear * 0.4 * tarifaCom : 0;

    // ── L: ahorro = G + I - K ──
    const lYear = autoY + expY - comY;

    // ── N: mantenimiento ──
    // N26=0, N27=D4×T13, N28=N27×1.05, N29=N28×1.05 ...
    if (y === 1) {
      mant = 0;
    } else if (y === 2) {
      mant = costoSinIVA * PORC_MANTENIMIENTO;
    } else {
      mant = mant * (1 + INFLACION_MANT);
    }

    // ── O: incentivo años 1-5 ──
    const incY = y <= AÑOS_INCENTIVO ? incentivoPorAnio : 0;

    // ── Q: flujo neto = L - N + O ──
    flujos[y] = lYear - mant + incY;

    // Actualizar tarifas con inflación
    tarifa    *= (1 + INFLACION_TARIFA);
    tarifaExp *= (1 + INFLACION_TARIFA);
    tarifaCom *= (1 + INFLACION_TARIFA);
  }

  // ── Ahorro 25 años = T50 (acumulado año 0 a 25) ──────────────────────────
  let acumulado = 0;
  for (let y = 0; y <= AÑOS_VIDA; y++) acumulado += flujos[y];
  const ahorro25 = acumulado;

  // ── Retorno = (D5 - U25) / C17 ───────────────────────────────────────────
  const retorno = (precioProyecto - incentivoTotal) / ahorroAnual;

  // ── TIR = IRR(Q25:Q50) — Newton-Raphson ─────────────────────────────────
  function irr(cf) {
    const hasNeg = cf.some(v => v < 0);
    const hasPos = cf.some(v => v > 0);
    if (!hasNeg || !hasPos) return 0;
    let r = 0.3; // semilla cercana a resultado esperado ~31%
    for (let i = 0; i < 500; i++) {
      let npv = 0, dnpv = 0;
      for (let t = 0; t < cf.length; t++) {
        const d = Math.pow(1 + r, t);
        npv  += cf[t] / d;
        if (t > 0) dnpv -= (t * cf[t]) / (d * (1 + r));
      }
      if (Math.abs(dnpv) < 1e-15) break;
      const delta = npv / dnpv;
      r -= delta;
      if (Math.abs(delta) < 1e-10) break;
    }
    return r * 100;
  }
  const tirPct = irr(flujos);

  return { incentivoTotal, retorno, ahorro25, tirPct };
}


/**
 * Convierte texto a número, soportando formatos con separadores decimales
 * @param {string|number} txt - Valor a convertir
 * @returns {number} Número convertido (0 si no es válido)
 */
function toNum(txt) {
  if (txt === null || txt === undefined) return 0;
  // La coma y el punto son siempre separador decimal.
  // El usuario escribe miles sin separador (1400, no 1.400).
  const s = String(txt).trim().replace(",", ".");
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
const PDF_LEGEND = `* Estos valores están sujetos a verificación técnica mediante visita de ingeniería en sitio y simulación detallada del sistema fotovoltaico utilizando el software especializado PVSOL. Cualquier ajuste resultante de esta validación será informado oportunamente para su aprobación.
** Los valores de ahorro, retorno de inversión y el periodo de amortización proyectados son estimados y pueden diferir de los resultados reales. Dependerán directamente del consumo mensual de energía eléctrica (kWh) del usuario y de las variaciones en la tarifa del kWh establecida por el operador de red. La remuneración de los excedentes de energía inyectados a la red se realizará conforme a la Resolución CREG 174 de 2021.
*** El valor total del proyecto es de carácter estimado y referencial. El costo final estará sujeto al diseño detallado y simulación energética en software PVSOL, elaborados después de la visita de ingeniería en sitio, donde se identificarán los requerimientos técnicos específicos del proyecto.`;

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

  const [A, setA] = useState(6155745.12);                        // Constante A precio
  const [B, setB] = useState(0.12);                              // Constante B precio
  const [factorEmision, setFactorEmision] = useState(0.493);     // kgCO2/kWh (N10)
  const [factorPerdidas, setFactorPerdidas] = useState(0.03);    // 3% pérdidas (N11)
  const [valorExportacion, setValorExportacion] = useState(200);           // COP/kWh excedentes (C38)
  const [valorComercializacion, setValorComercializacion] = useState(50);  // COP/kWh OR (C39)

  const [editA, setEditA] = useState("");
  const [editB, setEditB] = useState("");
  const [editFactorEmision, setEditFactorEmision] = useState("");
  const [editFactorPerdidas, setEditFactorPerdidas] = useState("");
  const [editValorExportacion, setEditValorExportacion] = useState("");
  const [editValorComercializacion, setEditValorComercializacion] = useState("");

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
        setFactorEmision(c.factorEmision);
        setFactorPerdidas(c.factorPerdidas);
        setValorExportacion(c.valorExportacion);
        setValorComercializacion(c.valorComercializacion);
        setEditA(String(c.A));
        setEditB(String(c.B));
        setEditFactorEmision(String(c.factorEmision));
        setEditFactorPerdidas(String(c.factorPerdidas));
        setEditValorExportacion(String(c.valorExportacion));
        setEditValorComercializacion(String(c.valorComercializacion));
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
    // ── DATOS INICIALES ──────────────────────────────────────────────────
    const consumo   = toNum(consumoMes);    // N3  kWh/mes
    const rend      = toNum(rendimiento);   // N4  kWh/kWp·año
    const pW        = toNum(panelW);        // N5  W
    const costo     = toNum(costoKwh);      // N9  COP/kWh
    const fEmision  = Number(factorEmision)        || 0.493; // N10
    const fPerdidas = Number(factorPerdidas)       || 0.03;  // N11
    const c38       = Number(valorExportacion)     || 200;   // COP/kWh excedentes
    const c39       = Number(valorComercializacion)|| 50;    // COP/kWh comercialización

    // N12: Costo energía mes = N3 × N9
    const costoEnergiaMes = consumo * costo;

    // N25: [kWp] a instalar = (N3 × 12) / N4
    const kwpInstalar = rend > 0 ? (consumo * 12) / rend : 0;

    // N26: # paneles
    //   SI(micro; MULTIPLO.SUPERIOR(REDONDEAR.MAS(N25/(N5/1000),0), 4)
    //           ; REDONDEAR.MAS(N25/(N5/1000),0))
    const panelKw    = pW > 0 ? pW / 1000 : 0;
    const rawPaneles = panelKw > 0 ? Math.ceil(kwpInstalar / panelKw) : 0;
    const numPaneles = modo === "micro"
      ? Math.ceil(rawPaneles / 4) * 4   // MULTIPLO.SUPERIOR(..., 4)
      : rawPaneles;

    // N28: # inversores = REDONDEAR.MAS(N25 / (N6×1.4), 0)
    const invKw         = toNum(inversorKw) || 0;
    const numInversores = modo === "inversor" && invKw > 0
      ? Math.ceil(kwpInstalar / (invKw * 1.4))
      : 0;

    // N29: # microinversores = REDONDEAR.MAS(N26 / 4, 0)
    const micKw    = toNum(microKw) || 0;
    const numMicros = modo === "micro"
      ? Math.ceil(numPaneles / 4)
      : 0;

    const cantInversor      = modo === "micro" ? numMicros : numInversores;
    const potenciaNominalKw = modo === "micro" ? micKw : invKw;

    // ── CUADRO NARANJA — fórmulas exactas ────────────────────────────────

    // C3: Potencia paneles pico = C4 × (N5/1000)
    const potenciaPico = numPaneles * panelKw;

    // C5: Potencia en inversor = SI(micro; N29×micKw; N6×N28)
    const potenciaInversorKw = modo === "micro"
      ? numMicros * micKw
      : invKw * numInversores;

    // C7: Área paneles = C4 × 2.72 × 1.05
    const areaPanelesM2 = numPaneles * 2.72 * 1.05;

    // C9: Estructura paneles solares = C4
    const estructuraPaneles = numPaneles;

    // C10: Generación anual = C3 × N4 × (1 − N11)
    const generacionAnual = potenciaPico * rend * (1 - fPerdidas);

    // C11: Generación mensual = C10 / 12
    const generacionMensual = generacionAnual / 12;

    // C12: Consumo operador red mensual = N3
    const consumoPromMes = consumo;

    // C13: Auto consumo = SI(C12 >= C11 ; C11×N9×12 ; C12×N9×12)
    const autoconsumo = consumo >= generacionMensual
      ? generacionMensual * costo * 12
      : consumo * costo * 12;

    // C14: Exportación = SI(((C10 − C12×12) × C38) > 0 ; valor ; 0)
    const excedentesKwh = generacionAnual - consumo * 12;
    const exportacion   = excedentesKwh * c38 > 0 ? excedentesKwh * c38 : 0;

    // C15: Pago anual OR comercialización = (C11×12) × 0.4 × C39
    const pagoComercializacion = generacionMensual * 12 * 0.4 * c39;

    // C17: Ahorro anual estimado = C13 + C14 − C15
    const ahorroAnual = autoconsumo + exportacion - pagoComercializacion;

    // C16: Ahorro mensual proyectado = C17 / 12
    const ahorroMensual = ahorroAnual / 12;

    // C18: Ahorro proyectado % = (C3×N4×(1−N11) / (C12×12)) × 100
    const ahorroPct = consumo > 0
      ? (generacionAnual / (consumo * 12)) * 100
      : 0;

    // C23: Emisiones evitadas = N10 × C10
    const emisionesEvitadas = fEmision * generacionAnual;

    // C24: Equivalente en árboles = C23 / 25
    const arbolesEquivalentes = emisionesEvitadas / 25;

    // Valor del proyecto = A × C3^(1−B) + 80000×C4 + 200000
    const a = Number(A) || 0;
    const b = Number(B) || 0;
    const precioProyecto = potenciaPico > 0 && a > 0
      ? a * Math.pow(potenciaPico, 1 - b) + 80000 * numPaneles + 200000
      : 0;

    // Retorno simple (referencia interna, no se muestra en cuadro)
    const amortizacion = ahorroAnual > 0 ? precioProyecto / ahorroAnual : 0;

    // ── Indicadores financieros completos (Excel fiel) ────────────────────
    const {
      incentivoTotal: incentivo1715,
      retorno,
      ahorro25,
      tirPct,
    } = calcularIndicadoresFinancieros({
      precioProyecto,
      ahorroAnual,
      generacionAnual,
      consumo,
      costo,
      valorExportacion: c38,
      valorComercializacion: c39,
    });

    return {
      consumo, rend, pW, costo, panelKw,
      costoEnergiaMes,
      kwpInstalar,
      numPaneles,
      potenciaPico,
      potenciaInversorKw,
      cantInversor,
      potenciaNominalKw,
      numInversores,
      numMicros,
      areaPanelesM2,
      estructuraPaneles,
      generacionAnual,
      generacionMensual,
      consumoPromMes,
      autoconsumo,
      exportacion,
      pagoComercializacion,
      ahorroAnual,
      ahorroMensual,
      ahorroPct,
      emisionesEvitadas,
      arbolesEquivalentes,
      precioProyecto,
      amortizacion,
      // Indicadores financieros
      incentivo1715,
      retorno,
      ahorro25,
      tirPct,
    };
  }, [
    consumoMes, rendimiento, panelW, costoKwh,
    modo, inversorKw, microKw,
    A, B, factorEmision, factorPerdidas,
    valorExportacion, valorComercializacion,
  ]);

  /**
   * Construye las filas del cuadro naranja para exportar a PDF
   * @returns {Array<{label: string, value: string}>} Array de objetos con etiqueta y valor
   */
  const buildOrangeRows = () => {
    const rows = [];

    // C3
    rows.push({ label: "Potencia paneles pico*",
      value: `${formatNumber(resultados.potenciaPico, 2)} kWp` });
    // C4
    rows.push({ label: `Panel solar ${resultados.pW || 0}W*`,
      value: `${resultados.numPaneles} UND` });
    // C5 / C6
    if (modo === "inversor") {
      rows.push({ label: "Potencia en inversor*",
        value: `${formatNumber(resultados.potenciaInversorKw, 2)} kW` });
      rows.push({ label: `Inversor ${formatNumber(resultados.potenciaNominalKw, 0)} kW*`,
        value: `${resultados.cantInversor} UND` });
    } else {
      rows.push({ label: "Potencia en inversor*", value: "—" });
      rows.push({ label: `Microinversor ${formatNumber(resultados.potenciaNominalKw, 2)} kW*`,
        value: `${resultados.cantInversor} UND` });
    }
    // C7
    rows.push({ label: "Área paneles*",
      value: `${formatNumber(resultados.areaPanelesM2, 2)} m²` });
    // C9: Estructura = C4
    rows.push({ label: "Estructura paneles solares*",
      value: `${resultados.estructuraPaneles} UND` });
    // C10
    rows.push({ label: "Generación anual estimada*",
      value: `${formatNumber(resultados.generacionAnual, 0)} kWh/Año` });
    // C11
    rows.push({ label: "Generación mensual estimada*",
      value: `${formatNumber(resultados.generacionMensual, 0)} kWh/Mes` });
    // C12
    rows.push({ label: "Consumo operador red mensual promedio*",
      value: `${formatNumber(resultados.consumoPromMes, 0)} kWh/Mes` });
    // C13
    rows.push({ label: "Auto consumo",
      value: formatCOP(resultados.autoconsumo, 0) });
    // C14
    rows.push({ label: "Exportación",
      value: resultados.exportacion > 0 ? formatCOP(resultados.exportacion, 0) : "$  0" });
    // C15
    rows.push({ label: "Pago anual OR por comercialización",
      value: formatCOP(resultados.pagoComercializacion, 0) });
    // C16
    rows.push({ label: "Ahorro mensual proyectado**",
      value: formatCOP(resultados.ahorroMensual, 0) });
    // C17
    rows.push({ label: "Ahorro anual estimado**",
      value: formatCOP(resultados.ahorroAnual, 0) });
    // C18
    rows.push({ label: "Ahorro proyectado**",
      value: `${formatNumber(resultados.ahorroPct, 2)} %` });

    // C19: Retorno de inversión
    rows.push({ label: "Retorno de inversión proyectada**",
      value: `${formatNumber(resultados.retorno, 2)} AÑOS` });
    // C20: TIR
    rows.push({ label: "TIR**",
      value: `${formatNumber(resultados.tirPct, 1)} %` });
    // C21: Ahorro 25 años
    rows.push({ label: "Ahorro durante 25 años de vida útil**",
      value: formatCOP(resultados.ahorro25, 0) });
    // C22: Incentivo ley 1715
    rows.push({ label: "Incentivo tributario ley 1715**",
      value: formatCOP(resultados.incentivo1715, 0) });

    // C23
    rows.push({ label: "Emisiones evitadas**",
      value: `${formatNumber(resultados.emisionesEvitadas, 2)} kg CO₂` });
    // C24
    rows.push({ label: "Equivalente en árboles sembrados al año**",
      value: `${formatNumber(resultados.arbolesEquivalentes, 0)} Árboles` });

    // Servicios incluidos (1 UND cada uno)
    rows.push({ label: "Sistema eléctrico asociado al servicio*", value: "1 UND" });
    rows.push({ label: "Ingeniería de detalle*",                  value: "1 UND" });
    rows.push({ label: "Sistema de monitoreo*",                   value: "1 UND" });
    rows.push({ label: "Smart Meter*",                            value: "1 UND" });
    rows.push({ label: "Medidor bidireccional*",                  value: "1 UND" });
    rows.push({ label: "Certificación RETIE*",                    value: "1 UND" });
    rows.push({ label: "Acompañamiento trámites UPME*",           value: "1 UND" });
    rows.push({ label: "Trámites CREG*",                          value: "1 UND" });
    rows.push({ label: "Tablero DC*",                             value: "1 UND" });
    rows.push({ label: "Tablero AC*",                             value: "1 UND" });

    // Valor del proyecto = A × C3^(1-B) + 80000×C4 + 200000
    rows.push({ label: "Valor del Proyecto***",
      value: formatCOP(resultados.precioProyecto, 0) });

    return rows;
  };

  /**
   * Maneja la exportación del PDF completo de la propuesta
   * @async
   */
  const handleExportPdf = async () => {
    try {
      setExportingPdf(true);

      const rows = buildOrangeRows();

      const clienteInfo = {
        nombre:    clienteNombre.trim(),
        telefono:  clienteTelefono.trim(),
        ciudad:    clienteCiudad.trim() || "Pereira",
        depto:     "Risaralda",
        direccion: clienteDireccion.trim(),
      };

      // Obtener número correlativo de propuesta y assets en paralelo
      const [numeroProyecto, assets] = await Promise.all([
        getNextNumeroProyecto(),
        loadPdfAssets(),
      ]);

      await exportCuadroNaranjaPdf({
        rows,
        userLabel:       userNombre || user?.email || "—",
        legendText:      PDF_LEGEND,
        title:           "DESCRIPCIÓN DEL PROYECTO",
        clienteInfo,
        numeroProyecto,
        resultados,
        modo,
        logoBase64:      assets.logoBase64,
        piePaginaBase64: assets.piePaginaBase64,
        firmaBase64:     assets.firmaBase64,
      });

      Alert.alert("Listo", `Propuesta N° SSFV-${new Date().getFullYear()}-${numeroProyecto}-NV generada.`);
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

    const nextA   = toNum(editA);
    const nextB   = toNum(editB);
    const nextFE  = toNum(editFactorEmision);
    const nextFP  = toNum(editFactorPerdidas);
    const nextVE  = toNum(editValorExportacion);
    const nextVC  = toNum(editValorComercializacion);

    if (!(nextA > 0)) {
      Alert.alert("Dato inválido", "La constante A debe ser mayor a 0.");
      return;
    }
    if (!(nextB >= 0 && nextB < 1)) {
      Alert.alert("Dato inválido", "La constante B debe estar entre 0 y 1 (ej: 0.12).");
      return;
    }
    if (!(nextFE > 0 && nextFE < 5)) {
      Alert.alert("Dato inválido", "El factor de emisión debe ser un valor positivo (ej: 0.493).");
      return;
    }
    if (!(nextFP >= 0 && nextFP < 1)) {
      Alert.alert("Dato inválido", "El factor de pérdidas debe estar entre 0 y 1 (ej: 0.03).");
      return;
    }
    if (!(nextVE >= 0)) {
      Alert.alert("Dato inválido", "El valor de exportación debe ser ≥ 0 COP/kWh.");
      return;
    }
    if (!(nextVC >= 0)) {
      Alert.alert("Dato inválido", "El valor de comercialización debe ser ≥ 0 COP/kWh.");
      return;
    }

    try {
      setSavingConstants(true);
      const updated = await updateNoVinculantesConstants({
        A: nextA, B: nextB,
        factorEmision: nextFE,
        factorPerdidas: nextFP,
        valorExportacion: nextVE,
        valorComercializacion: nextVC,
        userId: user?.uid || null,
      });
      setA(updated.A);
      setB(updated.B);
      setFactorEmision(updated.factorEmision);
      setFactorPerdidas(updated.factorPerdidas);
      setValorExportacion(updated.valorExportacion);
      setValorComercializacion(updated.valorComercializacion);
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
            setEditFactorEmision("0.493");
            setEditFactorPerdidas("0.03");
            setEditValorExportacion("200");
            setEditValorComercializacion("50");
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
              onPress={() => {
                setModo("micro");
                setMicroKw((prev) => (toNum(prev) >= 2 ? prev : "2"));
                }}
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
              onPress={() => {
                setModo("inversor");
                setInversorKw((prev) => (toNum(prev) >= 2 ? prev : "2"));
              }}

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

        {/* RESULTADOS INTERMEDIOS */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Resultados</Text>

          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Costo energía mes</Text>
            <Text style={styles.resultValue}>{formatCOP(resultados.costoEnergiaMes, 0)}</Text>
          </View>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>[kWp] a instalar</Text>
            <Text style={styles.resultValue}>{formatNumber(resultados.kwpInstalar, 2)} kWp</Text>
          </View>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}># Paneles</Text>
            <Text style={styles.resultValue}>{resultados.numPaneles}</Text>
          </View>
          {modo === "inversor" && (
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}># Inversores</Text>
              <Text style={styles.resultValue}>{resultados.numInversores}</Text>
            </View>
          )}
          {modo === "micro" && (
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}># Microinversores</Text>
              <Text style={styles.resultValue}>{resultados.numMicros}</Text>
            </View>
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

          {/* C3 */}
          <OrangeRow label="Potencia paneles pico*"
            value={`${formatNumber(resultados.potenciaPico, 2)} kWp`} />
          {/* C4 */}
          <OrangeRow label={`Panel solar ${resultados.pW || 0}W*`}
            value={`${resultados.numPaneles} UND`} />
          {/* C5 / C6 */}
          {modo === "inversor" ? (
            <>
              <OrangeRow label="Potencia en inversor*"
                value={`${formatNumber(resultados.potenciaInversorKw, 2)} kW`} />
              <OrangeRow label={`Inversor ${formatNumber(resultados.potenciaNominalKw, 0)} kW*`}
                value={`${resultados.cantInversor} UND`} />
            </>
          ) : (
            <>
              <OrangeRow label="Potencia en inversor*" value="—" />
              <OrangeRow label={`Microinversor ${formatNumber(resultados.potenciaNominalKw, 2)} kW*`}
                value={`${resultados.cantInversor} UND`} />
            </>
          )}
          {/* C7 */}
          <OrangeRow label="Área paneles*"
            value={`${formatNumber(resultados.areaPanelesM2, 2)} m²`} />
          {/* C9: Estructura = C4 */}
          <OrangeRow label="Estructura paneles solares*"
            value={`${resultados.estructuraPaneles} UND`} />
          {/* C10 */}
          <OrangeRow label="Generación anual estimada*"
            value={`${formatNumber(resultados.generacionAnual, 0)} kWh/Año`} />
          {/* C11 */}
          <OrangeRow label="Generación mensual estimada*"
            value={`${formatNumber(resultados.generacionMensual, 0)} kWh/Mes`} />
          {/* C12 */}
          <OrangeRow label="Consumo operador red mensual promedio*"
            value={`${formatNumber(resultados.consumoPromMes, 0)} kWh/Mes`} />
          {/* C13 */}
          <OrangeRow label="Auto consumo"
            value={formatCOP(resultados.autoconsumo, 0)} />
          {/* C14 */}
          <OrangeRow label="Exportación"
            value={resultados.exportacion > 0 ? formatCOP(resultados.exportacion, 0) : "$  0"} />
          {/* C15 */}
          <OrangeRow label="Pago anual OR por comercialización"
            value={formatCOP(resultados.pagoComercializacion, 0)} />
          {/* C16 */}
          <OrangeRow label="Ahorro mensual proyectado**"
            value={formatCOP(resultados.ahorroMensual, 0)} />
          {/* C17 */}
          <OrangeRow label="Ahorro anual estimado**"
            value={formatCOP(resultados.ahorroAnual, 0)} />
          {/* C18 */}
          <OrangeRow label="Ahorro proyectado**"
            value={`${formatNumber(resultados.ahorroPct, 2)} %`} />
          {/* C19 */}
          <OrangeRow label="Retorno de inversión proyectada**"
            value={`${formatNumber(resultados.retorno, 2)} AÑOS`} />
          {/* C20 */}
          <OrangeRow label="TIR**"
            value={`${formatNumber(resultados.tirPct, 1)} %`} />
          {/* C21 */}
          <OrangeRow label="Ahorro durante 25 años de vida útil**"
            value={formatCOP(resultados.ahorro25, 0)} />
          {/* C22 */}
          <OrangeRow label="Incentivo tributario ley 1715**"
            value={formatCOP(resultados.incentivo1715, 0)} />

          {/* C23 */}
          <OrangeRow label="Emisiones evitadas**"
            value={`${formatNumber(resultados.emisionesEvitadas, 2)} kg CO₂`} />
          {/* C24 */}
          <OrangeRow label="Equivalente en árboles sembrados al año**"
            value={`${formatNumber(resultados.arbolesEquivalentes, 0)} Árboles`} />

          <OrangeRow label="Sistema eléctrico asociado al servicio*" value="1 UND" />
          <OrangeRow label="Ingeniería de detalle*"                  value="1 UND" />
          <OrangeRow label="Sistema de monitoreo*"                   value="1 UND" />
          <OrangeRow label="Smart Meter*"                            value="1 UND" />
          <OrangeRow label="Medidor bidireccional*"                  value="1 UND" />
          <OrangeRow label="Certificación RETIE*"                    value="1 UND" />
          <OrangeRow label="Acompañamiento trámites UPME*"           value="1 UND" />
          <OrangeRow label="Trámites CREG*"                          value="1 UND" />
          <OrangeRow label="Tablero DC*"                             value="1 UND" />
          <OrangeRow label="Tablero AC*"                             value="1 UND" />

          <View style={styles.orangeTotalRow}>
            <Text style={styles.orangeTotalLabel}>Valor del Proyecto***</Text>
            <Text style={styles.orangeTotalValue}>
              {formatCOP(resultados.precioProyecto, 0)}
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
          <Text style={styles.cardTitle}>Constantes y factores</Text>

          {!canEditConstants ? (
            <>
              <Text style={styles.muted}>
                Solo Administrador o Ingeniero puede editar estas constantes.
              </Text>
              {/* Mostrar valores actuales de solo lectura */}
              <View style={styles.constReadBox}>
                <View style={styles.constReadRow}>
                  <Text style={styles.constReadLabel}>Factor emisión CO₂</Text>
                  <Text style={styles.constReadValue}>{factorEmision} kgCO₂/kWh</Text>
                </View>
                <View style={styles.constReadRow}>
                  <Text style={styles.constReadLabel}>Factor de pérdidas</Text>
                  <Text style={styles.constReadValue}>{(Number(factorPerdidas) * 100).toFixed(1)} %</Text>
                </View>
                <View style={styles.constReadRow}>
                  <Text style={styles.constReadLabel}>Valor exportación (C38)</Text>
                  <Text style={styles.constReadValue}>${Number(valorExportacion).toLocaleString("es-CO")} /kWh</Text>
                </View>
                <View style={styles.constReadRow}>
                  <Text style={styles.constReadLabel}>Valor comercialización (C39)</Text>
                  <Text style={styles.constReadValue}>${Number(valorComercializacion).toLocaleString("es-CO")} /kWh</Text>
                </View>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.constSectionLabel}>Fórmula precio</Text>
              <Field
                label="Constante A"
                value={editA}
                onChangeText={setEditA}
                keyboardType="numeric"
                placeholder="6155745.12"
              />
              <Field
                label="Constante B (ej: 0.12)"
                value={editB}
                onChangeText={setEditB}
                keyboardType="numeric"
                placeholder="0.12"
              />

              <Text style={[styles.constSectionLabel, { marginTop: 10 }]}>Factores técnicos</Text>
              <Field
                label="Factor de emisión CO₂ [kgCO₂/kWh] (ej: 0.493)"
                value={editFactorEmision}
                onChangeText={setEditFactorEmision}
                keyboardType="numeric"
                placeholder="0.493"
              />
              <Field
                label="Factor de pérdidas del sistema (ej: 0.03 = 3%)"
                value={editFactorPerdidas}
                onChangeText={setEditFactorPerdidas}
                keyboardType="numeric"
                placeholder="0.03"
              />

              <Text style={[styles.constSectionLabel, { marginTop: 10 }]}>Tarifas CREG</Text>
              <Field
                label="Valor exportación excedentes C38 [COP/kWh]"
                value={editValorExportacion}
                onChangeText={setEditValorExportacion}
                keyboardType="numeric"
                placeholder="200"
              />
              <Field
                label="Valor comercialización OR C39 [COP/kWh]"
                value={editValorComercializacion}
                onChangeText={setEditValorComercializacion}
                keyboardType="numeric"
                placeholder="50"
              />

              <View style={styles.row}>
                <TouchableOpacity
                  style={[styles.btn, styles.btnPrimary]}
                  onPress={onSaveConstants}
                  disabled={savingConstants}
                >
                  {savingConstants ? (
                    <ActivityIndicator color="#fff" />
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
            Precio = A × (kWp)^(1−B) · Generación = kWp × Rendimiento × (1−Pérdidas)
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

  // ====== TARJETA RESULTADOS ======
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  resultLabel: { flex: 1, fontSize: 12, color: "#444", fontWeight: "600" },
  resultValue: { fontSize: 13, fontWeight: "800", color: "#FF4500" },

  // ====== CONSTANTES SOLO LECTURA ======
  constReadBox: {
    marginTop: 10,
    backgroundColor: "#F7F7F7",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  constReadRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
  },
  constReadLabel: { fontSize: 12, color: "#666" },
  constReadValue: { fontSize: 12, fontWeight: "700", color: "#333" },
  constSectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FF4500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },

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