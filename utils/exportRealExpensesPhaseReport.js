// utils/exportRealExpensesPhaseReport.js
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { generateTimestamp, rowsToCsv } from "./csvUtils";

function safeName(name) {
  return (name || "proyecto")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_");
}

/**
 * Exporta un reporte por fase (CSV) usando los datos ya calculados en RealExpensesScreen.
 *
 * expected shape:
 * - phaseKey: "fase1" | "fase2" | "fase3" | "fase4"
 * - items: array de items de esa fase (groupedByPhase[phaseKey])
 * - totals: { materiales, viaticos, tramites, manoObra, totalFase }
 */
export async function exportRealExpensesPhaseReport({
  phaseKey,
  projectTitle,
  items,
  totals,
}) {
  try {
    if (!items) items = [];

    const rows = [
      ["REPORTE GASTOS REALES"],
      ["Proyecto", projectTitle || ""],
      ["Fase", phaseKey],
      ["Generado", new Date().toISOString()],
      [""],
      ["LISTADO"],
      ["Tipo", "Concepto/Nombre", "Categoría", "Cantidad", "Valor Unit.", "Valor", "Fecha/Creado"],
    ];

    for (const item of items) {
      const tipo = item.tipo || "gasto";

      if (tipo === "material") {
        const unit = Number(item.precioUnitario ?? item.costoUnitario ?? item.precio ?? 0);
        const qty = Number(item.cantidad || 0);
        const total = Number(item.total ?? unit * qty ?? 0);

        rows.push([
          "Material",
          item.nombre || "",
          item.categoria || item.subcategoria || "",
          qty,
          unit,
          total,
          item.fecha || item.createdAt || "",
        ]);
      } else if (tipo === "viatico") {
        const total = Number(item.valor || 0);
        rows.push([
          "Viático",
          item.concepto || "",
          item.categoria || "",
          "",
          "",
          total,
          item.fecha || item.createdAt || "",
        ]);
      } else if (tipo === "tramite") {
        const total = Number(item.valor || 0);
        rows.push([
          "Trámite",
          item.concepto || "",
          "",
          "",
          "",
          total,
          item.fecha || item.createdAt || "",
        ]);
      } else if (tipo === "manoObra") {
        const total = Number(item.total || 0);
        rows.push([
          "Mano de obra (agregado)",
          "Mano de obra",
          "",
          `Hrs: ${Number(item.totalHorasManoObra || 0)} (N:${Number(item.totalHorasNormales || 0)} / E:${Number(item.totalHorasExtras || 0)})`,
          "",
          total,
          "",
        ]);
      } else {
        const total = Number(item.total || item.valor || 0);
        rows.push([
          "Gasto",
          item.concepto || item.nombre || "",
          "",
          "",
          "",
          total,
          item.fecha || item.createdAt || "",
        ]);
      }
    }

    rows.push([""]);
    rows.push(["TOTALES"]);
    rows.push(["Materiales", Number(totals?.materiales || 0)]);
    rows.push(["Viáticos", Number(totals?.viaticos || 0)]);
    rows.push(["Trámites", Number(totals?.tramites || 0)]);
    rows.push(["Mano de obra", Number(totals?.manoObra || 0)]);
    rows.push(["TOTAL FASE", Number(totals?.totalFase || 0)]);

    const csv = rowsToCsv(rows, ";");
    const filename = `reporte_gastos_${safeName(projectTitle)}_${phaseKey}_${generateTimestamp()}.csv`;
    const uri = FileSystem.cacheDirectory + filename;

    await FileSystem.writeAsStringAsync(uri, csv, { encoding: "utf8" });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri);
    }

    return { ok: true, savedTo: uri };
  } catch (error) {
    console.error("ERROR EXPORTANDO REPORTE FASE:", error);
    return { ok: false, message: error.message };
  }
}
