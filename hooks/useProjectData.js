import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { db } from '../firebase/firebaseConfig';

export const useProjectData = (projectId) => {
  const [projectStartISO, setProjectStartISO] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (!projectId) return; // No hacer nada si no hay projectId

    const fetchProject = async () => {
      try {
        const ref = doc(db, 'proyectos', projectId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          if (data.startDate) {
            setProjectStartISO(data.startDate.split('T')[0]);
          }
        }
      } catch (err) {
        console.error('Error obteniendo proyecto:', err);
      }
    };
    fetchProject();
  }, [projectId]);

  const handleChangeStartDate = async (dateObj) => {
    if (!dateObj || !projectId) return; // Validar projectId
    const newISO = dateObj.toISOString().split('T')[0];
    try {
      await updateDoc(doc(db, 'proyectos', projectId), {
        startDate: new Date(newISO).toISOString(),
      });
      setProjectStartISO(newISO);
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