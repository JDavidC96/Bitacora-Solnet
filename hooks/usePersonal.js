// hooks/usePersonal.js
import { collection, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../firebase/firebaseConfig';

export const usePersonal = () => {
  const [personal, setPersonal] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      const unsub = onSnapshot(
        collection(db, 'personal'),
        (snapshot) => {
          const data = snapshot.docs.map((doc) => ({ 
            id: doc.id, 
            ...doc.data() 
          }));
          setPersonal(data);
          setLoading(false);
        },
        (err) => {
          console.error('Error en suscripción de personal:', err);
          setError(err);
          setLoading(false);
        }
      );

      return () => unsub();
    } catch (err) {
      console.error('Error inicializando usePersonal:', err);
      setError(err);
      setLoading(false);
    }
  }, []);

  return { personal, loading, error };
};