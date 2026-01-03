// utils/exportReporteGeneralExcel.js
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx";

/**
 * Exporta un reporte general de horas en formato Excel:
 * - Hoja "General"
 * - Hoja "Por persona"
 * - Una hoja por cada persona
 */
export async function exportReporteGeneralExcel(registros) {
  if (!registros || registros.length === 0) {
    return { ok: false, message: "No hay registros para exportar." };
  }

  try {
    // Crear libro Excel
    const workbook = XLSX.utils.book_new();

    // ==================================================
    // 1) HOJA GENERAL
    // ==================================================
    const generalData = registros.map((r) => ({
      Persona: r.nombre,
      "Fecha inicio": r.fechaInicio,
      "Fecha fin": r.fechaFin,
      "Horas normales": r.horasNormales || 0,
      "Horas extra": r.horasExtras || 0,
      "Total horas": r.totalHoras || 0,
      Destino: r.destino || "",
      "Tipo asignación": r.tipoAsignacion || "",
      Proyecto: r.proyectoId || "",
    }));

    const generalSheet = XLSX.utils.json_to_sheet(generalData);
    XLSX.utils.book_append_sheet(workbook, generalSheet, "General");

    // ==================================================
    // 2) HOJA RESUMEN POR PERSONA
    // ==================================================
    const resumenMap = new Map();

    registros.forEach((r) => {
      const key = r.nombre || "Sin nombre";
      if (!resumenMap.has(key)) {
        resumenMap.set(key, {
          Persona: key,
          "Horas normales": 0,
          "Horas extra": 0,
          "Total horas": 0,
        });
      }

      const item = resumenMap.get(key);
      item["Horas normales"] += r.horasNormales || 0;
      item["Horas extra"] += r.horasExtras || 0;
      item["Total horas"] += r.totalHoras || 0;
    });

    const resumenData = Array.from(resumenMap.values());
    const resumenSheet = XLSX.utils.json_to_sheet(resumenData);
    XLSX.utils.book_append_sheet(workbook, resumenSheet, "Por persona");

    // ==================================================
    // 3) UNA HOJA POR PERSONA
    // ==================================================
    resumenMap.forEach((_, persona) => {
      const lista = registros.filter((r) => r.nombre === persona);

      const data = lista.map((r) => ({
        "Fecha inicio": r.fechaInicio,
        "Fecha fin": r.fechaFin,
        "Horas normales": r.horasNormales || 0,
        "Horas extra": r.horasExtras || 0,
        "Total horas": r.totalHoras || 0,
        Destino: r.destino || "",
        Proyecto: r.proyectoId || "",
      }));

      const sheet = XLSX.utils.json_to_sheet(data);

      const safeName =
        persona.substring(0, 28).replace(/[\\/?*[\]]/g, "_") || "Persona";

      XLSX.utils.book_append_sheet(workbook, sheet, safeName);
    });

    // ==================================================
    // 4) GENERAR ARCHIVO BASE64
    // ==================================================
    const base64 = XLSX.write(workbook, {
      type: "base64",
      bookType: "xlsx",
    });

    // ==================================================
    // 5) GUARDAR ARCHIVO (EXPO SDK 49 FIX)
    // ==================================================
    const fileUri =
      FileSystem.documentDirectory + "reporte_general_horas.xlsx";

    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: "base64", // <-- FIX
    });

    // ==================================================
    // 6) COMPARTIR ARCHIVO
    // ==================================================
    await Sharing.shareAsync(fileUri);

    return { ok: true };
  } catch (error) {
    console.error("Error exportando Excel reporte general:", error);
    return { ok: false, message: error.message };
  }
}

