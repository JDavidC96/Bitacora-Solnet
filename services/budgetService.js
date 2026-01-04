// services/budgetService.js
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

/**
 * Estructura en Firestore:
 *
 * proyectos/{projectId}/presupuesto (colección)
 *   - config (doc): configuración global del presupuesto
 *       {
 *         tipo: "config",
 *         utilidadGlobal: 25,
 *         aiu: { administracion: 8, imprevistos: 2, utilidad: 5 }
 *       }
 *   - {itemId} (doc por ítem)
 *       {
 *         faseKey: "fase1" | "fase2" | "fase3" | "fase4",
 *         nombre: string,
 *         unidades: number,
 *         costoUnitario: number,
 *         aplicaIva: boolean,
 *         unidad: string,
 *         categoria: string,
 *         notas: string
 *       }
 */

const FASES_INFO = {
  fase1: { nombre: "Equipos y estructura" },
  fase2: { nombre: "Sistema eléctrico asociado al proyecto" },
  fase3: { nombre: "Instalación y puesta en servicio" },
  fase4: {
    nombre: "Trámites de conexión, mantenimientos, otras actividades",
  },
};

// valores por defecto si no hay config
const DEFAULT_CONFIG = {
  utilidadGlobal: 0, // el usuario la definirá en pantalla
  aiu: {
    administracion: 8,
    imprevistos: 2,
    utilidad: 5,
  },
};

// ---------------------------
// Helpers internos de cálculo
// ---------------------------

/**
 * Calcula los valores financieros de un ítem según la utilidad global.
 * NO se persisten estos campos en Firestore; se calculan al vuelo.
 */
function calcularItemConUtilidad(item, utilidadGlobal) {
  const unidades = Number(item.unidades) || 0;
  const costoUnitario = Number(item.costoUnitario) || 0;

  const costoTotal = unidades * costoUnitario;

  let precioIndividual = costoUnitario;
  if (utilidadGlobal > 0 && utilidadGlobal < 100) {
    const margen = 1 - utilidadGlobal / 100; // ej: 25% -> 0.75
    if (margen !== 0) {
      precioIndividual = costoUnitario / margen;
    }
  }

  const valorTotal = precioIndividual * unidades;
  const utilidad = valorTotal - costoTotal;

  return {
    ...item,
    unidades,
    costoUnitario,
    costoTotal,
    precioIndividual,
    valorTotal,
    utilidad,
  };
}

// crea config + items base fase3/fase4 si no hay nada
async function crearPresupuestoInicial(projectId) {
  const colRef = collection(db, "proyectos", projectId, "presupuesto");

  // doc de configuración
  const configRef = doc(colRef, "config");
  await setDoc(configRef, {
    tipo: "config",
    ...DEFAULT_CONFIG,
  });

  // Ítems base FASE 3
  const fase3Base = [
    "Día de técnico",
    "Día de ingeniero",
    "Hidratación",
    "Almuerzos",
    "Gasolina",
    "Hospedaje",
    "Viáticos varios",
  ];

  for (const nombre of fase3Base) {
    await addDoc(colRef, {
      faseKey: "fase3",
      nombre,
      unidades: 0,
      costoUnitario: 0,
      aplicaIva: false, // mano de obra / viáticos
      unidad: "un",
      categoria: "instalacion",
      notas: "",
    });
  }

  // Ítems base FASE 4
  const fase4Base = [
    "Visita ingeniería de detalle (memorias y planos)",
    "Comisiones",
    "Certificado RETIE de la instalación",
    "Trámite CREG",
    "Trámite UPME",
    "Estudio de conexión",
  ];

  for (const nombre of fase4Base) {
    await addDoc(colRef, {
      faseKey: "fase4",
      nombre,
      unidades: 1,
      costoUnitario: 0,
      aplicaIva: false,
      unidad: "un",
      categoria: "tramites",
      notas: "",
    });
  }
}

