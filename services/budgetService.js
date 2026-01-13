/**
 * SERVICIO DE GESTIÓN DE PRESUPUESTOS
 * 
 * Descripción:
 * Servicio completo para la gestión de presupuestos de proyectos en Firestore.
 * Maneja creación, lectura, actualización y eliminación de ítems presupuestales,
 * cálculos financieros automatizados e importación desde Excel.
 * 
 * Características principales:
 * 1. Estructura organizada por fases (1-4) con configuración global
 * 2. Cálculos automáticos de costos, precios, utilidades e impuestos
 * 3. Sistema de AIU (Administración, Imprevistos, Utilidad)
 * 4. Importación/exportación desde Excel
 * 5. Inicialización automática con plantillas base
 * 6. Gestión de configuración de utilidad global
 * 
 * Estructura en Firestore:
 * proyectos/{projectId}/presupuesto (colección)
 *   ├── config (documento): configuración global del presupuesto
 *   │     {
 *   │       tipo: "config",
 *   │       utilidadGlobal: 25,          // % de utilidad global
 *   │       aiu: {                       // % de AIU por defecto
 *   │         administracion: 8,
 *   │         imprevistos: 2,
 *   │         utilidad: 5
 *   │       }
 *   │     }
 *   └── {itemId} (documentos por ítem)
 *         {
 *           faseKey: "fase1" | "fase2" | "fase3" | "fase4",
 *           nombre: "Paneles Trina",
 *           unidades: 32,
 *           costoUnitario: 585612,
 *           aplicaIva: true,
 *           aplicaUtilidadGlobal: true,
 *           unidad: "un",
 *           categoria: "materiales",
 *           notas: "Entrega en bodega"
 *         }
 * 
 * Fases del proyecto:
 * - fase1: Equipos y estructura (materiales principales)
 * - fase2: Sistema eléctrico asociado al proyecto
 * - fase3: Instalación y puesta en servicio (mano de obra, viáticos)
 * - fase4: Trámites, mantenimientos, otras actividades
 * 
 * @module budgetService
 */

// Importaciones de Firestore
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
 * Información de las fases del presupuesto
 * @constant {Object} FASES_INFO
 */
const FASES_INFO = {
  fase1: { nombre: "Equipos y estructura" },
  fase2: { nombre: "Sistema eléctrico asociado al proyecto" },
  fase3: { nombre: "Instalación y puesta en servicio" },
  fase4: {
    nombre: "Trámites de conexión, mantenimientos, otras actividades",
  },
};

/**
 * Configuración por defecto del presupuesto
 * @constant {Object} DEFAULT_CONFIG
 */
const DEFAULT_CONFIG = {
  utilidadGlobal: 0, // El usuario la definirá en pantalla
  aiu: {
    administracion: 8,  // 8% de administración
    imprevistos: 2,     // 2% de imprevistos
    utilidad: 5,        // 5% de utilidad adicional
  },
};

// ==================== FUNCIONES AUXILIARES ====================

/**
 * Calcula los valores financieros de un ítem según la utilidad global
 * NOTA: Estos campos NO se persisten en Firestore; se calculan al vuelo
 * 
 * @function calcularItemConUtilidad
 * @param {Object} item - Ítem con datos básicos
 * @param {number} utilidadGlobal - Porcentaje de utilidad global
 * @returns {Object} Ítem con campos calculados agregados
 * 
 * @description
 * Calcula:
 * - Costo total: unidades × costo unitario
 * - Precio individual: costo unitario / (1 - utilidad%) [si aplica]
 * - Valor total: precio individual × unidades
 * - Utilidad: valor total - costo total
 */
function calcularItemConUtilidad(item, utilidadGlobal) {
  const unidades = Number(item.unidades) || 0;
  const costoUnitario = Number(item.costoUnitario) || 0;

  const costoTotal = unidades * costoUnitario;

  let precioIndividual = costoUnitario;

  // SOLO aplicar utilidad global si el ítem lo permite
  // Verifica explícitamente que no sea false y que el porcentaje sea válido
  if (
    item.aplicaUtilidadGlobal !== false &&
    utilidadGlobal > 0 &&
    utilidadGlobal < 100
  ) {
    const margen = 1 - utilidadGlobal / 100; // ej: 25% → 0.75
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

/**
 * Crea la estructura inicial de un presupuesto
 * Incluye configuración y ítems base para fases 3 y 4
 * 
 * @async
 * @function crearPresupuestoInicial
 * @param {string} projectId - ID del proyecto
 */
async function crearPresupuestoInicial(projectId) {
  const colRef = collection(db, "proyectos", projectId, "presupuesto");

  // 1. Documento de configuración
  const configRef = doc(colRef, "config");
  await setDoc(configRef, {
    tipo: "config",
    ...DEFAULT_CONFIG,
  });

  // 2. Ítems base para FASE 3 (Instalación)
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
      aplicaIva: false, // Mano de obra/viáticos no aplican IVA
      aplicaUtilidadGlobal: true, // Por defecto aplica utilidad
      unidad: "un",
      categoria: "instalacion",
      notas: "",
    });
  }

  // 3. Ítems base para FASE 4 (Trámites)
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
      unidades: 1, // Generalmente son servicios únicos
      costoUnitario: 0,
      aplicaIva: false, // Servicios profesionales generalmente no aplican IVA
      // "Comisiones" no debe aplicar utilidad global
      aplicaUtilidadGlobal: nombre === "Comisiones" ? false : true,
      unidad: "un",
      categoria: "tramites",
      notas: "",
    });
  }
}

