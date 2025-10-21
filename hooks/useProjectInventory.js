import { collection, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../firebase/firebaseConfig";

export const useProjectInventory = (projectId) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    try {
      const q = collection(db, "proyectos", projectId, "inventario");
      const unsub = onSnapshot(
        q, 
        (snap) => {
          const unique = Array.from(
            new Map(snap.docs.map((d) => [d.id, { idDoc: d.id, ...d.data() }])).values()
          );
          setItems(unique);
          setLoading(false);
        },
        (err) => {
          console.error('Error en suscripción de inventario:', err);
          setError(err);
          setLoading(false);
        }
      );
      
      return () => unsub();
    } catch (err) {
      console.error('Error inicializando useProjectInventory:', err);
      setError(err);
      setLoading(false);
    }
  }, [projectId]);

  return { items, loading, error };
};