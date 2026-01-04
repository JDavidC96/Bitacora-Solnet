// utils/exportExcelRegistroLaboral.js
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

function generateTimestamp() {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, "-");
}

export async function exportRegistroLaboralExcel(registros) {
  try {
    if (!registros || registros.length === 0) {
      return { ok: false, message: "No hay registros para exportar." };
    }

    // =====================================================
    // 1. ENCABEZADOS (orden lógico + completo)
    // =====================================================
    const headers = [
      "Persona",
      "Fecha inicio",
      "Fecha fin",

      "Horas normales",
      "Horas extra diurnas",

      "Horas nocturnas",
      "Horas extra nocturnas",

      "Horas dominicales / festivas",
      "Horas dominicales nocturnas",

      "Horas extra dominicales / festivas",
      "Horas extra dominicales nocturnas",

      "Total horas",
      "Asignación",
      "Tipo asignación",
    ].join(";");

    // =====================================================
    // 2. FILAS
    // =====================================================
    const rows = registros.map((r) => {
      const hn = Number(r.horasNormales || 0);
      const he = Number(r.horasExtras || 0);

      const hnn = Number(r.horasNocturnas || 0);
      const hen = Number(r.horasExtrasNocturnas || 0);

      const hd = Number(r.horasDominicales || 0);
      const hdn = Number(r.horasDominicalesNocturnas || 0);

      const hde = Number(r.horasExtrasDominicales || 0);
      const hden = Number(r.horasExtrasDominicalesNocturnas || 0);

      const total =
        Number(r.totalHoras) ||
        hn + he + hnn + hen + hd + hdn + hde + hden;

      return [
        r.nombre ?? "",
        r.fechaInicio ?? "",
        r.fechaFin ?? "",

        hn,
        he,

        hnn,
        hen,

        hd,
        hdn,

        hde,
        hden,

        total,
        r.destino ?? "",
        r.tipoAsignacion ?? "",
      ].join(";");
    });

    // =====================================================
    // 3. CONTENIDO CSV
    // =====================================================
    const csv = [headers, ...rows].join("\n");

    // =====================================================
    // 4. GUARDAR ARCHIVO
    // =====================================================
    const filename = `registro_laboral_${generateTimestamp()}.csv`;
    const uri = FileSystem.cacheDirectory + filename;

    await FileSystem.writeAsStringAsync(uri, csv, {
      encoding: "utf8",
    });

    // =====================================================
    // 5. COMPARTIR
    // =====================================================
    await Sharing.shareAsync(uri);

    return { ok: true, savedTo: uri };
  } catch (error) {
    console.error("ERROR EXPORTANDO CSV REGISTRO LABORAL:", error);
    return { ok: false, message: error.message };
  }
}
