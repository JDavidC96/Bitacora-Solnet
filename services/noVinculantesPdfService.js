// services/noVinculantesPdfService.js
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

/**
 * SERVICIO DE GENERACIÓN DE PDF PARA PROYECTOS NO VINCULANTES
 * 
 * Descripción:
 * Este servicio maneja la generación y exportación de PDFs para el cuadro naranja
 * de proyectos no vinculantes. Convierte datos estructurados a HTML y luego a PDF,
 * incluyendo información del cliente y leyendas técnicas.
 * 
 * Funcionalidades principales:
 * 1. Generación de HTML estructurado con estilos CSS
 * 2. Conversión de HTML a PDF usando expo-print
 * 3. Compartición del PDF generado usando expo-sharing
 * 4. Escapado seguro de contenido HTML
 * 5. Formateo de información del cliente
 * 
 * Dependencias:
 * - expo-print: Para generar archivos PDF desde HTML
 * - expo-sharing: Para compartir el PDF generado
 * 
 * @module noVinculantesPdfService
 */

/**
 * Genera un PDF con el cuadro naranja y lo comparte a través del sistema nativo
 * 
 * @async
 * @function exportCuadroNaranjaPdf
 * @param {Object} options - Opciones para la generación del PDF
 * @param {Array<{label: string, value: string}>} options.rows - Filas del cuadro naranja
 * @param {string} [options.title="DESCRIPCIÓN DEL PROYECTO"] - Título del documento
 * @param {string} [options.userLabel=""] - Etiqueta del usuario que genera el PDF
 * @param {string} [options.legendText=""] - Texto de leyenda técnica
 * @param {string} [options.filename="no-vinculantes-cuadro.pdf"] - Nombre del archivo PDF
 * @param {Object} [options.clienteInfo={}] - Información del cliente
 * @param {string} [options.clienteInfo.nombre] - Nombre del cliente
 * @param {string} [options.clienteInfo.telefono] - Teléfono del cliente
 * @param {string} [options.clienteInfo.ciudad] - Ciudad del cliente
 * @param {string} [options.clienteInfo.direccion] - Dirección del cliente
 * @returns {Promise<{ok: boolean, uri: string}>} Objeto con estado y URI del PDF generado
 * @throws {Error} Si hay problemas al generar o compartir el PDF
 * 
 * @example
 * await exportCuadroNaranjaPdf({
 *   rows: [{label: "Potencia", value: "10 kWp"}],
 *   userLabel: "Juan Pérez",
 *   clienteInfo: {
 *     nombre: "Cliente Ejemplo",
 *     telefono: "3001234567"
 *   }
 * });
 */
export async function exportCuadroNaranjaPdf({
  rows = [],
  title = "DESCRIPCIÓN DEL PROYECTO",
  userLabel = "",
  legendText = "",
  filename = "no-vinculantes-cuadro.pdf",
  clienteInfo = {}, // Nuevo: información del cliente
}) {
  const now = new Date();

  // Generar HTML con los datos proporcionados
  const html = buildHtml({
    title,
    userLabel,
    now,
    rows,
    legendText,
    clienteInfo, // Pasamos la info del cliente
  });

  // Genera PDF en el dispositivo
  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  // Compartir usando el sistema nativo de compartir
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: "Compartir PDF",
      UTI: "com.adobe.pdf", // Tipo uniforme de identificador para iOS
    });
  } else {
    // Si no hay sharing disponible, igual devolvemos la ruta
    return { ok: true, uri };
  }

  return { ok: true, uri };
}

/**
 * Escapa caracteres especiales para prevenir vulnerabilidades XSS
 * y asegurar la correcta renderización del HTML
 * 
 * @function escapeHtml
 * @param {string} str - Cadena de texto a escapar
 * @returns {string} Texto escapado seguro para HTML
 * 
 * @example
 * escapeHtml('<script>alert("xss")</script>') 
 * // Devuelve: "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
 */
