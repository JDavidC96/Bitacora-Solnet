// hooks/useProjects.js
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../firebase/firebaseConfig';

export const useProjects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const etapaUnsubs = [];

    try {
      // Query para obtener SOLO proyectos activos (no completados)
      const projectsQuery = query(
        collection(db, 'proyectos'),
        where('completed', '!=', true) // Solo proyectos no completados
      );

      const unsubProjects = onSnapshot(
        projectsQuery,
        (snapshot) => {
          const proyArray = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            progress: 0,
            // Asegurar que tenga los campos necesarios
            completed: doc.data().completed || false,
            completedAt: doc.data().completedAt || null,
            status: doc.data().status || 'active'
          }));

          console.log(`📊 ${proyArray.length} proyectos activos cargados`);
          setProjects(proyArray);
          setLoading(false);

          // limpiar suscripciones previas
          etapaUnsubs.forEach(unsub => unsub());
          etapaUnsubs.length = 0;

          // suscribirse a las etapas de cada proyecto
          proyArray.forEach((proj) => {
            const unsubEtapas = onSnapshot(
              collection(db, 'proyectos', proj.id, 'etapas'),
              (etapasSnap) => {
                const todasLasTareas = etapasSnap.docs.map((et) => ({ 
                  idDoc: et.id, 
                  ...et.data() 
                }));
                
                // Filtrar solo tareas normales (excluir mantenimientos)
                const tareasNormales = todasLasTareas.filter(t => !t.esMantenimiento);
                const tareasMantenimiento = todasLasTareas.filter(t => t.esMantenimiento);
                
                const totalTareasNormales = tareasNormales.length;
                const cumplidasTareasNormales = tareasNormales.filter((et) => et.cumplida).length;
                const progress = totalTareasNormales > 0 ? cumplidasTareasNormales / totalTareasNormales : 0;

                // detectar si hay etapas retrasadas (incluyendo mantenimientos)
                const hoyISO = new Date().toISOString().split("T")[0];
                const retrasada = todasLasTareas.some((et) => {
                  return !et.cumplida && new Date(hoyISO) > new Date(et.fechaFin);
                });

                // Verificar si el proyecto está completado (solo tareas normales)
                const allNormalTasksCompleted = totalTareasNormales > 0 && 
                  cumplidasTareasNormales === totalTareasNormales;

                setProjects((prev) =>
                  prev.map((p) =>
                    p.id === proj.id ? { 
                      ...p, 
                      progress, 
                      retrasada,
                      allTasksCompleted: allNormalTasksCompleted,
                      totalTareas: totalTareasNormales,
                      tareasCumplidas: cumplidasTareasNormales,
                      totalMantenimientos: tareasMantenimiento.length,
                      mantenimientosCumplidos: tareasMantenimiento.filter(t => t.cumplida).length
                    } : p
                  )
                );

                // Si todas las tareas normales están completadas, marcar proyecto como completado
                if (allNormalTasksCompleted && !proj.completed) {
                  console.log(`✅ Proyecto ${proj.title} completado al 100% - Debería moverse a completados`);
                  // El marcado automático se hace en ProjectStepScreen
                }
              }
            );
            etapaUnsubs.push(unsubEtapas);
          });
        },
        (err) => {
          console.error('❌ Error en suscripción de proyectos:', err);
          setError(err);
          setLoading(false);
        }
      );

      return () => {
        unsubProjects();
        etapaUnsubs.forEach(unsub => unsub());
      };
    } catch (err) {
      console.error('❌ Error inicializando useProjects:', err);
      setError(err);
      setLoading(false);
    }
  }, []);

  return { projects, loading, error };
};