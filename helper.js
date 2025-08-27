
// Feriados (YYYY-MM-DD)

export const HOLIDAYS_CO = [
  "2025-01-01",
  "2025-01-06",
  "2025-03-24",
  "2025-04-17",
  "2025-04-18",
  "2025-05-01",
  "2025-06-02",
  "2025-06-23",
  "2025-06-30",
  "2025-07-20",
  "2025-08-07",
  "2025-08-18",
  "2025-10-13",
  "2025-11-03",
  "2025-11-17",
  "2025-12-08",
  "2025-12-25",
];


// Helpers de fecha (LOCAL, sin UTC)

export const toYMD = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

// Recibe "YYYY-MM-DD" y crea Date en hora local (00:00 local)
export const fromYMD = (ymd) => {
  if (ymd instanceof Date) return new Date(ymd.getFullYear(), ymd.getMonth(), ymd.getDate(), 0, 0, 0, 0);
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
};

export const addDaysLocal = (date, days) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
};

// Utilidades de días hábiles (LOCAL)

export const isBusinessDay = (date, holidays) => {
  const day = date.getDay(); // 0=Dom, 6=Sáb
  if (day === 0 || day === 6) return false;
  const isoLocal = toYMD(date);
  return !holidays.includes(isoLocal);
};

// Suma "businessDays" hábiles EXCLUYENDO el día inicial.
// Ej: si businessDays=0 -> retorna el mismo día.
// si quieres incluir el día de inicio, usa addBusinessDaysInclusive.

export const addBusinessDaysCountFromStart = (startDate, businessDays, holidays) => {
  const date = fromYMD(startDate);
  let added = 0;
  while (added < businessDays) {
    const next = addDaysLocal(date, 1);
    // mover puntero
    date.setTime(next.getTime());
    if (isBusinessDay(date, holidays)) added++;
  }
  return date;
};

// Suma "dur" días hábiles INCLUYENDO el día inicial.
// Ej: dur=1 => misma fecha si es hábil (o la siguiente hábil si no lo es).

export const addBusinessDaysInclusive = (startDate, dur, holidays) => {
  let start = fromYMD(startDate);

  // si el inicio no es hábil, muévete al siguiente hábil
  if (!isBusinessDay(start, holidays)) {
    do {
      start = addDaysLocal(start, 1);
    } while (!isBusinessDay(start, holidays));
  }

  if (dur <= 1) return start;
  // dur incluye el inicio, así que avanzamos dur-1 hábiles
  return addBusinessDaysCountFromStart(start, dur - 1, holidays);
};

// Devuelve el siguiente día hábil DESPUÉS de "date"
export const nextBusinessDay = (date, holidays) => {
  let d = addDaysLocal(date, 1);
  while (!isBusinessDay(d, holidays)) {
    d = addDaysLocal(d, 1);
  }
  return d;
};

// Cuenta días hábiles entre dos fechas (INCLUSIVO)
export const businessDaysBetweenInclusive = (startYMD, endYMD, holidays) => {
  let start = fromYMD(startYMD);
  const end = fromYMD(endYMD);
  let count = 0;
  while (start.getTime() <= end.getTime()) {
    if (isBusinessDay(start, holidays)) count++;
    start = addDaysLocal(start, 1);
  }
  return count;
};


// Definición de tareas (días HÁBILES)

