// services/budgetService.js
import {
    arrayUnion,
    collection, doc,
    getDoc, getDocs,
    setDoc,
    updateDoc
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

export const budgetService = {
  // Crear presupuesto para un proyecto
  async create(projectId, budgetData) {
    try {
      const budgetRef = doc(collection(db, 'proyectos', projectId, 'presupuesto'));
      
      const budget = {
        id: budgetRef.id,
        proyectoId: projectId,
        nombre: budgetData.nombre,
        creadoPor: budgetData.creadoPor,
        proyectoNombre: budgetData.proyectoNombre,
        fechaCreacion: new Date().toISOString(),
        estado: 'activo',
        
        // Estructura de las 4 fases
        fases: {
          fase1: { 
            nombre: 'Equipos y Estructura',
            items: [],
            total: 0,
            aplicaIva: true
          },
          fase2: { 
            nombre: 'Sistema Eléctrico Asociado',
            items: [],
            total: 0,
            aplicaIva: true
          },
          fase3: { 
            nombre: 'Instalación y Puesta en Servicio',
            personal: [],
            viaticos: [],
            total: 0,
            aplicaIva: false
          },
          fase4: { 
            nombre: 'Trámites de Conexión y Mantenimientos',
            items: [],
            total: 0,
            aplicaIva: false
          }
        },
        
        // Configuración de porcentajes
        porcentajes: {
          administracion: 8,
          imprevistos: 2,
          utilidad: 5
        },
        
        // Cálculos globales (se llenan automáticamente)
        calculosGlobales: {
          administracion: 0,
          imprevistos: 0,
          utilidad: 0,
          ivaUtilidad: 0,
          ivaFase1: 0,
          ivaFase2: 0
        },
        
        totalGeneral: 0
      };

      await setDoc(budgetRef, budget);
      return budget;
    } catch (error) {
      throw new Error(`Error creando presupuesto: ${error.message}`);
    }
  },

  // Obtener presupuesto de un proyecto
  async getByProject(projectId) {
    try {
      const presupuestoRef = collection(db, 'proyectos', projectId, 'presupuesto');
      const querySnapshot = await getDocs(presupuestoRef);
      
      if (querySnapshot.empty) {
        return null;
      }
      
      // Tomar el primer presupuesto (podría extenderse para múltiples)
      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      throw new Error(`Error obteniendo presupuesto: ${error.message}`);
    }
  },

  // Agregar item a Fase 1 o 2
  async addItem(projectId, budgetId, fase, itemData) {
    try {
      const budgetRef = doc(db, 'proyectos', projectId, 'presupuesto', budgetId);
      
      // Calcular precios automáticamente
      const itemCalculado = this.calcularItemFase12(itemData);
      
      await updateDoc(budgetRef, {
        [`fases.${fase}.items`]: arrayUnion(itemCalculado),
        [`fases.${fase}.total`]: this.calcularTotalFase(fase, itemCalculado)
      });
      
      // Recalcular totales globales
      await this.recalcularTotales(projectId, budgetId);
      
      return itemCalculado;
    } catch (error) {
      throw new Error(`Error agregando item: ${error.message}`);
    }
  },

  // Agregar personal a Fase 3
  async addPersonal(projectId, budgetId, personalData) {
    try {
      const budgetRef = doc(db, 'proyectos', projectId, 'presupuesto', budgetId);
      
      const personalCalculado = {
        ...personalData,
        totalPresupuestado: (personalData.diasPresupuestados || 0) * (personalData.valorDiaPresupuestado || 0)
      };
      
      await updateDoc(budgetRef, {
        [`fases.fase3.personal`]: arrayUnion(personalCalculado)
      });
      
      await this.recalcularTotales(projectId, budgetId);
      
      return personalCalculado;
    } catch (error) {
      throw new Error(`Error agregando personal: ${error.message}`);
    }
  },

  // Agregar viáticos a Fase 3
  async addViaticos(projectId, budgetId, viaticoData) {
    try {
      const budgetRef = doc(db, 'proyectos', projectId, 'presupuesto', budgetId);
      
      await updateDoc(budgetRef, {
        [`fases.fase3.viaticos`]: arrayUnion(viaticoData)
      });
      
      await this.recalcularTotales(projectId, budgetId);
      
      return viaticoData;
    } catch (error) {
      throw new Error(`Error agregando viáticos: ${error.message}`);
    }
  },

  // Agregar item a Fase 4
  async addItemFase4(projectId, budgetId, itemData) {
    try {
      const budgetRef = doc(db, 'proyectos', projectId, 'presupuesto', budgetId);
      
      const itemCalculado = {
        ...itemData,
        unidades: 1, // Fase 4 siempre es 1 unidad
        costoTotal: itemData.costoUnitario || 0,
        precioVentaTotal: itemData.costoUnitario || 0 // Sin utilidad en fase 4
      };
      
      await updateDoc(budgetRef, {
        [`fases.fase4.items`]: arrayUnion(itemCalculado),
        [`fases.fase4.total`]: this.calcularTotalFase('fase4', itemCalculado)
      });
      
      await this.recalcularTotales(projectId, budgetId);
      
      return itemCalculado;
    } catch (error) {
      throw new Error(`Error agregando item fase 4: ${error.message}`);
    }
  },

  // Cálculos automáticos para Fase 1 y 2
  calcularItemFase12(itemData) {
    const { unidades, costoUnitario, aplicaIva = true, utilidadPorcentaje = 10 } = itemData;
    
    const costoTotal = unidades * costoUnitario;
    const utilidadValor = costoTotal * (utilidadPorcentaje / 100);
    const precioSinIva = costoTotal + utilidadValor;
    const iva = aplicaIva ? precioSinIva * 0.19 : 0;
    const precioConIva = precioSinIva + iva;
    
    return {
      ...itemData,
      costoTotal,
      utilidadPorcentaje,
      utilidadValor,
      precioSinIva,
      iva,
      precioConIva,
      precioUnitarioConIva: precioConIva / unidades
    };
  },

  // Calcular total de una fase
  calcularTotalFase(fase, nuevoItem) {
    // Esta función se complementaría con el total existente
    // Por simplicidad, devuelve el valor del nuevo item
    return nuevoItem.precioConIva || nuevoItem.costoTotal || 0;
  },

  // Recalcular todos los totales globales
  async recalcularTotales(projectId, budgetId) {
    try {
      const budgetRef = doc(db, 'proyectos', projectId, 'presupuesto', budgetId);
      const budgetDoc = await getDoc(budgetRef);
      
      if (!budgetDoc.exists()) return;
      
      const budget = budgetDoc.data();
      
      // Calcular subtotales por fase
      const totalFase1 = budget.fases.fase1.total || 0;
      const totalFase2 = budget.fases.fase2.total || 0;
      const totalFase3 = budget.fases.fase3.total || 0;
      const totalFase4 = budget.fases.fase4.total || 0;
      
      // Base para cálculos globales (Fase 3 + Fase 4)
      const baseCalculosGlobales = totalFase3 + totalFase4;
      
      // Cálculos globales
      const administracion = baseCalculosGlobales * (budget.porcentajes.administracion / 100);
      const imprevistos = baseCalculosGlobales * (budget.porcentajes.imprevistos / 100);
      const utilidad = baseCalculosGlobales * (budget.porcentajes.utilidad / 100);
      const ivaUtilidad = utilidad * 0.19;
      
      // IVA de Fase 1 y 2
      const ivaFase1 = totalFase1 * 0.19; // Asumiendo que todo aplica IVA
      const ivaFase2 = totalFase2 * 0.19; // Asumiendo que todo aplica IVA
      
      // Total General
      const totalGeneral = totalFase1 + totalFase2 + totalFase3 + totalFase4 + 
                          administracion + imprevistos + utilidad + 
                          ivaUtilidad + ivaFase1 + ivaFase2;
      
      await updateDoc(budgetRef, {
        'calculosGlobales.administracion': administracion,
        'calculosGlobales.imprevistos': imprevistos,
        'calculosGlobales.utilidad': utilidad,
        'calculosGlobales.ivaUtilidad': ivaUtilidad,
        'calculosGlobales.ivaFase1': ivaFase1,
        'calculosGlobales.ivaFase2': ivaFase2,
        totalGeneral: totalGeneral
      });
      
    } catch (error) {
      throw new Error(`Error recalculando totales: ${error.message}`);
    }
  },

  // Actualizar porcentajes
  async updatePorcentajes(projectId, budgetId, nuevosPorcentajes) {
    try {
      const budgetRef = doc(db, 'proyectos', projectId, 'presupuesto', budgetId);
      
      await updateDoc(budgetRef, {
        'porcentajes.administracion': nuevosPorcentajes.administracion,
        'porcentajes.imprevistos': nuevosPorcentajes.imprevistos,
        'porcentajes.utilidad': nuevosPorcentajes.utilidad
      });
      
      // Recalcular con nuevos porcentajes
      await this.recalcularTotales(projectId, budgetId);
      
    } catch (error) {
      throw new Error(`Error actualizando porcentajes: ${error.message}`);
    }
  },

  // Eliminar item de cualquier fase
  async deleteItem(projectId, budgetId, fase, itemId) {
    try {
      const budgetRef = doc(db, 'proyectos', projectId, 'presupuesto', budgetId);
      const budgetDoc = await getDoc(budgetRef);
      
      if (!budgetDoc.exists()) return;
      
      const budget = budgetDoc.data();
      const items = budget.fases[fase].items.filter(item => item.id !== itemId);
      
      await updateDoc(budgetRef, {
        [`fases.${fase}.items`]: items
      });
      
      await this.recalcularTotales(projectId, budgetId);
      
    } catch (error) {
      throw new Error(`Error eliminando item: ${error.message}`);
    }
  }
};