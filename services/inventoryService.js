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
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "../firebase/firebaseConfig";
import { getFaseByCodigo } from "../utils/classifyMaterial";

/**
 * Servicio integral de gestión de inventario para el sistema de proyectos solares.
 * 
 * Este servicio maneja todas las operaciones relacionadas con:
 * - Inventario general de materiales
 * - Movimientos entre inventario general y proyectos
 * - Historial de transacciones
 * - Gestión de gastos reales por proyecto
 * - Sistema de fases (fase1/fase2) para clasificación de materiales
 * 
 * Arquitectura modular:
 * 1. Gestión de inventario general
 * 2. Historial de movimientos
 * 3. Movimientos inventario → proyecto
 * 4. Operaciones entre proyectos
 * 5. Compatibilidad con funciones en inglés
 * 
 * @module inventoryService
 */

/* ======================================================
 * UTILIDADES INTERNAS
 * ====================================================== */

/**
 * Obtiene la cantidad disponible de un material a partir de diferentes nombres de campo
 * @param {Object} data - Objeto de datos del material
 * @returns {number} Cantidad disponible
 * @private
 */
const getCantidad = (data) => {
  if (typeof data.cantidadActual === "number") return data.cantidadActual;
  if (typeof data.cantidad_disponible === "number")
    return data.cantidad_disponible;
  if (typeof data.cantidad === "number") return data.cantidad;
  return 0;
};

/**
 * Resuelve el nombre del actor (usuario) actual para registro en historial
 * @returns {Promise<string>} Nombre del usuario o "Sistema" si no se puede determinar
 * @private
 */
const getActorNombre = async () => {
  try {
    const user = auth.currentUser;
    if (!user) return "Sistema";

    const ref = doc(db, "usuarios_permitidos", user.uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return user.email || "Usuario";
    }

    const data = snap.data();
    return data.nombre || data.email || user.email || "Usuario";
  } catch (error) {
    console.error("Error resolviendo actorNombre:", error);
    return "Sistema";
  }
};

/**
 * Determina la fase de compra (fase1 o fase2) basándose en el código del material
 * Solo para materiales de compras directas (no transferencias internas)
 * @param {string} codigo - Código del material
 * @returns {string} "fase1" o "fase2"
 * @private
 */
const getFaseCompra = (codigo) => {
  const f = getFaseByCodigo(codigo || "");
  return f === "fase1" ? "fase1" : "fase2";
};

/* ======================================================
 * INVENTORY SERVICE
 * ====================================================== */

