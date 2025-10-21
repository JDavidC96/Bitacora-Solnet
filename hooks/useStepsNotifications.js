import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

// Configuración inicial de notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const useStepsNotifications = (tasks, projectTitle) => {
  const timerRef = useRef(null);
  const scheduledKeysRef = useRef(new Set());

  // Configurar canal de notificaciones
  useEffect(() => {
    const setupNotifications = async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.HIGH,
          sound: true,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        await Notifications.requestPermissionsAsync();
      }
    };

    setupNotifications();
  }, []);

  const sendNotification = async (title, body, trigger = null, key = null) => {
    try {
      if (key && scheduledKeysRef.current.has(key)) return;
      if (key) scheduledKeysRef.current.add(key);

      await Notifications.scheduleNotificationAsync({
        content: { title, body },
        trigger: trigger instanceof Date ? { type: 'date', date: trigger } : trigger,
      });
    } catch (e) {
      console.error('Error programando notificación:', e);
    }
  };

  const getEstado = (t) => {
    if (t.cumplida) return 'cumplida';
    const hoyISO = new Date().toISOString().split('T')[0];
    if (new Date(hoyISO) > new Date(t.fechaFin)) return 'retraso';
    return 'pendiente';
  };

  const estadoEmoji = (estado) =>
    estado === 'cumplida' ? '🟢' : estado === 'retraso' ? '🔴' : '🟡';

  // Programar notificaciones
  useEffect(() => {
    if (!tasks || tasks.length === 0) return;

    const revisarYProgramar = () => {
      const now = new Date();
      const hoyISO = now.toISOString().split('T')[0];

      tasks.forEach((t) => {
        const estado = getEstado(t);
        const emoji = estadoEmoji(estado);

        if (t.fechaInicio === hoyISO) {
          sendNotification(
            `${emoji} [${projectTitle}]: Tarea inicia: ${t.titulo}`,
            `La tarea "${t.titulo}" comienza hoy (${t.fechaInicio}).`,
            null,
            `${t.idDoc}_start_today`
          );
        }

        if (!t.cumplida && new Date(hoyISO) > new Date(t.fechaFin)) {
          sendNotification(
            `${emoji} [${projectTitle}]: Retraso en: ${t.titulo}`,
            `La tarea debía terminar el ${t.fechaFin} y sigue pendiente.`,
            null,
            `${t.idDoc}_delay`
          );
        }

        if (t.fechaInicio) {
          const startKey = `${t.idDoc}_start_${t.fechaInicio}`;
          const startTrigger = new Date(`${t.fechaInicio}T09:00:00`);
          if (startTrigger > now) {
            sendNotification(
              `${estadoEmoji('pendiente')} Inicio de ${t.titulo}`,
              `Hoy inicia la tarea "${t.titulo}".`,
              startTrigger,
              startKey
            );
          }
        }

        if (t.fechaFin && !t.cumplida) {
          const endKey = `${t.idDoc}_end_${t.fechaFin}`;
          const endTrigger = new Date(`${t.fechaFin}T17:00:00`);
          if (endTrigger > now) {
            sendNotification(
              `${estadoEmoji('pendiente')} Vence ${t.titulo}`,
              `Hoy vence la tarea "${t.titulo}".`,
              endTrigger,
              endKey
            );
          }
        }
      });
    };

    revisarYProgramar();

    const actualizarAMedianoche = async () => {
      await Notifications.cancelAllScheduledNotificationsAsync();
      revisarYProgramar();
    };

    const ahora = new Date();
    const siguienteMedianoche = new Date(ahora);
    siguienteMedianoche.setHours(24, 0, 0, 0);
    const msHastaMedianoche = siguienteMedianoche.getTime() - ahora.getTime();

    timerRef.current = setTimeout(() => {
      actualizarAMedianoche();
      timerRef.current = setInterval(actualizarAMedianoche, 24 * 60 * 60 * 1000);
    }, msHastaMedianoche);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        clearInterval(timerRef.current);
      }
    };
  }, [tasks, projectTitle]);
};