// ==================== SERVICIO PRINCIPAL ====================

/**
 * Servicio de gestión de presupuestos
 * @namespace budgetService
 */
export const budgetService = {
  /**
   * Obtiene el presupuesto completo de un proyecto
   * Si no existe, crea estructura inicial automáticamente
   * 
   * @async
   * @method getBudgetByProject
   * @param {string} projectId - ID del proyecto
   * @returns {Promise<Object>} Objeto con estructura completa del presupuesto
   * 
   * @example
   * const presupuesto = await budgetService.getBudgetByProject("proyecto-123");
   * console.log(presupuesto.fases.fase1.items);
   */
  async getBudgetByProject(projectId) {
    const colRef = collection(db, "proyectos", projectId, "presupuesto");
    let snap = await getDocs(colRef);

    // ========== INICIALIZACIÓN AUTOMÁTICA ==========
    // Si no hay documentos, crear estructura inicial
    if (snap.empty) {
      await crearPresupuestoInicial(projectId);
      snap = await getDocs(colRef); // Volver a cargar
    }

    // ========== PROCESAMIENTO DE DATOS ==========
    let config = { ...DEFAULT_CONFIG };
    const itemsRaw = [];

    // Separar configuración de ítems
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

    // ========== CONFIGURACIÓN DE CÁLCULOS ==========
    const utilidadGlobal = Number(config.utilidadGlobal) || 0;
    const porcAdm = Number(config.aiu?.administracion ?? 0);
    const porcImp = Number(config.aiu?.imprevistos ?? 0);
    const porcUtiAIU = Number(config.aiu?.utilidad ?? 0);

    // ========== ESTRUCTURA DE FASES ==========
    const fases = {
      fase1: { nombre: FASES_INFO.fase1.nombre, items: [], total: 0 },
      fase2: { nombre: FASES_INFO.fase2.nombre, items: [], total: 0 },
      fase3: { nombre: FASES_INFO.fase3.nombre, items: [], total: 0 },
      fase4: { nombre: FASES_INFO.fase4.nombre, items: [], total: 0 },
    };

    // ========== VARIABLES DE ACUMULACIÓN ==========
    let costoTotalProyecto = 0;
    let valorTotalProyecto = 0;
    let utilidadTotalProyecto = 0;

    // Bases para IVA por fase
    let baseIvaF1 = 0;
    let baseIvaF2 = 0;
    let baseIvaF4 = 0;

    // ========== PROCESAR TODOS LOS ÍTEMS ==========
    itemsRaw.forEach((raw) => {
      const faseKey = raw.faseKey || "fase1";
      if (!fases[faseKey]) return;

      // Configuración por ítem
      const aplicaIva = raw.aplicaIva ?? true;
      const aplicaUtilidadGlobal = raw.aplicaUtilidadGlobal ?? true;

      // Calcular valores del ítem
      const itemCalc = calcularItemConUtilidad(
        { ...raw, aplicaIva, aplicaUtilidadGlobal },
        utilidadGlobal
      );

      // Acumular en la fase
      fases[faseKey].items.push(itemCalc);
      fases[faseKey].total += itemCalc.valorTotal;

      // Acumular totales generales
      costoTotalProyecto += itemCalc.costoTotal;
      valorTotalProyecto += itemCalc.valorTotal;
      utilidadTotalProyecto += itemCalc.utilidad;

      // Acumular base para IVA (solo ítems que aplican IVA)
      if (aplicaIva) {
        if (faseKey === "fase1") baseIvaF1 += itemCalc.valorTotal;
        if (faseKey === "fase2") baseIvaF2 += itemCalc.valorTotal;
        if (faseKey === "fase4") baseIvaF4 += itemCalc.valorTotal;
        // fase3 no genera IVA (mano de obra/viáticos)
      }
    });

    // ========== CÁLCULOS FINANCIEROS GLOBALES ==========
    
    // 1. Total antes de IVA
    const totalAntesIVA =
      fases.fase1.total +
      fases.fase2.total +
      fases.fase3.total +
      fases.fase4.total;

    // 2. IVA por fase (19%)
    const ivaFase1 = baseIvaF1 * 0.19;
    const ivaFase2 = baseIvaF2 * 0.19;
    const ivaFase4 = baseIvaF4 * 0.19;

    // 3. AIU sobre valor total de fase3 + fase4
    const baseAIU = fases.fase3.total + fases.fase4.total;
    const administracion = (baseAIU * porcAdm) / 100;
    const imprevistos = (baseAIU * porcImp) / 100;
    const utilidadAIU = (baseAIU * porcUtiAIU) / 100;
    const ivaUtilidadAIU = utilidadAIU * 0.19;

    // 4. Total general del proyecto
    const totalGeneral =
      totalAntesIVA +
      ivaFase1 +
      ivaFase2 +
      ivaFase4 +
      administracion +
      imprevistos +
      utilidadAIU +
      ivaUtilidadAIU;

    // ========== ESTRUCTURA DE RETORNO ==========
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

  // ==================== CRUD DE ÍTEMS ====================

  /**
   * Agrega un ítem a cualquier fase (1-4)
   * 
   * @async
   * @method addItem
   * @param {string} projectId - ID del proyecto
   * @param {string} _budgetId - ID del presupuesto (mantenido por compatibilidad)
   * @param {string} faseKey - Clave de la fase ("fase1" - "fase4")
   * @param {Object} itemData - Datos del ítem
   * @returns {Promise<Object>} Ítem creado con ID
   * 
   * @description
   * Si itemData incluye un id, se usará para actualizar un documento existente.
   * Si no, se creará un nuevo documento con ID generado por Firestore.
   */
  async addItem(projectId, _budgetId, faseKey, itemData) {
    const colRef = collection(db, "proyectos", projectId, "presupuesto");

    const payload = {
      faseKey,
      nombre: itemData.nombre || "",
      unidades: Number(itemData.unidades) || 0,
      costoUnitario: Number(itemData.costoUnitario) || 0,
      aplicaIva: itemData.aplicaIva ?? true,
      aplicaUtilidadGlobal: itemData.aplicaUtilidadGlobal ?? true,
      unidad: itemData.unidad || "un",
      categoria: itemData.categoria || "",
      notas: itemData.notas || "",
    };

    // Si viene id desde la UI, actualizar documento existente
    if (itemData.id) {
      const ref = doc(colRef, itemData.id);
      await setDoc(ref, payload);
      return { id: itemData.id, ...payload };
    } else {
      // Crear nuevo documento con ID generado
      const ref = await addDoc(colRef, payload);
      return { id: ref.id, ...payload };
    }
  },

  /**
   * Alias para agregar ítem específicamente a fase 4
   * Mantenido por compatibilidad con código existente
   * 
   * @async
   * @method addItemFase4
   */
  async addItemFase4(projectId, budgetId, itemData) {
    return this.addItem(projectId, budgetId, "fase4", itemData);
  },

  /**
   * Actualiza un ítem existente
   * 
   * @async
   * @method updateItem
   * @param {string} projectId - ID del proyecto
   * @param {string} _budgetId - ID del presupuesto
   * @param {string} _faseKey - Clave de la fase
   * @param {Object} itemData - Datos actualizados del ítem
   * @returns {Promise<Object>} Ítem actualizado
   * 
   * @throws {Error} Si itemData no incluye id
   */
  async updateItem(projectId, _budgetId, _faseKey, itemData) {
    if (!itemData.id) {
      throw new Error("updateItem requiere itemData.id");
    }
    
    const ref = doc(db, "proyectos", projectId, "presupuesto", itemData.id);

    const payload = {
      nombre: itemData.nombre || "",
      unidades: Number(itemData.unidades) || 0,
      costoUnitario: Number(itemData.costoUnitario) || 0,
      aplicaIva: itemData.aplicaIva ?? true,
      aplicaUtilidadGlobal: itemData.aplicaUtilidadGlobal ?? true,
      unidad: itemData.unidad || "un",
      categoria: itemData.categoria || "",
      notas: itemData.notas || "",
      faseKey: itemData.faseKey || "fase1",
    };

    await updateDoc(ref, payload);
    return { id: itemData.id, ...payload };
  },

  /**
   * Alias para actualizar ítem específicamente en fase 4
   * 
   * @async
   * @method updateItemFase4
   */
  async updateItemFase4(projectId, budgetId, itemData) {
    return this.updateItem(projectId, budgetId, "fase4", itemData);
  },

  /**
   * Elimina un ítem del presupuesto
   * 
   * @async
   * @method deleteItem
   * @param {string} projectId - ID del proyecto
   * @param {string} _budgetId - ID del presupuesto
   * @param {string} _faseKey - Clave de la fase
   * @param {string} itemId - ID del ítem a eliminar
   */
  async deleteItem(projectId, _budgetId, _faseKey, itemId) {
    const ref = doc(db, "proyectos", projectId, "presupuesto", itemId);
    await deleteDoc(ref);
  },

  /**
   * Alias para eliminar ítem específicamente de fase 4
   * 
   * @async
   * @method deleteItemFase4
   */
  async deleteItemFase4(projectId, budgetId, itemId) {
    return this.deleteItem(projectId, budgetId, "fase4", itemId);
  },

  // ==================== CONFIGURACIÓN GLOBAL ====================

  /**
   * Actualiza el porcentaje de utilidad global del proyecto
   * Aplica a TODOS los ítems que tengan aplicaUtilidadGlobal = true
   * 
   * @async
   * @method updateUtilidadGlobal
   * @param {string} projectId - ID del proyecto
   * @param {number} utilidadGlobal - Nuevo porcentaje de utilidad (0-100)
   */
  async updateUtilidadGlobal(projectId, utilidadGlobal) {
    const colRef = collection(db, "proyectos", projectId, "presupuesto");
    const configRef = doc(colRef, "config");
    const snap = await getDoc(configRef);

    if (!snap.exists()) {
      // Crear configuración si no existe
      await setDoc(configRef, {
        tipo: "config",
        ...DEFAULT_CONFIG,
        utilidadGlobal: Number(utilidadGlobal) || 0,
      });
    } else {
      // Actualizar solo utilidad global
      await updateDoc(configRef, {
        utilidadGlobal: Number(utilidadGlobal) || 0,
      });
    }
  },

  /**
   * Actualiza los porcentajes de AIU (Administración, Imprevistos, Utilidad)
   * 
   * @async
   * @method updateAIU
   * @param {string} projectId - ID del proyecto
   * @param {Object} aiuConfig - Objeto con porcentajes
   * @param {number} aiuConfig.administracion - % de administración
   * @param {number} aiuConfig.imprevistos - % de imprevistos
   * @param {number} aiuConfig.utilidad - % de utilidad adicional
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

  // ==================== IMPORTACIÓN DESDE EXCEL ====================

  /**
   * Reemplaza completamente el presupuesto desde datos de importación
   * BATCH OPERATION: Borra todo excepto config y crea nuevos ítems
   * 
   * @async
   * @method replaceBudgetFromImport
   * @param {string} projectId - ID del proyecto
   * @param {Object} importData - Datos de importación
   * @param {number} importData.utilidadGlobal - Utilidad global
   * @param {Object} importData.aiu - Configuración de AIU
   * @param {Array} importData.items - Lista de ítems a importar
   * 
   * @description
   * Operación atómica que:
   * 1. Borra todos los ítems existentes (excepto config)
   * 2. Actualiza configuración
   * 3. Crea nuevos ítems desde la importación
   */
  async replaceBudgetFromImport(projectId, { utilidadGlobal, aiu, items }) {
    const colRef = collection(db, "proyectos", projectId, "presupuesto");
    const snap = await getDocs(colRef);

    const batch = writeBatch(db);

    // 1. Borrar todo excepto config (la reescribiremos)
    snap.forEach((d) => {
      const isConfig = d.id === "config" || d.data()?.tipo === "config";
      if (!isConfig) {
        batch.delete(doc(db, "proyectos", projectId, "presupuesto", d.id));
      }
    });

    // 2. Actualizar configuración
    batch.set(doc(db, "proyectos", projectId, "presupuesto", "config"), {
      tipo: "config",
      utilidadGlobal: Number(utilidadGlobal) || 0,
      aiu: {
        administracion: Number(aiu?.administracion) || 0,
        imprevistos: Number(aiu?.imprevistos) || 0,
        utilidad: Number(aiu?.utilidad) || 0,
      },
    });

    // 3. Crear nuevos ítems (IDs automáticos de Firestore)
    items.forEach((it) => {
      const ref = doc(colRef); // ID automático
      batch.set(ref, {
        faseKey: it.faseKey,
        nombre: it.nombre || "",
        unidades: Number(it.unidades) || 0,
        costoUnitario: Number(it.costoUnitario) || 0,
        aplicaIva: it.aplicaIva ?? true,
        // Preserva configuración de utilidad global si existe, por defecto true
        aplicaUtilidadGlobal: it.aplicaUtilidadGlobal ?? true,
        unidad: it.unidad || "un",
        categoria: it.categoria || "",
        notas: it.notas || "",
      });
    });

    // Ejecutar todas las operaciones atómicamente
    await batch.commit();
  },
};

/**
 * Exportación por defecto para compatibilidad
 */
export default budgetService;