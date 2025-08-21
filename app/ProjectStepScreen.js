import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
// Firebase
import { addDoc, collection, doc, getDoc, getDocs, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
// Notificaciones
import * as Notifications from 'expo-notifications';

// Helpers
import { buildSchedule, DEFINICION_TAREAS, HOLIDAYS_CO, isBusinessDay } from '../helper';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function ProjectStepsScreen() {
  const { id, title } = useLocalSearchParams();
  const [tasks, setTasks] = useState([]);
  const [projectStartISO, setProjectStartISO] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [prorrogaModal, setProrrogaModal] = useState(false);
  const [prorrogaTarget, setProrrogaTarget] = useState(null);
  const [prorrogaDias, setProrrogaDias] = useState('0');

  const timerRef = useRef(null);

  // Config Android canal notificaciones
  useEffect(() => {
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
  }, []);

  // Función para disparar notificaciones
  const sendNotification = async (title, body) => {
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null, // Inmediata
    });
  };

  // Traer fecha real del proyecto desde Firestore
  useEffect(() => {
    const fetchProject = async () => {
      try {
        const ref = doc(db, 'proyectos', id);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          if (data.startDate) {
            setProjectStartISO(data.startDate.split('T')[0]); // YYYY-MM-DD
          }
        }
      } catch (err) {
        console.error("Error obteniendo proyecto:", err);
      }
    };
    fetchProject();
  }, [id]);

  // Contar días hábiles entre dos fechas
  const contarDiasHabiles = (fechaInicio, fechaFin) => {
    let dias = 0;
    let actual = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    while (actual <= fin) {
      if (isBusinessDay(actual, HOLIDAYS_CO)) dias++;
      actual.setDate(actual.getDate() + 1);
    }
    return dias;
  };

  // Duración de la tarea en días hábiles
  const diasActividadHabiles = (fechaInicio, fechaFin) => {
    return contarDiasHabiles(fechaInicio, fechaFin);
  };

  // Días de retraso en días hábiles
  const diasRetrasoHabiles = (fechaFin) => {
    let hoy = new Date();
    let fin = new Date(fechaFin);
    if (hoy <= fin) return 0;
    return contarDiasHabiles(fin, hoy);
  };

  useEffect(() => {
    const q = collection(db, 'proyectos', id, 'etapas');
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ idDoc: d.id, ...d.data() }));
      setTasks(data);
    });
    return () => unsub();
  }, [id]);

  // Generar etapas SOLO cuando ya tenemos la fecha de inicio real
  useEffect(() => {
    if (!projectStartISO) return;

    (async () => {
      const q = collection(db, 'proyectos', id, 'etapas');
      const snap = await getDocs(q);
      if (snap.empty) {
        const sched = buildSchedule(projectStartISO, {}, HOLIDAYS_CO);
        for (const def of DEFINICION_TAREAS) {
          const s = sched.get(def.id);
          await addDoc(collection(db, 'proyectos', id, 'etapas'), {
            titulo: def.titulo,
            fase: def.fase,
            idTarea: def.id,
            diasDuracion: def.dias,
            fechaInicio: s.fechaInicio,
            fechaFin: s.fechaFin,
            cumplida: false,
            prorrogas: 0,
            notas: [],
          });
        }
      }
    })();
  }, [id, projectStartISO]);

  //  Revisión diaria (medianoche) para notificaciones
  useEffect(() => {
    const revisarTareas = () => {
      const hoyISO = new Date().toISOString().split('T')[0];
      tasks.forEach((t) => {
        // Notificación cuando la tarea empieza
        if (t.fechaInicio === hoyISO) {
          sendNotification(
            `📌 Tarea iniciada: ${t.titulo}`,
            `La tarea "${t.titulo}" comienza hoy (${t.fechaInicio}).`
          );
        }

        // Notificación cuando entra en retraso
        if (!t.cumplida && new Date(hoyISO) > new Date(t.fechaFin)) {
          sendNotification(
            `⚠️ Retraso en: ${t.titulo}`,
            `La tarea "${t.titulo}" debió terminar el ${t.fechaFin} y sigue pendiente.`
          );
        }
      });
    };

    const actualizarAMedianoche = () => {
      setTasks(prev => [...prev]);
      revisarTareas();
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
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [tasks]);

  const toggleCumplida = async (tarea) => {
    try {
      const ref = doc(db, 'proyectos', id, 'etapas', tarea.idDoc);
      await updateDoc(ref, { cumplida: !tarea.cumplida });
    } catch (e) {
      console.error('Error actualizando cumplida:', e);
    }
  };

  const openProrroga = (tarea) => {
    setProrrogaTarget(tarea);
    setProrrogaDias('0');
    setProrrogaModal(true);
  };

  const applyProrroga = async () => {
    try {
      const extra = parseInt(prorrogaDias || '0', 10);
      if (!prorrogaTarget || isNaN(extra) || extra <= 0) {
        setProrrogaModal(false);
        return;
      }
      const q = collection(db, 'proyectos', id, 'etapas');
      const snap = await getDocs(q);
      const extraDurations = {};
      const byId = {};
      snap.docs.forEach(d => {
        const row = { idDoc: d.id, ...d.data() };
        byId[row.idTarea] = row;
        extraDurations[row.idTarea] = row.prorrogas || 0;
      });
      extraDurations[prorrogaTarget.idTarea] = (extraDurations[prorrogaTarget.idTarea] || 0) + extra;
      const sched = buildSchedule(projectStartISO, extraDurations, HOLIDAYS_CO);
      for (const def of DEFINICION_TAREAS) {
        const s = sched.get(def.id);
        const docId = byId[def.id].idDoc;
        const isTarget = def.id === prorrogaTarget.idTarea;
        await updateDoc(doc(db, 'proyectos', id, 'etapas', docId), {
          fechaInicio: s.fechaInicio,
          fechaFin: s.fechaFin,
          prorrogas: extraDurations[def.id],
          ...(isTarget
            ? { notas: [...(byId[def.id].notas || []), `Prórroga: +${extra} días hábiles`] }
            : {}),
        });
      }
      setProrrogaModal(false);
      setProrrogaTarget(null);
      setProrrogaDias('0');
    } catch (e) {
      console.error('Error aplicando prórroga:', e);
      Alert.alert('Error', 'No fue posible aplicar la prórroga.');
    }
  };

  const renderGroupedTasks = () => {
    const ordenIds = DEFINICION_TAREAS.map(t => t.id);
    const grouped = tasks.reduce((acc, tarea) => {
      if (!acc[tarea.fase]) acc[tarea.fase] = [];
      acc[tarea.fase].push(tarea);
      return acc;
    }, {});
    const fasesOrdenadas = Object.keys(grouped).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10);
      const numB = parseInt(b.replace(/\D/g, ''), 10);
      return numA - numB;
    });

    let fechaInicioProyecto = null;
    let fechaFinProyecto = null;

    return (
      <>
        {fasesOrdenadas.map((fase) => {
          const tareas = grouped[fase].sort(
            (a, b) => ordenIds.indexOf(a.idTarea) - ordenIds.indexOf(b.idTarea)
          );
          const minFecha = tareas.reduce((min, t) => min < t.fechaInicio ? min : t.fechaInicio, tareas[0].fechaInicio);
          const maxFecha = tareas.reduce((max, t) => max > t.fechaFin ? max : t.fechaFin, tareas[0].fechaFin);
          const diasFase = contarDiasHabiles(minFecha, maxFecha);

          if (!fechaInicioProyecto || minFecha < fechaInicioProyecto) fechaInicioProyecto = minFecha;
          if (!fechaFinProyecto || maxFecha > fechaFinProyecto) fechaFinProyecto = maxFecha;

          return (
            <View key={fase} style={{ marginBottom: 20 }}>
              <Text style={{ color: '#90CDF4', fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
                {fase} (Duración real: {diasFase} días hábiles)
              </Text>
              {tareas.map(t => {
                return (
                  <View key={t.idDoc} style={styles.taskCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={styles.taskTitle}>{t.titulo}</Text>
                      <TouchableOpacity onPress={() => toggleCumplida(t)}>
                        <Text style={[
                          styles.badge,
                          t.cumplida
                            ? styles.badgeOk
                            : diasRetrasoHabiles(t.fechaFin) > 0
                              ? styles.badgeDelay
                              : styles.badgePending
                        ]}>
                          {t.cumplida
                            ? 'Cumplida'
                            : diasRetrasoHabiles(t.fechaFin) > 0
                              ? 'Retraso'
                              : 'Pendiente'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.taskDate}>
                      Inicio: {t.fechaInicio} · Fin: {t.fechaFin}
                    </Text>

                    <Text style={{ color: '#ECC94B' }}>
                      Días de actividad: {diasActividadHabiles(t.fechaInicio, t.fechaFin)}
                    </Text>

                    {!t.cumplida && diasRetrasoHabiles(t.fechaFin) > 0 && (
                      <Text style={{ color: '#F56565', fontWeight: 'bold' }}>
                        ⚠️ Retraso: {diasRetrasoHabiles(t.fechaFin)} días
                      </Text>
                    )}

                    {!!t.prorrogas && <Text style={styles.taskNote}>Prórrogas acumuladas: {t.prorrogas} días</Text>}
                    {(t.notas?.length ?? 0) > 0 && (
                      <View style={{ marginTop: 6 }}>
                        {t.notas.map((n, i) => (
                          <Text key={i} style={styles.noteItem}>• {n}</Text>
                        ))}
                      </View>
                    )}
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                      <TouchableOpacity
                        style={[styles.smallBtn, { backgroundColor: '#ECC94B' }]}
                        onPress={() => openProrroga(t)}
                      >
                        <Text style={styles.smallBtnText}>➕ Prórroga</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })}

        {fechaInicioProyecto && fechaFinProyecto && (
          <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold', marginTop: 10 }}>
            ⏳ Duración total del proyecto: {contarDiasHabiles(fechaInicioProyecto, fechaFinProyecto)} días hábiles
          </Text>
        )}
      </>
    );
  };

  if (!projectStartISO) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1E1E2F' }}>
        <Text style={{ color: '#FFF' }}>Cargando fecha de inicio...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Etapas de {title}</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Fecha de inicio del proyecto:</Text>
        <TouchableOpacity onPress={() => setShowDatePicker(true)}>
          <Text style={styles.link}>{projectStartISO}</Text>
        </TouchableOpacity>
      </View>
      {showDatePicker && (
        <DateTimePicker
          value={new Date(projectStartISO)}
          mode="date"
          onChange={(e, date) => {
            if (date) setProjectStartISO(date.toISOString().split('T')[0]);
            setShowDatePicker(false);
          }}
        />
      )}
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {renderGroupedTasks()}
      </ScrollView>
      <Modal visible={prorrogaModal} transparent animationType="slide" onRequestClose={() => setProrrogaModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Agregar prórroga</Text>
            <Text style={{ color: '#CCC', marginBottom: 8 }}>
              {prorrogaTarget?.titulo} — ¿Cuántos días hábiles?
            </Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              placeholder="Días"
              placeholderTextColor="#aaa"
              value={prorrogaDias}
              onChangeText={setProrrogaDias}
            />
            <TouchableOpacity style={styles.button} onPress={applyProrroga}>
              <Text style={styles.buttonText}>Aplicar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setProrrogaModal(false)}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1E1E2F', padding: 20 },
  title: { color: '#FFF', fontSize: 22, marginBottom: 12, textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 10 },
  label: { color: '#CCC' },
  link: { color: '#90CDF4', textDecorationLine: 'underline' },
  taskCard: { backgroundColor: '#2C2C3A', padding: 14, borderRadius: 10, marginBottom: 10 },
  taskTitle: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  taskDate: { color: '#DDD', marginTop: 6 },
  taskNote: { color: '#ECC94B', marginTop: 6 },
  noteItem: { color: '#BEE3F8', fontSize: 13 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, overflow: 'hidden', fontWeight: '700' },
  badgeOk: { backgroundColor: '#48BB78', color: '#1A202C' },
  badgePending: { backgroundColor: '#CBD5E0', color: '#1A202C' },
  badgeDelay: { backgroundColor: '#F56565', color: '#FFF' },
  smallBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  smallBtnText: { color: '#1A202C', fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: '#000000aa', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { backgroundColor: '#2C2C3A', padding: 24, borderRadius: 12, width: '85%' },
  modalTitle: { color: '#FFF', fontSize: 18, marginBottom: 12, textAlign: 'center' },
  input: { backgroundColor: '#1E1E2F', color: '#FFF', padding: 12, borderRadius: 8, width: '100%', marginBottom: 16 },
  button: { backgroundColor: '#48BB78', padding: 12, borderRadius: 8, marginBottom: 8 },
  buttonText: { color: '#1A202C', fontWeight: 'bold', textAlign: 'center' },
  cancelText: { color: '#F56565', textAlign: 'center' },
});
