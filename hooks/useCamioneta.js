// hooks/useCamioneta.js
import { collection, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../firebase/firebaseConfig';

/**
 * Hook para suscribirse en tiempo real al inventario de la camioneta.
 *
 * La camioneta usa un doc por ítem (doc ID = itemId del inventario general).
 * El material sigue contando en el stock general; este hook solo expone
 * cuánto de ese stock está físicamente en la camioneta.
 *
 * Devuelve:
 * - itemsCamioneta: lista completa de ítems en camioneta
 * - camionetaPorItem: mapa { [itemId]: cantidad } para consulta O(1)
 * - loading: indicador de carga inicial
 *
 * Colección Firestore: `inventario_camioneta`
 */
export const useCamioneta = () => {
  const [itemsCamioneta, setItemsCamioneta] = useState([]);
  const [camionetaPorItem, setCamionetaPorItem] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsub;
    try {
      unsub = onSnapshot(
        collection(db, 'inventario_camioneta'),
        (snap) => {
          const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setItemsCamioneta(docs);

          // Mapa directo itemId → cantidad (el doc ID ya es el itemId)
          const byItem = {};
          docs.forEach((item) => {
            const qty = Number(item.cantidad || 0);
            if (qty > 0) byItem[item.itemId || item.id] = qty;
          });
          setCamionetaPorItem(byItem);
          setLoading(false);
        },
        (err) => {
          console.error('Error en useCamioneta:', err);
          setLoading(false);
        }
      );
    } catch (err) {
      console.error('Error inicializando useCamioneta:', err);
      setLoading(false);
    }

    return () => unsub?.();
  }, []);

  return { itemsCamioneta, camionetaPorItem, loading };
};