import * as Notifications from "expo-notifications";
import { collection, getDocs } from "firebase/firestore";
import { Platform } from "react-native";
import { db } from "./firebase/firebaseConfig";
import { diffDiasHabiles } from "./utils/dateUtils"; // usa festivos via helper

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
const scheduledKeysSession = new Set();

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

async function scheduleUnique({ title, body, date, key }) {
  if (!(date instanceof Date)) return;
  if (date <= new Date()) return;
  if (key && scheduledKeysSession.has(key)) return;
  if (key) scheduledKeysSession.add(key);

  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: { type: "date", date },
  });
}

/**
 * Programa notificaciones para una tarea:
 * - 2 días antes de iniciar
 * - día de inicio
 * - 2 días antes de terminar (si dura > 3 días hábiles)
 * - día de fin
 * - atraso inmediato si ya está vencida
 */
export async function scheduleTaskBundle(tarea, opts = {}) {
  const {
    daysAhead = 7,
    prefixKey = tarea.idDoc || tarea.titulo || "tarea",
    notifyOverdue = true,
  } = opts;

  if (!tarea?.fechaInicio || !tarea?.fechaFin) return;

  // 👇 Asegurar que siempre tengamos el nombre del proyecto
  const proyectoNombre = tarea.proyectoTitulo || "Proyecto sin nombre";
  const proyectoTxt = ` [${proyectoNombre}]`;

  const durHabiles = diffDiasHabiles(tarea.fechaInicio, tarea.fechaFin);

  // 2 días antes de inicio
  const startMinus2 = atHour(tarea.fechaInicio, 9, 0);
  startMinus2.setDate(startMinus2.getDate() - 2);
  if (isWithinNextDays(startMinus2, daysAhead)) {
    await scheduleUnique({
      title: `⏳ Se acerca inicio: ${tarea.titulo}${proyectoTxt}`,
      body: `Faltan 2 días para iniciar "${tarea.titulo}" del proyecto "${proyectoNombre}".`,
      date: startMinus2,
      key: `${prefixKey}_start_minus2_${tarea.fechaInicio}`,
    });
  }

  // Día de inicio
  const startDay = atHour(tarea.fechaInicio, 9, 0);
  if (isWithinNextDays(startDay, daysAhead)) {
    await scheduleUnique({
      title: `📅 Inicio de ${tarea.titulo}${proyectoTxt}`,
      body: `La tarea "${tarea.titulo}" del proyecto "${proyectoNombre}" inicia hoy.`,
      date: startDay,
      key: `${prefixKey}_start_${tarea.fechaInicio}`,
    });
  }

  // 2 días antes del fin
  const endMinus2 = atHour(tarea.fechaFin, 9, 0);
  endMinus2.setDate(endMinus2.getDate() - 2);
  if (durHabiles > 3 && isWithinNextDays(endMinus2, daysAhead)) {
    await scheduleUnique({
      title: `⏳ Se acerca fin: ${tarea.titulo}${proyectoTxt}`,
      body: `Faltan 2 días para finalizar "${tarea.titulo}" del proyecto "${proyectoNombre}".`,
      date: endMinus2,
      key: `${prefixKey}_end_minus2_${tarea.fechaFin}`,
    });
  }

  // Día de fin
  const endDay = atHour(tarea.fechaFin, 17, 0);
  if (isWithinNextDays(endDay, daysAhead)) {
    await scheduleUnique({
      title: `⏰ Vence ${tarea.titulo}${proyectoTxt}`,
      body: `La tarea "${tarea.titulo}" del proyecto "${proyectoNombre}" vence hoy.`,
      date: endDay,
      key: `${prefixKey}_end_${tarea.fechaFin}`,
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
        body: `La tarea "${tarea.titulo}" del proyecto "${proyectoNombre}" debía terminar el ${tarea.fechaFin} y sigue pendiente.`,
      },
      trigger: null,
    });
  }
}

/**
 * Recorre todos los proyectos y programa notificaciones de tareas
 */
export async function programProjectNotifications(
  uid,
  { daysAhead = 7, notifyOverdue = true } = {}
) {
  try {
    const proyectosSnap = await getDocs(collection(db, "proyectos"));

    for (const proyecto of proyectosSnap.docs) {
      const data = proyecto.data();
      const etapasSnap = await getDocs(
        collection(db, "proyectos", proyecto.id, "etapas")
      );

      for (const etapa of etapasSnap.docs) {
        const t = { idDoc: etapa.id, ...etapa.data() };

        await scheduleTaskBundle(
          { 
            ...t, 
            proyectoTitulo: data.title || data.nombre || "Proyecto sin nombre" 
          },
          {
            daysAhead,
            prefixKey: `${proyecto.id}_${t.idDoc}`,
            notifyOverdue,
          }
        );
      }
    }
  } catch (err) {
    console.error("Error programando notificaciones de proyectos:", err);
  }
}