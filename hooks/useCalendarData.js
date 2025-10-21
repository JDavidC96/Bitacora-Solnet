// hooks/useCalendarData.js
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../firebase/firebaseConfig';

export const useCalendarData = (projectId) => {
  const [notes, setNotes] = useState([]);
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    try {
      // Suscribirse a notas
      const notesQuery = query(
        collection(db, 'proyectos', projectId, 'notas'),
        orderBy('fechaISO', 'desc')
      );
      
      const unsubscribeNotes = onSnapshot(notesQuery, 
        (snapshot) => {
          const notesData = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
          }));
          setNotes(notesData);
        },
        (err) => {
          console.error('Error en suscripción de notas:', err);
          setError(err);
        }
      );

      // Suscribirse a etapas
      const stagesQuery = collection(db, 'proyectos', projectId, 'etapas');
      
      const unsubscribeStages = onSnapshot(stagesQuery,
        (snapshot) => {
          const stagesData = snapshot.docs.map(doc => ({ 
            idDoc: doc.id, 
            ...doc.data() 
          }));
          setStages(stagesData);
          setLoading(false);
        },
        (err) => {
          console.error('Error en suscripción de etapas:', err);
          setError(err);
          setLoading(false);
        }
      );

      return () => {
        unsubscribeNotes();
        unsubscribeStages();
      };
    } catch (err) {
      console.error('Error inicializando useCalendarData:', err);
      setError(err);
      setLoading(false);
    }
  }, [projectId]);

  // Calcular fechas marcadas
  const markedDates = calculateMarkedDates(notes, stages);

  return { notes, stages, markedDates, loading, error };
};

// Función para calcular las fechas marcadas en el calendario
function calculateMarkedDates(notes = [], stages = []) {
  const markedDates = {};

  // Marcar etapas
  stages.forEach(stage => {
    if (stage.fechaInicio && stage.fechaFin) {
      // Inicio y fin en el mismo día
      if (stage.fechaInicio === stage.fechaFin) {
        markedDates[stage.fechaInicio] = { 
          color: "purple", 
          tipo: "inicio-fin",
          etapa: stage 
        };
      } else {
        // Inicio
        markedDates[stage.fechaInicio] = { 
          color: "green", 
          tipo: "inicio",
          etapa: stage 
        };
        
        // Fin (solo si no está cumplida)
        if (!stage.cumplida) {
          markedDates[stage.fechaFin] = { 
            color: "red", 
            tipo: "fin",
            etapa: stage 
          };
        }
      }
    }

    // Prórroga
    if (stage.fechaFinOriginal && stage.fechaFin && stage.fechaFinOriginal !== stage.fechaFin) {
      markedDates[stage.fechaFinOriginal] = { 
        color: "yellow", 
        tipo: "prorroga",
        etapa: stage 
      };
    }

    // Fecha de cumplimiento
    if (stage.fechaCumplida) {
      markedDates[stage.fechaCumplida] = { 
        color: "green", 
        tipo: "cumplida",
        etapa: stage 
      };
    }
  });

  // Marcar notas
  notes.forEach(note => {
    if (note.fechaISO) {
      markedDates[note.fechaISO] = { 
        color: "blue", 
        tipo: "nota",
        note: note 
      };
    }
  });

  return markedDates;
}