function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Construye el HTML completo para el PDF
 * 
 * @function buildHtml
 * @param {Object} params - Parámetros para construir el HTML
 * @param {string} params.title - Título del documento
 * @param {string} params.userLabel - Etiqueta del usuario
 * @param {Date} params.now - Fecha y hora actual
 * @param {Array} params.rows - Filas del cuadro naranja
 * @param {string} params.legendText - Texto de la leyenda
 * @param {Object} params.clienteInfo - Información del cliente
 * @returns {string} HTML completo listo para convertir a PDF
 * 
 * @description
 * Genera una plantilla HTML con:
 * - Sección de información del cliente (si está disponible)
 * - Cuadro naranja con las filas proporcionadas
 * - Metadatos (usuario y fecha)
 * - Leyendas técnicas con saltos de línea preservados
 * 
 * Estilos incluidos:
 * - Colores corporativos (naranja #F57C00)
 * - Diseño responsivo para PDF
 * - Formateo de tablas y secciones
 */
function buildHtml({ title, userLabel, now, rows, legendText, clienteInfo = {} }) {
  // Colores corporativos para el cuadro naranja
  const orange = "#F57C00";
  const orangeLight = "#FFF3E0";
  const border = "#F2B37E";

  // Generar filas HTML para la tabla del cuadro naranja
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

  // Formatear fecha en formato colombiano
  const dateStr = now.toLocaleString("es-CO");

  // Procesar leyenda: mantener saltos de línea
  const legend = escapeHtml(legendText).replace(/\n/g, "<br/>");

  // Generar sección de información del cliente (si existe)
  const clienteHtml = clienteInfo.nombre || clienteInfo.telefono || clienteInfo.ciudad || clienteInfo.direccion 
    ? `
    <div class="cliente-section">
      <div class="cliente-title">Información del Cliente</div>
      ${clienteInfo.nombre ? `<div class="cliente-row"><span class="cliente-label">Nombre:</span> ${escapeHtml(clienteInfo.nombre)}</div>` : ''}
      ${clienteInfo.telefono ? `<div class="cliente-row"><span class="cliente-label">Teléfono:</span> ${escapeHtml(clienteInfo.telefono)}</div>` : ''}
      ${clienteInfo.ciudad ? `<div class="cliente-row"><span class="cliente-label">Ciudad:</span> ${escapeHtml(clienteInfo.ciudad)}</div>` : ''}
      ${clienteInfo.direccion ? `<div class="cliente-row"><span class="cliente-label">Dirección:</span> ${escapeHtml(clienteInfo.direccion)}</div>` : ''}
    </div>
    `
    : '';

  // Plantilla HTML completa con estilos embebidos
  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    /* Configuración de página para impresión */
    @page { margin: 18px; }
    
    /* Estilos generales del documento */
    body { 
      font-family: Arial, Helvetica, sans-serif; 
      color: #111; 
      line-height: 1.4; 
    }
    
    /* Sección de información del cliente */
    .cliente-section {
      margin-bottom: 16px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
      border: 1px solid #dee2e6;
    }
    .cliente-title {
      font-weight: 700;
      font-size: 14px;
      margin-bottom: 8px;
      color: #2c3e50;
      border-bottom: 1px solid #dee2e6;
      padding-bottom: 4px;
    }
    .cliente-row {
      margin-bottom: 6px;
      font-size: 12px;
    }
    .cliente-label {
      font-weight: 700;
      color: #495057;
      min-width: 80px;
      display: inline-block;
    }
    
    /* Contenedor del cuadro naranja */
    .wrap {
      border: 2px solid ${orange};
      background: ${orangeLight};
      border-radius: 10px;
      overflow: hidden;
    }
    
    /* Título del cuadro */
    .title {
      text-align: center;
      font-weight: 800;
      padding: 10px 12px;
      border-bottom: 2px solid ${orange};
      letter-spacing: 0.5px;
    }
    
    /* Metadatos (usuario y fecha) */
    .meta {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 12px;
      font-size: 12px;
      background: #ffe0b2;
      border-bottom: 1px solid ${border};
    }
    
    /* Tabla de resultados */
    table { 
      width: 100%; 
      border-collapse: collapse; 
    }
    td {
      padding: 8px 12px;
      border-bottom: 1px solid ${border};
      vertical-align: top;
      font-size: 12px;
    }
    td.label { 
      font-weight: 700; 
      width: 70%; 
    }
    td.value { 
      font-weight: 800; 
      text-align: right; 
      width: 30%; 
      white-space: nowrap; 
    }
    
    /* Leyenda técnica */
    .legend {
      margin-top: 12px;
      font-size: 10.5px;
      color: #222;
      line-height: 1.35;
    }
  </style>
</head>
<body>
  <!-- Sección de información del cliente -->
  ${clienteHtml}
  
  <!-- Cuadro naranja principal -->
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

  <!-- Leyenda técnica -->
  <div class="legend">
    ${legend}
  </div>
</body>
</html>
`;
}