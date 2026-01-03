// utils/formatDateLocal.js
export function formatDateLocal(isoString) {
  if (!isoString) return "-";

  const date = new Date(isoString);
  return date.toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}
