import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { diffDiasHabiles } from "./utils/dateUtils";

// ===== Configuración de Cache =====
const CACHE_DURATION = 168 * 60 * 60 * 1000; // 168 horas = 7 días
const PROJECTS_CACHE_KEY = '@projects_cache';
const CACHE_TIMESTAMP_KEY = '@projects_cache_timestamp';

// ===== Sistema de bloqueo para evitar duplicados =====
let isInitialized = false;
let initializationPromise = null;
const scheduledKeysSession = new Set();

// ===== Funciones de Cache =====
async function isCacheValid() {
  try {
    const timestamp = await AsyncStorage.getItem(CACHE_TIMESTAMP_KEY);
    if (!timestamp) return false;
    
    const now = Date.now();
    const cacheTime = parseInt(timestamp);
    
    return (now - cacheTime) < CACHE_DURATION;
  } catch (error) {
    console.error('Error verificando validez del cache:', error);
    return false;
  }
}

async function saveCacheWithTimestamp(data) {
  try {
    await AsyncStorage.setItem(PROJECTS_CACHE_KEY, JSON.stringify(data));
    await AsyncStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    console.log('💾 Cache guardado con timestamp');
  } catch (error) {
    console.error('Error guardando cache:', error);
  }
}

async function getCachedProjects() {
  try {
    const cacheValid = await isCacheValid();
    
    if (!cacheValid) {
      console.log('🔄 Cache expirado o no válido');
      return {};
    }
    
    const cached = await AsyncStorage.getItem(PROJECTS_CACHE_KEY);
    if (cached) {
      console.log('📁 Cache válido encontrado');
      return JSON.parse(cached);
    }
    return {};
  } catch (error) {
    console.error('Error reading cache for notifications:', error);
    return {};
  }
}

// ===== Configuración base =====
export async function configureNotifications() {
  const { status } = await Notifications.requestPermissionsAsync({
    allowAlert: true,
    allowBadge: true,
    allowSound: true,
    shouldShowBanner: true,
    shouldShowList: true,
  });

  if (status !== "granted") {
    console.warn("Permiso de notificaciones no concedido");
    return;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.HIGH,
      sound: true,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }
}

export async function showSaveNotification(title, body) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: null,
  });
}

export async function scheduleTaskNotification(title, body, fecha) {
  if (!(fecha instanceof Date)) {
    console.error("scheduleTaskNotification: fecha debe ser Date");
    return;
  }
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: { type: "date", date: fecha },
  });
}

export async function scheduleIntervalNotification(title, body, seconds) {
  if (!seconds || seconds <= 0) {
    console.error("scheduleIntervalNotification: el intervalo debe ser > 0");
    return;
  }
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: { type: "timeInterval", seconds, repeats: true },
  });
}

// ===== Utilidades internas =====
function atHour(dateYYYYMMDD, hour = 9, minute = 0) {
  const d = new Date(
    typeof dateYYYYMMDD === "string"
      ? `${dateYYYYMMDD}T00:00:00`
      : dateYYYYMMDD
  );
  d.setHours(hour, minute, 0, 0);
  return d;
}

function daysFromNow(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
}

function isWithinNextDays(target, daysAhead) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = daysFromNow(daysAhead);
  return target > start && target <= end;
}

async function scheduleUnique({ title, body, date, key, projectId, taskId }) {
  if (!(date instanceof Date)) return;
  if (date <= new Date()) return;
  if (key && scheduledKeysSession.has(key)) return;
  if (key) scheduledKeysSession.add(key);

  await Notifications.scheduleNotificationAsync({
    content: { 
      title, 
      body,
      data: {
        projectId: projectId || '',
        taskId: taskId || '',
        screen: 'ProjectStepScreen',
        type: 'task_reminder'
      }
    },
    trigger: { type: "date", date },
  });
}

/**
 * Programa notificaciones para una tarea usando datos del cache
 */
