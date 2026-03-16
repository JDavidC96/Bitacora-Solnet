// hooks/useReservas.js
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../firebase/firebaseConfig';

/**
 * Hook para suscribirse en tiempo real a las reservas activas del inventario general.
 *
 * Devuelve:
 * - reservas:               lista completa de reservas activas
 * - reservasPorItem:        { [itemId]: totalCantidad }  — para el badge numérico
 * - reservasDetalladasPorItem: { [itemId]: Array<reserva> } — para el modal de gestión
 * - loading
 */
export const useReservas = () => {
  const [reservas, setReservas] = useState([]);
  const [reservasPorItem, setReservasPorItem] = useState({});
  const [reservasDetalladasPorItem, setReservasDetalladasPorItem] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsub;
    try {
      const q = query(
        collection(db, 'reservas_inventario'),
        where('status', '==', 'activa')
      );

      unsub = onSnapshot(
        q,
        (snap) => {
          const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setReservas(docs);

          const totales = {};
          const detalladas = {};

          docs.forEach((r) => {
            // Mapa de totales (badge)
            totales[r.itemId] = (totales[r.itemId] || 0) + Number(r.cantidad || 0);
            // Mapa de arrays (modal)
            if (!detalladas[r.itemId]) detalladas[r.itemId] = [];
            detalladas[r.itemId].push(r);
          });

          setReservasPorItem(totales);
          setReservasDetalladasPorItem(detalladas);
          setLoading(false);
        },
        (err) => {
          console.error('Error en useReservas:', err);
          setLoading(false);
        }
      );
    } catch (err) {
      console.error('Error inicializando useReservas:', err);
      setLoading(false);
    }

    return () => unsub?.();
  }, []);

  return { reservas, reservasPorItem, reservasDetalladasPorItem, loading };
};