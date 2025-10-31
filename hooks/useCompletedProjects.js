// hooks/useCompletedProjects.js
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../firebase/firebaseConfig';

export const useCompletedProjects = () => {
  const [completedProjects, setCompletedProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      // Query para obtener SOLO proyectos completados
      const completedQuery = query(
        collection(db, 'proyectos'),
        where('completed', '==', true),
        orderBy('completedAt', 'desc')
      );

      const unsubscribe = onSnapshot(
        completedQuery,
        (snapshot) => {
          const projects = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            progress: 1, // Siempre 100% porque están completados
          }));

          console.log(`✅ ${projects.length} proyectos completados cargados`);
          setCompletedProjects(projects);
          setLoading(false);
        },
        (err) => {
          console.error('❌ Error cargando proyectos completados:', err);
          setError(err);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error('❌ Error en useCompletedProjects:', err);
      setError(err);
      setLoading(false);
    }
  }, []);

  return { completedProjects, loading, error };
};