// services/camionetaService.js
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';
import { getFaseByCodigo } from '../utils/classifyMaterial';

/**
 * Servicio para gestión del inventario de la camioneta.
 *
 * ─── Desde inventario GENERAL ───────────────────────────────────────────────
 *  cargarDesdeGeneral    → descuenta inventario_general, suma a camioneta
 *  descargarAlGeneral    → suma a inventario_general, resta de camioneta
 *  descargarAlProyecto   → suma al inventario del proyecto + gasto real,
 *                          resta de camioneta (no toca el general)
 *
 * ─── Desde inventario de PROYECTO ───────────────────────────────────────────
 *  cargarDesdeProyecto   → descuenta del inventario del proyecto,
 *                          suma a camioneta
 *  (descargar usa los mismos métodos de arriba)
 *
 * Colección Firestore: `inventario_camioneta`
 * Un doc por ítem, doc ID = itemId del inventario_general.
 */

/** @private */
const getActorNombre = async () => {
  try {
    const user = auth.currentUser;
    if (!user) return 'Sistema';
    const snap = await getDoc(doc(db, 'usuarios_permitidos', user.uid));
    if (!snap.exists()) return user.email || 'Usuario';
    const d = snap.data();
    return d.nombre || d.email || user.email || 'Usuario';
  } catch {
    return 'Sistema';
  }
};

/** @private */
const getFaseCompra = (codigo) => {
  const f = getFaseByCodigo(codigo || '');
  return f === 'fase1' ? 'fase1' : 'fase2';
};

/** @private */
const getCantidad = (data) => {
  if (typeof data.cantidadActual === 'number') return data.cantidadActual;
  if (typeof data.cantidad_disponible === 'number') return data.cantidad_disponible;
  if (typeof data.cantidad === 'number') return data.cantidad;
  return 0;
};

/** @private — upsert cantidad en doc de camioneta */
const upsertCamioneta = async (itemId, qty, actor, meta = {}) => {
  const ref = doc(db, 'inventario_camioneta', itemId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await setDoc(ref, {
      ...snap.data(),
      cantidad: Number(snap.data().cantidad || 0) + qty,
      ultimaModificacion: new Date(),
      ultimoUsuario: actor,
    });
  } else {
    await setDoc(ref, {
      itemId,
      cantidad: qty,
      cargadoPor: actor,
      fechaCarga: new Date(),
      ultimaModificacion: new Date(),
      ultimoUsuario: actor,
      ...meta,
    });
  }
};

/** @private — reduce o elimina el doc de camioneta */
const reducirCamioneta = async (ref, current, qty, actor) => {
  const nueva = Number(current.cantidad || 0) - qty;
  if (nueva <= 0) {
    await deleteDoc(ref);
  } else {
    await setDoc(ref, { ...current, cantidad: nueva, ultimaModificacion: new Date(), ultimoUsuario: actor });
  }
};

