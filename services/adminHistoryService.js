// services/adminHistoryService.js
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

export const adminHistoryService = {
  /**
   * Obtener último login de todos los usuarios
   */
  getLastLogins: async () => {
    try {
      const usersRef = collection(db, 'usuarios_permitidos');
      const usersSnap = await getDocs(usersRef);
      
      const lastLogins = usersSnap.docs.map(doc => {
        const userData = doc.data();
        return {
          uid: doc.id,
          email: userData.email,
          role: userData.rol || 'usuario',
          lastLogin: userData.ultimoLogin || null,
          nombre: userData.nombre || 'Sin nombre'
        };
      });
      
      return lastLogins.sort((a, b) => 
        new Date(b.lastLogin || 0) - new Date(a.lastLogin || 0)
      );
    } catch (error) {
      console.error('Error obteniendo últimos logins:', error);
      return [];
    }
  },

  /**
   * Obtener estadísticas del sistema
   */
  getSystemStats: async () => {
    try {
      const collections = [
        'inventario_movimientos',
        'historial_herramientas'
      ];

      const stats = {};

      for (const collName of collections) {
        const collRef = collection(db, collName);
        const snap = await getDocs(collRef);
        stats[collName] = snap.size;
      }

      // Contar usuarios
      const usersRef = collection(db, 'usuarios_permitidos');
      const usersSnap = await getDocs(usersRef);
      stats.usuarios = usersSnap.size;

      return stats;
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      return {};
    }
  },

  /**
   * Obtener notas recientes de proyectos
   */
  getRecentNotes: async (limitCount = 50) => {
    try {
      const notes = [];
      
      // Obtener todos los proyectos
      const projectsRef = collection(db, 'proyectos');
      const projectsSnap = await getDocs(projectsRef);
      
      for (const projectDoc of projectsSnap.docs) {
        const projectId = projectDoc.id;
        const projectData = projectDoc.data();
        
        // Obtener notas de este proyecto
        const notesRef = collection(db, 'proyectos', projectId, 'notas');
        const q = query(notesRef, orderBy('fecha', 'desc'), limit(limitCount));
        const notesSnap = await getDocs(q);
        
        notesSnap.docs.forEach(noteDoc => {
          notes.push({
            id: noteDoc.id,
            projectId: projectId,
            projectTitle: projectData.title || 'Proyecto sin título',
            ...noteDoc.data(),
            type: 'nota'
          });
        });
      }
      
      return notes.sort((a, b) => 
        new Date(b.fecha?.toDate?.() || b.fecha) - new Date(a.fecha?.toDate?.() || a.fecha)
      );
    } catch (error) {
      console.error('Error obteniendo notas:', error);
      return [];
    }
  }
};

export default adminHistoryService;