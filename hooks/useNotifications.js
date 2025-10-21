// hooks/useNotifications.js
import * as Notifications from 'expo-notifications';
import { collection, getDocs } from 'firebase/firestore';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { db } from '../firebase/firebaseConfig';

export const useNotifications = () => {
  useEffect(() => {
    const configureNotifications = async () => {
      const { status } = await Notifications.requestPermissionsAsync({
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
        shouldShowBanner: true,
        shouldShowList: true,
      });

      if (status !== 'granted') {
        console.warn('Permiso de notificaciones no concedido');
        return;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.HIGH,
          sound: true,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }
    };

    configureNotifications();
  }, []);
};

// Hook para notificaciones de tareas atrasadas
export const useDelayedTasksNotifier = () => {
  const notifyDelayedTasks = async () => {
    try {
      const proyectosSnap = await getDocs(collection(db, "proyectos"));
      
      for (const proyectoDoc of proyectosSnap.docs) {
        const proyecto = proyectoDoc.data();
        const etapasSnap = await getDocs(
          collection(db, "proyectos", proyectoDoc.id, "etapas")
        );

        etapasSnap.forEach((et) => {
          const tarea = et.data();
          const hoyISO = new Date().toISOString().split("T")[0];

          if (!tarea.cumplida && new Date(hoyISO) > new Date(tarea.fechaFin)) {
            Notifications.scheduleNotificationAsync({
              content: {
                title: `🔴 [${proyecto.title || "Proyecto"}]: Retraso en: ${tarea.titulo}`,
                body: `La tarea debía terminar el ${tarea.fechaFin} y sigue pendiente.`,
              },
              trigger: null,
            });
          }
        });
      }
    } catch (e) {
      console.error("Error revisando tareas atrasadas:", e);
    }
  };

  return { notifyDelayedTasks };
};