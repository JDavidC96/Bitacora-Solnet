import { addDoc, collection, doc, getDoc, getDocs, onSnapshot, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { db } from '../firebase/firebaseConfig';
import { buildSchedule, DEFINICION_TAREAS, HOLIDAYS_CO } from '../helper';
import { useProjectCache } from './useProjectCache';

export const useTasks = (projectId, projectStartISO, canMarkStateRole, canProrrogaRole) => {
  const [tasks, setTasks] = useState([]);
  const [prorrogaModal, setProrrogaModal] = useState(false);
  const [prorrogaTarget, setProrrogaTarget] = useState(null);
  const [prorrogaDias, setProrrogaDias] = useState('0');
  const { saveProjectToCache, getCachedProject } = useProjectCache();

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
    try {
      // Verificar si el acta de legalización está cumplida
      const actaLegalizacion = currentTasks.find(t => t.idTarea === 'acta_legalizacion');
      
      if (actaLegalizacion && actaLegalizacion.cumplida) {
        // Verificar si los mantenimientos ya existen
        const primerMantenimiento = currentTasks.find(t => t.idTarea === 'primer_mantenimiento');
        const segundoMantenimiento = currentTasks.find(t => t.idTarea === 'segundo_mantenimiento');
        
        // Solo crear mantenimientos si no existen
        if (!primerMantenimiento || !segundoMantenimiento) {
          await createMaintenanceTasks(projectId, currentTasks);
        }
      }
    } catch (error) {
      console.error('Error verificando mantenimientos:', error);
    }
  };

  // Función para crear tareas de mantenimiento
  const createMaintenanceTasks = async (projectId, existingTasks) => {
    try {
      console.log('🛠️ Creando tareas de mantenimiento...');
      
      // Obtener la fecha del acta de legalización
      const actaLegalizacion = existingTasks.find(t => t.idTarea === 'acta_legalizacion');
      if (!actaLegalizacion) {
        console.log('❌ No se encontró el acta de legalización');
        return;
      }

      const fechaActa = actaLegalizacion.fechaCumplida || actaLegalizacion.fechaFin;
      
      // Calcular fechas para mantenimientos (6 y 12 meses después del acta)
      const fechaActaDate = new Date(fechaActa);
      
      const primerMantenimientoFecha = new Date(fechaActaDate);
      primerMantenimientoFecha.setMonth(primerMantenimientoFecha.getMonth() + 6);
      
      const segundoMantenimientoFecha = new Date(fechaActaDate);
      segundoMantenimientoFecha.setMonth(segundoMantenimientoFecha.getMonth() + 12);

      // Crear primer mantenimiento
      const primerMantenimientoExistente = existingTasks.find(t => t.idTarea === 'primer_mantenimiento');
      if (!primerMantenimientoExistente) {
        await addDoc(collection(db, 'proyectos', projectId, 'etapas'), {
          titulo: "Primer mantenimiento (6 meses)",
          fase: "Fase 7 - Mantenimientos",
          idTarea: "primer_mantenimiento",
          diasDuracion: 0,
          fechaInicio: primerMantenimientoFecha.toISOString().split('T')[0],
          fechaFin: primerMantenimientoFecha.toISOString().split('T')[0],
          cumplida: false,
          prorrogas: 0,
          notas: ["Creado automáticamente después del acta de legalización"],
          esMantenimiento: true,
          createdAt: new Date().toISOString()
        });
        console.log('✅ Primer mantenimiento creado para:', primerMantenimientoFecha.toISOString().split('T')[0]);
      }

      // Crear segundo mantenimiento
      const segundoMantenimientoExistente = existingTasks.find(t => t.idTarea === 'segundo_mantenimiento');
      if (!segundoMantenimientoExistente) {
        await addDoc(collection(db, 'proyectos', projectId, 'etapas'), {
          titulo: "Segundo mantenimiento (12 meses)",
          fase: "Fase 7 - Mantenimientos",
          idTarea: "segundo_mantenimiento",
          diasDuracion: 0,
          fechaInicio: segundoMantenimientoFecha.toISOString().split('T')[0],
          fechaFin: segundoMantenimientoFecha.toISOString().split('T')[0],
          cumplida: false,
          prorrogas: 0,
          notas: ["Creado automáticamente después del acta de legalización"],
          esMantenimiento: true,
          createdAt: new Date().toISOString()
        });
        console.log('✅ Segundo mantenimiento creado para:', segundoMantenimientoFecha.toISOString().split('T')[0]);
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

  const toggleCumplida = async (tarea) => {
    if (!canMarkStateRole || !projectId) return;
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
        setTimeout(() => {
          checkAndCreateMaintenanceTasks(projectId, tasks);
        }, 1000);
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
    if (!canProrrogaRole || tarea.esMantenimiento) return; // No permitir prórrogas en mantenimientos
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

      // No permitir prórrogas en mantenimientos
      if (prorrogaTarget.esMantenimiento) {
        Alert.alert('Error', 'No se pueden aplicar prórrogas a tareas de mantenimiento');
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

      // ACTUALIZAR TODAS LAS TAREAS (excluyendo mantenimientos)
      for (const def of DEFINICION_TAREAS) {
        const s = sched.get(def.id);
        const docId = byId[def.id]?.id;
        
        if (docId && s) {
          const updates = {
            fechaInicio: s.fechaInicio,
            fechaFin: s.fechaFin,
            prorrogas: extraDurations[def.id]
          };

          // Agregar nota solo para la tarea con prórroga
          if (def.id === prorrogaTarget.idTarea) {
            updates.notas = [
              ...(byId[def.id].notas || []),
              `Prórroga: +${extra} días hábiles`,
            ];
          }

          await updateDoc(doc(db, 'proyectos', projectId, 'etapas', docId), updates);
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
  };
};