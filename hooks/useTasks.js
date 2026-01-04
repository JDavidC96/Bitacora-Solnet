import { addDoc, collection, doc, getDoc, getDocs, onSnapshot, updateDoc } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { db } from '../firebase/firebaseConfig';
import { buildSchedule, DEFINICION_TAREAS, HOLIDAYS_CO, MANTENIMIENTOS_TAREAS } from '../helper';
import projectService from '../services/projectService';
import { useProjectCache } from './useProjectCache';

export const useTasks = (projectId, projectStartISO, canMarkStateRole, canProrrogaRole) => {
  const [tasks, setTasks] = useState([]);
  const [prorrogaModal, setProrrogaModal] = useState(false);
  const [prorrogaTarget, setProrrogaTarget] = useState(null);
  const [prorrogaDias, setProrrogaDias] = useState('0');
  const { saveProjectToCache } = useProjectCache();

  // Refs para controlar la creación de mantenimientos
  const maintenanceCreationInProgress = useRef(false);
  const createdMaintenances = useRef(new Set());

  // Escuchar etapas
  useEffect(() => {
    if (!projectId) return;

    const q = collection(db, 'proyectos', projectId, 'etapas');
    const unsub = onSnapshot(
      q,
      async (snap) => {
        const data = snap.docs.map((d) => ({ idDoc: d.id, ...d.data() }));
        setTasks(data);

        // ✅ Verificar y crear mantenimientos según "última etapa requerida"
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
      },
      (error) => {
        console.error('Error en snapshot de etapas:', error);
      }
    );

    return () => unsub();
  }, [projectId]);

  // -------------------------------
  // Helpers de mantenimiento
  // -------------------------------

  /**
   * Devuelve la "última etapa requerida" del flujo:
   * recorre DEFINICION_TAREAS desde el final hacia atrás y toma la primera tarea
   * que exista en Firestore y NO esté marcada como noAplica.
   *
   * Ej: si acta_legalizacion es noAplica => última requerida = legalizacion
   * si legalizacion también noAplica => subsanar_visita, etc.
   */
  const getUltimaEtapaRequerida = (currentTasks) => {
    const byId = new Map(
      currentTasks
        .filter((t) => !t.esMantenimiento)
        .map((t) => [t.idTarea, t])
    );

    for (let i = DEFINICION_TAREAS.length - 1; i >= 0; i--) {
      const def = DEFINICION_TAREAS[i];
      const t = byId.get(def.id);
      if (!t) continue;
      if (t.noAplica === true) continue;
      return t;
    }

    // Caso extremo: todas las tareas del final quedaron noAplica o no existen
    // retornamos la última existente (si hay) solo para no devolver null.
    const vals = [...byId.values()];
    return vals.length ? vals[vals.length - 1] : null;
  };

  const getFechaDeCierreEtapa = (etapa) => {
    return (
      etapa?.fechaCumplida ||
      etapa?.fechaNoAplica ||
      etapa?.fechaFin ||
      new Date().toISOString().split('T')[0]
    );
  };

  // Función para verificar y crear tareas de mantenimiento
  const checkAndCreateMaintenanceTasks = async (projectId, currentTasks) => {
    if (maintenanceCreationInProgress.current) {
      console.log('⚠️ Creación de mantenimientos en progreso, omitiendo...');
      return;
    }

    try {
      maintenanceCreationInProgress.current = true;

      // 1) Si ya existen mantenimientos en BD, no hacer nada
      const yaExisteMantenimiento = currentTasks.some((t) => t.esMantenimiento === true);
      if (yaExisteMantenimiento) {
        createdMaintenances.current.add('primer_mantenimiento');
        createdMaintenances.current.add('segundo_mantenimiento');
        return;
      }

      // 2) Determinar la última etapa requerida (saltando noAplica desde el final)
      const ultimaRequerida = getUltimaEtapaRequerida(currentTasks);
      if (!ultimaRequerida) return;

      // 3) Solo se activa mantenimiento si la ÚLTIMA REQUERIDA está finalizada (cumplida)
      // Nota: por diseño no debería ser noAplica (la filtramos), pero lo dejamos por robustez.
      const estadoFinal = ultimaRequerida.cumplida === true || ultimaRequerida.noAplica === true;
      if (!estadoFinal) {
        createdMaintenances.current.clear();
        return;
      }

      console.log(`🏁 Última etapa requerida finalizada (${ultimaRequerida.titulo}) => creando mantenimientos...`);

      // 4) Qué mantenimientos crear
      const mantenimientosPorCrear = [];
      if (!createdMaintenances.current.has('primer_mantenimiento')) mantenimientosPorCrear.push('primer_mantenimiento');
      if (!createdMaintenances.current.has('segundo_mantenimiento')) mantenimientosPorCrear.push('segundo_mantenimiento');

      if (mantenimientosPorCrear.length === 0) return;

      const fechaBase = getFechaDeCierreEtapa(ultimaRequerida);

      await createMaintenanceTasks(projectId, currentTasks, mantenimientosPorCrear, fechaBase);

      mantenimientosPorCrear.forEach((id) => createdMaintenances.current.add(id));

      // ✅ Badge persistente en el proyecto (solo al activarse)
      try {
        await projectService.markMaintenanceActivated(projectId, ultimaRequerida.titulo);
      } catch (e) {
        console.error('Error guardando badge de mantenimiento:', e);
      }
    } catch (error) {
      console.error('Error verificando mantenimientos:', error);
    } finally {
      maintenanceCreationInProgress.current = false;
    }
  };

  // Crear tareas de mantenimiento específicas (con fecha base configurable)
  const createMaintenanceTasks = async (projectId, existingTasks, mantenimientosACrear, fechaBaseISO) => {
    try {
      const fechaBase = fechaBaseISO || new Date().toISOString().split('T')[0];
      const fechaBaseDate = new Date(fechaBase);

      for (const mantenimientoId of mantenimientosACrear) {
        if (createdMaintenances.current.has(mantenimientoId)) {
          console.log(`⏩ Mantenimiento ${mantenimientoId} ya fue creado, omitiendo...`);
          continue;
        }

        const mantenimientoDef = MANTENIMIENTOS_TAREAS.find((m) => m.id === mantenimientoId);
        if (!mantenimientoDef) {
          console.log(`❌ Definición no encontrada para: ${mantenimientoId}`);
          continue;
        }

        // Calcular fecha según el tipo de mantenimiento
        let fechaMantenimiento = new Date(fechaBaseDate);
        if (mantenimientoId === 'primer_mantenimiento') {
          fechaMantenimiento.setMonth(fechaMantenimiento.getMonth() + 6);
        } else if (mantenimientoId === 'segundo_mantenimiento') {
          fechaMantenimiento.setMonth(fechaMantenimiento.getMonth() + 12);
        }

        // Verificar que no exista (por si acaso)
        const mantenimientoExistente = existingTasks.find((t) => t.idTarea === mantenimientoId);
        if (mantenimientoExistente) {
          console.log(`⏩ ${mantenimientoDef.titulo} ya existe en la base de datos`);
          createdMaintenances.current.add(mantenimientoId);
          continue;
        }

        await addDoc(collection(db, 'proyectos', projectId, 'etapas'), {
          titulo: mantenimientoDef.titulo,
          fase: mantenimientoDef.fase,
          idTarea: mantenimientoId,
          diasDuracion: 0,
          fechaInicio: fechaMantenimiento.toISOString().split('T')[0],
          fechaFin: fechaMantenimiento.toISOString().split('T')[0],
          cumplida: false,
          prorrogas: 0,
          notas: [`Creado automáticamente después de finalizar la última etapa requerida (${fechaBase})`],
          esMantenimiento: true,
          createdAt: new Date().toISOString(),
        });

        console.log(`✅ ${mantenimientoDef.titulo} creado para: ${fechaMantenimiento.toISOString().split('T')[0]}`);
        createdMaintenances.current.add(mantenimientoId);
      }
    } catch (error) {
      console.error('❌ Error creando tareas de mantenimiento:', error);
    }
  };

  // -------------------------------
  // Estados / no aplica
  // -------------------------------

  const markAsNotApplicable = async (tarea) => {
    if (!canMarkStateRole || !projectId) return;

    try {
      const ref = doc(db, 'proyectos', projectId, 'etapas', tarea.idDoc);
      await updateDoc(ref, {
        noAplica: true,
        cumplida: false,
        fechaNoAplica: new Date().toISOString().split('T')[0],
        notas: [
          ...(tarea.notas || []),
          `Tarea marcada como "No Aplica" - ${new Date().toLocaleDateString('es-ES')}`,
        ],
        updatedAt: new Date().toISOString(),
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
          `Tarea reactivada - ${new Date().toLocaleDateString('es-ES')}`,
        ],
        updatedAt: new Date().toISOString(),
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

      // ✅ IMPORTANTE: ya NO se llama checkAndCreateMaintenanceTasks aquí.
      // El onSnapshot lo ejecuta siempre con el "data" actualizado.

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
      const targetIndex = DEFINICION_TAREAS.findIndex((task) => task.id === prorrogaTarget.idTarea);

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
        const docId = byId[def.id]?.idDoc;

        if (docId && s) {
          const taskData = byId[def.id];

          if (!taskData.esMantenimiento && !taskData.noAplica) {
            const updates = {
              fechaInicio: s.fechaInicio,
              fechaFin: s.fechaFin,
              prorrogas: extraDurations[def.id],
            };

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
    unmarkAsNotApplicable,
  };
};
