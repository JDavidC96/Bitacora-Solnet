import { addDoc, collection, doc, getDoc, getDocs, onSnapshot, updateDoc } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { db } from '../firebase/firebaseConfig';
import { buildSchedule, DEFINICION_TAREAS, HOLIDAYS_CO, MANTENIMIENTOS_TAREAS } from '../helper';
import { useProjectCache } from './useProjectCache';

export const useTasks = (projectId, projectStartISO, canMarkStateRole, canProrrogaRole) => {
  const [tasks, setTasks] = useState([]);
  const [prorrogaModal, setProrrogaModal] = useState(false);
  const [prorrogaTarget, setProrrogaTarget] = useState(null);
  const [prorrogaDias, setProrrogaDias] = useState('0');
  const { saveProjectToCache, getCachedProject } = useProjectCache();
  
  // Refs para controlar la creación de mantenimientos
  const maintenanceCreationInProgress = useRef(false);
  const createdMaintenances = useRef(new Set());

  // Escuchar etapas - SOLO si projectId es válido
  useEffect(() => {
    if (!projectId) return;

    const q = collection(db, 'proyectos', projectId, 'etapas');
    const unsub = onSnapshot(q, async (snap) => {
      const data = snap.docs.map((d) => ({ idDoc: d.id, ...d.data() }));
      setTasks(data);
      
      // Verificar si el acta de legalización está cumplida para crear mantenimientos
      await checkAndCreateMaintenanceTasks(projectId, data);
      
      // Guardar en cache para notificaciones
      try {
        const projectRef = doc(db, 'proyectos', projectId);
        const projectSnap = await getDoc(projectRef);
        if (projectSnap.exists()) {
          const projectData = projectSnap.data();
          saveProjectToCache(projectId, projectData, data);
        }
      } catch (error) {
        console.error('Error saving tasks to cache:', error);
      }
    }, (error) => {
      console.error('Error en snapshot de etapas:', error);
    });
    
    return () => unsub();
  }, [projectId]);

  // Función para verificar y crear tareas de mantenimiento
  const checkAndCreateMaintenanceTasks = async (projectId, currentTasks) => {
    // Evitar ejecuciones concurrentes
    if (maintenanceCreationInProgress.current) {
      console.log('⚠️ Creación de mantenimientos en progreso, omitiendo...');
      return;
    }

    try {
      maintenanceCreationInProgress.current = true;

      // Verificar si el acta de legalización está cumplida
      const actaLegalizacion = currentTasks.find(t => t.idTarea === 'acta_legalizacion');
      
      if (actaLegalizacion && actaLegalizacion.cumplida) {
        console.log('📋 Acta de legalización cumplida, verificando mantenimientos...');
        
        // Verificar si los mantenimientos ya existen
        const primerMantenimiento = currentTasks.find(t => t.idTarea === 'primer_mantenimiento');
        const segundoMantenimiento = currentTasks.find(t => t.idTarea === 'segundo_mantenimiento');
        
        const mantenimientosPorCrear = [];
        
        if (!primerMantenimiento && !createdMaintenances.current.has('primer_mantenimiento')) {
          mantenimientosPorCrear.push('primer_mantenimiento');
        }
        
        if (!segundoMantenimiento && !createdMaintenances.current.has('segundo_mantenimiento')) {
          mantenimientosPorCrear.push('segundo_mantenimiento');
        }

        // Solo crear mantenimientos si no existen y no se han creado en esta sesión
        if (mantenimientosPorCrear.length > 0) {
          console.log(`🛠️ Creando ${mantenimientosPorCrear.length} mantenimientos...`);
          await createMaintenanceTasks(projectId, currentTasks, mantenimientosPorCrear);
        } else {
          console.log('✅ Todos los mantenimientos ya existen o fueron creados');
        }
      } else if (!actaLegalizacion?.cumplida) {
        console.log('⏳ Acta de legalización no cumplida, mantenimientos pendientes');
        // Resetear el tracking si el acta se desmarca
        createdMaintenances.current.clear();
      }
    } catch (error) {
      console.error('Error verificando mantenimientos:', error);
    } finally {
      maintenanceCreationInProgress.current = false;
    }
  };

  // Función para crear tareas de mantenimiento específicas
  const createMaintenanceTasks = async (projectId, existingTasks, mantenimientosACrear) => {
    try {
      // Obtener la fecha del acta de legalización
      const actaLegalizacion = existingTasks.find(t => t.idTarea === 'acta_legalizacion');
      if (!actaLegalizacion) {
        console.log('❌ No se encontró el acta de legalización');
        return;
      }

      const fechaActa = actaLegalizacion.fechaCumplida || actaLegalizacion.fechaFin;
      const fechaActaDate = new Date(fechaActa);
      
      for (const mantenimientoId of mantenimientosACrear) {
        if (createdMaintenances.current.has(mantenimientoId)) {
          console.log(`⏩ Mantenimiento ${mantenimientoId} ya fue creado, omitiendo...`);
          continue;
        }

        const mantenimientoDef = MANTENIMIENTOS_TAREAS.find(m => m.id === mantenimientoId);
        if (!mantenimientoDef) {
          console.log(`❌ Definición no encontrada para: ${mantenimientoId}`);
          continue;
        }

        // Calcular fecha según el tipo de mantenimiento
        let fechaMantenimiento = new Date(fechaActaDate);
        if (mantenimientoId === 'primer_mantenimiento') {
          fechaMantenimiento.setMonth(fechaMantenimiento.getMonth() + 6);
        } else if (mantenimientoId === 'segundo_mantenimiento') {
          fechaMantenimiento.setMonth(fechaMantenimiento.getMonth() + 12);
        }

        // Verificar una vez más que no exista (por si acaso)
        const mantenimientoExistente = existingTasks.find(t => t.idTarea === mantenimientoId);
        if (mantenimientoExistente) {
          console.log(`⏩ ${mantenimientoDef.titulo} ya existe en la base de datos`);
          createdMaintenances.current.add(mantenimientoId);
          continue;
        }

        // Crear el mantenimiento
        await addDoc(collection(db, 'proyectos', projectId, 'etapas'), {
          titulo: mantenimientoDef.titulo,
          fase: mantenimientoDef.fase,
          idTarea: mantenimientoId,
          diasDuracion: 0,
          fechaInicio: fechaMantenimiento.toISOString().split('T')[0],
          fechaFin: fechaMantenimiento.toISOString().split('T')[0],
          cumplida: false,
          prorrogas: 0,
          notas: ["Creado automáticamente después del acta de legalización"],
          esMantenimiento: true,
          createdAt: new Date().toISOString()
        });

        console.log(`✅ ${mantenimientoDef.titulo} creado para: ${fechaMantenimiento.toISOString().split('T')[0]}`);
        createdMaintenances.current.add(mantenimientoId);
      }
    } catch (error) {
      console.error('❌ Error creando tareas de mantenimiento:', error);
    }
  };

  // Crear etapas iniciales EXCLUYENDO mantenimientos
  useEffect(() => {
    if (!projectId || !projectStartISO) return;
    
    const createInitialTasks = async () => {
      try {
        const q = collection(db, 'proyectos', projectId, 'etapas');
        const snap = await getDocs(q);
        if (snap.empty) {
          const sched = buildSchedule(projectStartISO, {}, HOLIDAYS_CO);
          
          console.log(`🔄 Creando ${DEFINICION_TAREAS.length} tareas iniciales...`);
          
          for (const def of DEFINICION_TAREAS) {
            const s = sched.get(def.id);
            await addDoc(collection(db, 'proyectos', projectId, 'etapas'), {
              titulo: def.titulo,
              fase: def.fase,
              idTarea: def.id,
              diasDuracion: def.dias,
              fechaInicio: s.fechaInicio,
              fechaFin: s.fechaFin,
              cumplida: false,
              prorrogas: 0,
              notas: [],
              esMantenimiento: false,
              noAplica: false, // Inicializar como false
              fechaNoAplica: null,
              createdAt: new Date().toISOString()
            });
          }
          console.log(`✅ ${DEFINICION_TAREAS.length} tareas iniciales creadas (sin mantenimientos)`);
        } else {
          console.log(`📊 ${snap.size} tareas ya existen, omitiendo creación inicial`);
        }
      } catch (error) {
        console.error('Error creando tareas iniciales:', error);
      }
    };

    createInitialTasks();
  }, [projectId, projectStartISO]);

  // Función para marcar tarea como "No Aplica"
  const markAsNotApplicable = async (tarea) => {
    if (!canMarkStateRole || !projectId) return;
    
    try {
      const ref = doc(db, 'proyectos', projectId, 'etapas', tarea.idDoc);
      await updateDoc(ref, {
        noAplica: true,
        cumplida: false, // Asegurar que no esté marcada como cumplida
        fechaNoAplica: new Date().toISOString().split('T')[0],
        notas: [
          ...(tarea.notas || []),
          `Tarea marcada como "No Aplica" - ${new Date().toLocaleDateString('es-ES')}`
        ],
        updatedAt: new Date().toISOString()
      });
      
      console.log(`✅ Tarea "${tarea.titulo}" marcada como No Aplica`);
      
      // Actualizar cache
      const projectRef = doc(db, 'proyectos', projectId);
      const projectSnap = await getDoc(projectRef);
      if (projectSnap.exists()) {
        const projectData = projectSnap.data();
        const q = collection(db, 'proyectos', projectId, 'etapas');
        const tasksSnap = await getDocs(q);
        const tasksData = tasksSnap.docs.map((d) => ({ idDoc: d.id, ...d.data() }));
        saveProjectToCache(projectId, projectData, tasksData);
      }
    } catch (error) {
      console.error('❌ Error marcando tarea como No Aplica:', error);
      throw error;
    }
  };

  // Función para reactivar tarea marcada como "No Aplica"
  const unmarkAsNotApplicable = async (tarea) => {
    if (!canMarkStateRole || !projectId) return;
    
    try {
      const ref = doc(db, 'proyectos', projectId, 'etapas', tarea.idDoc);
      await updateDoc(ref, {
        noAplica: false,
        fechaNoAplica: null,
        notas: [
          ...(tarea.notas || []),
          `Tarea reactivada - ${new Date().toLocaleDateString('es-ES')}`
        ],
        updatedAt: new Date().toISOString()
      });
      
      console.log(`✅ Tarea "${tarea.titulo}" reactivada`);
      
      // Actualizar cache
      const projectRef = doc(db, 'proyectos', projectId);
      const projectSnap = await getDoc(projectRef);
      if (projectSnap.exists()) {
        const projectData = projectSnap.data();
        const q = collection(db, 'proyectos', projectId, 'etapas');
        const tasksSnap = await getDocs(q);
        const tasksData = tasksSnap.docs.map((d) => ({ idDoc: d.id, ...d.data() }));
        saveProjectToCache(projectId, projectData, tasksData);
      }
    } catch (error) {
      console.error('❌ Error reactivando tarea:', error);
      throw error;
    }
  };

  const toggleCumplida = async (tarea) => {
    if (!canMarkStateRole || !projectId || tarea.noAplica) return;
    try {
      const ref = doc(db, 'proyectos', projectId, 'etapas', tarea.idDoc);
      const nuevoEstado = !tarea.cumplida;
      await updateDoc(ref, {
        cumplida: nuevoEstado,
        fechaCumplida: nuevoEstado ? new Date().toISOString().split('T')[0] : null,
      });
      
      // Si se marca el acta de legalización, verificar para crear mantenimientos
      if (nuevoEstado && tarea.idTarea === 'acta_legalizacion') {
        console.log('📋 Acta de legalización marcada como cumplida, verificando mantenimientos...');
        // Pequeño delay para asegurar que la actualización se haya propagado
        setTimeout(() => {
          checkAndCreateMaintenanceTasks(projectId, tasks);
        }, 2000);
      }
      
      // Actualizar cache
      const projectRef = doc(db, 'proyectos', projectId);
      const projectSnap = await getDoc(projectRef);
      if (projectSnap.exists()) {
        const projectData = projectSnap.data();
        const q = collection(db, 'proyectos', projectId, 'etapas');
        const tasksSnap = await getDocs(q);
        const tasksData = tasksSnap.docs.map((d) => ({ idDoc: d.id, ...d.data() }));
        saveProjectToCache(projectId, projectData, tasksData);
      }
    } catch (e) {
      console.error('Error actualizando cumplida:', e);
    }
  };

  const openProrroga = (tarea) => {
    if (!canProrrogaRole || tarea.esMantenimiento || tarea.noAplica) return;
    setProrrogaTarget(tarea);
    setProrrogaDias('0');
    setProrrogaModal(true);
  };

  const applyProrroga = async () => {
    if (!canProrrogaRole || !projectId) return;
    try {
      const extra = parseInt(prorrogaDias || '0', 10);
      if (!prorrogaTarget || isNaN(extra) || extra <= 0) {
        setProrrogaModal(false);
        return;
      }

      // No permitir prórrogas en mantenimientos o tareas no aplica
      if (prorrogaTarget.esMantenimiento || prorrogaTarget.noAplica) {
        Alert.alert('Error', 'No se pueden aplicar prórrogas a esta tarea');
        setProrrogaModal(false);
        return;
      }

      const q = collection(db, 'proyectos', projectId, 'etapas');
      const snap = await getDocs(q);
      const extraDurations = {};
      const byId = {};
      snap.docs.forEach((d) => {
        const row = { idDoc: d.id, ...d.data() };
        byId[row.idTarea] = row;
        extraDurations[row.idTarea] = row.prorrogas || 0;
      });

      // ENCONTRAR LA POSICIÓN DE LA TAREA SELECCIONADA
      const targetIndex = DEFINICION_TAREAS.findIndex(task => task.id === prorrogaTarget.idTarea);
      
      if (targetIndex === -1) {
        console.error('Tarea objetivo no encontrada en DEFINICION_TAREAS');
        return;
      }

      // APLICAR PRÓRROGA SOLO A TAREAS POSTERIORES (incluyendo la actual)
      DEFINICION_TAREAS.forEach((task, index) => {
        if (index >= targetIndex) {
          if (index === targetIndex) {
            extraDurations[task.id] = (extraDurations[task.id] || 0) + extra;
          } else {
            extraDurations[task.id] = extraDurations[task.id] || 0;
          }
        } else {
          extraDurations[task.id] = extraDurations[task.id] || 0;
        }
      });

      // RECALCULAR EL CRONOGRAMA COMPLETO
      const sched = buildSchedule(projectStartISO, extraDurations, HOLIDAYS_CO);

      // ACTUALIZAR TODAS LAS TAREAS (excluyendo mantenimientos y no aplica)
      for (const def of DEFINICION_TAREAS) {
        const s = sched.get(def.id);
        const docId = byId[def.id]?.id;
        
        if (docId && s) {
          const taskData = byId[def.id];
          // Solo actualizar si no es mantenimiento y no está marcada como no aplica
          if (!taskData.esMantenimiento && !taskData.noAplica) {
            const updates = {
              fechaInicio: s.fechaInicio,
              fechaFin: s.fechaFin,
              prorrogas: extraDurations[def.id]
            };

            // Agregar nota solo para la tarea con prórroga
            if (def.id === prorrogaTarget.idTarea) {
              updates.notas = [
                ...(taskData.notas || []),
                `Prórroga: +${extra} días hábiles`,
              ];
            }

            await updateDoc(doc(db, 'proyectos', projectId, 'etapas', docId), updates);
          }
        }
      }

      // Actualizar cache después de prórroga
      const projectRef = doc(db, 'proyectos', projectId);
      const projectSnap = await getDoc(projectRef);
      if (projectSnap.exists()) {
        const projectData = projectSnap.data();
        const updatedTasksSnap = await getDocs(q);
        const updatedTasks = updatedTasksSnap.docs.map((d) => ({ idDoc: d.id, ...d.data() }));
        saveProjectToCache(projectId, projectData, updatedTasks);
      }

      setProrrogaModal(false);
      setProrrogaTarget(null);
      setProrrogaDias('0');
      Alert.alert('✅ Éxito', `Prórroga de ${extra} días aplicada correctamente`);
    } catch (e) {
      console.error('Error aplicando prórroga:', e);
      Alert.alert('Error', 'No fue posible aplicar la prórroga.');
    }
  };

  return {
    tasks,
    prorrogaModal,
    setProrrogaModal,
    prorrogaTarget,
    setProrrogaTarget,
    prorrogaDias,
    setProrrogaDias,
    applyProrroga,
    toggleCumplida,
    openProrroga,
    markAsNotApplicable,
    unmarkAsNotApplicable
  };
};