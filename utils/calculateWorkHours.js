// utils/calculateWorkHours.js
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

  const start = new Date(startISO);
  const end = new Date(endISO);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    return emptyResult();
  }

  // Solo horas COMPLETAS
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

    // Jornada "normal" según tu regla histórica:
    // Lun–Vie 08:00–17:00 (y además NO dominical/festivo)
    const isWeekday = day >= 1 && day <= 5;
    const isNormalSchedule = !isDominicalFestivo && isWeekday && hour >= 8 && hour < 17;

    if (isDominicalFestivo) {
      // En dominical/festivo, TODA hora es "dominical".
      // Si luego quieres separar "dominical normal" vs "dominical extra",
      // aquí lo partimos con la misma lógica de jornada normal.
      if (isNormalSchedule) {
        // Practicamente no ocurrirá porque isNormalSchedule incluye !isDominicalFestivo
        // pero lo dejamos por consistencia.
        if (isNocturnal) res.dominicalNocturnalHours += 1;
        else res.dominicalHours += 1;
      } else {
        // La mayoría caerá aquí
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
