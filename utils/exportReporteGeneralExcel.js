// utils/exportReporteGeneralExcel.js
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

function generateTimestamp() {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, "-");
}

function breakdown(r) {
  const hn = Number(r.horasNormales || 0);
  const he = Number(r.horasExtras || 0);

  const hnn = Number(r.horasNocturnas || 0);
  const hen = Number(r.horasExtrasNocturnas || 0);

  const hd = Number(r.horasDominicales || 0);
  const hdn = Number(r.horasDominicalesNocturnas || 0);

  const hde = Number(r.horasExtrasDominicales || 0);
  const hden = Number(r.horasExtrasDominicalesNocturnas || 0);

  const total = Number(r.totalHoras || 0) || hn + he + hnn + hen + hd + hdn + hde + hden;

  return { hn, he, hnn, hen, hd, hdn, hde, hden, total };
}

/**
 * Agrupar horas por persona (con desglose completo)
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
        horasNocturnas: 0,
        horasExtrasNocturnas: 0,
        horasDominicales: 0,
        horasDominicalesNocturnas: 0,
        horasExtrasDominicales: 0,
        horasExtrasDominicalesNocturnas: 0,
        total: 0,
      });
    }

    const b = breakdown(r);
    const item = map.get(key);

    item.horasNormales += b.hn;
    item.horasExtras += b.he;
    item.horasNocturnas += b.hnn;
    item.horasExtrasNocturnas += b.hen;
    item.horasDominicales += b.hd;
    item.horasDominicalesNocturnas += b.hdn;
    item.horasExtrasDominicales += b.hde;
    item.horasExtrasDominicalesNocturnas += b.hden;
    item.total += b.total;
  });

  return Array.from(map.values());
}

/**
 * Agrupar horas por proyecto (con desglose completo)
 */
function agruparPorProyecto(registros) {
  const map = new Map();

  registros.forEach((r) => {
    const key = r.destino ?? "Sin destino";

    if (!map.has(key)) {
      map.set(key, {
        proyecto: key,
        horasNormales: 0,
        horasExtras: 0,
        horasNocturnas: 0,
        horasExtrasNocturnas: 0,
        horasDominicales: 0,
        horasDominicalesNocturnas: 0,
        horasExtrasDominicales: 0,
        horasExtrasDominicalesNocturnas: 0,
        total: 0,
      });
    }

    const b = breakdown(r);
    const item = map.get(key);

    item.horasNormales += b.hn;
    item.horasExtras += b.he;
    item.horasNocturnas += b.hnn;
    item.horasExtrasNocturnas += b.hen;
    item.horasDominicales += b.hd;
    item.horasDominicalesNocturnas += b.hdn;
    item.horasExtrasDominicales += b.hde;
    item.horasExtrasDominicalesNocturnas += b.hden;
    item.total += b.total;
  });

  return Array.from(map.values());
}

/**
 * Totales globales (con desglose completo)
 */
function calcularTotales(registros) {
  let horasNormales = 0;
  let horasExtras = 0;
  let horasNocturnas = 0;
  let horasExtrasNocturnas = 0;
  let horasDominicales = 0;
  let horasDominicalesNocturnas = 0;
  let horasExtrasDominicales = 0;
  let horasExtrasDominicalesNocturnas = 0;
  let total = 0;

  registros.forEach((r) => {
    const b = breakdown(r);
    horasNormales += b.hn;
    horasExtras += b.he;
    horasNocturnas += b.hnn;
    horasExtrasNocturnas += b.hen;
    horasDominicales += b.hd;
    horasDominicalesNocturnas += b.hdn;
    horasExtrasDominicales += b.hde;
    horasExtrasDominicalesNocturnas += b.hden;
    total += b.total;
  });

  return {
    horasNormales,
    horasExtras,
    horasNocturnas,
    horasExtrasNocturnas,
    horasDominicales,
    horasDominicalesNocturnas,
    horasExtrasDominicales,
    horasExtrasDominicalesNocturnas,
    total,
  };
}

/**
 * Exportación PRO en CSV (separado por ; para Excel)
 */
