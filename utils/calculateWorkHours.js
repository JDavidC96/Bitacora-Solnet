/// utils/calculateWorkHours.js
import { HOLIDAYS_CO, toYMD } from "../helper";

/**
 * Calcula horas laborales en bloques de 1 hora COMPLETA.
 *
 * Reglas base del sistema:
 * - Solo se cuentan HORAS COMPLETAS (minutos se descartan).
 * - Jornada normal: Lunes a Viernes, 08:00–17:00 (diurna).
 * - Nocturno: 19:00–06:00 (aplica todos los días).
 * - Dominical/Festivo: Domingo o fecha listada en HOLIDAYS_CO.
 *
 * Ajustes agregados:
 * - Tolerancia entrada (día hábil NO festivo): 07:30:00–08:15:59 => 08:00:00
 * - Tolerancia salida (día hábil NO festivo): 16:45:00–16:59:59 => 17:00:00
 * - Almuerzo (regla B, día hábil NO festivo): si la jornada cruza 12:00–14:00, resta 1h
 *
 * Retorna:
 * {
 *   normalHours,
 *   extraHours,
 *   nocturnalHours,
 *   nocturnalExtraHours,
 *   dominicalHours,
 *   dominicalNocturnalHours,
 *   dominicalExtraHours,
 *   dominicalExtraNocturnalHours,
 * }
 */
export function calculateWorkHours(startISO, endISO) {
  if (!startISO || !endISO) return emptyResult();

  let start = new Date(startISO);
  let end = new Date(endISO);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    return emptyResult();
  }

  // ==============================
  // 1) NORMALIZACIÓN CON TOLERANCIAS
  // ==============================

  // Aplica tolerancia de ENTRADA si el inicio cae en día hábil NO festivo
  if (isWeekdayNonHoliday(start)) {
    start = applyStartTolerance(start);
  }

  // Aplica tolerancia de SALIDA si el fin cae en día hábil NO festivo
  if (isWeekdayNonHoliday(end)) {
    end = applyEndTolerance(end);
  }

  if (end <= start) return emptyResult();

  // ==============================
  // 2) CÁLCULO POR HORAS COMPLETAS
  // ==============================

  const diffMs = end.getTime() - start.getTime();
  const totalFullHours = Math.floor(diffMs / (60 * 60 * 1000));
  if (totalFullHours <= 0) return emptyResult();

  const res = emptyResult();
  const current = new Date(start);

  for (let i = 0; i < totalFullHours; i++) {
    const day = current.getDay(); // 0=Dom, 6=Sáb
    const hour = current.getHours();

    const ymdLocal = toYMD(current); // ✅ LOCAL
    const isSunday = day === 0;
    const isHoliday = HOLIDAYS_CO.includes(ymdLocal);
    const isDominicalFestivo = isSunday || isHoliday;

    const isNocturnal = hour >= 19 || hour < 6;

    // Jornada "normal":
    // Lun–Vie 08:00–17:00 (y además NO dominical/festivo)
    const isWeekday = day >= 1 && day <= 5;
    const isNormalSchedule =
      !isDominicalFestivo && isWeekday && hour >= 8 && hour < 17;

    if (isDominicalFestivo) {
      // En dominical/festivo, TODA hora es "dominical".
      if (isNormalSchedule) {
        // No debería pasar por la condición !isDominicalFestivo, pero se deja por consistencia.
        if (isNocturnal) res.dominicalNocturnalHours += 1;
        else res.dominicalHours += 1;
      } else {
        if (isNocturnal) res.dominicalExtraNocturnalHours += 1;
        else res.dominicalExtraHours += 1;
      }
    } else if (isNormalSchedule) {
      if (isNocturnal) res.nocturnalHours += 1;
      else res.normalHours += 1;
    } else {
      if (isNocturnal) res.nocturnalExtraHours += 1;
      else res.extraHours += 1;
    }

    current.setHours(current.getHours() + 1);
  }

  // ==============================
  // 3) ALMUERZO (Regla B)
  // ==============================
  // Se resta 1 hora SOLO si:
  // - el día del inicio es hábil NO festivo (criterio operativo típico),
  // - y la jornada cruza la ventana 12:00–14:00,
  // - y hay al menos 1 hora normal para descontar.
  // (La resta se hace sobre normalHours y por ende afecta el total posterior.)
  if (isWeekdayNonHoliday(start) && crossesLunchWindow(start, end)) {
    if (res.normalHours > 0) res.normalHours = Math.max(0, res.normalHours - 1);
  }

  return res;
}

function emptyResult() {
  return {
    normalHours: 0,
    extraHours: 0,
    nocturnalHours: 0,
    nocturnalExtraHours: 0,
    dominicalHours: 0,
    dominicalNocturnalHours: 0,
    dominicalExtraHours: 0,
    dominicalExtraNocturnalHours: 0,
  };
}

/**
 * Día hábil = Lun–Vie y NO festivo (según HOLIDAYS_CO y fecha local toYMD).
 */
function isWeekdayNonHoliday(dateObj) {
  const day = dateObj.getDay(); // 0=Dom, 6=Sáb
  if (day < 1 || day > 5) return false;

  const ymdLocal = toYMD(dateObj);
  const isHoliday = HOLIDAYS_CO.includes(ymdLocal);
  return !isHoliday;
}

/**
 * Tolerancia entrada: 07:30:00–08:15:59 => 08:00:00
 */
function applyStartTolerance(d) {
  const h = d.getHours();
  const m = d.getMinutes();
  const s = d.getSeconds();

  // Entre 07:30:00 y 07:59:59
  const inEarlyWindow = h === 7 && m >= 30;
  // Entre 08:00:00 y 08:15:59
  const inLateWindow = h === 8 && m <= 15;

  if (inEarlyWindow || inLateWindow) {
    const nd = new Date(d);
    nd.setHours(8, 0, 0, 0);
    return nd;
  }

  // Si es exactamente 08:15:59 o cualquier caso ya cubierto por h===8 && m<=15,
  // no hace falta condicional extra.
  return d;
}

/**
 * Tolerancia salida: 16:45:00–16:59:59 => 17:00:00
 */
function applyEndTolerance(d) {
  const h = d.getHours();
  const m = d.getMinutes();

  if (h === 16 && m >= 45) {
    const nd = new Date(d);
    nd.setHours(17, 0, 0, 0);
    return nd;
  }

  return d;
}

/**
 * Ventana de almuerzo: 12:00–14:00
 * Retorna true si [start, end) se cruza con esa ventana (mismo día).
 */
function crossesLunchWindow(start, end) {
  const ls = new Date(start);
  ls.setHours(12, 0, 0, 0);

  const le = new Date(start);
  le.setHours(14, 0, 0, 0);

  return end > ls && start < le;
}