export const budgetService = {
  /**
   * Obtiene el presupuesto completo de un proyecto.
   * Si no existe nada, crea configuración + ítems base y devuelve estructura inicial.
   */
  async getBudgetByProject(projectId) {
    const colRef = collection(db, "proyectos", projectId, "presupuesto");
    let snap = await getDocs(colRef);

    // Si no hay nada, inicializamos config + ítems base
    if (snap.empty) {
      await crearPresupuestoInicial(projectId);
      snap = await getDocs(colRef);
    }

    // Leer config e ítems
    let config = { ...DEFAULT_CONFIG };
    const itemsRaw = [];

    snap.forEach((d) => {
      const data = d.data();
      if (d.id === "config" || data.tipo === "config") {
        config = {
          ...DEFAULT_CONFIG,
          ...data,
          aiu: { ...DEFAULT_CONFIG.aiu, ...(data.aiu || {}) },
        };
      } else {
        itemsRaw.push({ id: d.id, ...data });
      }
    });

    const utilidadGlobal = Number(config.utilidadGlobal) || 0;
    const porcAdm = Number(config.aiu?.administracion ?? 0);
    const porcImp = Number(config.aiu?.imprevistos ?? 0);
    const porcUtiAIU = Number(config.aiu?.utilidad ?? 0);

    // Estructura de fases
    const fases = {
      fase1: { nombre: FASES_INFO.fase1.nombre, items: [], total: 0 },
      fase2: { nombre: FASES_INFO.fase2.nombre, items: [], total: 0 },
      fase3: { nombre: FASES_INFO.fase3.nombre, items: [], total: 0 },
      fase4: { nombre: FASES_INFO.fase4.nombre, items: [], total: 0 },
    };

    // Totales generales por proyecto
    let costoTotalProyecto = 0;
    let valorTotalProyecto = 0;
    let utilidadTotalProyecto = 0;

    // Bases para IVA por fase
    let baseIvaF1 = 0;
    let baseIvaF2 = 0;
    let baseIvaF4 = 0;

    // -----------------------------
    // Procesar todos los ítems
    // -----------------------------
    itemsRaw.forEach((raw) => {
      const faseKey = raw.faseKey || "fase1";
      if (!fases[faseKey]) return;

      const aplicaIva = raw.aplicaIva ?? true;

      const itemCalc = calcularItemConUtilidad(
        { ...raw, aplicaIva },
        utilidadGlobal
      );

      // Acumular en la fase
      fases[faseKey].items.push(itemCalc);
      fases[faseKey].total += itemCalc.valorTotal;

      // Acumular totales generales
      costoTotalProyecto += itemCalc.costoTotal;
      valorTotalProyecto += itemCalc.valorTotal;
      utilidadTotalProyecto += itemCalc.utilidad;

      // Base IVA por fase (solo sobre ítems que aplican IVA)
      if (aplicaIva) {
        if (faseKey === "fase1") baseIvaF1 += itemCalc.valorTotal;
        if (faseKey === "fase2") baseIvaF2 += itemCalc.valorTotal;
        if (faseKey === "fase4") baseIvaF4 += itemCalc.valorTotal;
      }
    });

    // Total antes de IVA (suma de VALOR TOTAL de todas las fases)
    const totalAntesIVA =
      fases.fase1.total +
      fases.fase2.total +
      fases.fase3.total +
      fases.fase4.total;

    // IVA por fase (solo en resumen general)
    const ivaFase1 = baseIvaF1 * 0.19;
    const ivaFase2 = baseIvaF2 * 0.19;
    const ivaFase4 = baseIvaF4 * 0.19; // fase 3 no genera IVA

    // AIU sobre valor total de fase3 + fase4
    const baseAIU = fases.fase3.total + fases.fase4.total;
    const administracion = (baseAIU * porcAdm) / 100;
    const imprevistos = (baseAIU * porcImp) / 100;
    const utilidadAIU = (baseAIU * porcUtiAIU) / 100;
    const ivaUtilidadAIU = utilidadAIU * 0.19;

    const totalGeneral =
      totalAntesIVA +
      ivaFase1 +
      ivaFase2 +
      ivaFase4 +
      administracion +
      imprevistos +
      utilidadAIU +
      ivaUtilidadAIU;

    const totalesGenerales = {
      costoTotalProyecto,
      valorTotalProyecto,
      utilidadTotalProyecto,
    };

    const calculosGlobales = {
      totalAntesIVA,
      ivaFase1,
      ivaFase2,
      ivaFase4,
      baseAIU,
      administracion,
      imprevistos,
      utilidadAIU,
      ivaUtilidadAIU,
    };

    return {
      id: "presupuesto",
      fases,
      utilidadGlobal,
      porcentajesAIU: {
        administracion: porcAdm,
        imprevistos: porcImp,
        utilidad: porcUtiAIU,
      },
      totalesGenerales,
      calculosGlobales,
      totalGeneral,
    };
  },

  // --------------------------------------------------
  // CRUD de ítems (compatible con tu BudgetScreen)
  // --------------------------------------------------

  /**
   * Agregar ítem a cualquier fase (1–4).
   * El parámetro budgetId NO se usa, solo se mantiene por compatibilidad.
   */
  async addItem(projectId, _budgetId, faseKey, itemData) {
    const colRef = collection(db, "proyectos", projectId, "presupuesto");

    const payload = {
      faseKey,
      nombre: itemData.nombre || "",
      unidades: Number(itemData.unidades) || 0,
      costoUnitario: Number(itemData.costoUnitario) || 0,
      aplicaIva: itemData.aplicaIva ?? true,
      unidad: itemData.unidad || "un",
      categoria: itemData.categoria || "",
      notas: itemData.notas || "",
    };

    // si viene id desde la UI, lo usamos, si no dejamos que Firestore lo genere
    if (itemData.id) {
      const ref = doc(colRef, itemData.id);
      await setDoc(ref, payload);
      return { id: itemData.id, ...payload };
    } else {
      const ref = await addDoc(colRef, payload);
      return { id: ref.id, ...payload };
    }
  },

  async addItemFase4(projectId, budgetId, itemData) {
    return this.addItem(projectId, budgetId, "fase4", itemData);
  },

  /**
   * Actualizar un ítem.
   */
  async updateItem(projectId, _budgetId, _faseKey, itemData) {
    if (!itemData.id) {
      throw new Error("updateItem requiere itemData.id");
    }
    const ref = doc(
      db,
      "proyectos",
      projectId,
      "presupuesto",
      itemData.id
    );

    const payload = {
      nombre: itemData.nombre || "",
      unidades: Number(itemData.unidades) || 0,
      costoUnitario: Number(itemData.costoUnitario) || 0,
      aplicaIva: itemData.aplicaIva ?? true,
      unidad: itemData.unidad || "un",
      categoria: itemData.categoria || "",
      notas: itemData.notas || "",
      faseKey: itemData.faseKey || "fase1",
    };

    await updateDoc(ref, payload);
    return { id: itemData.id, ...payload };
  },

  async updateItemFase4(projectId, budgetId, itemData) {
    return this.updateItem(projectId, budgetId, "fase4", itemData);
  },

  /**
   * Eliminar ítem.
   */
  async deleteItem(projectId, _budgetId, _faseKey, itemId) {
    const ref = doc(db, "proyectos", projectId, "presupuesto", itemId);
    await deleteDoc(ref);
  },

  async deleteItemFase4(projectId, budgetId, itemId) {
    return this.deleteItem(projectId, budgetId, "fase4", itemId);
  },

  // --------------------------------------------------
  // Configuración global (utilidad y AIU)
  // --------------------------------------------------

  /**
   * Actualizar % de utilidad global (aplica a TODOS los ítems).
   */
  async updateUtilidadGlobal(projectId, utilidadGlobal) {
    const colRef = collection(db, "proyectos", projectId, "presupuesto");
    const configRef = doc(colRef, "config");
    const snap = await getDoc(configRef);

    if (!snap.exists()) {
      await setDoc(configRef, {
        tipo: "config",
        ...DEFAULT_CONFIG,
        utilidadGlobal: Number(utilidadGlobal) || 0,
      });
    } else {
      await updateDoc(configRef, {
        utilidadGlobal: Number(utilidadGlobal) || 0,
      });
    }
  },

  /**
   * Actualizar porcentajes de AIU.
   */
  async updateAIU(projectId, { administracion, imprevistos, utilidad }) {
    const colRef = collection(db, "proyectos", projectId, "presupuesto");
    const configRef = doc(colRef, "config");
    const snap = await getDoc(configRef);

    const aiu = {
      administracion: Number(administracion) || 0,
      imprevistos: Number(imprevistos) || 0,
      utilidad: Number(utilidad) || 0,
    };

    if (!snap.exists()) {
      await setDoc(configRef, {
        tipo: "config",
        ...DEFAULT_CONFIG,
        aiu,
      });
    } else {
      await updateDoc(configRef, {
        aiu,
      });
    }
  },

  // --------------------------------------------------
  // IMPORTACIÓN DESDE EXCEL (REEMPLAZA TODO)
  // --------------------------------------------------

  async replaceBudgetFromImport(projectId, { utilidadGlobal, aiu, items }) {
    const colRef = collection(db, "proyectos", projectId, "presupuesto");
    const snap = await getDocs(colRef);

    const batch = writeBatch(db);

    // 1) borrar todo excepto config (lo vamos a re-escribir igual)
    snap.forEach((d) => {
      const isConfig = d.id === "config" || d.data()?.tipo === "config";
      if (!isConfig) {
        batch.delete(doc(db, "proyectos", projectId, "presupuesto", d.id));
      }
    });

    // 2) set config
    batch.set(doc(db, "proyectos", projectId, "presupuesto", "config"), {
      tipo: "config",
      utilidadGlobal: Number(utilidadGlobal) || 0,
      aiu: {
        administracion: Number(aiu?.administracion) || 0,
        imprevistos: Number(aiu?.imprevistos) || 0,
        utilidad: Number(aiu?.utilidad) || 0,
      },
    });

    // 3) crear ítems nuevos (ids nuevos)
    // writeBatch no soporta addDoc, pero sí setDoc con doc() sin id fijo:
    items.forEach((it) => {
      const ref = doc(colRef); // id auto
      batch.set(ref, {
        faseKey: it.faseKey,
        nombre: it.nombre || "",
        unidades: Number(it.unidades) || 0,
        costoUnitario: Number(it.costoUnitario) || 0,
        aplicaIva: it.aplicaIva ?? true,
        unidad: it.unidad || "un",
        categoria: it.categoria || "",
        notas: it.notas || "",
      });
    });

    await batch.commit();
  },
};

export default budgetService;