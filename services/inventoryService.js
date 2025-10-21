// services/inventoryService.js
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

export const inventoryService = {
  /**
   * Agregar ítem al inventario general
   */
  addGeneralItem: async (itemData) => {
    await addDoc(collection(db, "inventario_general"), {
      nombre: itemData.nombre,
      cantidad: parseInt(itemData.cantidad),
      tipo_medida: itemData.tipo_medida || "Unidad",
      notas: itemData.notas || "",
      ultimaModificacion: new Date(),
    });
  },

  /**
   * Actualizar ítem existente
   */
  updateGeneralItem: async (id, itemData) => {
    const ref = doc(db, "inventario_general", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error("El ítem ya no existe");

    await updateDoc(ref, {
      nombre: itemData.nombre,
      cantidad: parseInt(itemData.cantidad),
      tipo_medida: itemData.tipo_medida,
      notas: itemData.notas,
      ultimaModificacion: new Date(),
    });
  },

  /**
   * Eliminar ítem del inventario general
   */
  deleteGeneralItem: async (id) => {
    await deleteDoc(doc(db, "inventario_general", id));
  },

  /**
   * Mover ítem a un proyecto
   */
  moveToProject: async (moveData) => {
    const { itemId, item, cantidad, proyectoDestino } = moveData;
    const cantidadInt = parseInt(cantidad);

    if (!proyectoDestino) throw new Error("Proyecto destino no definido");

    // Verificar existencia y actualizar inventario general
    const refActual = doc(db, "inventario_general", itemId);
    const snap = await getDoc(refActual);
    if (!snap.exists()) throw new Error("El ítem ya no existe en inventario general");

    await updateDoc(refActual, {
      cantidad: item.cantidad - cantidadInt,
      ultimaModificacion: new Date(),
    });

    // Buscar o crear el ítem dentro del proyecto destino
    const colDestino = collection(db, `proyectos/${proyectoDestino}/inventario`);
    const snapshot = await getDocs(colDestino);
    const existente = snapshot.docs.find((d) => d.data().nombre === item.nombre);

    if (existente) {
      await updateDoc(doc(db, `proyectos/${proyectoDestino}/inventario`, existente.id), {
        cantidad: existente.data().cantidad + cantidadInt,
        ultimaModificacion: new Date(),
      });
    } else {
      await addDoc(colDestino, {
        nombre: item.nombre,
        cantidad: cantidadInt,
        tipo_medida: item.tipo_medida || "Unidad",
        notas: item.notas || "",
        ultimaModificacion: new Date(),
      });
    }

    return { success: true };
  },

  /**
   * Registrar movimiento en el historial
   */
  registerMovement: async (movementData) => {
    try {
      const movementWithTimestamp = {
        ...movementData,
        fecha: new Date().toISOString(),
        timestamp: new Date(), // Para ordenamiento
      };

      await addDoc(collection(db, "inventario_movimientos"), movementWithTimestamp);
      return { success: true };
    } catch (error) {
      console.error("Error registrando movimiento:", error);
      throw new Error("No se pudo registrar el movimiento en el historial");
    }
  },

  /**
   * Obtener historial de movimientos
   */
  getMovementHistory: async () => {
    try {
      const q = query(
        collection(db, "inventario_movimientos"),
        orderBy("timestamp", "desc")
      );

      const snapshot = await getDocs(q);
      const movements = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return movements;
    } catch (error) {
      console.error("Error obteniendo historial:", error);
      throw new Error("No se pudo obtener el historial de movimientos");
    }
  },

  /**
   * Mover ítem a proyecto con registro en historial
   */
  moveToProjectWithHistory: async (moveData) => {
    const { itemId, item, cantidad, proyectoDestino, usuario, proyectoDestinoTitle } = moveData;

    try {
      await inventoryService.moveToProject(moveData);

      await inventoryService.registerMovement({
        material: item.nombre,
        cantidad: cantidad,
        tipo: "movimiento",
        origen: "Inventario General",
        destino: `Proyecto: ${proyectoDestinoTitle || proyectoDestino}`,
        usuario: usuario || "Sistema",
        proyectoOrigen: "Inventario General",
        proyectoDestino: proyectoDestinoTitle || proyectoDestino,
        unidad: item.tipo_medida || "Unidad",
        notas: "Movimiento desde inventario general al proyecto",
      });

      return { success: true };
    } catch (error) {
      console.error("Error en moveToProjectWithHistory:", error);
      throw new Error("No se pudo completar el movimiento con historial");
    }
  },

  /**
   * Agregar ítem con registro en historial
   */
  addGeneralItemWithHistory: async (itemData, usuario) => {
    try {
      await inventoryService.addGeneralItem(itemData);

      await inventoryService.registerMovement({
        material: itemData.nombre,
        cantidad: itemData.cantidad,
        tipo: "entrada",
        origen: "Nuevo ingreso",
        destino: "Inventario General",
        usuario: usuario || "Sistema",
        proyectoOrigen: "N/A",
        proyectoDestino: "Inventario General",
        unidad: itemData.tipo_medida || "Unidad",
        notas: itemData.notas || "Nuevo material agregado",
      });

      return { success: true };
    } catch (error) {
      console.error("Error en addGeneralItemWithHistory:", error);
      throw new Error("No se pudo agregar el ítem con historial");
    }
  },

  /**
   * Eliminar ítem con registro en historial
   */
  deleteGeneralItemWithHistory: async (itemId, item, usuario, razon = "Eliminación") => {
    try {
      await inventoryService.deleteGeneralItem(itemId);

      await inventoryService.registerMovement({
        material: item.nombre,
        cantidad: item.cantidad,
        tipo: "salida",
        origen: "Inventario General",
        destino: "Eliminado",
        usuario: usuario || "Sistema",
        proyectoOrigen: "Inventario General",
        proyectoDestino: "N/A",
        unidad: item.tipo_medida || "Unidad",
        notas: `Material eliminado: ${razon}`,
      });

      return { success: true };
    } catch (error) {
      console.error("Error en deleteGeneralItemWithHistory:", error);
      throw new Error("No se pudo eliminar el ítem con historial");
    }
  },
};

export default inventoryService;