export const DEFINICION_TAREAS = [
  // Fase 1 - Contrato
  { id: "firma_contrato", titulo: "Firma contrato", fase: "Fase 1 - Contrato", dias: 3, dependsOn: [] },
  { id: "visita_inicial", titulo: "Visita inicial", fase: "Fase 1 - Contrato", dias: 4, dependsOn: [] },
  { id: "abono_cliente", titulo: "Abono cliente", fase: "Fase 1 - Contrato", dias: 6, dependsOn: [] },

  // Fase 2 - Ingeniería de detalle
  { id: "visita_detallada", titulo: "Visita detallada", fase: "Fase 2 - Ingeniería de detalle", dias: 1, dependsOn: [{ id: "abono_cliente", relation: "startAtEndOf" }] },
  { id: "simulacion_pvsol", titulo: "Simulación PVsol", fase: "Fase 2 - Ingeniería de detalle", dias: 5, dependsOn: [{ id: "abono_cliente", relation: "startAtEndOf" }] },
  { id: "memorias_calculo", titulo: "Memorias de cálculo", fase: "Fase 2 - Ingeniería de detalle", dias: 3, dependsOn: [{ id: "simulacion_pvsol", relation: "startAtEndOf" }] },
  { id: "planos", titulo: "Planos", fase: "Fase 2 - Ingeniería de detalle", dias: 3, dependsOn: [{ id: "memorias_calculo", relation: "startAtEndOf" }] },
  { id: "listado_materiales", titulo: "Listado de materiales", fase: "Fase 2 - Ingeniería de detalle", dias: 2, dependsOn: [{ id: "planos", relation: "startAtEndOf" }] },
  { id: "solicitud_operador_red_inicial", titulo: "Solicitud operador de red inicial", fase: "Fase 2 - Ingeniería de detalle", dias: 26, dependsOn: [{ id: "listado_materiales", relation: "startAtEndOf" }] },

  // Fase 3 - Compras
  { id: "estructura", titulo: "Estructura", fase: "Fase 3 - Compras", dias: 10, dependsOn: [{ id: "listado_materiales", relation: "startAtEndOf" }] },
  { id: "inversores", titulo: "Inversores", fase: "Fase 3 - Compras", dias: 12, dependsOn: [{ id: "listado_materiales", relation: "startAtEndOf" }] },
  { id: "equipos_medida", titulo: "Equipos de medida", fase: "Fase 3 - Compras", dias: 12, dependsOn: [{ id: "listado_materiales", relation: "startAtEndOf" }] },
  { id: "paneles", titulo: "Paneles", fase: "Fase 3 - Compras", dias: 20, dependsOn: [{ id: "listado_materiales", relation: "startAtEndOf" }] },
  { id: "tableros", titulo: "Tableros", fase: "Fase 3 - Compras", dias: 30, dependsOn: [{ id: "listado_materiales", relation: "startAtEndOf" }] },
  { id: "materiales", titulo: "Materiales", fase: "Fase 3 - Compras", dias: 5, dependsOn: [{ id: "listado_materiales", relation: "startAtEndOf" }] },

  // Fase 4 - Instalación
  { id: "acta_inicio", titulo: "Acta de inicio", fase: "Fase 4 - Instalación", dias: 1, dependsOn: [{ id: "estructura", relation: "startDayAfterEndOf" }] },
  { id: "montaje_estructura", titulo: "Montaje de estructura", fase: "Fase 4 - Instalación", dias: 13, dependsOn: [{ id: "acta_inicio", relation: "startWith" }] },
  { id: "montaje_paneles", titulo: "Montaje Paneles", fase: "Fase 4 - Instalación", dias: 11, dependsOn: [{ id: "montaje_estructura", relation: "startAtEndOf" }] },
  { id: "montaje_tablero", titulo: "Montaje tablero", fase: "Fase 4 - Instalación", dias: 2, dependsOn: [{ id: "montaje_paneles", relation: "startAtEndOf" }] },
  { id: "cambio_carga", titulo: "Cambio de carga", fase: "Fase 4 - Instalación", dias: 1, dependsOn: [{ id: "montaje_tablero", relation: "startAtEndOf" }] },
  { id: "equipo_medida", titulo: "Equipo de medida", fase: "Fase 4 - Instalación", dias: 2, dependsOn: [{ id: "cambio_carga", relation: "startWith" }] },
  { id: "acometida", titulo: "Acometida", fase: "Fase 4 - Instalación", dias: 2, dependsOn: [{ id: "equipo_medida", relation: "startAtEndOf" }] },
  { id: "acta_entrega", titulo: "Acta de entrega", fase: "Fase 4 - Instalación", dias: 1, dependsOn: [{ id: "acometida", relation: "startAtEndOf" }] },

  // Fase 5 - Retie
  { id: "cotizacion", titulo: "Cotización", fase: "Fase 5 - Retie", dias: 3, dependsOn: [{ id: "acta_entrega", relation: "startWith" }] },
  { id: "pago_cotizacion", titulo: "Pago cotización", fase: "Fase 5 - Retie", dias: 1, dependsOn: [{ id: "acta_entrega", relation: "startWith" }] },
  { id: "agendamiento", titulo: "Agendamiento", fase: "Fase 5 - Retie", dias: 3, dependsOn: [{ id: "acta_entrega", relation: "startWith" }] },
  { id: "visita", titulo: "Visita", fase: "Fase 5 - Retie", dias: 1, dependsOn: [{ id: "agendamiento", relation: "startAtEndOf" }] },
  { id: "dictamen_inicial", titulo: "Dictamen inicial", fase: "Fase 5 - Retie", dias: 3, dependsOn: [{ id: "visita", relation: "startWith" }] },
  { id: "subsanacion", titulo: "Subsanación", fase: "Fase 5 - Retie", dias: 5, dependsOn: [{ id: "dictamen_inicial", relation: "startAtEndOf" }] },
  { id: "dictamen_final", titulo: "Dictamen final", fase: "Fase 5 - Retie", dias: 7, dependsOn: [{ id: "subsanacion", relation: "startAtEndOf" }] },

  // Fase 6 - Legalización del proyecto
  { id: "documentacion_final", titulo: "Documentación final", fase: "Fase 6 - Legalización del proyecto", dias: 3, dependsOn: [{ id: "dictamen_final", relation: "startAtEndOf" }] },
  { id: "respuesta_operador_red", titulo: "Respuesta operador de red", fase: "Fase 6 - Legalización del proyecto", dias: 15, dependsOn: [{ id: "documentacion_final", relation: "startAtEndOf" }] },
  { id: "subsanar_documentacion", titulo: "Subsanar documentación", fase: "Fase 6 - Legalización del proyecto", dias: 4, dependsOn: [{ id: "respuesta_operador_red", relation: "startAtEndOf" }] },
  { id: "visita_conexion", titulo: "Visita de conexión", fase: "Fase 6 - Legalización del proyecto", dias: 4, dependsOn: [{ id: "subsanar_documentacion", relation: "startAtEndOf" }] },
  { id: "subsanar_visita", titulo: "Subsanar visita", fase: "Fase 6 - Legalización del proyecto", dias: 6, dependsOn: [{ id: "visita_conexion", relation: "startAtEndOf" }] },
  { id: "legalizacion", titulo: "Legalización", fase: "Fase 6 - Legalización del proyecto", dias: 3, dependsOn: [{ id: "subsanar_visita", relation: "startAtEndOf" }] },
  { id: "acta_legalizacion", titulo: "Acta legalización", fase: "Fase 6 - Legalización del proyecto", dias: 1, dependsOn: [{ id: "legalizacion", relation: "startAtEndOf" }] },
];


