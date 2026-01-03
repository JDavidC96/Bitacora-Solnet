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
import { getFaseByCodigo } from "../utils/classifyMaterial"; // ✅ NUEVO

/* ======================================================
 * UTILIDADES INTERNAS
 * ====================================================== */

// Utilidad interna para cantidad disponible
const getCantidad = (data) => {
  if (typeof data.cantidadActual === "number") return data.cantidadActual;
  if (typeof data.cantidad_disponible === "number")
    return data.cantidad_disponible;
  if (typeof data.cantidad === "number") return data.cantidad;
  return 0;
};

// Resolver nombre humano del actor
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

// ✅ Para compras: SOLO fase1/fase2
const getFaseCompra = (codigo) => {
  const f = getFaseByCodigo(codigo || "");
  return f === "fase1" ? "fase1" : "fase2";
};

/* ======================================================
 * INVENTORY SERVICE
 * ====================================================== */

export const inventoryService = {
  /* ======================================================
   * 1. INVENTARIO GENERAL
   * ====================================================== */

  /** Obtener todos los items del inventario general */
  async getAllGeneral() {
    const snap = await getDocs(collection(db, "inventario_general"));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  /** Agregar ítem al inventario general */
  agregarItemInventarioGeneral: async (itemData) => {
    await addDoc(collection(db, "inventario_general"), {
      nombre: itemData.nombre,
      categoria: itemData.categoria || "",
      cantidad: Number(itemData.cantidad ?? 0),
      tipo_medida: itemData.tipo_medida || "Unidad",
      precio: Number(itemData.precio ?? 0),
      codigo: itemData.codigo || "",
      notas: itemData.notas || "",
      minimo: itemData.minimo ?? null,
      ultimaModificacion: new Date(),
    });
  },

  /** Actualizar ítem existente del inventario general */
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
      minimo:
        itemData.minimo !== undefined ? itemData.minimo : current.minimo ?? null,
      ultimaModificacion: new Date(),
    });
  },

  /** Eliminar ítem del inventario general */
  eliminarItemInventarioGeneral: async (id) => {
    await deleteDoc(doc(db, "inventario_general", id));
  },

  /** Agregar ítem general + historial */
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

  /** Eliminar ítem general + historial */
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

  /** Registrar movimiento en el historial */
  registrarMovimiento: async (movementData) => {
    const actorNombre = await getActorNombre();

    const ref = await addDoc(collection(db, "inventario_movimientos"), {
      ...movementData,
      actorNombre,
      usuario: movementData.usuario || actorNombre,
      fecha: new Date().toISOString(),
      timestamp: new Date(),
    });

    return ref; // ✅ NUEVO: usamos ref.id para el gasto
  },

  /** Obtener historial de movimientos ordenados por fecha descendente */
  obtenerHistorialMovimientos: async () => {
    const q = query(
      collection(db, "inventario_movimientos"),
      orderBy("timestamp", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  /* ======================================================
   * 3. MOVIMIENTO DESDE INVENTARIO GENERAL → PROYECTO
   * ====================================================== */

  /**
   * Descontar inventario general y sumar al inventario de un proyecto.
   * NO registra historial, solo hace el movimiento.
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
   * Movimiento a proyecto + historial
   * (usado desde Inventario General)
   */
  moverAProyectoConHistorial: async (moveData) => {
    const { item, cantidad, proyectoDestino, proyectoDestinoTitle } = moveData;

    await inventoryService.moverAProyecto(moveData);

    const actorNombre = await getActorNombre();

    // ✅ 1) Movimiento con id
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

    // ✅ 2) Gasto real persistente en proyecto destino
    const qty = Number(cantidad) || 0;
    const unit = Number(item.precio ?? 0);
    const fase = getFaseCompra(item.codigo);

    await setDoc(
      doc(db, "proyectos", proyectoDestino, "gastosMaterial", movRef.id),
      {
        nombre: item.nombre || "",
        codigo: item.codigo || "",
        categoria: item.categoria || "",
        tipo_medida: item.tipo_medida || "Unidad",

        fase,
        cantidad: qty,
        precioUnitario: unit,
        total: unit * qty,

        createdAt: new Date().toISOString(),
        createdBy: actorNombre,

        origen: "ingreso_inventario_proyecto",
        source: "inventario_general",
      }
    );
  },

  /**
   * Asignar material a proyecto con historial (vista desde ProjectStockScreen)
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
   * Agregar material externo al proyecto (comprado directo),
   * SIN tocar inventario general pero exigiendo que exista en catálogo.
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

    // ✅ Movimiento con id
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

    // ✅ Gasto real persistente en proyecto destino
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
      source: "externo",
    });
  },

  /* ======================================================
   * 4. USO, DEVOLUCIÓN Y TRANSFERENCIA ENTRE PROYECTOS
   * ====================================================== */

  /**
   * Registrar uso de material dentro de un proyecto
   * ✅ YA NO registra gasto real (solo consumo + movimiento)
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

    // 2) Registrar movimiento en historial de inventario
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

    // ❌ NO HAY GASTO REAL AQUÍ
  },

  /**
   * Devolver material del proyecto al inventario general
   * (sin afectar la inversión original del proyecto).
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

    // Restar solo de cantidadActual
    await updateDoc(refProyecto, {
      cantidadActual: disponible - qty,
      updatedAt: new Date(),
      updatedBy: actorNombre,
    });

    // 2. Actualizar inventario general
    if (dataProyecto.tipo_medida !== "Metro") {
      // Unidades: sumar al ítem existente (por código o nombre)
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
      // Metros: crear ítem nuevo separado
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
   * Transferir material entre proyectos, sin pasar por inventario general.
   * ✅ Registra gasto real SOLO en el destino (proyecto B)
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

    // ✅ Movimiento con id
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

    // ✅ Gasto real SOLO en el destino
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
   * 5. ALIAS EN INGLÉS PARA COMPATIBILIDAD
   * ====================================================== */

  getAllGeneralItems() {
    return this.getAllGeneral();
  },

  addGeneralItem(itemData) {
    return this.agregarItemInventarioGeneral(itemData);
  },

  updateGeneralItem(id, data) {
    return this.actualizarItemInventarioGeneral(id, data);
  },

  deleteGeneralItem(id) {
    return this.eliminarItemInventarioGeneral(id);
  },

  addGeneralItemWithHistory(itemData) {
    return this.agregarItemGeneralConHistorial(itemData);
  },

  deleteGeneralItemWithHistory(itemId, item, razon) {
    return this.eliminarItemGeneralConHistorial(itemId, item, razon);
  },

  registerMovement(data) {
    return this.registrarMovimiento(data);
  },

  getMovementHistory() {
    return this.obtenerHistorialMovimientos();
  },

  moveToProject(moveData) {
    return this.moverAProyecto(moveData);
  },

  moveToProjectWithHistory(moveData) {
    return this.moverAProyectoConHistorial(moveData);
  },

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

  assignToProjectWithHistory(args) {
    return this.asignarMaterialAProyectoConHistorial(args);
  },

  updateProjectUsage(args) {
    return this.registrarUsoMaterialProyecto(args);
  },

  returnMaterialToGeneral(args) {
    return this.devolverMaterialAInventarioGeneral(args);
  },

  transferBetweenProjects(args) {
    return this.transferirMaterialEntreProyectos(args);
  },
};

export default inventoryService;
