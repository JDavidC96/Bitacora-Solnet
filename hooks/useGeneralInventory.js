// hooks/useGeneralInventory.js
import { collection, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../firebase/firebaseConfig';

export const useGeneralInventory = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      const unsubscribe = onSnapshot(
        collection(db, 'inventario_general'),
        (snapshot) => {
          const uniqueItems = Array.from(
            new Map(snapshot.docs.map((d) => [d.id, { id: d.id, ...d.data() }])).values()
          );
          setItems(uniqueItems);
          setLoading(false);
        },
        (err) => {
          console.error('Error en suscripción de inventario general:', err);
          setError(err);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error('Error inicializando useGeneralInventory:', err);
      setError(err);
      setLoading(false);
    }
  }, []);

  return { items, loading, error };
};