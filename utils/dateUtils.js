// utils/dateUtils.js
import { HOLIDAYS_CO, businessDaysBetweenInclusive, fromYMD, toYMD } from "../helper";

/**
 * Contar días hábiles entre dos fechas (INCLUYENDO inicio y fin).
 */
export function contarDiasHabiles(fechaInicio, fechaFin, holidays = HOLIDAYS_CO) {
  if (!fechaInicio || !fechaFin) return 0;
  return businessDaysBetweenInclusive(fechaInicio, fechaFin, holidays);
}

/**
 * Días hábiles de retraso respecto a la fecha de fin.
 */
export function diasRetrasoHabiles(fechaFin, holidays = HOLIDAYS_CO) {
  if (!fechaFin) return 0;
  const hoy = toYMD(new Date());
  if (fromYMD(hoy) <= fromYMD(fechaFin)) return 0;
  return businessDaysBetweenInclusive(fechaFin, hoy, holidays);
}

/**
 * Diferencia en días hábiles entre inicio y fin (actividad planificada).
 * Ejemplo: inicio=01-03, fin=05-03 → devuelve 5 si todos son hábiles.
 */
export function diffDiasHabiles(inicio, fin, holidays = HOLIDAYS_CO) {
  if (!inicio || !fin) return 0;
  return businessDaysBetweenInclusive(inicio, fin, holidays);
}

/**
 * Formatear fecha en string legible (ej: 12/03/2025).
 */
export function formatDate(fecha) {
  if (!fecha) return "";
  const d = new Date(fecha);
  return d.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
