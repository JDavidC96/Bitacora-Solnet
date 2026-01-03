// hooks/useProjectInventory.js
import { collection, onSnapshot, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../firebase/firebaseConfig";

export const useProjectInventory = (projectId) => {
  const [projectItems, setProjectItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;

    const ref = collection(db, "proyectos", projectId, "inventario");
    const q = query(ref);

    // 📌 Firestore listener en tiempo real
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setProjectItems(list);
        setLoading(false);
      },
      (err) => {
        console.error("Error cargando inventario del proyecto:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [projectId]);

  return {
    projectItems,
    loading,
  };
};
