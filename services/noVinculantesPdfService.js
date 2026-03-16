// services/noVinculantesPdfService.js
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

// ─── Carga de imágenes locales como base64 ───────────────────────────────────
export async function loadPdfAssets() {
  try {
    const [logoAsset, pieAsset, firmaAsset] = await Promise.all([
      Asset.fromModule(require("../assets/images/terrall.png")).downloadAsync(),
      Asset.fromModule(require("../assets/images/piepagina.png")).downloadAsync(),
      Asset.fromModule(require("../assets/images/firmalogistica.png")).downloadAsync(),
    ]);
    const [logoB64, pieB64, firmaB64] = await Promise.all([
      FileSystem.readAsStringAsync(logoAsset.localUri ?? logoAsset.uri, { encoding: "base64" }),
      FileSystem.readAsStringAsync(pieAsset.localUri  ?? pieAsset.uri,  { encoding: "base64" }),
      FileSystem.readAsStringAsync(firmaAsset.localUri ?? firmaAsset.uri, { encoding: "base64" }),
    ]);
    return {
      logoBase64:      `data:image/png;base64,${logoB64}`,
      piePaginaBase64: `data:image/png;base64,${pieB64}`,
      firmaBase64:     `data:image/png;base64,${firmaB64}`,
    };
  } catch (e) {
    console.warn("loadPdfAssets:", e.message);
    return { logoBase64: "", piePaginaBase64: "", firmaBase64: "" };
  }
}

// ─── Exportar PDF ─────────────────────────────────────────────────────────────
/**
 * Genera y comparte el PDF completo de la propuesta no vinculante.
 *
 * @param {Object} opts
 * @param {Array}   opts.rows          - Filas del cuadro naranja
 * @param {string}  opts.title
 * @param {string}  opts.userLabel
 * @param {string}  opts.legendText
 * @param {Object}  opts.clienteInfo   - { nombre, telefono, ciudad, direccion }
 * @param {string}  opts.numeroProyecto - "001", "002", …
 * @param {Object}  opts.resultados    - Objeto con los cálculos (potenciaPico, ahorroPct, etc.)
 * @param {string}  opts.modo         - "micro" | "inversor"
 * @param {string}  opts.logoBase64
 * @param {string}  opts.piePaginaBase64
 */
export async function exportCuadroNaranjaPdf({
  rows = [],
  title = "DESCRIPCIÓN DEL PROYECTO",
  userLabel = "",
  legendText = "",
  clienteInfo = {},
  numeroProyecto = "001",
  resultados = {},
  modo = "micro",
  logoBase64 = "",
  piePaginaBase64 = "",
  firmaBase64 = "",
}) {
  const now = new Date();
  const html = buildHtml({
    title, userLabel, now, rows, legendText,
    clienteInfo, numeroProyecto, resultados, modo,
    logoBase64, piePaginaBase64, firmaBase64,
  });

  const { uri } = await Print.printToFileAsync({ html, base64: false });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: "Compartir propuesta",
      UTI: "com.adobe.pdf",
    });
  }
  return { ok: true, uri };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getVal(rows, label) {
  const r = rows.find(r => r.label.toLowerCase().includes(label.toLowerCase()));
  return r ? esc(r.value) : "—";
}

function fmtFecha(date) {
  return date.toLocaleDateString("es-CO", {
    day: "numeric", month: "long", year: "numeric",
  });
}

// ─── HTML completo ────────────────────────────────────────────────────────────