export async function exportReporteGeneralExcel(registros) {
  try {
    if (!registros || registros.length === 0) {
      return { ok: false, message: "No hay registros para exportar." };
    }

    // ============================
    // 1) DETALLE
    // ============================
    const headersDetalle = [
      "Persona",
      "FechaInicio",
      "FechaFin",
      "HorasNormales",
      "HorasExtrasDiurnas",
      "HorasNocturnas",
      "HorasExtrasNocturnas",
      "HorasDominicalesFestivas",
      "HorasDominicalesFestivasNocturnas",
      "HorasExtrasDominicalesFestivas",
      "HorasExtrasDominicalesFestivasNocturnas",
      "TotalHoras",
      "Destino",
      "TipoAsignacion",
      "ProyectoId",
    ].join(";");

    const detalleRows = registros.map((r) => {
      const b = breakdown(r);

      return [
        r.nombre ?? "",
        r.fechaInicio ?? "",
        r.fechaFin ?? "",

        b.hn,
        b.he,
        b.hnn,
        b.hen,
        b.hd,
        b.hdn,
        b.hde,
        b.hden,

        b.total,
        r.destino ?? "",
        r.tipoAsignacion ?? "",
        r.proyectoId ?? "",
      ].join(";");
    });

    const bloqueDetalle = ["DETALLE DE REGISTROS", headersDetalle, ...detalleRows, ""].join("\n");

    // ============================
    // 2) TOTALES POR PERSONA
    // ============================
    const personas = agruparPorPersona(registros);

    const headersPersonas = [
      "Persona",
      "HorasNormales",
      "HorasExtrasDiurnas",
      "HorasNocturnas",
      "HorasExtrasNocturnas",
      "HorasDominicalesFestivas",
      "HorasDominicalesFestivasNocturnas",
      "HorasExtrasDominicalesFestivas",
      "HorasExtrasDominicalesFestivasNocturnas",
      "TotalHoras",
    ].join(";");

    const personasRows = personas.map((p) =>
      [
        p.persona,
        p.horasNormales,
        p.horasExtras,
        p.horasNocturnas,
        p.horasExtrasNocturnas,
        p.horasDominicales,
        p.horasDominicalesNocturnas,
        p.horasExtrasDominicales,
        p.horasExtrasDominicalesNocturnas,
        p.total,
      ].join(";")
    );

    const bloquePersonas = ["TOTALES POR PERSONA", headersPersonas, ...personasRows, ""].join("\n");

    // ============================
    // 3) TOTALES POR PROYECTO
    // ============================
    const proyectos = agruparPorProyecto(registros);

    const headersProyectos = [
      "Proyecto",
      "HorasNormales",
      "HorasExtrasDiurnas",
      "HorasNocturnas",
      "HorasExtrasNocturnas",
      "HorasDominicalesFestivas",
      "HorasDominicalesFestivasNocturnas",
      "HorasExtrasDominicalesFestivas",
      "HorasExtrasDominicalesFestivasNocturnas",
      "TotalHoras",
    ].join(";");

    const proyectosRows = proyectos.map((p) =>
      [
        p.proyecto,
        p.horasNormales,
        p.horasExtras,
        p.horasNocturnas,
        p.horasExtrasNocturnas,
        p.horasDominicales,
        p.horasDominicalesNocturnas,
        p.horasExtrasDominicales,
        p.horasExtrasDominicalesNocturnas,
        p.total,
      ].join(";")
    );

    const bloqueProyectos = ["TOTALES POR PROYECTO", headersProyectos, ...proyectosRows, ""].join("\n");

    // ============================
    // 4) RESUMEN GLOBAL
    // ============================
    const global = calcularTotales(registros);

    const bloqueGlobal = [
      "RESUMEN GLOBAL",
      [
        "HorasNormales",
        "HorasExtrasDiurnas",
        "HorasNocturnas",
        "HorasExtrasNocturnas",
        "HorasDominicalesFestivas",
        "HorasDominicalesFestivasNocturnas",
        "HorasExtrasDominicalesFestivas",
        "HorasExtrasDominicalesFestivasNocturnas",
        "TotalHoras",
      ].join(";"),
      [
        global.horasNormales,
        global.horasExtras,
        global.horasNocturnas,
        global.horasExtrasNocturnas,
        global.horasDominicales,
        global.horasDominicalesNocturnas,
        global.horasExtrasDominicales,
        global.horasExtrasDominicalesNocturnas,
        global.total,
      ].join(";"),
      "",
    ].join("\n");

    // ============================
    // 5) COMBINAR CSV
    // ============================
    const csvFinal = [bloqueDetalle, bloquePersonas, bloqueProyectos, bloqueGlobal].join("\n");

    // ============================
    // 6) GUARDAR / COMPARTIR
    // ============================
    const filename = `reporte_general_${generateTimestamp()}.csv`;
    const uri = FileSystem.cacheDirectory + filename;

    await FileSystem.writeAsStringAsync(uri, csvFinal, { encoding: "utf8" });
    await Sharing.shareAsync(uri);

    return { ok: true, savedTo: uri };
  } catch (error) {
    console.error("ERROR EXPORTANDO CSV PRO:", error);
    return { ok: false, message: error.message };
  }
}
