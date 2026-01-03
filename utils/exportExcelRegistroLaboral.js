// utils/exportExcelRegistroLaboralCSV.js
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

function generateTimestamp() {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, "-");
}

export async function exportRegistroLaboral(registros) {
  try {
    if (!registros || registros.length === 0) {
      return { ok: false, message: "No hay registros para exportar." };
    }

    // === 1. ENCABEZADOS con tus nombres EXACTOS ===
    const headers = [
      "Persona",
      "Fecha inicio",
      "Fecha fin",
      "Horas normales",
      "Horas extra",
      "Total horas",
      "Asignacion",
      "Tipo"
    ].join(";");

    // === 2. FILAS ===
    const rows = registros.map((r) =>
      [
        r.nombre ?? "",
        r.fechaInicio ?? "",
        r.fechaFin ?? "",
        r.horasNormales ?? 0,
        r.horasExtras ?? 0,
        r.totalHoras ?? 0,
        r.destino ?? "",
        r.tipoAsignacion ?? ""
      ].join(";")
    );

    // === 3. Generar contenido CSV ===
    const csv = [headers, ...rows].join("\n");

    // === 4. Guardar archivo ===
    const filename = `registro_laboral_${generateTimestamp()}.csv`;
    const uri = FileSystem.cacheDirectory + filename;

    await FileSystem.writeAsStringAsync(uri, csv, {
      encoding: "utf8",
    });

    // === 5. Compartir archivo ===
    await Sharing.shareAsync(uri);

    return { ok: true, savedTo: uri };
  } catch (error) {
    console.error("ERROR EXPORTANDO CSV REGISTRO LABORAL:", error);
    return { ok: false, message: error.message };
  }
}
