// services/personalService.js
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    updateDoc,
    where
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

export const personalService = {
  /**
   * Crear nueva persona
   */
  create: async (personalData) => {
    const { nombre, cargo } = personalData;
    
    if (!nombre?.trim() || !cargo?.trim()) {
      throw new Error('Nombre y cargo son requeridos');
    }

    try {
      const personalRef = await addDoc(collection(db, 'personal'), {
        nombre: nombre.trim(),
        cargo: cargo.trim(),
        estado: 'libre',
        proyectoAsignado: null,
        createdAt: new Date().toISOString(),
      });
      
      return { id: personalRef.id, success: true };
    } catch (error) {
      console.error('Error creando personal:', error);
      throw new Error('No se pudo crear la persona');
    }
  },

  /**
   * Asignar persona a proyecto
   */
  assignToProject: async (personId, projectTitle) => {
    try {
      const personaRef = doc(db, 'personal', personId);
      
      // Verificar que la persona existe
      const personaSnap = await getDoc(personaRef);
      if (!personaSnap.exists()) {
        throw new Error('Persona no encontrada');
      }

      const personaData = personaSnap.data();

      // Actualizar estado de la persona
      await updateDoc(personaRef, {
        estado: 'ocupado',
        proyectoAsignado: projectTitle,
        updatedAt: new Date().toISOString(),
      });

      // Registrar en historial
      await addDoc(collection(db, 'historial_personal'), {
        nombre: personaData.nombre,
        destino: projectTitle,
        fechaInicio: new Date().toISOString(),
        fechaFin: null,
        createdAt: new Date().toISOString(),
      });

      return { success: true };
    } catch (error) {
      console.error('Error asignando personal:', error);
      throw new Error('No se pudo asignar la persona al proyecto');
    }
  },

  /**
   * Liberar persona de proyecto
   */
  liberar: async (personId) => {
    try {
      const personaRef = doc(db, 'personal', personId);
      
      // Verificar que la persona existe
      const personaSnap = await getDoc(personaRef);
      if (!personaSnap.exists()) {
        throw new Error('Persona no encontrada');
      }

      const personaData = personaSnap.data();

      // Actualizar estado de la persona
      await updateDoc(personaRef, {
        estado: 'libre',
        proyectoAsignado: null,
        updatedAt: new Date().toISOString(),
      });

      // Cerrar registro en historial
      const qHist = query(
        collection(db, 'historial_personal'),
        where('nombre', '==', personaData.nombre),
        where('fechaFin', '==', null),
        orderBy('fechaInicio', 'desc'),
        limit(1)
      );
      
      const snap = await getDocs(qHist);
      if (!snap.empty) {
        const ref = doc(db, 'historial_personal', snap.docs[0].id);
        await updateDoc(ref, { 
          fechaFin: new Date().toISOString() 
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error liberando personal:', error);
      throw new Error('No se pudo liberar a la persona');
    }
  },

  /**
   * Eliminar persona
   */
  delete: async (personId, nombrePersona) => {
    try {
      const personaRef = doc(db, 'personal', personId);
      
      // Verificar que la persona existe
      const personaSnap = await getDoc(personaRef);
      if (!personaSnap.exists()) {
        throw new Error('Persona no encontrada');
      }

      await deleteDoc(personaRef);
      return { success: true };
    } catch (error) {
      console.error('Error eliminando personal:', error);
      throw new Error('No se pudo eliminar a la persona');
    }
  },

  /**
   * Obtener todo el personal
   */
  getAll: async () => {
    try {
      const personalRef = collection(db, 'personal');
      const snap = await getDocs(personalRef);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error obteniendo personal:', error);
      throw new Error('No se pudo obtener el personal');
    }
  },

  /**
   * Obtener personal libre
   */
  getLibre: async () => {
    try {
      const q = query(
        collection(db, 'personal'),
        where('estado', '==', 'libre')
      );
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error obteniendo personal libre:', error);
      throw new Error('No se pudo obtener el personal libre');
    }
  },

  /**
   * Obtener personal ocupado
   */
  getOcupado: async () => {
    try {
      const q = query(
        collection(db, 'personal'),
        where('estado', '==', 'ocupado')
      );
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error obteniendo personal ocupado:', error);
      throw new Error('No se pudo obtener el personal ocupado');
    }
  }
};

export default personalService;