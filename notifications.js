import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export async function configureNotifications() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    console.warn('Permiso de notificaciones no concedido');
    return;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

export async function showSaveNotification() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '✅ Entrada guardada',
      body: 'Tu nota fue registrada correctamente.',
    },
    trigger: null, // Se muestra de inmediato
  });
}
