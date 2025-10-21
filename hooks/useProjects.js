// hooks/useProjects.js
import { collection, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../firebase/firebaseConfig';

export const useProjects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const etapaUnsubs = [];

    try {
      const unsubProjects = onSnapshot(
        collection(db, 'proyectos'),
        (snapshot) => {
          const proyArray = snapshot.docs.map((doc) => ({
            id: doc.id,               // ← usamos el id real del documento
            ...doc.data(),
            progress: 0,
          }));

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
                const total = etapasSnap.size;
                const cumplidas = etapasSnap.docs.filter((et) => et.data().cumplida).length;
                const progress = total > 0 ? cumplidas / total : 0;

                // detectar si hay etapas retrasadas
                const hoyISO = new Date().toISOString().split("T")[0];
                const retrasada = etapasSnap.docs.some((et) => {
                  const d = et.data();
                  return !d.cumplida && new Date(hoyISO) > new Date(d.fechaFin);
                });

                setProjects((prev) =>
                  prev.map((p) =>
                    p.id === proj.id ? { ...p, progress, retrasada } : p
                  )
                );
              }
            );
            etapaUnsubs.push(unsubEtapas);
          });
        },
        (err) => {
          console.error('Error en suscripción de proyectos:', err);
          setError(err);
          setLoading(false);
        }
      );

      return () => {
        unsubProjects();
        etapaUnsubs.forEach(unsub => unsub());
      };
    } catch (err) {
      console.error('Error inicializando useProjects:', err);
      setError(err);
      setLoading(false);
    }
  }, []);

  return { projects, loading, error };
};
