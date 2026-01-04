// utils/excelBudgetImporter.js
import * as XLSX from "xlsx";

const PHASE_TITLES = {
  fase1: "Equipos y estructura",
  fase2: "Sistema electrico asociado al proyecto",
  fase3: "Instalación y puesta en servicio",
  fase4: "Tramites de conexión, mantenimientos, otras actividades",
};

function normText(v) {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function parsePercentAny(v) {
  // Acepta: 0.12, 12, "12%", "0.12", etc.
  if (v === null || v === undefined || v === "") return 0;

  if (typeof v === "number") {
    // Si viene 0.12 => 12%
    if (v > 0 && v <= 1) return v * 100;
    return v;
  }

  const s = String(v).trim().replace(",", ".");
  const m = s.match(/-?\d+(\.\d+)?/);
  if (!m) return 0;
  const n = parseFloat(m[0]);
  // si el string tenía %, lo tomamos tal cual; si no, igual funciona
  if (n > 0 && n <= 1 && s.includes("%") === false) return n * 100;
  return n;
}

function parseNumberAny(v) {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  const s = String(v).trim().replace(/\./g, "").replace(",", "."); // por si viene 1.234.567,89
  const m = s.match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : 0;
}

function aplicaIvaSegunReglas(faseKey, nombre) {
  const n = normText(nombre);

  if (faseKey === "fase1") {
    // NO IVA solo para paneles/módulos e inversores (producto)
    // PERO estructura/soportería/herrajes SÍ deben tener IVA aunque mencionen "paneles"
    const esEstructura = n.includes("estructura") || n.includes("soporte") || n.includes("herra") || n.includes("perfil");

    const esPanelProducto =
      // detecta panel como producto (no "estructura de paneles")
      (n.includes("panel") || n.includes("modulo") || n.includes("módulo")) &&
      !esEstructura;

    const esInversor = n.includes("inversor");

    if (esPanelProducto || esInversor) return false;
    return true;
  }

  if (faseKey === "fase2") return true;
  if (faseKey === "fase3") return false;

  if (faseKey === "fase4") {
    const conIva = [
      "certificado retie de la instalación",
      "certificado retie de la instalacion",
      "estudio de conexión",
      "estudio de conexion",
      "estudio calidad de energía",
      "estudio calidad de energia",
      "sistema de compensación automatico",
      "sistema de compensacion automatico",
    ].map(normText);

    return conIva.some((k) => n.includes(k));
  }

  return true;
}

function findSheetCaseInsensitive(workbook, preferredName) {
  const target = normText(preferredName);
  const name = workbook.SheetNames.find((sn) => normText(sn) === target);
  return name ? workbook.Sheets[name] : null;
}

function findPhaseRowIndexes(rows) {
  // rows: array of arrays (header:1)
  const indexes = {};
  for (let i = 0; i < rows.length; i++) {
    const a = rows[i]?.[0];
    const aNorm = normText(a);

    for (const [faseKey, title] of Object.entries(PHASE_TITLES)) {
      if (aNorm === normText(title)) {
        indexes[faseKey] = i;
      }
    }
  }
  return indexes;
}

function extractAIUFromRows(rows) {
  // Busca strings tipo "ADMINISTRACION 8%" en col A
  let administracion = 0;
  let imprevistos = 0;
  let utilidad = 0;

  for (let i = 0; i < rows.length; i++) {
    const a = rows[i]?.[0];
    if (!a) continue;
    const s = String(a);

    if (normText(s).includes("administracion")) administracion = parsePercentAny(s);
    if (normText(s).includes("imprevistos")) imprevistos = parsePercentAny(s);
    // cuidado: acá “UTILIDAD 5%” es AIU utilidad, no la global
    if (normText(s).startsWith("utilidad")) utilidad = parsePercentAny(s);
  }

  return { administracion, imprevistos, utilidad };
}

function sliceItemsBetween(rows, startIdx, endIdxExclusive, faseKey) {
  const items = [];

  for (let i = startIdx + 1; i < endIdxExclusive; i++) {
    const nombre = rows[i]?.[0];
    const unidadesRaw = rows[i]?.[1];
    const costoUnitarioRaw = rows[i]?.[2];

    if (!nombre) continue;

    const nombreStr = String(nombre).trim();
    const nombreNorm = normText(nombreStr);

    // Cortes típicos
    if (nombreNorm.startsWith("total")) continue;
    if (nombreNorm === "") continue;

    const unidades = parseNumberAny(unidadesRaw);
    const costoUnitario = parseNumberAny(costoUnitarioRaw);

    // Si la fila no parece ítem (sin costo y sin unidades), la ignoramos
    // (pero deja pasar ítems con unidades 0 si hay costo, o viceversa)
    if (unidades === 0 && costoUnitario === 0) continue;

    items.push({
      faseKey,
      nombre: nombreStr,
      unidades,
      costoUnitario,
      aplicaIva: aplicaIvaSegunReglas(faseKey, nombreStr),
      unidad: "un",
      categoria: "",
      notas: "",
    });
  }

  return items;
}

export function parseBudgetFromExcelBase64(base64) {
  const wb = XLSX.read(base64, { type: "base64" });

  const sheet =
    findSheetCaseInsensitive(wb, "Presupuesto") ||
    findSheetCaseInsensitive(wb, "presupuesto");

  if (!sheet) {
    throw new Error('No se encontró la hoja "Presupuesto".');
  }

  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: true,
    defval: null,
  });

  // Utilidad global desde G2 (fila 2 col G => index [1][6])
  const g2 = rows?.[1]?.[6];
  const utilidadGlobal = parsePercentAny(g2);

  // AIU por texto (ADMINISTRACION/IMPREVISTOS/UTILIDAD)
  const aiu = extractAIUFromRows(rows);

  // Fases por encabezados
  const phaseIdx = findPhaseRowIndexes(rows);

  // Validación mínima
  for (const k of ["fase1", "fase2", "fase3", "fase4"]) {
    if (phaseIdx[k] === undefined) {
      throw new Error(`No se encontró el encabezado de ${k} en la hoja Presupuesto.`);
    }
  }

  // Construir items por rangos
  const order = ["fase1", "fase2", "fase3", "fase4"];
  const items = [];

  for (let p = 0; p < order.length; p++) {
    const faseKey = order[p];
    const start = phaseIdx[faseKey];
    const end =
      p < order.length - 1 ? phaseIdx[order[p + 1]] : rows.length;

    items.push(...sliceItemsBetween(rows, start, end, faseKey));
  }

  return { utilidadGlobal, aiu, items };
}