export async function scheduleTaskBundleFromCache(tarea, projectTitle, opts = {}) {
  const {
    daysAhead = 7,
    prefixKey = tarea.idDoc || tarea.titulo || "tarea",
    notifyOverdue = true,
    projectId = ''
  } = opts;

  if (!tarea?.fechaInicio || !tarea?.fechaFin) return;

  const proyectoTxt = ` [${projectTitle}]`;
  const durHabiles = diffDiasHabiles(tarea.fechaInicio, tarea.fechaFin);

  // 2 días antes de inicio
  const startMinus2 = atHour(tarea.fechaInicio, 9, 0);
  startMinus2.setDate(startMinus2.getDate() - 2);
  if (isWithinNextDays(startMinus2, daysAhead)) {
    await scheduleUnique({
      title: `⏳ Se acerca inicio: ${tarea.titulo}${proyectoTxt}`,
      body: `Faltan 2 días para iniciar "${tarea.titulo}" del proyecto "${projectTitle}".`,
      date: startMinus2,
      key: `${prefixKey}_start_minus2_${tarea.fechaInicio}`,
      projectId: projectId,
      taskId: tarea.idDoc
    });
  }

  // Día de inicio
  const startDay = atHour(tarea.fechaInicio, 9, 0);
  if (isWithinNextDays(startDay, daysAhead)) {
    await scheduleUnique({
      title: `📅 Inicio de ${tarea.titulo}${proyectoTxt}`,
      body: `La tarea "${tarea.titulo}" del proyecto "${projectTitle}" inicia hoy.`,
      date: startDay,
      key: `${prefixKey}_start_${tarea.fechaInicio}`,
      projectId: projectId,
      taskId: tarea.idDoc
    });
  }

  // 2 días antes del fin
  const endMinus2 = atHour(tarea.fechaFin, 9, 0);
  endMinus2.setDate(endMinus2.getDate() - 2);
  if (durHabiles > 3 && isWithinNextDays(endMinus2, daysAhead)) {
    await scheduleUnique({
      title: `⏳ Se acerca fin: ${tarea.titulo}${proyectoTxt}`,
      body: `Faltan 2 días para finalizar "${tarea.titulo}" del proyecto "${projectTitle}".`,
      date: endMinus2,
      key: `${prefixKey}_end_minus2_${tarea.fechaFin}`,
      projectId: projectId,
      taskId: tarea.idDoc
    });
  }

  // Día de fin
  const endDay = atHour(tarea.fechaFin, 17, 0);
  if (isWithinNextDays(endDay, daysAhead)) {
    await scheduleUnique({
      title: `⏰ Vence ${tarea.titulo}${proyectoTxt}`,
      body: `La tarea "${tarea.titulo}" del proyecto "${projectTitle}" vence hoy.`,
      date: endDay,
      key: `${prefixKey}_end_${tarea.fechaFin}`,
      projectId: projectId,
      taskId: tarea.idDoc
    });
  }

  // Atraso inmediato
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fin = atHour(tarea.fechaFin, 23, 59);
  if (notifyOverdue && !tarea.cumplida && hoy > fin) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🔴 Retraso en: ${tarea.titulo}${proyectoTxt}`,
        body: `La tarea "${tarea.titulo}" del proyecto "${projectTitle}" debía terminar el ${tarea.fechaFin} y sigue pendiente.`,
        data: {
          projectId: projectId,
          taskId: tarea.idDoc,
          screen: 'ProjectStepScreen',
          type: 'task_overdue'
        }
      },
      trigger: null,
    });
  }
}

/**
 * Recorre todos los proyectos del cache y programa notificaciones
 */
export async function programProjectNotificationsFromCache({ daysAhead = 7, notifyOverdue = true } = {}) {
  if (initializationPromise) {
    console.log('⚠️ Inicialización de notificaciones en progreso, omitiendo...');
    return initializationPromise;
  }

  if (isInitialized) {
    console.log('⚠️ Notificaciones ya inicializadas, omitiendo...');
    return;
  }

  initializationPromise = (async () => {
    try {
      isInitialized = true;
      console.log('🔄 Iniciando programación de notificaciones desde cache...');
      
      await Notifications.cancelAllScheduledNotificationsAsync();
      scheduledKeysSession.clear();
      
      const cachedProjects = await getCachedProjects();
      console.log(`📁 Proyectos en cache: ${Object.keys(cachedProjects).length}`);
      
      let totalTasks = 0;
      for (const [projectId, projectData] of Object.entries(cachedProjects)) {
        const projectTitle = projectData.title || 'Proyecto sin nombre';
        const tasks = projectData.tasks || [];
        totalTasks += tasks.length;
        
        for (const task of tasks) {
          await scheduleTaskBundleFromCache(
            task, 
            projectTitle,
            {
              daysAhead,
              prefixKey: `${projectId}_${task.idDoc}`,
              notifyOverdue,
              projectId: projectId
            }
          );
        }
      }
      console.log(`✅ Notificaciones programadas desde cache: ${totalTasks} tareas procesadas`);
    } catch (err) {
      console.error("❌ Error programando notificaciones desde cache:", err);
      isInitialized = false;
    } finally {
      initializationPromise = null;
    }
  })();

  return initializationPromise;
}

// ===== Funciones de utilidad =====
export async function forceReprogramNotifications() {
  isInitialized = false;
  return await programProjectNotificationsFromCache();
}

export async function clearAllNotifications() {
  isInitialized = false;
  initializationPromise = null;
  scheduledKeysSession.clear();
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function clearExpiredCache() {
  try {
    const cacheValid = await isCacheValid();
    
    if (!cacheValid) {
      await AsyncStorage.multiRemove([PROJECTS_CACHE_KEY, CACHE_TIMESTAMP_KEY]);
      console.log('🧹 Cache expirado limpiado');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error limpiando cache expirado:', error);
    return false;
  }
}

export async function forceClearCache() {
  try {
    await AsyncStorage.multiRemove([PROJECTS_CACHE_KEY, CACHE_TIMESTAMP_KEY]);
    console.log('🧹 Cache forzado a limpiar');
    return true;
  } catch (error) {
    console.error('Error forzando limpieza de cache:', error);
    return false;
  }
}

export async function getCacheStatus() {
  try {
    const timestamp = await AsyncStorage.getItem(CACHE_TIMESTAMP_KEY);
    const hasCache = await AsyncStorage.getItem(PROJECTS_CACHE_KEY);
    
    if (!timestamp || !hasCache) {
      return { exists: false, valid: false, age: null };
    }
    
    const now = Date.now();
    const cacheTime = parseInt(timestamp);
    const age = now - cacheTime;
    const valid = age < CACHE_DURATION;
    const hoursOld = Math.floor(age / (60 * 60 * 1000));
    
    return {
      exists: true,
      valid,
      age: hoursOld,
      maxAge: 168,
      willExpireIn: Math.max(0, 168 - hoursOld)
    };
  } catch (error) {
    console.error('Error obteniendo estado del cache:', error);
    return { exists: false, valid: false, age: null, error: error.message };
  }
}

export function getNotificationStatus() {
  return {
    isInitialized,
    isInitializing: !!initializationPromise,
    scheduledKeysCount: scheduledKeysSession.size
  };
}

// Exportar para uso en otros archivos
export { PROJECTS_CACHE_KEY, saveCacheWithTimestamp };
