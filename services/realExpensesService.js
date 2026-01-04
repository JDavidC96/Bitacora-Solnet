// services/realExpensesService.js
import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";

import { db } from "../firebase/firebaseConfig";

/* ============================================================
 * UTILIDADES DE CLASIFICACIÓN
 * ============================================================ */

/**
 * Clasifica por prefijos (fase 1 y fase 2)
 * fase1: paneles, inversores, estructura
 * fase2: cableado, eléctricos, tubería, accesorios
 */
function classifyByPrefix(codigo = "") {
  const c = (codigo || "").toUpperCase();

  // fase1
  if (
    c.startsWith("PAN") ||
    c.startsWith("MOD") ||
    c.startsWith("INV") ||
    c.startsWith("EST")
  ) {
    return "fase1";
  }

  // fase2
  if (
    c.startsWith("CBL") ||
    c.startsWith("ELE") ||
    c.startsWith("TUB") ||
    c.startsWith("ACS")
  ) {
    return "fase2";
  }

  // Por defecto, fase3 (no se usa en compras cuando normalizamos)
  return "fase3";
}

/**
 * Clasificación por nombre (para externos sin código)
 */
function classifyExternal(nombre = "") {
  const n = (nombre || "").toLowerCase();

  // fase1
  if (
    n.includes("panel") ||
    n.includes("módulo") ||
    n.includes("modulo") ||
    n.includes("inversor") ||
    n.includes("estructura") ||
    n.includes("riel") ||
    n.includes("perfil")
  ) {
    return "fase1";
  }

  // fase2
  if (
    n.includes("cable") ||
    n.includes("tuber") ||
    n.includes("conduit") ||
    n.includes("breaker") ||
    n.includes("termomagn") ||
    n.includes("tablero") ||
    n.includes("bornera") ||
    n.includes("conector") ||
    n.includes("mc4") ||
    n.includes("accesorio")
  ) {
    return "fase2";
  }

  // Por defecto, fase3
  return "fase3";
}

/* ============================================================
 * SERVICIO
 * ============================================================ */

