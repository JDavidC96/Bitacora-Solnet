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

export const useStepsNotifications = (tasks, projectTitle, projectId) => {
  const timerRef = useRef(null);
  const scheduledKeysRef = useRef(new Set());
  const lastTaskHashRef = useRef('');

  // Función para generar un hash de las tareas actuales
  const getTasksHash = (tasks) => {
    if (!tasks || tasks.length === 0) return 'empty';
    return tasks.map(t => 
      `${t.idDoc}-${t.cumplida}-${t.fechaInicio}-${t.fechaFin}-${t.titulo}-${t.esMantenimiento || false}`
    ).join('|');
  };

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

  const sendNotification = async (title, body, trigger = null, key = null, projectId = null, taskId = null) => {
    try {
      if (key && scheduledKeysRef.current.has(key)) {
        console.log(`⚠️ Notificación duplicada omitida: ${key}`);
        return;
      }
      if (key) scheduledKeysRef.current.add(key);

      await Notifications.scheduleNotificationAsync({
        content: { 
          title, 
          body,
          data: {
            projectId: projectId || '',
            taskId: taskId || '',
            screen: 'ProjectStepScreen',
            type: 'task_alert'
          }
        },
        trigger: trigger instanceof Date ? { type: 'date', date: trigger } : trigger,
      });
      
      console.log(`✅ Notificación programada: ${title}`);
    } catch (e) {
      console.error('❌ Error programando notificación:', e);
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

    const currentHash = getTasksHash(tasks);
    
    if (currentHash === lastTaskHashRef.current) {
      console.log('⚡ Tareas sin cambios, omitiendo reprocesamiento de notificaciones');
      return;
    }
    
    console.log('🔄 Procesando notificaciones para tareas actualizadas');
    lastTaskHashRef.current = currentHash;

    const revisarYProgramar = () => {
      const now = new Date();
      const hoyISO = now.toISOString().split('T')[0];

      tasks.forEach((t) => {
        const esMantenimiento = t.esMantenimiento;
        const estado = getEstado(t);
        const emoji = estadoEmoji(estado);

        // Notificación inmediata: Tarea/Mantenimiento inicia hoy
        if (t.fechaInicio === hoyISO) {
          const tipoTexto = esMantenimiento ? 'Mantenimiento programado' : 'Tarea inicia';
          sendNotification(
            `${emoji} [${projectTitle}]: ${tipoTexto}: ${t.titulo}`,
            `El ${esMantenimiento ? 'mantenimiento' : 'tarea'} "${t.titulo}" del proyecto "${projectTitle}" ${esMantenimiento ? 'está programado para' : 'comienza'} hoy.`,
            null,
            `${t.idDoc}_start_today_${hoyISO}`,
            projectId,
            t.idDoc
          );
        }

        // Notificación inmediata: Tarea/Mantenimiento en retraso
        if (!t.cumplida && new Date(hoyISO) > new Date(t.fechaFin)) {
          const tipoTexto = esMantenimiento ? 'Mantenimiento retrasado' : 'Retraso en';
          sendNotification(
            `${emoji} [${projectTitle}]: ${tipoTexto}: ${t.titulo}`,
            `El ${esMantenimiento ? 'mantenimiento' : 'tarea'} "${t.titulo}" del proyecto "${projectTitle}" debía realizarse el ${t.fechaFin} y sigue pendiente.`,
            null,
            `${t.idDoc}_delay_${hoyISO}`,
            projectId,
            t.idDoc
          );
        }

        // Notificación programada: Inicio de tarea/mantenimiento
        if (t.fechaInicio) {
          const startKey = `${t.idDoc}_start_${t.fechaInicio}`;
          const startTrigger = new Date(`${t.fechaInicio}T09:00:00`);
          if (startTrigger > now) {
            const tipoTexto = esMantenimiento ? 'Mantenimiento programado' : 'Inicio de';
            sendNotification(
              `${estadoEmoji('pendiente')} [${projectTitle}]: ${tipoTexto} ${t.titulo}`,
              `El ${esMantenimiento ? 'mantenimiento' : 'tarea'} "${t.titulo}" del proyecto "${projectTitle}" ${esMantenimiento ? 'está programado para' : 'inicia'} hoy.`,
              startTrigger,
              startKey,
              projectId,
              t.idDoc
            );
          }
        }

        // Notificación programada: Fin de tarea/mantenimiento
        if (t.fechaFin && !t.cumplida) {
          const endKey = `${t.idDoc}_end_${t.fechaFin}`;
          const endTrigger = new Date(`${t.fechaFin}T17:00:00`);
          if (endTrigger > now) {
            const tipoTexto = esMantenimiento ? 'Vence mantenimiento' : 'Vence';
            sendNotification(
              `${estadoEmoji('pendiente')} [${projectTitle}]: ${tipoTexto} ${t.titulo}`,
              `El ${esMantenimiento ? 'mantenimiento' : 'tarea'} "${t.titulo}" del proyecto "${projectTitle}" vence hoy.`,
              endTrigger,
              endKey,
              projectId,
              t.idDoc
            );
          }
        }
      });
    };

    revisarYProgramar();

    const actualizarAMedianoche = async () => {
      console.log('🌙 Actualizando notificaciones para nuevo día');
      await Notifications.cancelAllScheduledNotificationsAsync();
      scheduledKeysRef.current.clear();
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
  }, [tasks, projectTitle, projectId]);
};