// services/equipmentService.js
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

export const equipmentService = {
  addEquipment: async (equipmentData, user) => {
    const { nombre, estado, serial, marca, precio } = equipmentData;

    if (!nombre?.trim()) {
      throw new Error('El nombre de la herramienta es requerido');
    }

    const precioFinal = Number.isFinite(Number(precio)) ? Number(precio) : (precio == null ? null : null);

    try {
      await addDoc(collection(db, "herramientas"), {
        nombre: nombre.trim(),
        estado: estado || "Nueva",
        serial: serial?.trim() || null,

        // nuevos campos (opcionales)
        marca: marca?.trim() || null,
        precio: precioFinal,

        asignada: null,
        prestadaA: null,
        createdAt: new Date().toISOString(),
      });

      await equipmentService.addToHistory(`Se agregó la herramienta`, nombre.trim(), user);
      return { success: true };
    } catch (error) {
      console.error('Error agregando herramienta:', error);
      throw new Error('No se pudo agregar la herramienta');
    }
  },

  // NUEVO: editar herramienta
  editEquipment: async (equipmentId, updates, user) => {
    try {
      const ref = doc(db, "herramientas", equipmentId);

      const snap = await getDoc(ref);
      if (!snap.exists()) {
        throw new Error('La herramienta ya no existe');
      }

      const actual = { id: snap.id, ...snap.data() };

      const payload = {
        nombre: updates?.nombre?.trim() || actual.nombre,
        estado: updates?.estado || actual.estado || "Nueva",
        serial: updates?.serial?.trim() || null,
        marca: updates?.marca?.trim() || null,
        precio: updates?.precio == null ? null : (Number.isFinite(Number(updates.precio)) ? Number(updates.precio) : null),
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(ref, payload);

      await equipmentService.addToHistory(
        `Se editó la herramienta`,
        payload.nombre,
        user
      );

      return { success: true };
    } catch (error) {
      console.error('Error editando herramienta:', error);
      throw new Error('No se pudo editar la herramienta');
    }
  },

  assignEquipment: async (equipmentId, person, user) => {
    try {
      const ref = doc(db, "herramientas", equipmentId);

      const snap = await getDoc(ref);
      if (!snap.exists()) {
        throw new Error('La herramienta ya no existe');
      }

      const herramienta = { id: snap.id, ...snap.data() };

      await updateDoc(ref, {
        asignada: {
          idPersona: person.id,
          nombre: person.nombre
        },
        prestadaA: null,
        updatedAt: new Date().toISOString(),
      });

      await equipmentService.addToHistory(
        `${herramienta.nombre} asignado a: ${person.nombre}`,
        herramienta.nombre,
        user
      );

      return { success: true };
    } catch (error) {
      console.error('Error asignando herramienta:', error);
      throw new Error('No se pudo asignar la herramienta');
    }
  },

  loanEquipment: async (equipmentId, person, user) => {
    try {
      const ref = doc(db, "herramientas", equipmentId);

      const snap = await getDoc(ref);
      if (!snap.exists()) {
        throw new Error('La herramienta ya no existe');
      }

      const herramienta = { id: snap.id, ...snap.data() };

      await updateDoc(ref, {
        prestadaA: {
          idPersona: person.id,
          nombre: person.nombre
        },
        updatedAt: new Date().toISOString(),
      });

      let accion = '';
      if (herramienta.asignada) {
        accion = `${herramienta.nombre} asignado a: ${herramienta.asignada.nombre} fue prestado a: ${person.nombre}`;
      } else {
        accion = `${herramienta.nombre} fue prestado a: ${person.nombre}`;
      }

      await equipmentService.addToHistory(accion, herramienta.nombre, user);

      return { success: true };
    } catch (error) {
      console.error('Error prestando herramienta:', error);
      throw new Error('No se pudo registrar el préstamo');
    }
  },

  transferEquipment: async (equipmentId, newOwner, user) => {
    try {
      const ref = doc(db, "herramientas", equipmentId);

      const snap = await getDoc(ref);
      if (!snap.exists()) {
        throw new Error('La herramienta ya no existe');
      }

      const herramienta = { id: snap.id, ...snap.data() };
      const anterior = herramienta.asignada?.nombre || "Nadie";

      await updateDoc(ref, {
        asignada: {
          idPersona: newOwner.id,
          nombre: newOwner.nombre
        },
        prestadaA: null,
        updatedAt: new Date().toISOString(),
      });

      await equipmentService.addToHistory(
        `${herramienta.nombre} transferido de: ${anterior} a: ${newOwner.nombre}`,
        herramienta.nombre,
        user
      );

      return { success: true };
    } catch (error) {
      console.error('Error transfiriendo herramienta:', error);
      throw new Error('No se pudo transferir la herramienta');
    }
  },

  returnEquipment: async (equipmentId, user) => {
    try {
      const ref = doc(db, "herramientas", equipmentId);

      const snap = await getDoc(ref);
      if (!snap.exists()) {
        throw new Error('La herramienta ya no existe');
      }

      const herramienta = { id: snap.id, ...snap.data() };

      if (!herramienta.prestadaA) {
        throw new Error('La herramienta no está prestada');
      }

      const persona = herramienta.prestadaA;

      await updateDoc(ref, {
        prestadaA: null,
        updatedAt: new Date().toISOString(),
      });

      await equipmentService.addToHistory(
        `${herramienta.nombre} devuelto por: ${persona.nombre}`,
        herramienta.nombre,
        user
      );

      return { success: true };
    } catch (error) {
      console.error('Error devolviendo herramienta:', error);
      throw new Error('No se pudo registrar la devolución');
    }
  },

  deleteEquipment: async (equipmentId, user) => {
    try {
      const ref = doc(db, "herramientas", equipmentId);

      const snap = await getDoc(ref);
      if (!snap.exists()) {
        throw new Error('La herramienta ya no existe');
      }

      const herramienta = { id: snap.id, ...snap.data() };

      await deleteDoc(ref);

      await equipmentService.addToHistory(
        `Se eliminó la herramienta`,
        herramienta.nombre,
        user
      );

      return { success: true };
    } catch (error) {
      console.error('Error eliminando herramienta:', error);
      throw new Error('No se pudo eliminar la herramienta');
    }
  },

  addToHistory: async (accion, herramientaNombre, user) => {
    try {
      await addDoc(collection(db, "historial_herramientas"), {
        herramienta: herramientaNombre,
        accion,
        fecha: new Date().toISOString(),
        usuario: user?.email || user?.role || 'Sistema',
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Error guardando historial:", error);
    }
  }
};

export default equipmentService;
