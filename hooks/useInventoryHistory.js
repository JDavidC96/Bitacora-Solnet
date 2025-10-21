// hooks/useInventoryHistory.js
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../firebase/firebaseConfig';
import { inventoryService } from '../services/inventoryService';

export const useInventoryHistory = () => {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      const q = query(
        collection(db, 'inventario_movimientos'),
        orderBy('timestamp', 'desc')
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const movementsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setMovements(movementsData);
          setLoading(false);
        },
        (err) => {
          console.error('Error en suscripción de historial:', err);
          setError(err);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error('Error inicializando useInventoryHistory:', err);
      setError(err);
      setLoading(false);
    }
  }, []);

  // Función para refrescar manualmente
  const refreshHistory = async () => {
    try {
      setLoading(true);
      const history = await inventoryService.getMovementHistory();
      setMovements(history);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return { movements, loading, error, refreshHistory };
};