// utils/csvUtils.js
export function generateTimestamp() {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, "-");
}

export function csvEscape(value) {
  const s = value == null ? "" : String(value);
  const escaped = s.replace(/"/g, '""');
  if (/[;"\r\n]/.test(escaped)) return `"${escaped}"`;
  return escaped;
}

export function rowsToCsv(rows, separator = ";") {
  // Excel (es-CO) suele interpretar ; mejor. Este truco fuerza separador.
  const header = `sep=${separator}\n`;
  const body = rows.map((r) => r.map((c) => csvEscape(c)).join(separator)).join("\n");
  return header + body + "\n";
}