export const inventoryService = {
  /* ======================================================
   * 1. GESTIÓN DE INVENTARIO GENERAL
   * ====================================================== */

  /**
   * Obtiene todos los items del inventario general
   * @async
   * @returns {Promise<Array<Object>>} Lista de materiales del inventario general
   */
  async getAllGeneral() {
    const snap = await getDocs(collection(db, "inventario_general"));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  /**
   * Agrega un ítem al inventario general (sin historial)
   * @async
   * @param {Object} itemData - Datos del material a agregar
   * @param {string} itemData.nombre - Nombre del material
   * @param {string} [itemData.categoria] - Categoría del material
   * @param {number} itemData.cantidad - Cantidad inicial
   * @param {string} [itemData.tipo_medida="Unidad"] - Unidad de medida
   * @param {number} itemData.precio - Precio unitario
   * @param {string} [itemData.codigo=""] - Código único del material
   * @param {string} [itemData.notas=""] - Notas adicionales
   * @param {number|null} [itemData.minimo=null] - Stock mínimo para alertas
   */
  agregarItemInventarioGeneral: async (itemData) => {
    await addDoc(collection(db, "inventario_general"), {
      nombre: itemData.nombre,
      categoria: itemData.categoria || "",
      cantidad: Number(itemData.cantidad ?? 0),
      tipo_medida: itemData.tipo_medida || "Unidad",
      precio: Number(itemData.precio ?? 0),
      codigo: itemData.codigo || "",
      notas: itemData.notas || "",
      minimo: itemData.minimo ?? null, // Campo de stock mínimo agregado
      ultimaModificacion: new Date(),
    });
  },

  /**
   * Actualiza un ítem existente en el inventario general
   * @async
   * @param {string} id - ID del documento en Firestore
   * @param {Object} itemData - Campos a actualizar (pueden ser parciales)
   */
  actualizarItemInventarioGeneral: async (id, itemData) => {
    const ref = doc(db, "inventario_general", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error("El ítem ya no existe");

    const current = snap.data();

    await updateDoc(ref, {
      nombre: itemData.nombre ?? current.nombre,
      categoria: itemData.categoria ?? current.categoria ?? "",
      cantidad: Number(itemData.cantidad ?? current.cantidad ?? 0),
      tipo_medida: itemData.tipo_medida ?? current.tipo_medida ?? "Unidad",
      precio: Number(itemData.precio ?? current.precio ?? 0),
      codigo: itemData.codigo ?? current.codigo ?? "",
      notas: itemData.notas ?? current.notas ?? "",
      minimo: itemData.minimo !== undefined ? itemData.minimo : current.minimo ?? null,
      ultimaModificacion: new Date(),
    });
  },

  /**
   * Elimina un ítem del inventario general
   * @async
   * @param {string} id - ID del documento a eliminar
   */
  eliminarItemInventarioGeneral: async (id) => {
    await deleteDoc(doc(db, "inventario_general", id));
  },

  /**
   * Agrega un ítem al inventario general y registra el movimiento en historial
   * @async
   * @param {Object} itemData - Datos completos del material
   */
  agregarItemGeneralConHistorial: async (itemData) => {
    const actorNombre = await getActorNombre();

    await inventoryService.agregarItemInventarioGeneral(itemData);

    await inventoryService.registrarMovimiento({
      material: itemData.nombre,
      cantidad: Number(itemData.cantidad ?? 0),
      tipo: "entrada",
      origen: "Nuevo ingreso",
      destino: "Inventario General",
      usuario: actorNombre,
      unidad: itemData.tipo_medida || "Unidad",
      notas: itemData.notas || "Nuevo material agregado",
    });
  },

  /**
   * Elimina un ítem del inventario general y registra la acción en historial
   * @async
   * @param {string} itemId - ID del material a eliminar
   * @param {Object} item - Objeto completo del material (para registro)
   * @param {string} [razon="Eliminación"] - Razón de la eliminación
   */
  eliminarItemGeneralConHistorial: async (
    itemId,
    item,
    razon = "Eliminación"
  ) => {
    const actorNombre = await getActorNombre();

    await inventoryService.eliminarItemInventarioGeneral(itemId);

    await inventoryService.registrarMovimiento({
      material: item.nombre,
      cantidad: Number(item.cantidad ?? 0),
      tipo: "salida",
      origen: "Inventario General",
      destino: "Eliminado",
      usuario: actorNombre,
      unidad: item.tipo_medida || "Unidad",
      notas: `Material eliminado: ${razon}`,
    });
  },

  /* ======================================================
   * 2. HISTORIAL DE MOVIMIENTOS
   * ====================================================== */

  /**
   * Registra un movimiento en el historial de inventario
   * @async
   * @param {Object} movementData - Datos del movimiento
   * @param {string} movementData.material - Nombre del material
   * @param {number} movementData.cantidad - Cantidad movida
   * @param {string} movementData.tipo - Tipo de movimiento (entrada, salida, uso, etc.)
   * @param {string} movementData.origen - Origen del movimiento
   * @param {string} movementData.destino - Destino del movimiento
   * @param {string} [movementData.usuario] - Usuario que realizó la acción
   * @param {string} movementData.unidad - Unidad de medida
   * @param {string} [movementData.notas] - Notas adicionales
   * @returns {Promise<Object>} Referencia del documento creado (contiene ID para gastos)
   */
  registrarMovimiento: async (movementData) => {
    const actorNombre = await getActorNombre();

    const ref = await addDoc(collection(db, "inventario_movimientos"), {
      ...movementData,
      actorNombre,
      usuario: movementData.usuario || actorNombre,
      fecha: new Date().toISOString(),
      timestamp: new Date(),
    });

    return ref; // ✅ Retorna referencia para usar ID en registro de gastos
  },

  /**
   * Obtiene el historial completo de movimientos ordenado por fecha descendente
   * @async
   * @returns {Promise<Array<Object>>} Lista de movimientos históricos
   */
  obtenerHistorialMovimientos: async () => {
    const q = query(
      collection(db, "inventario_movimientos"),
      orderBy("timestamp", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  /* ======================================================
   * 3. MOVIMIENTOS DESDE INVENTARIO GENERAL HACIA PROYECTOS
   * ====================================================== */

  /**
   * Descuenta material del inventario general y lo suma al inventario de un proyecto
   * NO registra historial - solo realiza el movimiento físico
   * @async
   * @param {Object} moveData - Datos del movimiento
   * @param {string} moveData.itemId - ID del material en inventario general
   * @param {Object} moveData.item - Objeto completo del material
   * @param {number} moveData.cantidad - Cantidad a mover
   * @param {string} moveData.proyectoDestino - ID del proyecto destino
   * @throws {Error} Si el material no existe o no hay stock suficiente
   */
  moverAProyecto: async (moveData) => {
    const { itemId, item, cantidad, proyectoDestino } = moveData;
    const cantidadInt = Number(cantidad);

    if (!proyectoDestino) {
      throw new Error("Proyecto destino no definido");
    }

    // 1. Validar y actualizar inventario general
    const refGeneral = doc(db, "inventario_general", itemId);
    const snapGeneral = await getDoc(refGeneral);
    if (!snapGeneral.exists()) {
      throw new Error("El ítem ya no existe en inventario general");
    }

    const generalData = snapGeneral.data();
    const stockActual = Number(generalData.cantidad ?? 0);

    if (cantidadInt > stockActual) {
      throw new Error(
        `Cantidad solicitada mayor al stock disponible (${stockActual}).`
      );
    }

    await updateDoc(refGeneral, {
      cantidad: stockActual - cantidadInt,
      ultimaModificacion: new Date(),
    });

    // 2. Sumar al inventario del proyecto
    const colProyecto = collection(db, "proyectos", proyectoDestino, "inventario");
    const snapProyecto = await getDocs(colProyecto);

    let existente = null;

    if (item.codigo) {
      existente = snapProyecto.docs.find((d) => d.data().codigo === item.codigo);
    }

    if (!existente) {
      existente = snapProyecto.docs.find((d) => d.data().nombre === item.nombre);
    }

    const actorNombre = await getActorNombre();

    if (existente) {
      const data = existente.data();
      const actual = getCantidad(data);
      const original = Number(data.cantidadOriginal ?? data.cantidad ?? 0);

      await updateDoc(
        doc(db, "proyectos", proyectoDestino, "inventario", existente.id),
        {
          cantidadActual: actual + cantidadInt,
          cantidadOriginal: original + cantidadInt,
          updatedAt: new Date(),
          updatedBy: actorNombre,
        }
      );
    } else {
      await addDoc(colProyecto, {
        nombre: item.nombre,
        categoria: item.categoria || "",
        codigo: item.codigo || "",
        tipo_medida: item.tipo_medida || "Unidad",
        precio: Number(item.precio ?? 0),
        cantidadOriginal: cantidadInt,
        cantidadActual: cantidadInt,
        creadoEn: new Date(),
        creadoPor: actorNombre,
        updatedAt: new Date(),
        updatedBy: actorNombre,
      });
    }
  },

  /**
   * Mueve material a un proyecto y registra tanto el historial como el gasto real
   * Utilizado desde la pantalla de Inventario General
   * @async
   * @param {Object} moveData - Datos del movimiento
   * @param {Object} moveData.item - Material a mover
   * @param {number} moveData.cantidad - Cantidad a mover
   * @param {string} moveData.proyectoDestino - ID del proyecto destino
   * @param {string} [moveData.proyectoDestinoTitle] - Título del proyecto destino
   */
  moverAProyectoConHistorial: async (moveData) => {
    const { item, cantidad, proyectoDestino, proyectoDestinoTitle } = moveData;

    await inventoryService.moverAProyecto(moveData);

    const actorNombre = await getActorNombre();

    // ✅ 1) Registrar movimiento en historial (obtiene ID para gasto)
    const movRef = await inventoryService.registrarMovimiento({
      material: item.nombre,
      cantidad: Number(cantidad),
      tipo: "movimiento",
      origen: "Inventario General",
      destino: `Proyecto: ${proyectoDestinoTitle || proyectoDestino}`,
      usuario: actorNombre,
      proyectoOrigen: "Inventario General",
      proyectoDestino: proyectoDestinoTitle || proyectoDestino,
      unidad: item.tipo_medida || "Unidad",
      notas: "Movimiento desde inventario general al proyecto",
    });

    // ✅ 2) Registrar gasto real persistente en el proyecto destino
    const qty = Number(cantidad) || 0;
    const unit = Number(item.precio ?? 0);
    const fase = getFaseCompra(item.codigo); // Determinar fase basada en código

    await setDoc(
      doc(db, "proyectos", proyectoDestino, "gastosMaterial", movRef.id),
      {
        nombre: item.nombre || "",
        codigo: item.codigo || "",
        categoria: item.categoria || "",
        tipo_medida: item.tipo_medida || "Unidad",

        fase, // fase1 o fase2 según clasificación
        cantidad: qty,
        precioUnitario: unit,
        total: unit * qty,

        createdAt: new Date().toISOString(),
        createdBy: actorNombre,

        origen: "ingreso_inventario_proyecto",
        source: "inventario_general", // Indica que viene del inventario general
      }
    );
  },

  /**
   * Alias para mover material a proyecto con historial (desde ProjectStockScreen)
   * @async
   * @param {Object} args - Argumentos de asignación
   * @param {string} args.projectId - ID del proyecto destino
   * @param {Object} args.material - Material a asignar
   * @param {number} args.cantidad - Cantidad a asignar
   * @param {string} [args.proyectoTitle] - Título del proyecto
   */
  asignarMaterialAProyectoConHistorial: async ({
    projectId,
    material,
    cantidad,
    proyectoTitle,
  }) => {
    return inventoryService.moverAProyectoConHistorial({
      itemId: material.id,
      item: material,
      cantidad,
      proyectoDestino: projectId,
      proyectoDestinoTitle: proyectoTitle,
    });
  },

  /**
   * Agrega material externo (comprado directamente) al proyecto
   * SIN afectar el inventario general, pero exige que el material exista en el catálogo
   * Registra gasto real en el proyecto
   * @async
   * @param {Object} args - Datos del material externo
   */
  agregarMaterialExternoAProyecto: async ({
    projectId,
    material,
    cantidad,
    proyectoTitle,
  }) => {
    const qty = Number(cantidad);
    const colProyecto = collection(db, "proyectos", projectId, "inventario");
    const snapProyecto = await getDocs(colProyecto);

    let existente = null;
    if (material.codigo) {
      existente = snapProyecto.docs.find((d) => d.data().codigo === material.codigo);
    }
    if (!existente) {
      existente = snapProyecto.docs.find((d) => d.data().nombre === material.nombre);
    }

    const actorNombre = await getActorNombre();

    if (existente) {
      const data = existente.data();
      const actual = getCantidad(data);
      const original = Number(data.cantidadOriginal ?? 0);

      await updateDoc(doc(db, "proyectos", projectId, "inventario", existente.id), {
        cantidadActual: actual + qty,
        cantidadOriginal: original + qty,
        updatedAt: new Date(),
        updatedBy: actorNombre,
      });
    } else {
      await addDoc(colProyecto, {
        nombre: material.nombre,
        categoria: material.categoria || "",
        codigo: material.codigo || "",
        tipo_medida: material.tipo_medida || "Unidad",
        precio: Number(material.precio ?? 0),
        cantidadOriginal: qty,
        cantidadActual: qty,
        creadoEn: new Date(),
        creadoPor: actorNombre,
        updatedAt: new Date(),
        updatedBy: actorNombre,
        notas: `Material externo registrado en proyecto ${proyectoTitle || ""}`,
      });
    }

    // ✅ Registrar movimiento en historial
    const movRef = await inventoryService.registrarMovimiento({
      material: material.nombre,
      cantidad: qty,
      tipo: "entrada_externa",
      origen: "Compra directa / Externo",
      destino: `Proyecto: ${proyectoTitle || projectId}`,
      usuario: actorNombre,
      unidad: material.tipo_medida || "Unidad",
      notas: "Material externo agregado directamente al proyecto",
    });

    // ✅ Registrar gasto real en proyecto destino
    const unit = Number(material.precio ?? 0);
    const fase = getFaseCompra(material.codigo);

    await setDoc(doc(db, "proyectos", projectId, "gastosMaterial", movRef.id), {
      nombre: material.nombre || "",
      codigo: material.codigo || "",
      categoria: material.categoria || "",
      tipo_medida: material.tipo_medida || "Unidad",

      fase,
      cantidad: qty,
      precioUnitario: unit,
      total: unit * qty,

      createdAt: new Date().toISOString(),
      createdBy: actorNombre,

      origen: "ingreso_inventario_proyecto",
      source: "externo", // Indica que es una compra directa externa
    });
  },

  /* ======================================================
   * 4. OPERACIONES DE USO, DEVOLUCIÓN Y TRANSFERENCIA ENTRE PROYECTOS
   * ====================================================== */

  /**
   * Registra el uso de material dentro de un proyecto
   * Descuenta del inventario del proyecto pero NO registra gasto real
   * @async
   * @param {Object} args - Datos del uso
   */
  registrarUsoMaterialProyecto: async ({
    projectId,
    item,
    usedAmount,
    proyectoTitle,
  }) => {
    const qty = Number(usedAmount);
    const ref = doc(db, "proyectos", projectId, "inventario", item.id);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error("Material no existe en el proyecto.");

    const data = snap.data();
    const disponible = getCantidad(data);

    if (qty > disponible) {
      throw new Error(`No puede usar más de lo disponible (${disponible}).`);
    }

    const actorNombre = await getActorNombre();

    // 1) Actualizar inventario del proyecto
    await updateDoc(ref, {
      cantidadActual: disponible - qty,
      updatedAt: new Date(),
      updatedBy: actorNombre,
    });

    // 2) Registrar movimiento en historial
    await inventoryService.registrarMovimiento({
      material: data.nombre,
      cantidad: qty,
      tipo: "uso",
      origen: `Proyecto: ${proyectoTitle || projectId}`,
      destino: "Consumo interno",
      usuario: actorNombre,
      unidad: data.tipo_medida || "Unidad",
      notas: "Uso de material en proyecto",
    });

    // ❌ NO se registra gasto real aquí (ya fue registrado al ingresar el material)
  },

  /**
   * Devuelve material desde un proyecto al inventario general
   * No afecta la inversión original del proyecto
   * @async
   * @param {Object} args - Datos de la devolución
   */
  devolverMaterialAInventarioGeneral: async ({
    projectId,
    item,
    cantidad,
    proyectoTitle,
  }) => {
    const qty = Number(cantidad);

    // 1. Leer material en proyecto
    const refProyecto = doc(db, "proyectos", projectId, "inventario", item.id);
    const snapProyecto = await getDoc(refProyecto);
    if (!snapProyecto.exists()) {
      throw new Error("Material no existe en el proyecto.");
    }

    const dataProyecto = snapProyecto.data();
    const disponible = getCantidad(dataProyecto);

    if (qty > disponible) {
      throw new Error(`No puede devolver más de lo disponible (${disponible}).`);
    }

    const actorNombre = await getActorNombre();

    // Restar solo de cantidadActual (no de cantidadOriginal)
    await updateDoc(refProyecto, {
      cantidadActual: disponible - qty,
      updatedAt: new Date(),
      updatedBy: actorNombre,
    });

    // 2. Actualizar inventario general según tipo de material
    if (dataProyecto.tipo_medida !== "Metro") {
      // Unidades: sumar al ítem existente en inventario general
      const genSnap = await getDocs(collection(db, "inventario_general"));

      let match = null;
      if (dataProyecto.codigo) {
        match = genSnap.docs.find((d) => d.data().codigo === dataProyecto.codigo);
      }
      if (!match) {
        match = genSnap.docs.find((d) => d.data().nombre === dataProyecto.nombre);
      }

      if (!match) {
        throw new Error(
          "No se encontró el material en el inventario general para hacer la devolución."
        );
      }

      const d = match.data();
      const actualGen = Number(d.cantidad ?? 0);

      await updateDoc(doc(db, "inventario_general", match.id), {
        cantidad: actualGen + qty,
        ultimaModificacion: new Date(),
      });
    } else {
      // Metros: crear ítem nuevo separado (no se mezclan metrajes)
      await addDoc(collection(db, "inventario_general"), {
        nombre: `${dataProyecto.nombre} (sobrante proyecto ${proyectoTitle || projectId})`,
        categoria: dataProyecto.categoria || "",
        cantidad: qty,
        tipo_medida: "Metro",
        precio: Number(dataProyecto.precio ?? 0),
        codigo: dataProyecto.codigo || "",
        notas: "Metraje devuelto desde proyecto",
        createdAt: new Date(),
        ultimaModificacion: new Date(),
      });
    }

    // Registrar movimiento en historial
    await inventoryService.registrarMovimiento({
      material: dataProyecto.nombre,
      cantidad: qty,
      tipo: "devolucion",
      origen: `Proyecto: ${proyectoTitle || projectId}`,
      destino: "Inventario General",
      usuario: actorNombre,
      unidad: dataProyecto.tipo_medida || "Unidad",
      notas: "Devolución de material desde proyecto al inventario general",
    });
  },

  /**
   * Transfiere material entre proyectos sin pasar por inventario general
   * Registra gasto real SOLO en el proyecto destino
   * @async
   * @param {Object} args - Datos de la transferencia
   */
  transferirMaterialEntreProyectos: async ({
    origenId,
    destinoId,
    item,
    cantidad,
    origenTitle,
    destinoTitle,
  }) => {
    const qty = Number(cantidad);

    // 1. Descontar del proyecto origen
    const origenRef = doc(db, "proyectos", origenId, "inventario", item.id);
    const snapOrigen = await getDoc(origenRef);
    if (!snapOrigen.exists())
      throw new Error("Material no existe en proyecto origen.");

    const dataOrigen = snapOrigen.data();
    const disponible = getCantidad(dataOrigen);

    if (qty > disponible) {
      throw new Error(
        `No puede transferir más de lo disponible en el proyecto origen (${disponible}).`
      );
    }

    const actorNombre = await getActorNombre();

    await updateDoc(origenRef, {
      cantidadActual: disponible - qty,
      updatedAt: new Date(),
      updatedBy: actorNombre,
    });

    // 2. Sumar al proyecto destino
    const colDestino = collection(db, "proyectos", destinoId, "inventario");
    const snapDestino = await getDocs(colDestino);

    let existente = null;
    if (dataOrigen.codigo) {
      existente = snapDestino.docs.find((d) => d.data().codigo === dataOrigen.codigo);
    }
    if (!existente) {
      existente = snapDestino.docs.find((d) => d.data().nombre === dataOrigen.nombre);
    }

    if (existente) {
      const dataDest = existente.data();
      const actualDest = getCantidad(dataDest);
      const originalDest = Number(dataDest.cantidadOriginal ?? 0);

      await updateDoc(doc(db, "proyectos", destinoId, "inventario", existente.id), {
        cantidadActual: actualDest + qty,
        cantidadOriginal: originalDest + qty,
        updatedAt: new Date(),
        updatedBy: actorNombre,
      });
    } else {
      await addDoc(colDestino, {
        nombre: dataOrigen.nombre,
        categoria: dataOrigen.categoria || "",
        codigo: dataOrigen.codigo || "",
        tipo_medida: dataOrigen.tipo_medida || "Unidad",
        precio: Number(dataOrigen.precio ?? 0),
        cantidadOriginal: qty,
        cantidadActual: qty,
        creadoEn: new Date(),
        creadoPor: actorNombre,
        updatedAt: new Date(),
        updatedBy: actorNombre,
      });
    }

    // ✅ Registrar movimiento en historial
    const movRef = await inventoryService.registrarMovimiento({
      tipo: "transferencia",
      material: dataOrigen.nombre,
      cantidad: qty,
      origen: origenTitle || origenId,
      destino: destinoTitle || destinoId,
      usuario: actorNombre,
      unidad: dataOrigen.tipo_medida || "Unidad",
      notas: "Transferencia de material entre proyectos",
    });

    // ✅ Registrar gasto real SOLO en el proyecto destino
    const unit = Number(dataOrigen.precio ?? 0);
    const fase = getFaseCompra(dataOrigen.codigo);

    await setDoc(doc(db, "proyectos", destinoId, "gastosMaterial", movRef.id), {
      nombre: dataOrigen.nombre || "",
      codigo: dataOrigen.codigo || "",
      categoria: dataOrigen.categoria || "",
      tipo_medida: dataOrigen.tipo_medida || "Unidad",

      fase,
      cantidad: qty,
      precioUnitario: unit,
      total: unit * qty,

      createdAt: new Date().toISOString(),
      createdBy: actorNombre,

      origen: "ingreso_inventario_proyecto",
      source: "transferencia_proyecto",
      proyectoOrigen: origenTitle || origenId,
    });
  },

  /* ======================================================
   * 5. ALIAS EN INGLÉS PARA COMPATIBILIDAD CON CÓDIGO EXISTENTE
   * ====================================================== */

  /** @alias getAllGeneral */
  getAllGeneralItems() {
    return this.getAllGeneral();
  },

  /** @alias agregarItemInventarioGeneral */
  addGeneralItem(itemData) {
    return this.agregarItemInventarioGeneral(itemData);
  },

  /** @alias actualizarItemInventarioGeneral */
  updateGeneralItem(id, data) {
    return this.actualizarItemInventarioGeneral(id, data);
  },

  /** @alias eliminarItemInventarioGeneral */
  deleteGeneralItem(id) {
    return this.eliminarItemInventarioGeneral(id);
  },

  /** @alias agregarItemGeneralConHistorial */
  addGeneralItemWithHistory(itemData) {
    return this.agregarItemGeneralConHistorial(itemData);
  },

  /** @alias eliminarItemGeneralConHistorial */
  deleteGeneralItemWithHistory(itemId, item, razon) {
    return this.eliminarItemGeneralConHistorial(itemId, item, razon);
  },

  /** @alias registrarMovimiento */
  registerMovement(data) {
    return this.registrarMovimiento(data);
  },

  /** @alias obtenerHistorialMovimientos */
  getMovementHistory() {
    return this.obtenerHistorialMovimientos();
  },

  /** @alias moverAProyecto */
  moveToProject(moveData) {
    return this.moverAProyecto(moveData);
  },

  /** @alias moverAProyectoConHistorial */
  moveToProjectWithHistory(moveData) {
    return this.moverAProyectoConHistorial(moveData);
  },

  /** @alias moverAProyectoConHistorial */
  moveToProjectWithHistoryLegacy({
    itemId,
    item,
    cantidad,
    proyectoDestino,
    proyectoDestinoTitle,
  }) {
    return this.moverAProyectoConHistorial({
      itemId,
      item,
      cantidad,
      proyectoDestino,
      proyectoDestinoTitle,
    });
  },

  /** @alias asignarMaterialAProyectoConHistorial */
  assignToProjectWithHistory(args) {
    return this.asignarMaterialAProyectoConHistorial(args);
  },

  /** @alias registrarUsoMaterialProyecto */
  updateProjectUsage(args) {
    return this.registrarUsoMaterialProyecto(args);
  },

  /** @alias devolverMaterialAInventarioGeneral */
  returnMaterialToGeneral(args) {
    return this.devolverMaterialAInventarioGeneral(args);
  },

  /** @alias transferirMaterialEntreProyectos */
  transferBetweenProjects(args) {
    return this.transferirMaterialEntreProyectos(args);
  },
};

export default inventoryService;
