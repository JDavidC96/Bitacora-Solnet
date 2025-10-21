// hooks/useNotes.js
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../firebase/firebaseConfig';

export const useNotes = (projectId) => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    try {
      const q = query(
        collection(db, 'proyectos', projectId, 'notas'),
        orderBy('fechaISO', 'desc')
      );
      
      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
          }));
          setNotes(data);
          setLoading(false);
        },
        (err) => {
          console.error('Error en suscripción de notas:', err);
          setError(err);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error('Error inicializando useNotes:', err);
      setError(err);
      setLoading(false);
    }
  }, [projectId]);

  return { notes, loading, error };
};