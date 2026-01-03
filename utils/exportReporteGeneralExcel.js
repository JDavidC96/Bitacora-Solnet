// utils/exportReporteGeneralExcel.js
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

function generateTimestamp() {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, "-");
}

/**
 * Agrupar horas por persona
 */
function agruparPorPersona(registros) {
  const map = new Map();

  registros.forEach((r) => {
    const key = r.nombre ?? r.personalId ?? "desconocido";

    if (!map.has(key)) {
      map.set(key, {
        persona: key,
        horasNormales: 0,
        horasExtras: 0,
        total: 0,
      });
    }

    const item = map.get(key);
    item.horasNormales += r.horasNormales ?? 0;
    item.horasExtras += r.horasExtras ?? 0;
    item.total += r.totalHoras ?? 0;
  });

  return Array.from(map.values());
}

/**
 * Agrupar horas por proyecto
 */
function agruparPorProyecto(registros) {
  const map = new Map();

  registros.forEach((r) => {
    const key = r.proyectoId ?? r.destino ?? "sin-proyecto";

    if (!map.has(key)) {
      map.set(key, {
        proyecto: key,
        horasNormales: 0,
        horasExtras: 0,
        total: 0,
      });
    }

    const item = map.get(key);
    item.horasNormales += r.horasNormales ?? 0;
    item.horasExtras += r.horasExtras ?? 0;
    item.total += r.totalHoras ?? 0;
  });

  return Array.from(map.values());
}

/**
 * Calcular totales globales
 */
function calcularTotales(registros) {
  let normales = 0;
  let extras = 0;
  let total = 0;

  registros.forEach((r) => {
    normales += r.horasNormales ?? 0;
    extras += r.horasExtras ?? 0;
    total += r.totalHoras ?? 0;
  });

  return { normales, extras, total };
}

/**
 * Exportación PRO en CSV
 */
export async function exportReporteGeneralExcel(registros) {
  try {
    if (!registros || registros.length === 0) {
      return { ok: false, message: "No hay registros para exportar." };
    }

    // ============================
    // 1) SECCIÓN DETALLE
    // ============================
    const headersDetalle = [
      "Persona",
      "FechaInicio",
      "FechaFin",
      "HorasNormales",
      "HorasExtras",
      "TotalHoras",
      "Destino",
      "TipoAsignacion",
      "ProyectoId",
    ].join(";");

    const detalleRows = registros.map((r) =>
      [
        r.nombre ?? "",
        r.fechaInicio ?? "",
        r.fechaFin ?? "",
        r.horasNormales ?? 0,
        r.horasExtras ?? 0,
        r.totalHoras ?? 0,
        r.destino ?? "",
        r.tipoAsignacion ?? "",
        r.proyectoId ?? "",
      ].join(";")
    );

    const bloqueDetalle = [
      "DETALLE DE REGISTROS",
      headersDetalle,
      ...detalleRows,
      "",
    ].join("\n");

    // ============================
    // 2) SECCIÓN TOTALES POR PERSONA
    // ============================
    const personas = agruparPorPersona(registros);

    const headersPersonas = [
      "Persona",
      "HorasNormales",
      "HorasExtras",
      "TotalHoras",
    ].join(";");

    const personasRows = personas.map((p) =>
      [p.persona, p.horasNormales, p.horasExtras, p.total].join(";")
    );

    const bloquePersonas = [
      "TOTALES POR PERSONA",
      headersPersonas,
      ...personasRows,
      "",
    ].join("\n");

    // ============================
    // 3) SECCIÓN TOTALES POR PROYECTO
    // ============================
    const proyectos = agruparPorProyecto(registros);

    const headersProyectos = [
      "Proyecto",
      "HorasNormales",
      "HorasExtras",
      "TotalHoras",
    ].join(";");

    const proyectosRows = proyectos.map((p) =>
      [p.proyecto, p.horasNormales, p.horasExtras, p.total].join(";")
    );

    const bloqueProyectos = [
      "TOTALES POR PROYECTO",
      headersProyectos,
      ...proyectosRows,
      "",
    ].join("\n");

    // ============================
    // 4) RESUMEN GLOBAL
    // ============================
    const global = calcularTotales(registros);

    const bloqueGlobal = [
      "RESUMEN GLOBAL",
      "HorasNormales;HorasExtras;TotalHoras",
      `${global.normales};${global.extras};${global.total}`,
      "",
    ].join("\n");

    // ============================
    // 5) COMBINAR TODO EL CSV
    // ============================
    const csvFinal = [
      bloqueDetalle,
      bloquePersonas,
      bloqueProyectos,
      bloqueGlobal,
    ].join("\n");

    // ============================
    // 6) GUARDAR Y COMPARTIR
    // ============================
    const filename = `reporte_general_${generateTimestamp()}.csv`;
    const uri = FileSystem.cacheDirectory + filename;

    await FileSystem.writeAsStringAsync(uri, csvFinal, {
      encoding: "utf8",
    });

    await Sharing.shareAsync(uri);

    return { ok: true, savedTo: uri };
  } catch (error) {
    console.error("ERROR EXPORTANDO CSV PRO:", error);
    return { ok: false, message: error.message };
  }
}
