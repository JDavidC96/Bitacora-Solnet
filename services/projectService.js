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
import { DEFINICION_TAREAS, HOLIDAYS_CO, buildSchedule } from '../helper';

export const projectService = {
  // ========== CRUD BÁSICO ==========
  create: async (projectData) => {
  const { name, location, date, potenciaAC, potenciaDC, panelesInstalados } = projectData;

  if (!name?.trim() || !location?.trim()) {
    throw new Error('Nombre y ubicación son requeridos');
  }

  try {
    const potenciaAcNum = Number(potenciaAC);
    const potenciaDcNum = Number(potenciaDC);
    const panelesNum = Number(panelesInstalados);

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

    // kW AC
    if (Number.isFinite(potenciaAcNum) && potenciaAcNum >= 0) {
      projectPayload.potenciaAC = potenciaAcNum;
    }

    // kW DC
    if (Number.isFinite(potenciaDcNum) && potenciaDcNum >= 0) {
      projectPayload.potenciaDC = potenciaDcNum;
    }

    // Paneles
    if (Number.isFinite(panelesNum) && panelesNum >= 0) {
      projectPayload.panelesInstalados = Math.floor(panelesNum);
    }

    const projectRef = await addDoc(collection(db, 'proyectos'), projectPayload);
    return { id: projectRef.id, success: true };
  } catch (error) {
    console.error('Error creando proyecto:', error);
    throw new Error('No se pudo crear el proyecto');
  }
},

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

  update: async (projectId, updates) => {
    try {
      const ref = doc(db, 'proyectos', projectId);

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

  markMaintenanceActivated: async (projectId, triggerTitle = '') => {
    try {
      const ref = doc(db, 'proyectos', projectId);

      // Evitar re-escritura si ya está activo
      const snap = await getDoc(ref);
      if (snap.exists() && snap.data()?.maintenanceActivated === true) {
        return { success: true, already: true };
      }

      await updateDoc(ref, {
        maintenanceActivated: true,
        maintenanceActivatedAt: new Date().toISOString(),
        maintenanceActivatedBy: triggerTitle || null,
        lastUpdated: new Date().toISOString(),
      });

      return { success: true };
    } catch (error) {
      console.error('Error marcando maintenanceActivated:', error);
      throw error;
    }
  },
  
  // ========== GESTIÓN DE COMPLETADO ==========
  markAsCompleted: async (projectId, projectTitle = '') => {
    try {
      const ref = doc(db, 'proyectos', projectId);
      const snap = await getDoc(ref);
      if (!snap.exists()) throw new Error('Proyecto no encontrado');

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

  markAsActive: async (projectId) => {
    try {
      const ref = doc(db, 'proyectos', projectId);
      const snap = await getDoc(ref);
      if (!snap.exists()) throw new Error('Proyecto no encontrado');

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
      const operations = [];
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

      if (operations.length > 0) {
        console.log(`🔄 Ejecutando ${operations.length} operaciones...`);
        await Promise.all(operations);
      }

      await deleteDoc(doc(db, 'proyectos', projectId));
      return { success: true, message: 'Proyecto eliminado correctamente' };
    } catch (error) {
      console.error('❌ Error completo eliminando proyecto:', error);

      let errorMessage = 'No se pudo eliminar el proyecto';
      if (error.code) errorMessage += ` (Código: ${error.code})`;
      if (error.message && error.message.includes('indexOf')) {
        errorMessage = 'Error interno al procesar la eliminación. Intente nuevamente.';
      } else if (error.message) {
        errorMessage += `: ${error.message}`;
      }

      throw new Error(errorMessage);
    }
  },

  // ========== GESTIÓN DE ETAPAS ==========
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
  addNote: async (projectId, noteData) => {
    try {
      const { text, author, images = [] } = noteData;

      if (!text?.trim()) throw new Error('El texto de la nota es requerido');

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
  applyProrroga: async (projectId, taskId, extraDays, projectStartISO) => {
    try {
      const stages = await projectService.getStages(projectId);

      const byId = {};
      const extraDurations = {};
      const baseDurations = {};

      stages.forEach(stage => {
        byId[stage.idTarea] = stage;
        extraDurations[stage.idTarea] = stage.prorrogas || 0;
        baseDurations[stage.idTarea] = stage.diasDuracion; //  editable por proyecto
      });

      extraDurations[taskId] = (extraDurations[taskId] || 0) + parseInt(extraDays);

      const newSchedule = buildSchedule(projectStartISO, extraDurations, HOLIDAYS_CO, baseDurations);

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

  // ========== CRONOGRAMA: EDITAR DURACIONES ==========
  applyScheduleOverrides: async (projectId, baseDurationsInput = {}, projectStartISO) => {
    try {
      const stages = await projectService.getStages(projectId);

      const byId = {};
      const extraDurations = {};
      const baseDurations = {};

      stages.forEach(stage => {
        byId[stage.idTarea] = stage;
        extraDurations[stage.idTarea] = stage.prorrogas || 0;

        const incoming = baseDurationsInput?.[stage.idTarea];

        // base = lo que venga del modal si existe, si no lo que ya tenga la etapa
        baseDurations[stage.idTarea] =
          Number.isFinite(Number(incoming))
            ? Number(incoming)
            : Number(stage.diasDuracion ?? 0);
      });

      const newSchedule = buildSchedule(projectStartISO, extraDurations, HOLIDAYS_CO, baseDurations);

      const updatePromises = DEFINICION_TAREAS.map(async (def) => {
        const stage = byId[def.id];
        const newDates = newSchedule.get(def.id);
        if (!stage || !newDates) return;

        // ⛔️ no tocar mantenimientos / no aplica
        if (stage.esMantenimiento) return;
        if (stage.noAplica) return;

        return projectService.updateStage(projectId, stage.id, {
          diasDuracion: baseDurations[def.id],
          fechaInicio: newDates.fechaInicio,
          fechaFin: newDates.fechaFin,
          updatedAt: new Date().toISOString(),
        });
      });

      await Promise.all(updatePromises);
      return { success: true };
    } catch (error) {
      console.error('Error aplicando edición de cronograma:', error);
      throw new Error('No se pudo aplicar la edición del cronograma');
    }
  },

  // ========== UTILIDADES ==========
  changeStartDate: async (projectId, newStartDate, projectStartISO) => {
    try {
      const stages = await projectService.getStages(projectId);

      const extraDurations = {};
      const byId = {};
      const baseDurations = {};

      stages.forEach(stage => {
        byId[stage.idTarea] = stage;
        extraDurations[stage.idTarea] = stage.prorrogas || 0;
        baseDurations[stage.idTarea] = stage.diasDuracion; // ✅ editable por proyecto
      });

      const newSchedule = buildSchedule(newStartDate, extraDurations, HOLIDAYS_CO, baseDurations);

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