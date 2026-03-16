// services/reservasService.js
import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    setDoc,
    updateDoc,
    where,
} from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';
import { getFaseByCodigo } from '../utils/classifyMaterial';

/**
 * Servicio para gestión de reservas de materiales del inventario general.
 *
 * Flujo completo de una reserva:
 *
 *  1. crearReserva         → descuenta stock de inventario_general inmediatamente
 *                            crea doc con status: 'activa'
 *
 *  2. transferirAlProyecto → suma cantidad al inventario del proyecto
 *                            registra movimiento en historial + gasto real
 *                            marca reserva como 'completada'
 *                            (NO toca inventario_general — ya estaba descontado)
 *
 *  3. cancelarReserva      → devuelve stock a inventario_general
 *                            marca reserva como 'cancelada'
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

export const reservasService = {

  /* ============================================================
   * 1. CREAR — descuenta stock inmediatamente
   * ============================================================ */
  /**
   * @param {Object} args
   * @param {string} args.itemId
   * @param {string} args.itemNombre
   * @param {string} [args.itemCodigo]
   * @param {string} [args.categoria]
   * @param {string} [args.tipo_medida]
   * @param {number} [args.precio]
   * @param {string} args.proyectoId
   * @param {string} args.proyectoTitle
   * @param {number} args.cantidad
   * @throws {Error} Si no hay stock suficiente
   */
  crearReserva: async ({
    itemId, itemNombre, itemCodigo, categoria,
    tipo_medida, precio, proyectoId, proyectoTitle, cantidad,
  }) => {
    const qty = Number(cantidad);
    const usuario = await getActorNombre();

    // Validar y descontar stock
    const refGeneral = doc(db, 'inventario_general', itemId);
    const snapGeneral = await getDoc(refGeneral);
    if (!snapGeneral.exists()) throw new Error('El ítem ya no existe en el inventario.');

    const stockActual = Number(snapGeneral.data().cantidad ?? 0);
    if (qty > stockActual) {
      throw new Error(`Stock insuficiente. Disponible: ${stockActual} ${tipo_medida || 'Unidad'}.`);
    }

    await updateDoc(refGeneral, {
      cantidad: stockActual - qty,
      ultimaModificacion: new Date(),
    });

    // Crear doc de reserva
    await addDoc(collection(db, 'reservas_inventario'), {
      itemId,
      itemNombre,
      itemCodigo: itemCodigo || '',
      categoria: categoria || '',
      tipo_medida: tipo_medida || 'Unidad',
      precio: Number(precio ?? 0),
      proyectoId,
      proyectoTitle,
      cantidad: qty,
      usuario,
      fecha: new Date(),
      status: 'activa',
    });

    // Historial
    await addDoc(collection(db, 'inventario_movimientos'), {
      material: itemNombre,
      cantidad: qty,
      tipo: 'reserva',
      origen: 'Inventario General',
      destino: `Reservado para: ${proyectoTitle}`,
      usuario,
      unidad: tipo_medida || 'Unidad',
      notas: `Material reservado para proyecto ${proyectoTitle}`,
      fecha: new Date().toISOString(),
      timestamp: new Date(),
    });
  },

  /* ============================================================
   * 2. TRANSFERIR AL PROYECTO — completa la reserva
   * ============================================================ */
  /**
   * El stock general ya estaba descontado. Solo se mueve al proyecto.
   * @param {Object} args
   * @param {string} args.reservaId
   * @param {Object} args.reserva - Datos completos del doc de reserva
   * @throws {Error} Si la reserva ya no está activa
   */
  transferirAlProyecto: async ({ reservaId, reserva }) => {
    const actor = await getActorNombre();

    // Validar que sigue activa
    const reservaRef = doc(db, 'reservas_inventario', reservaId);
    const snapReserva = await getDoc(reservaRef);
    if (!snapReserva.exists() || snapReserva.data().status !== 'activa') {
      throw new Error('Esta reserva ya no está activa.');
    }

    const qty = Number(reserva.cantidad);

    // Sumar al inventario del proyecto
    const colProyecto = collection(db, 'proyectos', reserva.proyectoId, 'inventario');
    const snapProyecto = await getDocs(colProyecto);

    let existente = null;
    if (reserva.itemCodigo) {
      existente = snapProyecto.docs.find((d) => d.data().codigo === reserva.itemCodigo);
    }
    if (!existente) {
      existente = snapProyecto.docs.find((d) => d.data().nombre === reserva.itemNombre);
    }

    if (existente) {
      const data = existente.data();
      await updateDoc(
        doc(db, 'proyectos', reserva.proyectoId, 'inventario', existente.id),
        {
          cantidadActual: getCantidad(data) + qty,
          cantidadOriginal: Number(data.cantidadOriginal ?? data.cantidad ?? 0) + qty,
          updatedAt: new Date(),
          updatedBy: actor,
        }
      );
    } else {
      await addDoc(colProyecto, {
        nombre: reserva.itemNombre,
        categoria: reserva.categoria || '',
        codigo: reserva.itemCodigo || '',
        tipo_medida: reserva.tipo_medida || 'Unidad',
        precio: Number(reserva.precio ?? 0),
        cantidadOriginal: qty,
        cantidadActual: qty,
        creadoEn: new Date(),
        creadoPor: actor,
        updatedAt: new Date(),
        updatedBy: actor,
      });
    }

    // Historial
    const movRef = await addDoc(collection(db, 'inventario_movimientos'), {
      material: reserva.itemNombre,
      cantidad: qty,
      tipo: 'movimiento',
      origen: 'Inventario General (reserva)',
      destino: `Proyecto: ${reserva.proyectoTitle}`,
      usuario: actor,
      proyectoOrigen: 'Inventario General',
      proyectoDestino: reserva.proyectoTitle,
      unidad: reserva.tipo_medida || 'Unidad',
      notas: `Transferencia desde reserva al proyecto ${reserva.proyectoTitle}`,
      fecha: new Date().toISOString(),
      timestamp: new Date(),
    });

    // Gasto real en el proyecto
    const unit = Number(reserva.precio ?? 0);
    await setDoc(
      doc(db, 'proyectos', reserva.proyectoId, 'gastosMaterial', movRef.id),
      {
        nombre: reserva.itemNombre || '',
        codigo: reserva.itemCodigo || '',
        categoria: reserva.categoria || '',
        tipo_medida: reserva.tipo_medida || 'Unidad',
        fase: getFaseCompra(reserva.itemCodigo),
        cantidad: qty,
        precioUnitario: unit,
        total: unit * qty,
        createdAt: new Date().toISOString(),
        createdBy: actor,
        origen: 'ingreso_inventario_proyecto',
        source: 'reserva_inventario',
        proyectoOrigen: 'Reserva desde Inventario General',
      }
    );

    // Marcar completada
    await updateDoc(reservaRef, {
      status: 'completada',
      fechaTransferencia: new Date(),
      transferidoPor: actor,
    });
  },

  /* ============================================================
   * 3. CANCELAR — devuelve stock al inventario general
   * ============================================================ */
  /**
   * @param {string} reservaId
   * @param {Object} reserva - Datos completos para devolver stock correcto
   * @throws {Error} Si la reserva ya no está activa
   */
  cancelarReserva: async (reservaId, reserva) => {
    const actor = await getActorNombre();

    const reservaRef = doc(db, 'reservas_inventario', reservaId);
    const snapReserva = await getDoc(reservaRef);
    if (!snapReserva.exists() || snapReserva.data().status !== 'activa') {
      throw new Error('Esta reserva ya no está activa.');
    }

    const qty = Number(reserva.cantidad);

    // Devolver stock
    const refGeneral = doc(db, 'inventario_general', reserva.itemId);
    const snapGeneral = await getDoc(refGeneral);
    if (snapGeneral.exists()) {
      await updateDoc(refGeneral, {
        cantidad: Number(snapGeneral.data().cantidad ?? 0) + qty,
        ultimaModificacion: new Date(),
      });
    }

    // Historial
    await addDoc(collection(db, 'inventario_movimientos'), {
      material: reserva.itemNombre,
      cantidad: qty,
      tipo: 'devolucion',
      origen: `Reserva cancelada (${reserva.proyectoTitle})`,
      destino: 'Inventario General',
      usuario: actor,
      unidad: reserva.tipo_medida || 'Unidad',
      notas: 'Reserva cancelada — material devuelto al inventario general',
      fecha: new Date().toISOString(),
      timestamp: new Date(),
    });

    // Marcar cancelada
    await updateDoc(reservaRef, {
      status: 'cancelada',
      fechaCancelacion: new Date(),
      canceladoPor: actor,
    });
  },

  /** Obtiene reservas activas de un ítem (one-shot, para consultas puntuales) */
  getReservasPorItem: async (itemId) => {
    const q = query(
      collection(db, 'reservas_inventario'),
      where('itemId', '==', itemId),
      where('status', '==', 'activa')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },
};