// buildSchedule con orden topológico y fechas LOCAL

export const buildSchedule = (startDate, extraDurations = {}, holidays = HOLIDAYS_CO) => {
  const tareasMap = new Map();
  DEFINICION_TAREAS.forEach(t => {
    tareasMap.set(t.id, { ...t });
  });

  // ---- Orden topológico (DFS simple) ----
  const orden = [];
  const temp = new Set();   // detección de ciclos (opcional)
  const perm = new Set();

  const visitar = (id) => {
    if (perm.has(id)) return;
    if (temp.has(id)) throw new Error(`Ciclo de dependencias detectado en ${id}`);
    temp.add(id);
    const t = tareasMap.get(id);
    (t?.dependsOn || []).forEach(dep => visitar(dep.id));
    temp.delete(id);
    perm.add(id);
    orden.push(id);
  };

  DEFINICION_TAREAS.forEach(t => visitar(t.id));

  // ---- Cálculo de fechas ----
  const resultado = new Map();
  const inicioProyecto = (typeof startDate === "string") ? fromYMD(startDate) : fromYMD(toYMD(startDate));

  orden.forEach(id => {
    const tarea = tareasMap.get(id);

    // fechaInicio candidata: inicio de proyecto
    let fechaInicio = new Date(inicioProyecto.getFullYear(), inicioProyecto.getMonth(), inicioProyecto.getDate(), 0, 0, 0, 0);

    // ajustar por dependencias
(tarea.dependsOn || []).forEach(dep => {
  const depTarea = resultado.get(dep.id);
  if (!depTarea) throw new Error(`Dependencia ${dep.id} de ${id} no encontrada`);

  if (dep.relation === "startWith") {
    // mismo inicio que la dependencia
    const depStart = fromYMD(depTarea.fechaInicio);
    if (depStart.getTime() > fechaInicio.getTime()) fechaInicio = depStart;
  } 
  else if (dep.relation === "startAtEndOf") {
    // mismo día que termina la dependencia
    const depFin = fromYMD(depTarea.fechaFin);
    if (depFin.getTime() > fechaInicio.getTime()) fechaInicio = depFin;
  } 
  else if (dep.relation === "startDayAfterEndOf") {
    // siguiente día hábil después de terminar
    const depFin = fromYMD(depTarea.fechaFin);
    const next = nextBusinessDay(depFin, holidays);
    if (next.getTime() > fechaInicio.getTime()) fechaInicio = next;
  }
});

    // duración (incluye día de inicio)
    const dur = (tarea.dias || 0) + (extraDurations[id] || 0);
    const fechaFin = addBusinessDaysInclusive(fechaInicio, Math.max(dur, 0), holidays);

    resultado.set(id, {
      fechaInicio: toYMD(fechaInicio),
      fechaFin: toYMD(fechaFin),
    });
  });

  return resultado;
};
