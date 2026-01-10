// services/noVinculantesPdfService.js
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

/**
 * Genera un PDF local (HTML -> PDF) con el cuadro naranja
 * y lo comparte (WhatsApp, correo, etc.).
 */
export async function exportCuadroNaranjaPdf({
  rows = [],
  title = "DESCRIPCIÓN DEL PROYECTO",
  userLabel = "",
  legendText = "",
  filename = "no-vinculantes-cuadro.pdf",
}) {
  const now = new Date();

  const html = buildHtml({
    title,
    userLabel,
    now,
    rows,
    legendText,
  });

  // Genera PDF en el dispositivo
  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  // Compartir
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: "Compartir PDF",
      UTI: "com.adobe.pdf",
    });
  } else {
    // Si no hay sharing disponible, igual devolvemos la ruta
    return { ok: true, uri };
  }

  return { ok: true, uri };
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildHtml({ title, userLabel, now, rows, legendText }) {
  const orange = "#F57C00";
  const orangeLight = "#FFF3E0";
  const border = "#F2B37E";

  const rowsHtml = rows
    .map(
      (r) => `
      <tr>
        <td class="label">${escapeHtml(r.label)}</td>
        <td class="value">${escapeHtml(r.value)}</td>
      </tr>
    `
    )
    .join("");

  const dateStr = now.toLocaleString("es-CO");

  // leyenda con saltos de línea preservados
  const legend = escapeHtml(legendText).replace(/\n/g, "<br/>");

  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { margin: 18px; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111; }
    .wrap {
      border: 2px solid ${orange};
      background: ${orangeLight};
      border-radius: 10px;
      overflow: hidden;
    }
    .title {
      text-align: center;
      font-weight: 800;
      padding: 10px 12px;
      border-bottom: 2px solid ${orange};
      letter-spacing: 0.5px;
    }
    .meta {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 12px;
      font-size: 12px;
      background: #ffe0b2;
      border-bottom: 1px solid ${border};
    }
    table { width: 100%; border-collapse: collapse; }
    td {
      padding: 8px 12px;
      border-bottom: 1px solid ${border};
      vertical-align: top;
      font-size: 12px;
    }
    td.label { font-weight: 700; width: 70%; }
    td.value { font-weight: 800; text-align: right; width: 30%; white-space: nowrap; }
    .legend {
      margin-top: 12px;
      font-size: 10.5px;
      color: #222;
      line-height: 1.35;
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="title">${escapeHtml(title)}</div>
    <div class="meta">
      <div><b>Usuario:</b> ${escapeHtml(userLabel || "—")}</div>
      <div><b>Fecha:</b> ${escapeHtml(dateStr)}</div>
    </div>
    <table>
      ${rowsHtml}
    </table>
  </div>

  <div class="legend">
    ${legend}
  </div>
</body>
</html>
`;
}
