import { addDoc, collection, doc, getDocs, onSnapshot, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { db } from '../firebase/firebaseConfig';
import { buildSchedule, DEFINICION_TAREAS, HOLIDAYS_CO } from '../helper';

export const useTasks = (projectId, projectStartISO, canMarkStateRole, canProrrogaRole) => {
  const [tasks, setTasks] = useState([]);
  const [prorrogaModal, setProrrogaModal] = useState(false);
  const [prorrogaTarget, setProrrogaTarget] = useState(null);
  const [prorrogaDias, setProrrogaDias] = useState('0');

  // Escuchar etapas - SOLO si projectId es válido
  useEffect(() => {
    if (!projectId) return; // No hacer nada si no hay projectId

    const q = collection(db, 'proyectos', projectId, 'etapas');
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ idDoc: d.id, ...d.data() }));
      setTasks(data);
    }, (error) => {
      console.error('Error en snapshot de etapas:', error);
    });
    
    return () => unsub();
  }, [projectId]);

  // Crear etapas si no existen - SOLO si projectId y projectStartISO son válidos
  useEffect(() => {
    if (!projectId || !projectStartISO) return;
    
    const createInitialTasks = async () => {
      try {
        const q = collection(db, 'proyectos', projectId, 'etapas');
        const snap = await getDocs(q);
        if (snap.empty) {
          const sched = buildSchedule(projectStartISO, {}, HOLIDAYS_CO);
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
            });
          }
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
    } catch (e) {
      console.error('Error actualizando cumplida:', e);
    }
  };

  const openProrroga = (tarea) => {
    if (!canProrrogaRole) return;
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
        // Solo aplicar a la tarea actual y posteriores
        if (index === targetIndex) {
          // Para la tarea actual, sumar los días extra
          extraDurations[task.id] = (extraDurations[task.id] || 0) + extra;
        } else {
          // Para las posteriores, mantener las prórrogas existentes
          extraDurations[task.id] = extraDurations[task.id] || 0;
        }
      } else {
        // Para las tareas anteriores, mantener las prórrogas existentes
        extraDurations[task.id] = extraDurations[task.id] || 0;
      }
    });

    // RECALCULAR EL CRONOGRAMA COMPLETO
    const sched = buildSchedule(projectStartISO, extraDurations, HOLIDAYS_CO);

    // ACTUALIZAR TODAS LAS TAREAS (porque el cambio afecta dependencias)
    for (const def of DEFINICION_TAREAS) {
      const s = sched.get(def.id);
      const docId = byId[def.id].idDoc;
      const isTarget = def.id === prorrogaTarget.idTarea;

      await updateDoc(doc(db, 'proyectos', projectId, 'etapas', docId), {
        fechaInicio: s.fechaInicio,
        fechaFin: s.fechaFin,
        prorrogas: extraDurations[def.id],
        ...(isTarget
          ? {
              notas: [
                ...(byId[def.id].notas || []),
                `Prórroga: +${extra} días hábiles`,
              ],
            }
          : {}),
      });
    }

    setProrrogaModal(false);
    setProrrogaTarget(null);
    setProrrogaDias('0');
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