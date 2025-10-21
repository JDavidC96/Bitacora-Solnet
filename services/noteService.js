// services/noteService.js
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { imageService } from './imageService';

export const noteService = {
  /**
   * Crear nueva nota
   */
  createNote: async (projectId, noteData) => {
    const { text, author, images = [] } = noteData;
    
    if (!text?.trim()) {
      throw new Error('El texto de la nota es requerido');
    }

    try {
      const now = new Date();
      const fechaISO = now.toISOString().split("T")[0];
      
      let uploadedUrls = [];

      // Subir imágenes si hay
      if (images.length > 0) {
        uploadedUrls = await imageService.uploadImages(images, projectId);
      }

      // Crear la nota en Firestore
      const noteRef = await addDoc(collection(db, 'proyectos', projectId, 'notas'), {
        texto: text.trim(),
        autor: author || 'Usuario anónimo',
        fecha: `${fechaISO} ${now.toLocaleTimeString()}`,
        fechaISO: fechaISO,
        hora: now.toLocaleTimeString(),
        timestamp: now.getTime(),
        imagenes: uploadedUrls,
        createdAt: now.toISOString()
      });

      return { id: noteRef.id, success: true };
    } catch (error) {
      console.error('Error creando nota:', error);
      throw new Error('No se pudo crear la nota');
    }
  },

  /**
   * Actualizar nota existente
   */
  updateNote: async (projectId, noteId, newText) => {
    try {
      const ref = doc(db, 'proyectos', projectId, 'notas', noteId);
      await updateDoc(ref, {
        texto: newText.trim(),
        updatedAt: new Date().toISOString()
      });
      return { success: true };
    } catch (error) {
      console.error('Error actualizando nota:', error);
      throw new Error('No se pudo actualizar la nota');
    }
  },

  /**
   * Eliminar nota
   */
  deleteNote: async (projectId, noteId) => {
    try {
      // Aquí podrías añadir lógica para eliminar imágenes asociadas
      const ref = doc(db, 'proyectos', projectId, 'notas', noteId);
      await deleteDoc(ref);
      return { success: true };
    } catch (error) {
      console.error('Error eliminando nota:', error);
      throw new Error('No se pudo eliminar la nota');
    }
  }
};

export default noteService;