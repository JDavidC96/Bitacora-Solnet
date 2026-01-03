// utils/calculateWorkHours.js

/**
 * Calcula horas normales y horas extra entre dos fechas.
 * - Horas normales: lun a vie, 8:00 a 17:00
 * - Horas extra: resto
 *
 * Retorna:
 * { normalHours, extraHours }
 */
export function calculateWorkHours(startISO, endISO) {
  if (!startISO || !endISO) {
    return { normalHours: 0, extraHours: 0 };
  }

  const start = new Date(startISO);
  const end = new Date(endISO);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    return { normalHours: 0, extraHours: 0 };
  }

  let normalHours = 0;
  let extraHours = 0;

  const current = new Date(start);

  while (current < end) {
    const day = current.getDay(); // 0=dom,6=sab
    const hour = current.getHours();

    const isWeekend = (day === 0 || day === 6);
    const isWorkHour = hour >= 8 && hour < 17;

    if (!isWeekend && isWorkHour) {
      normalHours += 1;
    } else {
      extraHours += 1;
    }

    current.setHours(current.getHours() + 1);
  }

  return { normalHours, extraHours };
}
