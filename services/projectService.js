// services/projectService.js
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
  where
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { DEFINICION_TAREAS } from '../helper';

export const projectService = {
  // ========== CRUD BÁSICO ==========
  
  /**
 * Crear nuevo proyecto
 */
create: async (projectData) => {
  const { name, location, date, potenciaAC } = projectData;

  if (!name?.trim() || !location?.trim()) {
    throw new Error('Nombre y ubicación son requeridos');
  }

  try {
    // potenciaAC es opcional
    const potenciaNum = Number(potenciaAC);

    const projectPayload = {
      title: name.trim(),
      ubicacion: location.trim(),
      startDate: date.toISOString(),
      createdAt: new Date().toISOString(),
      createdBy: 'system',
      completed: false,
      completedAt: null,
      status: 'active',
    };

    // Guardar potencia si viene definida (permitimos 0 también)
    if (Number.isFinite(potenciaNum) && potenciaNum >= 0) {
      projectPayload.potenciaAC = potenciaNum;
    }

    const projectRef = await addDoc(collection(db, 'proyectos'), projectPayload);

    return { id: projectRef.id, success: true };
  } catch (error) {
    console.error('Error creando proyecto:', error);
    throw new Error('No se pudo crear el proyecto');
  }
},


  /**
   * Obtener proyecto por ID
   */
  getById: async (projectId) => {
    try {
      const ref = doc(db, 'proyectos', projectId);
      const snap = await getDoc(ref);
      
      if (!snap.exists()) {
        throw new Error('Proyecto no encontrado');
      }
      
      return { id: snap.id, ...snap.data() };
    } catch (error) {
      console.error('Error obteniendo proyecto:', error);
      throw new Error('No se pudo obtener el proyecto');
    }
  },

  /**
   * Actualizar proyecto
   */
  update: async (projectId, updates) => {
    try {
      const ref = doc(db, 'proyectos', projectId);
      
      // Verificar que el proyecto existe
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        throw new Error('Proyecto no encontrado');
      }
      
      await updateDoc(ref, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error actualizando proyecto:', error);
      throw new Error('No se pudo actualizar el proyecto');
    }
  },

  // ========== GESTIÓN DE COMPLETADO ==========

  /**
   * Marcar proyecto como completado
   */
  markAsCompleted: async (projectId, projectTitle = '') => {
    try {
      const ref = doc(db, 'proyectos', projectId);
      
      // Verificar que el proyecto existe
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        throw new Error('Proyecto no encontrado');
      }

      await updateDoc(ref, {
        completed: true,
        completedAt: new Date().toISOString(),
        status: 'completed',
        lastUpdated: new Date().toISOString()
      });
      
      console.log(`✅ Proyecto "${projectTitle}" (${projectId}) marcado como completado`);
      return { success: true, message: 'Proyecto marcado como completado' };
    } catch (error) {
      console.error('❌ Error marcando proyecto como completado:', error);
      throw new Error('No se pudo marcar el proyecto como completado');
    }
  },

  /**
   * Reactivar proyecto (mover de vuelta a activos)
   */
  markAsActive: async (projectId) => {
    try {
      const ref = doc(db, 'proyectos', projectId);
      
      // Verificar que el proyecto existe
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        throw new Error('Proyecto no encontrado');
      }

      await updateDoc(ref, {
        completed: false,
        completedAt: null,
        status: 'active',
        lastUpdated: new Date().toISOString()
      });
      
      console.log(`🔄 Proyecto ${projectId} reactivado`);
      return { success: true, message: 'Proyecto reactivado' };
    } catch (error) {
      console.error('❌ Error reactivando proyecto:', error);
      throw new Error('No se pudo reactivar el proyecto');
    }
  },

  /**
   * Verificar si un proyecto está completado (todas las tareas cumplidas)
   */
  checkCompletionStatus: async (projectId) => {
    try {
      const tasksRef = collection(db, 'proyectos', projectId, 'etapas');
      const tasksSnap = await getDocs(tasksRef);
      
      if (tasksSnap.empty) {
        return { isCompleted: false, totalTasks: 0, completedTasks: 0 };
      }

      const tasks = tasksSnap.docs.map(doc => doc.data());
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(task => task.cumplida).length;
      const isCompleted = totalTasks > 0 && completedTasks === totalTasks;

      return {
        isCompleted,
        totalTasks,
        completedTasks,
        progress: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
      };
    } catch (error) {
      console.error('❌ Error verificando estado de completado:', error);
      throw new Error('No se pudo verificar el estado del proyecto');
    }
  },

  /**
   * Marcar automáticamente como completado si todas las tareas están cumplidas
   */
  autoCompleteIfReady: async (projectId, projectTitle = '') => {
    try {
      const completionStatus = await projectService.checkCompletionStatus(projectId);
      
      if (completionStatus.isCompleted) {
        return await projectService.markAsCompleted(projectId, projectTitle);
      }
      
      return { 
        success: false, 
        message: 'El proyecto no está listo para completar',
        ...completionStatus 
      };
    } catch (error) {
      console.error('❌ Error en auto-completado:', error);
      throw error;
    }
  },

  /**
   * Obtener solo proyectos activos
   */
  getActiveProjects: async () => {
    try {
      const q = query(
        collection(db, 'proyectos'),
        where('completed', '!=', true),
        orderBy('createdAt', 'desc')
      );
      
      const snap = await getDocs(q);
      const projects = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log(`📊 ${projects.length} proyectos activos obtenidos`);
      return projects;
    } catch (error) {
      console.error('❌ Error obteniendo proyectos activos:', error);
      throw new Error('No se pudieron obtener los proyectos activos');
    }
  },

  /**
   * Obtener solo proyectos completados
   */
  getCompletedProjects: async () => {
    try {
      const q = query(
        collection(db, 'proyectos'),
        where('completed', '==', true),
        orderBy('completedAt', 'desc')
      );
      
      const snap = await getDocs(q);
      const projects = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log(`✅ ${projects.length} proyectos completados obtenidos`);
      return projects;
    } catch (error) {
      console.error('❌ Error obteniendo proyectos completados:', error);
      throw new Error('No se pudieron obtener los proyectos completados');
    }
  },

  delete: async (projectId, projectTitle) => {
    try {
      // Array para almacenar todas las operaciones
      const operations = [];

      // 1. Eliminar subcolecciones
      const subcollections = ['etapas', 'notas', 'inventario'];
      
      for (const subcollection of subcollections) {
        try {
          const subcollectionRef = collection(db, 'proyectos', projectId, subcollection);
          const subcollectionSnap = await getDocs(subcollectionRef);
          
          const deleteOps = subcollectionSnap.docs.map(docSnapshot => 
            deleteDoc(doc(db, 'proyectos', projectId, subcollection, docSnapshot.id))
          );
          
          operations.push(...deleteOps);
          
        } catch (subError) {
          console.warn(`⚠️ Error en subcolección ${subcollection}:`, subError);
        }
      }

      // 2. Liberar personal asignado (versión simplificada)
      try {
        const personalSnap = await getDocs(collection(db, "personal"));
        const updatePersonalOps = [];
        
        personalSnap.docs.forEach(docSnapshot => {
          const data = docSnapshot.data();
          if (data && data.proyectoAsignado === projectTitle) {
            updatePersonalOps.push(
              updateDoc(doc(db, "personal", docSnapshot.id), {
                estado: "libre",
                proyectoAsignado: null,
              })
            );
          }
        });

        operations.push(...updatePersonalOps);
        console.log(`👥 ${updatePersonalOps.length} personal para liberar`);
      } catch (personalError) {
        console.warn('⚠️ Error liberando personal:', personalError);
      }

      // 3. Cerrar historial (versión simplificada)
      try {
        const historialSnap = await getDocs(collection(db, "historial_personal"));
        const updateHistorialOps = [];
        
        historialSnap.docs.forEach(docSnapshot => {
          const data = docSnapshot.data();
          if (data && data.destino === projectTitle && !data.fechaFin) {
            updateHistorialOps.push(
              updateDoc(doc(db, "historial_personal", docSnapshot.id), {
                fechaFin: new Date().toISOString().split('T')[0]
              })
            );
          }
        });

        operations.push(...updateHistorialOps);
        console.log(`📊 ${updateHistorialOps.length} registros de historial para cerrar`);
      } catch (historialError) {
        console.warn('⚠️ Error cerrando historial:', historialError);
      }

      // Ejecutar todas las operaciones
      if (operations.length > 0) {
        console.log(`🔄 Ejecutando ${operations.length} operaciones...`);
        await Promise.all(operations);
      }

      // 4. Eliminar proyecto principal
      await deleteDoc(doc(db, 'proyectos', projectId));
      
      return { success: true, message: 'Proyecto eliminado correctamente' };
      
    } catch (error) {
      console.error('❌ Error completo eliminando proyecto:', error);
      
      // Mensaje de error más detallado
      let errorMessage = 'No se pudo eliminar el proyecto';
      if (error.code) {
        errorMessage += ` (Código: ${error.code})`;
      }
      if (error.message && error.message.includes('indexOf')) {
        errorMessage = 'Error interno al procesar la eliminación. Intente nuevamente.';
      } else if (error.message) {
        errorMessage += `: ${error.message}`;
      }
      
      throw new Error(errorMessage);
    }
  },

  // ========== GESTIÓN DE ETAPAS ==========

  /**
   * Crear etapas iniciales del proyecto
   */
  createInitialStages: async (projectId, startDate, extraDurations = {}) => {
  try {
    const schedule = buildSchedule(startDate, extraDurations, HOLIDAYS_CO);

    const stagesCreation = DEFINICION_TAREAS.map(async (def) => {
      const scheduled = schedule.get(def.id);

      return addDoc(collection(db, 'proyectos', projectId, 'etapas'), {
        titulo: def.titulo,
        fase: def.fase,
        idTarea: def.id,
        diasDuracion: def.dias,
        fechaInicio: scheduled.fechaInicio,
        fechaFin: scheduled.fechaFin,
        cumplida: false,
        prorrogas: 0,
        notas: [],
        createdAt: new Date().toISOString()
      });
    });

    await Promise.all(stagesCreation);
    return { success: true };
  } catch (error) {
    console.error('Error creando etapas iniciales:', error);
    throw new Error('No se pudieron crear las etapas del proyecto');
  }
},


  /**
   * Obtener todas las etapas de un proyecto
   */
  getStages: async (projectId) => {
    try {
      const stagesRef = collection(db, 'proyectos', projectId, 'etapas');
      const snap = await getDocs(stagesRef);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error obteniendo etapas:', error);
      throw new Error('No se pudieron obtener las etapas');
    }
  },

  /**
   * Actualizar estado de una etapa
   */
  updateStage: async (projectId, stageId, updates) => {
    try {
      const ref = doc(db, 'proyectos', projectId, 'etapas', stageId);
      await updateDoc(ref, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
      return { success: true };
    } catch (error) {
      console.error('Error actualizando etapa:', error);
      throw new Error('No se pudo actualizar la etapa');
    }
  },

  // ========== GESTIÓN DE NOTAS ==========

  /**
   * Agregar nota a un proyecto
   */
  addNote: async (projectId, noteData) => {
    try {
      const { text, author, images = [] } = noteData;
      
      if (!text?.trim()) {
        throw new Error('El texto de la nota es requerido');
      }

      const now = new Date();
      const noteRef = await addDoc(collection(db, 'proyectos', projectId, 'notas'), {
        texto: text.trim(),
        autor: author || 'Usuario anónimo',
        fecha: `${now.toISOString().split("T")[0]} ${now.toLocaleTimeString()}`,
        fechaISO: now.toISOString().split("T")[0],
        hora: now.toLocaleTimeString(),
        timestamp: now.getTime(),
        imagenes: images,
        createdAt: now.toISOString()
      });

      return { id: noteRef.id, success: true };
    } catch (error) {
      console.error('Error agregando nota:', error);
      throw new Error('No se pudo agregar la nota');
    }
  },

  /**
   * Obtener todas las notas de un proyecto
   */
  getNotes: async (projectId) => {
    try {
      const notesRef = collection(db, 'proyectos', projectId, 'notas');
      const snap = await getDocs(notesRef);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error obteniendo notas:', error);
      throw new Error('No se pudieron obtener las notas');
    }
  },

  /**
   * Actualizar nota
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

  // ========== GESTIÓN DE INVENTARIO ==========

  /**
   * Agregar item al inventario del proyecto
   */
  addInventoryItem: async (projectId, itemData) => {
    try {
      const { nombre, cantidad, tipo_medida, notas = '' } = itemData;
      
      if (!nombre?.trim() || cantidad == null) {
        throw new Error('Nombre y cantidad son requeridos');
      }

      const itemRef = await addDoc(collection(db, 'proyectos', projectId, 'inventario'), {
        nombre: nombre.trim(),
        cantidad: parseFloat(cantidad),
        tipo_medida: tipo_medida || 'Unidad',
        notas: notas.trim(),
        createdAt: new Date().toISOString(),
        createdBy: 'system'
      });

      return { id: itemRef.id, success: true };
    } catch (error) {
      console.error('Error agregando item al inventario:', error);
      throw new Error('No se pudo agregar el item al inventario');
    }
  },

  /**
   * Obtener inventario del proyecto
   */
  getInventory: async (projectId) => {
    try {
      const inventoryRef = collection(db, 'proyectos', projectId, 'inventario');
      const snap = await getDocs(inventoryRef);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error obteniendo inventario:', error);
      throw new Error('No se pudo obtener el inventario');
    }
  },

  /**
   * Actualizar item del inventario
   */
  updateInventoryItem: async (projectId, itemId, updates) => {
    try {
      const ref = doc(db, 'proyectos', projectId, 'inventario', itemId);
      await updateDoc(ref, {
        ...updates,
        lastUpdate: new Date().toISOString(),
        updatedBy: 'system'
      });
      return { success: true };
    } catch (error) {
      console.error('Error actualizando item de inventario:', error);
      throw new Error('No se pudo actualizar el item del inventario');
    }
  },

  // ========== GESTIÓN DE PRÓRROGAS ==========

  /**
   * Aplicar prórroga a una tarea y recalcular fechas
   */
  applyProrroga: async (projectId, taskId, extraDays, projectStartISO) => {
  try {
    const stages = await projectService.getStages(projectId);

    const byId = {};
    const extraDurations = {};

    stages.forEach(stage => {
      byId[stage.idTarea] = stage;
      extraDurations[stage.idTarea] = stage.prorrogas || 0;
    });

    extraDurations[taskId] =
      (extraDurations[taskId] || 0) + parseInt(extraDays);

    const newSchedule = buildSchedule(projectStartISO, extraDurations, HOLIDAYS_CO);

    const updatePromises = DEFINICION_TAREAS.map(async (def) => {
      const newDates = newSchedule.get(def.id);
      const stageId = byId[def.id]?.id;

      if (stageId && newDates) {
        const updates = {
          fechaInicio: newDates.fechaInicio,
          fechaFin: newDates.fechaFin,
          prorrogas: extraDurations[def.id],
        };

        if (def.id === taskId) {
          updates.notas = [
            ...(byId[def.id].notas || []),
            `Prórroga: +${extraDays} días hábiles`,
          ];
        }

        return projectService.updateStage(projectId, stageId, updates);
      }
    });

    await Promise.all(updatePromises);
    return { success: true };
  } catch (error) {
    console.error('Error aplicando prórroga:', error);
    throw new Error('No se pudo aplicar la prórroga');
  }
},


  // ========== UTILIDADES ==========

  /**
   * Cambiar fecha de inicio del proyecto y recalcular todas las etapas
   */
  changeStartDate: async (projectId, newStartDate, projectStartISO) => {
  try {
    const stages = await projectService.getStages(projectId);

    const extraDurations = {};
    const byId = {};

    stages.forEach(stage => {
      byId[stage.idTarea] = stage;
      extraDurations[stage.idTarea] = stage.prorrogas || 0;
    });

    const newSchedule = buildSchedule(newStartDate, extraDurations, HOLIDAYS_CO);

    await projectService.update(projectId, {
      startDate: new Date(newStartDate).toISOString(),
    });

    const updatePromises = DEFINICION_TAREAS.map(async (def) => {
      const newDates = newSchedule.get(def.id);
      const stageId = byId[def.id]?.id;

      if (stageId && newDates) {
        return projectService.updateStage(projectId, stageId, {
          fechaInicio: newDates.fechaInicio,
          fechaFin: newDates.fechaFin,
        });
      }
    });

    await Promise.all(updatePromises);
    return { success: true };
  } catch (error) {
    console.error('Error cambiando fecha de inicio:', error);
    throw new Error('No se pudo cambiar la fecha de inicio');
  }
},


  /**
   * Obtener estadísticas del proyecto
   */
  getProjectStats: async (projectId) => {
    try {
      const [stages, notes, inventory] = await Promise.all([
        projectService.getStages(projectId),
        projectService.getNotes(projectId),
        projectService.getInventory(projectId)
      ]);

      const totalStages = stages.length;
      const completedStages = stages.filter(s => s.cumplida).length;
      const progress = totalStages > 0 ? (completedStages / totalStages) * 100 : 0;

      // Verificar etapas retrasadas
      const hoyISO = new Date().toISOString().split("T")[0];
      const delayedStages = stages.filter(s => 
        !s.cumplida && new Date(hoyISO) > new Date(s.fechaFin)
      );

      return {
        totalStages,
        completedStages,
        progress: Math.round(progress),
        delayedStages: delayedStages.length,
        totalNotes: notes.length,
        totalInventory: inventory.length,
        hasDelays: delayedStages.length > 0
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      throw new Error('No se pudieron obtener las estadísticas del proyecto');
    }
  }
};

export default projectService;