function buildHtml({
  title, userLabel, now, rows, legendText,
  clienteInfo, numeroProyecto, resultados, modo,
  logoBase64, piePaginaBase64, firmaBase64,
}) {
  const orange      = "#F57C00";
  const orangeLight = "#FFF3E0";
  const borderC     = "#F2B37E";
  const green       = "#1B5E20";
  const blue        = "#0D47A1";
  const gold        = "#B8860B";
  const tableHdrBg  = "#C8A96E"; // color encabezado tablas del Word
  const tableRowBg  = "#FFF8DC";

  const dateStr   = fmtFecha(now);
  const anio      = now.getFullYear();
  const legend    = esc(legendText).replace(/\n/g, "<br/>");

  // Datos del cliente
  const nombre    = esc(clienteInfo.nombre   || "");
  const ciudad    = esc(clienteInfo.ciudad   || "Pereira");
  const depto     = esc(clienteInfo.depto    || "Risaralda");
  const telefono  = esc(clienteInfo.telefono || "");
  const direccion = esc(clienteInfo.direccion|| "");

  // Valores calculados para la carta de presentación
  // DEBUG — borra después de confirmar
  console.log("PDF buildHtml resultados:", JSON.stringify({
    potenciaInversorKw: resultados.potenciaInversorKw,
    potenciaNominalKw:  resultados.potenciaNominalKw,
    numMicros:          resultados.numMicros,
    numInversores:      resultados.numInversores,
    potenciaPico:       resultados.potenciaPico,
    pW:                 resultados.pW,
    modo,
  }));

  const potenciaPicoKwp = resultados.potenciaPico      || 0;
  const potenciaACkw    = resultados.potenciaInversorKw || 0;
  const consumoMes      = resultados.consumo            || 0;
  const ahorroPct       = resultados.ahorroPct          || 0;

  const fmtNum = (v, d = 2) =>
    Number(v || 0).toLocaleString("es-CO", {
      minimumFractionDigits: d, maximumFractionDigits: d,
    });
  const fmtCOP = (v) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v || 0);

  // ── Tarjetas resumen ──
  const ahorroMensual  = getVal(rows, "ahorro mensual proyectado");
  const ahorroAnual    = getVal(rows, "ahorro anual estimado");
  const ahorroPctStr   = getVal(rows, "ahorro proyectado**");
  const emisiones      = getVal(rows, "emisiones evitadas");
  const arboles        = getVal(rows, "árboles");
  const genMensual     = getVal(rows, "generación mensual");
  const genAnual       = getVal(rows, "generación anual");
  const consumoRed     = getVal(rows, "consumo operador");
  const numPanelesStr  = getVal(rows, "panel solar");
  const potPicoStr     = getVal(rows, "potencia paneles pico");
  const areaStr        = getVal(rows, "área paneles");
  const valorProyecto  = getVal(rows, "valor del proyecto");
  // Indicadores financieros — desde resultados directo (más preciso que las filas)
  const retornoStr     = getVal(rows, "retorno de inversión");
  const tirStr         = getVal(rows, "TIR**");
  const ahorro25Str    = getVal(rows, "25 años de vida");
  const incentivoStr   = getVal(rows, "ley 1715");

  const rowMicro = rows.find(
    r => r.label.toLowerCase().includes("microinversor") && r.value !== "—"
  );
  const rowInv = rows.find(
    r => r.label.toLowerCase().includes("potencia en inversor") && r.value !== "—"
  );
  const invLabel = rowMicro
    ? `${esc(rowMicro.label)}: ${esc(rowMicro.value)}`
    : rowInv ? `${esc(rowInv.label)}: ${esc(rowInv.value)}` : "—";

  // ── Todas las filas del cuadro naranja ──
  const allRowsHtml = rows.map(r => {
    const isTotal = r.label.toLowerCase().includes("valor del proyecto");
    return isTotal
      ? `<tr class="total-row"><td class="td-l">${esc(r.label)}</td><td class="td-v">${esc(r.value)}</td></tr>`
      : `<tr><td class="td-l">${esc(r.label)}</td><td class="td-v">${esc(r.value)}</td></tr>`;
  }).join("");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  @page {
    size: Letter;
    margin: 0;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    font-family: Arial, Helvetica, sans-serif;
    color: #1a1a1a;
    font-size: 10.5px;
    line-height: 1.5;
    background: #fff;
    height: 100%;
  }

  /* ── ESTRUCTURA: tabla con thead/tfoot que se repiten en cada página ── */
  .page-wrap {
    width: 100%;
    border-collapse: collapse;
  }

  /* ── HEADER derecha, logo terrall ── */
  .page-wrap thead td {
    padding: 5px 13mm 4px 13mm;
    height: 56px;
    vertical-align: middle;
    text-align: right;
    background: #fff;
  }
  .page-wrap thead img {
    height: 44px;
    object-fit: contain;
    opacity: 0.87;
    display: inline-block;
  }

  /* ── FOOTER centrado, piepagina ── */
  .page-wrap tfoot td {
    padding: 4px 13mm 4px 13mm;
    height: 46px;
    vertical-align: middle;
    text-align: center;
    background: #fff;
  }
  .page-wrap tfoot img {
    height: 36px;
    object-fit: contain;
    opacity: 0.80;
    display: inline-block;
  }

  /* ── CONTENIDO ── */
  .page-wrap tbody td {
    padding: 10px 13mm 10px 13mm;
    vertical-align: top;
  }
  .content { width: 100%; }

  /* ── FECHA Y NÚMERO ── */
  .doc-meta { margin-bottom: 10px; }
  .doc-meta .fecha { font-size: 11px; margin-bottom: 4px; }
  .doc-numero { font-weight: 700; font-size: 11px; margin-bottom: 8px; }
  .doc-destinatario { margin-bottom: 10px; font-size: 10.5px; }
  .doc-destinatario .nombre { font-weight: 700; text-transform: uppercase; }

  /* ── CUERPO CARTA ── */
  .saludo { font-weight: 700; margin-bottom: 8px; }
  .parrafo { margin-bottom: 9px; text-align: justify; font-size: 10.5px; }

  /* ── SECTION HEADING ── */
  .sec-num {
    font-size: 11.5px;
    font-weight: 900;
    color: ${orange};
    margin: 14px 0 6px;
  }

  /* ── TARJETAS 2×N ── */
  .cards { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin: 8px 0 10px; }
  .card  { border-radius: 7px; padding: 7px 9px; display: flex; gap: 8px; align-items: flex-start; }
  .ci   { font-size: 18px; flex-shrink: 0; margin-top: 1px; }
  .ct   { font-size: 8.5px; font-weight: 700; text-transform: uppercase; opacity: .7; margin-bottom: 1px; }
  .cv   { font-size: 13px; font-weight: 900; line-height: 1.1; }
  .cs   { font-size: 8.5px; opacity: .8; margin-top: 1px; }
  .co  { background: #FFF3E0; border: 1.5px solid #FFCC80; } .vo { color: #E65100; }
  .cb  { background: #E3F2FD; border: 1.5px solid #90CAF9; } .vb { color: ${blue}; }
  .cg  { background: #E8F5E9; border: 1.5px solid #A5D6A7; } .vg { color: ${green}; }
  .ct2 { background: #E0F2F1; border: 1.5px solid #80CBC4; } .vt { color: #00695C; }
  .cy  { background: #FFFDE7; border: 1.5px solid #FFF176; } .vy { color: #F57F17; }
  .cp  { background: #F3E5F5; border: 1.5px solid #CE93D8; } .vp { color: #6A1B9A; }
  .cr  { background: #FBE9E7; border: 1.5px solid #FFAB91; } .vr { color: #BF360C; }
  .cl  { background: #F9FBE7; border: 1.5px solid #DCE775; } .vl { color: #558B2F; }

  /* ── CUADRO NARANJA ── */
  .obox { border: 2px solid ${orange}; border-radius: 9px; overflow: hidden; margin: 8px 0; }
  .ohdr { background: ${orange}; color:#fff; font-weight:900; font-size:10.5px;
          text-align:center; padding:5px 10px; text-transform:uppercase; letter-spacing:.4px; }
  .mbar { background:#FFE0B2; border-bottom:1px solid ${borderC}; padding:3px 9px;
          font-size:8.5px; display:flex; justify-content:space-between; }
  .otbl { width:100%; border-collapse:collapse; background:${orangeLight}; }
  .otbl td { padding:3.5px 9px; border-bottom:1px solid ${borderC}; vertical-align:middle; }
  .td-l { font-weight:700; font-size:9px; width:72%; }
  .td-v { font-weight:900; font-size:9px; text-align:right; white-space:nowrap; color:#333; }
  .total-row td { background:${orange}!important; color:#fff!important;
                  font-weight:900!important; font-size:10.5px!important; padding:5px 9px!important; }

  /* ── TABLA WORD-STYLE (mantenimiento, garantías, equipo) ── */
  .wtbl { width:100%; border-collapse:collapse; margin: 7px 0; font-size:9.5px; }
  .wtbl th {
    background: ${tableHdrBg};
    color: #fff;
    font-weight: 700;
    padding: 5px 9px;
    text-align: center;
    border: 1px solid #ccc;
  }
  .wtbl td {
    background: ${tableRowBg};
    padding: 5px 9px;
    border: 1px solid #ddd;
    vertical-align: top;
  }
  .wtbl td.bold { font-weight: 700; }
  .wtbl tr:nth-child(even) td { background: #FAEBD7; }

  /* ── BULLETS ── */
  .bullets { margin: 6px 0 6px 14px; }
  .bullets li { margin-bottom: 4px; font-size: 10px; }
  .bullets li b { font-weight: 700; }

  /* ── NOTA ── */
  .nota { font-size: 9.5px; color: #444; margin: 6px 0; font-style: italic; }
  .nota-box {
    background: #FFF3E0;
    border: 1.5px solid ${orange};
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 9.5px;
    font-weight: 700;
    text-align: center;
    margin: 8px 0;
    color: #333;
  }

  /* ── LEYENDA ── */
  .legend {
    font-size: 8px; color:#555; line-height:1.5; margin-top:8px;
    padding:6px 9px; background:#FAFAFA; border-radius:5px; border:1px solid #E0E0E0;
  }

  /* ── CIERRE ── */
  .cierre { margin-top: 16px; font-size: 10.5px; }
  .cierre .firma { font-weight: 700; margin-top: 8px; }
</style>
</head>
<body>
<table class="page-wrap">
  <thead><tr><td>
    ${logoBase64 ? `<img src="${logoBase64}" alt="Terrall"/>` : `<span style="font-size:18px;font-weight:900;color:${orange};">TERRALL</span>`}
  </td></tr></thead>
  <tfoot><tr><td>
    ${piePaginaBase64 ? `<img src="${piePaginaBase64}" alt=""/>` : ""}
  </td></tr></tfoot>
  <tbody><tr><td>
<div class="content">

  <!-- 1. ENCABEZADO CARTA -->
  <div class="doc-meta">
    <div class="fecha">${esc(ciudad)}, ${esc(dateStr)}</div>
    <div class="doc-numero">N° SSFV-${anio}-${esc(numeroProyecto)}-NV</div>
    <div class="doc-destinatario">
      ${nombre ? `<span>${nombre.includes("señor") || nombre.includes("Señor") ? "" : (clienteInfo.genero === "F" ? "Señora" : "Señor")}</span>
      <span class="nombre"> ${nombre}</span><br/>` : ""}
      ${ciudad}, ${depto}
    </div>
    <div class="saludo">Cordial saludo</div>
  </div>

  <!-- PÁRRAFOS PRESENTACIÓN -->
  <p class="parrafo">
    Somos una empresa líder en el sector de la energía solar y la conectividad rural en Colombia,
    con más de 10 años de experiencia impulsando un futuro más sostenible e inclusivo. A lo largo
    de nuestra trayectoria, hemos llevado soluciones de energía limpia e internet a comunidades
    rurales en todo el país, consolidando nuestra posición a través de un compromiso constante con
    la excelencia, la innovación y el desarrollo social y ambiental.
  </p>
  <p class="parrafo">
    Es un gusto para nosotros presentar esta oferta técnica y económica, elaborada conforme a sus
    requerimientos, con la firme convicción de aportar al crecimiento energético del país mediante
    soluciones renovables eficientes, seguras y sostenibles.
  </p>
  <p class="parrafo">
    Nuestro objetivo es ofrecer una solución energética robusta, confiable y de alto desempeño,
    basada en componentes de marcas reconocidas a nivel internacional. Todos los equipos propuestos,
    incluyendo paneles e inversores, son completamente nuevos, cuentan con certificación RETIE y
    cumplen con los estándares exigidos para instalaciones industriales en Colombia. En particular,
    los paneles solares seleccionados están incluidos en el listado TIER 1 y pertenecen al top 10
    de fabricantes a nivel global.
  </p>
  <p class="parrafo">
    A continuación, se presenta el análisis del sistema fotovoltaico ONGRID propuesto, con una
    potencia nominal de <b>${fmtNum(potenciaACkw, 2)} kW AC</b>
    (<b>${fmtNum(potenciaPicoKwp, 2)} kWp</b> en módulos solares), dimensionado para cubrir
    un consumo mensual estimado según la información suministrada de
    <b>${fmtNum(consumoMes, 0)} kWh/mes</b> y un ahorro promedio mensual proyectado del
    <b>${fmtNum(ahorroPct, 2)}%</b>.
    El diseño del sistema cumple con las disposiciones de la Resolución CREG 174, el Reglamento
    Técnico de Instalaciones Eléctricas (RETIE), la NTC 2050 y el Acuerdo CNO 1862, asegurando
    una solución segura, confiable y conforme a la normativa vigente para autogeneración de energía
    en Colombia.
  </p>

  <!-- SECCIÓN 1: INFORMACIÓN DEL SISTEMA (tarjetas + cuadro naranja) -->
  <div class="sec-num">1.&nbsp;&nbsp;Información del Sistema Fotovoltaico</div>
  <br> <br/>
  <!-- Tarjetas -->
  <div class="cards">

    <div class="card co">
      <div class="ci">&#128262;</div>
      <div>
        <div class="ct">Paneles Solares*</div>
        <div class="cv vo">${numPanelesStr}</div>
        <div class="cs">Potencia: <b>${potPicoStr}</b> &bull; Área: ${areaStr}</div>
      </div>
    </div>

    <div class="card cb">
      <div class="ci">&#9889;</div>
      <div>
        <div class="ct">Consumo / Generación*</div>
        <div class="cv vb">${genMensual}</div>
        <div class="cs">Consumo diseño: <b>${consumoRed}</b></div>
        <div class="cs">${invLabel}</div>
      </div>
    </div>

    <div class="card cg">
      <div class="ci">&#128200;</div>
      <div>
        <div class="ct">Ahorro Mensual Proyectado**</div>
        <div class="cv vg">${ahorroMensual}</div>
        <div class="cs">Ahorro anual: <b>${ahorroAnual}</b> &bull; Cubre el <b>${ahorroPctStr}</b></div>
      </div>
    </div>

    <div class="card ct2">
      <div class="ci">&#127807;</div>
      <div>
        <div class="ct">Impacto Ambiental*</div>
        <div class="cv vt">${emisiones}</div>
        <div class="cs">Árboles equiv./año: <b>${arboles}</b> &bull; Gen. anual: ${genAnual}</div>
      </div>
    </div>

    <div class="card cy">
      <div class="ci">&#128176;</div>
      <div>
        <div class="ct">Inversión Total del Proyecto***</div>
        <div class="cv vy" style="font-size:14px;">${valorProyecto}</div>
      </div>
    </div>

    <div class="card cp">
      <div class="ci">&#127963;&#65039;</div>
      <div>
        <div class="ct">Incentivo Tributario Ley 1715***</div>
        <div class="cv vp" style="font-size:14px;">${incentivoStr}</div>
        <div class="cs">Sujeto a liquidación UPME</div>
      </div>
    </div>

    <div class="card cr">
      <div class="ci">&#128258;</div>
      <div>
        <div class="ct">Retorno de Inversión***</div>
        <div class="cv vr">${retornoStr}</div>
      </div>
    </div>

    <div class="card cl">
      <div class="ci">&#128202;</div>
      <div>
        <div class="ct">TIR*** &bull; Ahorro 25 años***</div>
        <div class="cv vl">${tirStr}</div>
        <div class="cs">${ahorro25Str} en vida útil del sistema</div>
      </div>
    </div>

  </div>

  <!-- Leyenda -->
  <div class="legend">${legend}</div>

  <div style="page-break-before: always;"></div>

  <!-- ── SECCIÓN 2: PLAN DE MANTENIMIENTO ── -->
  <div class="sec-num">2.&nbsp;&nbsp;Plan de mantenimiento incluido (1 año) – Inversión $0</div>
  <p class="parrafo">
    Para que su sistema genere el máximo ahorro durante sus 25 años de vida útil, Terrall incluye
    el primer año de Operación y Mantenimiento (O&amp;M) sin costo adicional:
  </p>

  <table class="wtbl">
    <thead>
      <tr>
        <th style="width:35%">Actividad</th>
        <th>Beneficio</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="bold">Limpieza de Paneles</td>
        <td>Eliminación de suciedad y hollín para restaurar la eficiencia de generación al 100%.</td>
      </tr>
      <tr>
        <td class="bold">Inspección Eléctrica</td>
        <td>Verificación de conexiones, termografía y prevención de puntos calientes.</td>
      </tr>
      <tr>
        <td class="bold">Diagnóstico de Inversores</td>
        <td>Inspección y actualización de software y monitoreo de parámetros de generación.</td>
      </tr>
      <tr>
        <td class="bold">Monitoreo Digital</td>
        <td>Reportes de generación mensual, ahorro y alertas tempranas mediante App móvil.</td>
      </tr>
    </tbody>
  </table>

  <ul class="bullets">
    <li><b>Técnicos Certificados:</b> Personal experto en alturas y normativa RETIE.</li>
    <li><b>Insumos Especializados:</b> Uso de agua desmineralizada para proteger el cristal antirreflectivo de los paneles.</li>
    <li><b>Informes de Gestión:</b> Entrega de un reporte técnico tras cada visita detallando el estado de salud del sistema.</li>
  </ul>
  <p class="parrafo">
    Una vez finalizado el primer año, podrá optar por nuestro <b>Contrato de Mantenimiento
    Preferencial</b>. Este servicio tiene un valor anual estimado de solo el <b>1.5% de los costos
    directos del proyecto</b> (ajustado anualmente al IPC). Este pequeño aporte asegura que el nuevo
    activo siga operando con los estándares de fábrica por las próximas dos décadas.
  </p>

  <!-- ── SECCIÓN 3: GARANTÍAS ── -->
  <div class="sec-num">3.&nbsp;&nbsp;Garantías</div>

  <table class="wtbl">
    <thead>
      <tr>
        <th style="width:40%">Componentes</th>
        <th>Garantía</th>
        <th>Tipo de garantía</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>Inversores</td>              <td style="text-align:center">5 años</td>       <td>Proveedor</td></tr>
      <tr><td>Paneles</td>                 <td style="text-align:center">10/25* años</td>  <td>Proveedor</td></tr>
      <tr><td>Sistema de monitoreo</td>    <td style="text-align:center">1 año</td>        <td>Proveedor</td></tr>
      <tr><td>Instalaciones eléctricas solares</td><td style="text-align:center">5 años</td><td>Directa</td></tr>
      <tr><td>Tableros eléctricos</td>     <td style="text-align:center">1 año</td>        <td>Fabricante</td></tr>
      <tr><td>Estructura paneles</td>      <td style="text-align:center">10 años</td>      <td>Fabricante</td></tr>
    </tbody>
  </table>

  <p class="nota">*Los módulos tienen garantía de 10 años por defectos de manufactura y por producción de energía de 25 años al 80% de la potencia nominal.</p>
  <div class="nota-box">
    NOTA: POR RAZONES DE SEGURIDAD CUANDO SE PRODUCE UN CORTE DE ENERGÍA EN LA RED,
    EL SISTEMA ON-GRID TAMBIÉN SE DESCONECTA AUTOMÁTICAMENTE
  </div>

  <!-- ── SECCIÓN 4: FORMA DE PAGO ── -->
  <div class="sec-num">4.&nbsp;&nbsp;Forma de Pago</div>
  <p class="parrafo">
    <b>Recursos propios:</b> Anticipo del 60% a la firma del contrato para colocar paneles e inversores
    en sitio, 30% al finalizar la instalación de paneles e inversores, 5% al finalizar la instalación y
    montaje de sistema eléctrico, y el 5% restante una vez se finalice la legalización ante el operador
    de red.
  </p>
  <p class="parrafo">
    <b>Financiación:</b> Leasing Bancolombia o Bancolombia por medio de la línea especial de sostenibilidad;
    para proyectos del sector agropecuario, líneas de fomento Finagro o agro sostenibles (Asesoría de
    crédito incluida).
  </p>

  <!-- ── SECCIÓN 5: ACUERDOS COMERCIALES ── -->
  <div class="sec-num">5.&nbsp;&nbsp;Acuerdos comerciales</div>
  <ul class="bullets">
    <li>Oferta <u><b>no vinculante</b></u> válida por: 15 días.</li>
    <li>Sistema de generación solar fotovoltaico de conexión a red, total de <b>${potPicoStr}</b>.</li>
    <li>Incluye Ingeniería de detalle, memorias de cálculo y planos.</li>
    <li>Todos los materiales y equipos a utilizar cuentan con certificado de conformidad de producto.</li>
    <li>Se incluyen todos los trámites ante el operador de red.</li>
    <li>Se incluye certificado RETIE del sistema solar.</li>
    <li>Se incluye acompañamiento en los trámites para incentivos tributarios, esta labor será calificada en forma de medio y no de resultado.</li>
    <li>Incluye medidor bidireccional.</li>
    <li>No se incluye corrección de penalización por reactivas.</li>
    <li>Se debe verificar la factibilidad de las rutas de cableado del sistema solar, hasta el lugar del tablero eléctrico principal.</li>
    <li>Paneles solares e inversores exentos de IVA de acuerdo a ley 1715.</li>
    <li>Instalación de tuberías expuestas, no incluye obras civiles de empotrado.</li>
    <li>Se dimensiona con base en la superficie y carga estimada por requerimiento del cliente.</li>
    <li>No incluye cálculo estructural de la capacidad portante de la cubierta; el cliente debe garantizar que dicha cubierta soporte al menos 16 Kg/m².</li>
    <li>En caso de requerirse podas de árboles u otra vegetación que interfiera con la correcta instalación y/u operación, dichas actividades serán responsabilidad del cliente.</li>
    <li>No incluye sistema de apantallamiento, ni sistema de puesta a tierra de las edificaciones existentes.</li>
    <li>No incluye líneas de vida o puntos de anclaje para trabajo seguro en alturas.</li>
    <li>Se requiere validación con el operador de red sobre la disponibilidad del transformador principal, de acuerdo a lo establecido en la CREG-174 para conexión de sistemas de generación solar menores o iguales a 100 kWp. Para clientes monousuarios y transformador propiedad del cliente, se debe cambiar la medida a nivel 2. Este cambio no está incluido en la presente cotización.</li>
    <li>En caso de requerir financiación se debe actualizar la oferta con póliza y requerimientos adicionales exigidos por la entidad bancaria.</li>
    <li>No se incluyen costos de adecuaciones que pueda solicitar el Operador de Red en acometidas ni en fronteras existentes.</li>
    <li>Se requiere contar con Internet WIFI y punto de red en la zona que estarán instalados los inversores, para efectos de monitoreo y control a distancia.</li>
    <li>Solo se incluye lo descrito en esta propuesta; cualquier ajuste y cambio tiene un costo adicional el cual deberá ser acordado por ambas partes.</li>
  </ul>

  <!-- ── SECCIÓN 6: RESPALDO TÉCNICO ── -->
  <div class="sec-num">6.&nbsp;&nbsp;Respaldo técnico: Ingeniería de élite a su servicio</div>
  <p class="parrafo">
    Su proyecto será ejecutado por expertos que suman más de 330 proyectos solares de experiencia acumulada.
  </p>

  <table class="wtbl">
    <thead>
      <tr>
        <th style="width:22%">Rol</th>
        <th style="width:38%">Perfil y Experiencia Clave</th>
        <th>Impacto en el Proyecto</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="bold">Dirección Nacional</td>
        <td>Ing. Electricista Senior. <b>+150 proyectos</b> ejecutados.</td>
        <td>Garantiza la optimización máxima del diseño y rendimiento.</td>
      </tr>
      <tr>
        <td class="bold">Coordinación Regional</td>
        <td>Ing. Electricista de Zona. <b>+50 proyectos</b> locales.</td>
        <td>Asegura el cumplimiento de cronogramas.</td>
      </tr>
      <tr>
        <td class="bold">Residencia de Obra</td>
        <td>Ing. Especialista en sitio. <b>+30 proyectos</b> solares.</td>
        <td>Supervisión técnica constante y control de calidad minuto a minuto.</td>
      </tr>
      <tr>
        <td class="bold">Cuerpo Técnico</td>
        <td>Técnicos CONALTEL. <b>+100 proyectos</b> de experiencia.</td>
        <td>Instalación ágil, precisa y bajo normas RETIE / NTC 2050.</td>
      </tr>
    </tbody>
  </table>

  <!-- CIERRE -->
  <div class="cierre">
    <p class="parrafo">Esperamos que nuestra oferta cumpla con sus expectativas, quedamos a disposición sobre cualquier inquietud, aclaración o comentario.</p>
    <p style="margin-bottom:10px;">Cordialmente,</p>
    ${firmaBase64 ? `<img src="${firmaBase64}" alt="Firma" style="height:70px;object-fit:contain;display:block;"/>` : `<p class="firma">Equipo Terrall</p>`}
  </div>

</div><!-- /content -->
  </td></tr></tbody>
</table>
</body>
</html>`;
}