export const camionetaService = {

  /* ============================================================
   * CARGAR DESDE INVENTARIO GENERAL
   * ============================================================ */
  /**
   * Descuenta del inventario_general y suma a camioneta.
   * @throws {Error} Si no hay stock suficiente
   */
  cargarDesdeGeneral: async ({ itemId, nombre, codigo, categoria, tipo_medida, precio, cantidad }) => {
    const qty = Number(cantidad);
    const actor = await getActorNombre();

    const refGeneral = doc(db, 'inventario_general', itemId);
    const snapGeneral = await getDoc(refGeneral);
    if (!snapGeneral.exists()) throw new Error('El ítem ya no existe en el inventario.');

    const stockActual = Number(snapGeneral.data().cantidad ?? 0);
    if (qty > stockActual) {
      throw new Error(`Stock insuficiente. Disponible: ${stockActual} ${tipo_medida || 'Unidad'}.`);
    }

    await updateDoc(refGeneral, { cantidad: stockActual - qty, ultimaModificacion: new Date() });

    await upsertCamioneta(itemId, qty, actor, {
      nombre, codigo: codigo || '', categoria: categoria || '',
      tipo_medida: tipo_medida || 'Unidad', precio: Number(precio || 0),
    });

    await addDoc(collection(db, 'inventario_movimientos'), {
      material: nombre, cantidad: qty, tipo: 'camioneta_carga',
      origen: 'Inventario General', destino: 'Camioneta',
      usuario: actor, unidad: tipo_medida || 'Unidad',
      notas: 'Material cargado en la camioneta desde inventario general',
      fecha: new Date().toISOString(), timestamp: new Date(),
    });
  },

  /* ============================================================
   * CARGAR DESDE INVENTARIO DE PROYECTO
   * ============================================================ */
  /**
   * Descuenta del inventario del proyecto y suma a camioneta.
   * El itemId debe ser el ID del doc en inventario_general (para
   * mantener coherencia en inventario_camioneta).
   *
   * @param {Object} args
   * @param {string} args.projectId          - ID del proyecto origen
   * @param {string} args.projectItemId      - ID del doc en proyectos/{}/inventario
   * @param {string} args.itemId             - ID del doc en inventario_general (para camioneta)
   * @param {string} args.nombre
   * @param {string} [args.codigo]
   * @param {string} [args.categoria]
   * @param {string} [args.tipo_medida]
   * @param {number} [args.precio]
   * @param {number} args.cantidad
   * @param {string} [args.proyectoTitle]
   * @throws {Error} Si no hay stock suficiente en el proyecto
   */
  cargarDesdeProyecto: async ({
    projectId, projectItemId, itemId,
    nombre, codigo, categoria, tipo_medida, precio, cantidad, proyectoTitle,
  }) => {
    const qty = Number(cantidad);
    const actor = await getActorNombre();

    // Validar y descontar del inventario del proyecto
    const refProy = doc(db, 'proyectos', projectId, 'inventario', projectItemId);
    const snapProy = await getDoc(refProy);
    if (!snapProy.exists()) throw new Error('El ítem ya no existe en el inventario del proyecto.');

    const data = snapProy.data();
    const disponible = getCantidad(data);
    if (qty > disponible) {
      throw new Error(`Cantidad insuficiente en el proyecto. Disponible: ${disponible} ${tipo_medida || 'Unidad'}.`);
    }

    await updateDoc(refProy, {
      cantidadActual: disponible - qty,
      updatedAt: new Date(),
      updatedBy: actor,
    });

    await upsertCamioneta(itemId, qty, actor, {
      nombre, codigo: codigo || '', categoria: categoria || '',
      tipo_medida: tipo_medida || 'Unidad', precio: Number(precio || 0),
    });

    await addDoc(collection(db, 'inventario_movimientos'), {
      material: nombre, cantidad: qty, tipo: 'camioneta_carga',
      origen: `Proyecto: ${proyectoTitle || projectId}`, destino: 'Camioneta',
      usuario: actor, unidad: tipo_medida || 'Unidad',
      notas: `Material cargado en camioneta desde proyecto ${proyectoTitle || projectId}`,
      fecha: new Date().toISOString(), timestamp: new Date(),
    });
  },

  /* ============================================================
   * DESCARGAR AL INVENTARIO GENERAL
   * ============================================================ */
  /**
   * @throws {Error} Si no hay suficiente en camioneta
   */
  descargarAlGeneral: async ({ itemId, cantidad }) => {
    const qty = Number(cantidad);
    const actor = await getActorNombre();

    const ref = doc(db, 'inventario_camioneta', itemId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('El ítem no está en la camioneta.');

    const current = snap.data();
    if (qty > Number(current.cantidad || 0)) {
      throw new Error(`Solo hay ${current.cantidad} ${current.tipo_medida || 'Unidad'} en la camioneta.`);
    }

    const refGeneral = doc(db, 'inventario_general', itemId);
    const snapGeneral = await getDoc(refGeneral);
    if (snapGeneral.exists()) {
      await updateDoc(refGeneral, {
        cantidad: Number(snapGeneral.data().cantidad ?? 0) + qty,
        ultimaModificacion: new Date(),
      });
    }

    await reducirCamioneta(ref, current, qty, actor);

    await addDoc(collection(db, 'inventario_movimientos'), {
      material: current.nombre, cantidad: qty, tipo: 'camioneta_descarga',
      origen: 'Camioneta', destino: 'Inventario General',
      usuario: actor, unidad: current.tipo_medida || 'Unidad',
      notas: 'Material descargado de camioneta al inventario general',
      fecha: new Date().toISOString(), timestamp: new Date(),
    });
  },

  /* ============================================================
   * DESCARGAR AL PROYECTO
   * ============================================================ */
  /**
   * Va directo al inventario del proyecto y registra gasto real.
   * No toca inventario_general (ya fue descontado al cargar).
   *
   * @throws {Error} Si no hay suficiente en camioneta
   */
  descargarAlProyecto: async ({ itemId, cantidad, proyectoId, proyectoTitle }) => {
    const qty = Number(cantidad);
    const actor = await getActorNombre();

    const ref = doc(db, 'inventario_camioneta', itemId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('El ítem no está en la camioneta.');

    const current = snap.data();
    if (qty > Number(current.cantidad || 0)) {
      throw new Error(`Solo hay ${current.cantidad} ${current.tipo_medida || 'Unidad'} en la camioneta.`);
    }

    // Sumar al inventario del proyecto
    const colProyecto = collection(db, 'proyectos', proyectoId, 'inventario');
    const snapProyecto = await getDocs(colProyecto);

    let existente = null;
    if (current.codigo) existente = snapProyecto.docs.find((d) => d.data().codigo === current.codigo);
    if (!existente) existente = snapProyecto.docs.find((d) => d.data().nombre === current.nombre);

    if (existente) {
      const data = existente.data();
      await updateDoc(doc(db, 'proyectos', proyectoId, 'inventario', existente.id), {
        cantidadActual: getCantidad(data) + qty,
        cantidadOriginal: Number(data.cantidadOriginal ?? data.cantidad ?? 0) + qty,
        updatedAt: new Date(), updatedBy: actor,
      });
    } else {
      await addDoc(colProyecto, {
        nombre: current.nombre, categoria: current.categoria || '',
        codigo: current.codigo || '', tipo_medida: current.tipo_medida || 'Unidad',
        precio: Number(current.precio ?? 0),
        cantidadOriginal: qty, cantidadActual: qty,
        creadoEn: new Date(), creadoPor: actor,
        updatedAt: new Date(), updatedBy: actor,
      });
    }

    await reducirCamioneta(ref, current, qty, actor);

    const movRef = await addDoc(collection(db, 'inventario_movimientos'), {
      material: current.nombre, cantidad: qty, tipo: 'camioneta_descarga',
      origen: 'Camioneta', destino: `Proyecto: ${proyectoTitle}`,
      usuario: actor, unidad: current.tipo_medida || 'Unidad',
      notas: `Material descargado de camioneta al proyecto ${proyectoTitle}`,
      fecha: new Date().toISOString(), timestamp: new Date(),
    });

    const unit = Number(current.precio ?? 0);
    await setDoc(doc(db, 'proyectos', proyectoId, 'gastosMaterial', movRef.id), {
      nombre: current.nombre || '', codigo: current.codigo || '',
      categoria: current.categoria || '', tipo_medida: current.tipo_medida || 'Unidad',
      fase: getFaseCompra(current.codigo),
      cantidad: qty, precioUnitario: unit, total: unit * qty,
      createdAt: new Date().toISOString(), createdBy: actor,
      origen: 'ingreso_inventario_proyecto', source: 'camioneta',
      proyectoOrigen: 'Descarga desde Camioneta',
    });
  },

  // Alias retrocompatibilidad
  cargarCamioneta(args) { return this.cargarDesdeGeneral(args); },
  descargarCamioneta(args) { return this.descargarAlGeneral(args); },
};