export const realExpensesService = {
  /* ============================================================
   * Registrar gastos de personal (si aplica)
   * ============================================================ */
  async crearRegistroHoras({ projectId, data }) {
    const ref = collection(db, "proyectos", projectId, "gastosPersonal");

    await addDoc(ref, {
      personalId: data.personalId || null,
      nombre: data.nombre || "",
      rol: data.rol || null,
      horasNormales: Number(data.horasNormales || 0),
      horasExtras: Number(data.horasExtras || 0),
      totalHoras: Number(data.totalHoras || 0),
      fechaInicio: data.fechaInicio || null,
      fechaFin: data.fechaFin || null,
      destino: data.destino || "",
      source: data.source || "manual",
      tipoAsignacion: data.tipoAsignacion || "",
      createdAt: new Date().toISOString(),
    });
  },

  /* ============================================================
   * Mano de obra real con múltiples tipos de horas
   * ============================================================ */
  async getManoObraReal(projectId) {
    const FACTORS = {
      normal: 1.0,
      extra: 1.25,
      nocturnal: 1.35,
      extraNocturnal: 1.75,
      dominical: 1.75,
      dominicalNocturnal: 2.10,
      dominicalExtra: 2.00,
      dominicalExtraNocturnal: 2.50,
    };

    const horasSnap = await getDocs(
      query(collection(db, "horas_personal"), where("proyectoId", "==", projectId))
    );

    const registros = horasSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Agrupar por personalId
    const personasMap = new Map();

    registros.forEach((r) => {
      if (!r.personalId) return;

      if (!personasMap.has(r.personalId)) {
        personasMap.set(r.personalId, {
          personalId: r.personalId,
          nombre: r.nombre || "",
          rol: r.rol || null,

          horasNormales: 0,
          horasExtras: 0,
          horasNocturnas: 0,
          horasExtrasNocturnas: 0,

          horasDominicales: 0,
          horasDominicalesNocturnas: 0,
          horasExtrasDominicales: 0,
          horasExtrasDominicalesNocturnas: 0,

          totalHoras: 0,
        });
      }

      const item = personasMap.get(r.personalId);

      const hn = Number(r.horasNormales || 0);
      const he = Number(r.horasExtras || 0);
      const hnn = Number(r.horasNocturnas || 0);
      const hen = Number(r.horasExtrasNocturnas || 0);

      const hd = Number(r.horasDominicales || 0);
      const hdn = Number(r.horasDominicalesNocturnas || 0);
      const hde = Number(r.horasExtrasDominicales || 0);
      const hden = Number(r.horasExtrasDominicalesNocturnas || 0);

      const th = Number(
        r.totalHoras ||
          (hn + he + hnn + hen + hd + hdn + hde + hden) ||
          0
      );

      item.horasNormales += hn;
      item.horasExtras += he;
      item.horasNocturnas += hnn;
      item.horasExtrasNocturnas += hen;

      item.horasDominicales += hd;
      item.horasDominicalesNocturnas += hdn;
      item.horasExtrasDominicales += hde;
      item.horasExtrasDominicalesNocturnas += hden;

      item.totalHoras += th;

      if (r.rol && !item.rol) item.rol = r.rol;
      if (r.nombre && !item.nombre) item.nombre = r.nombre;
    });

    const personas = Array.from(personasMap.values());

    // Cargar personal una sola vez y sacar tarifaHora por usuario
    const personalSnap = await getDocs(collection(db, "personal"));
    const rolMap = new Map();
    const nombreMap = new Map();
    const tarifaMap = new Map();

    personalSnap.forEach((d) => {
      const data = d.data() || {};
      rolMap.set(d.id, data.rol || "Operario");
      nombreMap.set(d.id, data.nombre || data.fullName || "");
      tarifaMap.set(d.id, Number(data.tarifaHora || 0));
    });

    // Completar rol/nombre faltante
    personas.forEach((p) => {
      if (!p.rol) p.rol = rolMap.get(p.personalId) || "Operario";
      if (!p.nombre) p.nombre = nombreMap.get(p.personalId) || p.nombre || "";
    });

    // Totales agregados
    let totalManoObra = 0;
    let totalHorasManoObra = 0;
    let totalHorasNormales = 0;
    let totalHorasExtras = 0;

    // Detalle (NO mostrar en UI, solo interno)
    const detalle = personas.map((p) => {
      const tarifaHora = tarifaMap.get(p.personalId) ?? 0;

      const hn = Number(p.horasNormales || 0);
      const he = Number(p.horasExtras || 0);
      const hnn = Number(p.horasNocturnas || 0);
      const hen = Number(p.horasExtrasNocturnas || 0);

      const hd = Number(p.horasDominicales || 0);
      const hdn = Number(p.horasDominicalesNocturnas || 0);
      const hde = Number(p.horasExtrasDominicales || 0);
      const hden = Number(p.horasExtrasDominicalesNocturnas || 0);

      const th = Number(p.totalHoras || (hn + he + hnn + hen + hd + hdn + hde + hden) || 0);

      const costoNormal = hn * tarifaHora * FACTORS.normal;
      const costoExtra = he * tarifaHora * FACTORS.extra;

      const costoNocturno = hnn * tarifaHora * FACTORS.nocturnal;
      const costoExtraNocturno = hen * tarifaHora * FACTORS.extraNocturnal;

      const costoDominical = hd * tarifaHora * FACTORS.dominical;
      const costoDominicalNocturno = hdn * tarifaHora * FACTORS.dominicalNocturnal;

      const costoExtraDominical = hde * tarifaHora * FACTORS.dominicalExtra;
      const costoExtraDominicalNocturno = hden * tarifaHora * FACTORS.dominicalExtraNocturnal;

      const costoTotal =
        costoNormal +
        costoExtra +
        costoNocturno +
        costoExtraNocturno +
        costoDominical +
        costoDominicalNocturno +
        costoExtraDominical +
        costoExtraDominicalNocturno;

      totalManoObra += costoTotal;
      totalHorasManoObra += th;
      totalHorasNormales += hn;

      // para "extras" sumamos todo lo que NO es normal diurna
      totalHorasExtras += (he + hen + hd + hdn + hde + hden);

      return {
        ...p,
        tarifaHora,

        costoNormal,
        costoExtra,
        costoNocturno,
        costoExtraNocturno,
        costoDominical,
        costoDominicalNocturno,
        costoExtraDominical,
        costoExtraDominicalNocturno,

        costoTotal,
        factors: FACTORS,
        tipo: "manoObra",
        fase: "fase3",
      };
    });

    return {
      detalle,
      totalManoObra,
      totalHorasManoObra,
      totalHorasNormales,
      totalHorasExtras,
      factors: FACTORS,
    };
  },

  /* ============================================================
   * Datos financieros del proyecto (principal)
   * ============================================================ */
  async getProjectFinancialData(projectId) {
    /* ===== 1. Cargar gastos reales ===== */
    const viaticosSnap = await getDocs(
      query(
        collection(db, "proyectos", projectId, "viaticos"),
        orderBy("fecha", "desc")
      )
    );

    // SIN orderBy para evitar fallos si algunos docs no tienen "fecha"
    const materialSnap = await getDocs(
      collection(db, "proyectos", projectId, "gastosMaterial")
    );

    const tramitesSnap = await getDocs(
      query(
        collection(db, "proyectos", projectId, "gastosTramites"),
        orderBy("fecha", "desc")
      )
    );

    const personalSnap = await getDocs(
      query(
        collection(db, "proyectos", projectId, "gastosPersonal"),
        orderBy("createdAt", "desc")
      )
    );

    /* ===== 2. Normalizar data ===== */
    const viaticos = viaticosSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      tipo: "viatico",
      fase: "fase3",
    }));

    // Optimización anti-duplicados:
    // - Ignorar materiales antiguos por "uso"
    // - Aceptar solo ingresos (inventario_general / externo / transferencia_proyecto)
    const materiales = materialSnap.docs
      .map((d) => {
        const data = d.data();

        // Evitar duplicados: ignorar registros antiguos generados por "uso"
        const origen = data.origen || "";
        if (origen === "uso_inventario_proyecto") return null;

        // Aceptar solo ingresos (inventario_general / externo / transferencia_proyecto)
        const source = data.source || "";
        const allowedSources = new Set([
          "inventario_general",
          "externo",
          "transferencia_proyecto",
        ]);

        const isIngreso =
          origen === "ingreso_inventario_proyecto" ||
          origen === "externo" ||
          allowedSources.has(source);

        if (!isIngreso) return null;

        let fase = data.fase;

        if (!fase) {
          if (data.codigo) fase = classifyByPrefix(data.codigo);
          else fase = classifyExternal(data.nombre);
        }

        return { id: d.id, ...data, tipo: "material", fase };
      })
      .filter(Boolean)
      .sort((a, b) => {
        const da = a.createdAt || a.fecha || a.fechaInicio || 0;
        const dbb = b.createdAt || b.fecha || b.fechaInicio || 0;
        return new Date(dbb).getTime() - new Date(da).getTime();
      });

    const tramites = tramitesSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      tipo: "tramite",
      fase: "fase4",
    }));

    const personal = personalSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      tipo: "personal",
      fase: "fase3",
    }));

    /* ===== 3. Presupuesto ===== */
    const presupuestoSnap = await getDocs(
      collection(db, "proyectos", projectId, "presupuesto")
    );

    const presupuesto = presupuestoSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    /* ===== 4. Totales reales por fase ===== */
    const realesPorFase = { fase1: 0, fase2: 0, fase3: 0, fase4: 0 };

    materiales.forEach((m) => {
      realesPorFase[m.fase] += Number(m.total || 0);
    });

    viaticos.forEach((v) => {
      realesPorFase.fase3 += Number(v.valor || 0);
    });

    tramites.forEach((t) => {
      realesPorFase.fase4 += Number(t.valor || 0);
    });

    personal.forEach((p) => {
      realesPorFase.fase3 += Number(p.valor || p.total || 0);
    });

    /* ===== 5. Mano de obra real ===== */
    const manoObraReal = await this.getManoObraReal(projectId);
    realesPorFase.fase3 += manoObraReal.totalManoObra;

    /* ===== 6. Presupuesto por fase ===== */
    const presupuestoPorFase = { fase1: 0, fase2: 0, fase3: 0, fase4: 0 };

    presupuesto.forEach((p) => {
      if (p.fase) presupuestoPorFase[p.fase] += p.valorTotal || 0;
    });

    /* ===== 7. Utilidades ===== */
    const utilidadRealPorFase = {
      fase1: presupuestoPorFase.fase1 - realesPorFase.fase1,
      fase2: presupuestoPorFase.fase2 - realesPorFase.fase2,
      fase3: presupuestoPorFase.fase3 - realesPorFase.fase3,
      fase4: presupuestoPorFase.fase4 - realesPorFase.fase4,
    };

    const totalReal = Object.values(realesPorFase).reduce((a, b) => a + b, 0);
    const totalPresupuesto = Object.values(presupuestoPorFase).reduce(
      (a, b) => a + b,
      0
    );
    const totalUtilidadReal = totalPresupuesto - totalReal;

    /* ===== 8. Retorno FINAL ===== */
    return {
      viaticos,
      materiales,
      personal,
      tramites,
      presupuesto,

      realesPorFase,
      presupuestoPorFase,
      utilidadRealPorFase,

      totalReal,
      totalPresupuesto,
      totalUtilidadReal,

      // Mano de obra (detalle + totales)
      manoObra: manoObraReal.detalle,
      manoObraRealDetalle: manoObraReal.detalle,
      totalManoObraReal: manoObraReal.totalManoObra,
      totalHorasManoObra: manoObraReal.totalHorasManoObra,
      totalHorasNormales: manoObraReal.totalHorasNormales,
      totalHorasExtras: manoObraReal.totalHorasExtras,
      factors: manoObraReal.factors,
    };
  },
};

export default realExpensesService;