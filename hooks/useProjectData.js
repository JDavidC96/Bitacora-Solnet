import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { db } from '../firebase/firebaseConfig';
import { useProjectCache } from './useProjectCache';

export const useProjectData = (projectId) => {
  const [projectStartISO, setProjectStartISO] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const { getCachedProject, saveProjectToCache } = useProjectCache();

  useEffect(() => {
    if (!projectId) return;

    const fetchProject = async () => {
      try {
        // Intentar obtener del cache primero
        const cached = getCachedProject(projectId);
        if (cached && cached.startDate) {
          setProjectStartISO(cached.startDate.split('T')[0]);
        }

        // Siempre obtener datos frescos de Firestore
        const ref = doc(db, 'proyectos', projectId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          if (data.startDate) {
            const startDate = data.startDate.split('T')[0];
            setProjectStartISO(startDate);
            
            // Guardar en cache para notificaciones (las tareas se añaden después)
            saveProjectToCache(projectId, data, []);
          }
        }
      } catch (err) {
        console.error('Error obteniendo proyecto:', err);
      }
    };
    fetchProject();
  }, [projectId]);

  const handleChangeStartDate = async (dateObj) => {
    if (!dateObj || !projectId) return;
    const newISO = dateObj.toISOString().split('T')[0];
    try {
      await updateDoc(doc(db, 'proyectos', projectId), {
        startDate: new Date(newISO).toISOString(),
      });
      setProjectStartISO(newISO);
      
      // Actualizar cache
      const ref = doc(db, 'proyectos', projectId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        const cached = getCachedProject(projectId);
        saveProjectToCache(projectId, data, cached?.tasks || []);
      }
    } catch (e) {
      console.error('Error cambiando fecha de inicio:', e);
      Alert.alert('Error', 'No fue posible actualizar la fecha de inicio del proyecto.');
    }
  };

  return {
    projectStartISO,
    showDatePicker,
    setShowDatePicker,
    handleChangeStartDate,
  };
};