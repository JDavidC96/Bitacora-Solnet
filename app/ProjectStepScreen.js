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

// Contexto de usuario (rol)
import { useUser } from '../context/UserContext';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function ProjectStepsScreen() {
  const { id, title } = useLocalSearchParams();
  const { role } = useUser(); //  rol centralizado

  // Permisos por rol
  const canMarkState = ['Administrador', 'Ingeniero', 'Supervisor'];
  const canProrroga = ['Administrador'];
  const canChangeStartDate = ['Administrador'];

  // ✅ Booleans reales por rol
  const canMarkStateRole = canMarkState.includes(role);
  const canProrrogaRole = canProrroga.includes(role);
  const canChangeStartDateRole = canChangeStartDate.includes(role);

  const [tasks, setTasks] = useState([]);
  const [projectStartISO, setProjectStartISO] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [prorrogaModal, setProrrogaModal] = useState(false);
  const [prorrogaTarget, setProrrogaTarget] = useState(null);
  const [prorrogaDias, setProrrogaDias] = useState('0');

  const timerRef = useRef(null);

  // Canal de notificaciones Android
  useEffect(() => {
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
  }, []);

  const sendNotification = async (title, body) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: { title, body },
        trigger: null,
      });
    } catch (e) {
      // Silencioso si no hay permisos de notificación
    }
  };

  // Traer proyecto (fecha inicio real)
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
        console.error('Error obteniendo proyecto:', err);
      }
    };
    fetchProject();
  }, [id]);

  // Escuchar etapas
  useEffect(() => {
    const q = collection(db, 'proyectos', id, 'etapas');
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ idDoc: d.id, ...d.data() }));
      setTasks(data);
    });
    return () => unsub();
  }, [id]);

  // Si no hay etapas, generarlas con la fecha de inicio real
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

  // Revisiones diarias: inicio/retraso (informativas)
  useEffect(() => {
    const revisarTareas = () => {
      const hoyISO = new Date().toISOString().split('T')[0];
      tasks.forEach((t) => {
        if (t.fechaInicio === hoyISO) {
          sendNotification(`📌 Tarea iniciada: ${t.titulo}`, `La tarea "${t.titulo}" comienza hoy (${t.fechaInicio}).`);
        }
        if (!t.cumplida && new Date(hoyISO) > new Date(t.fechaFin)) {
          sendNotification(`⚠️ Retraso en: ${t.titulo}`, `La tarea debía terminar el ${t.fechaFin} y sigue pendiente.`);
        }
      });
    };

    const actualizarAMedianoche = () => {
      setTasks((prev) => [...prev]);
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
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        clearInterval(timerRef.current);
      }
    };
  }, [tasks]);

  //  Utilidades de fechas
  const contarDiasHabiles = (fi, ff) => {
    let dias = 0;
    let actual = new Date(fi);
    const fin = new Date(ff);
    while (actual <= fin) {
      if (isBusinessDay(actual, HOLIDAYS_CO)) dias++;
      actual.setDate(actual.getDate() + 1);
    }
    return dias;
  };

  const diasActividadHabiles = (fi, ff) => contarDiasHabiles(fi, ff);

  const diasRetrasoHabiles = (ff) => {
    const hoy = new Date();
    const fin = new Date(ff);
    if (hoy <= fin) return 0;
    return contarDiasHabiles(fin, hoy);
  };

  // Acciones con permisos
  const toggleCumplida = async (tarea) => {
    if (!canMarkStateRole) return;
    try {
      const ref = doc(db, 'proyectos', id, 'etapas', tarea.idDoc);
      const nuevoEstado = !tarea.cumplida;
      await updateDoc(ref, {
        cumplida: nuevoEstado,
        fechaCumplida: nuevoEstado ? new Date().toISOString().split('T')[0] : null,
      });
    } catch (e) {
      console.error('Error actualizando cumplida:', e);
    }
  };

  const openProrroga = (tarea) => {
    if (!canProrrogaRole) return;
    setProrrogaTarget(tarea);
    setProrrogaDias('0');
    setProrrogaModal(true);
  };

  const applyProrroga = async () => {
    if (!canProrrogaRole) return;
    try {
      const extra = parseInt(prorrogaDias || '0', 10);
      if (!prorrogaTarget || isNaN(extra) || extra <= 0) {
        setProrrogaModal(false);
        return;
      }

      // Obtener etapas actuales y prórrogas acumuladas
      const q = collection(db, 'proyectos', id, 'etapas');
      const snap = await getDocs(q);
      const extraDurations = {};
      const byId = {};
      snap.docs.forEach((d) => {
        const row = { idDoc: d.id, ...d.data() };
        byId[row.idTarea] = row;
        extraDurations[row.idTarea] = row.prorrogas || 0;
      });

      // Sumar prórroga a la tarea objetivo
      extraDurations[prorrogaTarget.idTarea] =
        (extraDurations[prorrogaTarget.idTarea] || 0) + extra;

      // Recalcular calendario completo
      const sched = buildSchedule(projectStartISO, extraDurations, HOLIDAYS_CO);

      // Aplicar nuevas fechas a todas las tareas
      for (const def of DEFINICION_TAREAS) {
        const s = sched.get(def.id);
        const docId = byId[def.id].idDoc;
        const isTarget = def.id === prorrogaTarget.idTarea;

        await updateDoc(doc(db, 'proyectos', id, 'etapas', docId), {
          fechaInicio: s.fechaInicio,
          fechaFin: s.fechaFin,
          prorrogas: extraDurations[def.id],
          ...(isTarget
            ? {
                notas: [
                  ...(byId[def.id].notas || []),
                  `Prórroga: +${extra} días hábiles`,
                ],
              }
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

  const handleChangeStartDate = async (dateObj) => {
    if (!canChangeStartDateRole || !dateObj) return;
    const newISO = dateObj.toISOString().split('T')[0];
    try {
      await updateDoc(doc(db, 'proyectos', id), {
        startDate: new Date(newISO).toISOString(),
      });
      setProjectStartISO(newISO);

      // Recalcular todo el cronograma manteniendo prórrogas
      const q = collection(db, 'proyectos', id, 'etapas');
      const snap = await getDocs(q);
      const extraDurations = {};
      const byId = {};
      snap.docs.forEach((d) => {
        const row = { idDoc: d.id, ...d.data() };
        byId[row.idTarea] = row;
        extraDurations[row.idTarea] = row.prorrogas || 0;
      });

      const sched = buildSchedule(newISO, extraDurations, HOLIDAYS_CO);
      for (const def of DEFINICION_TAREAS) {
        const s = sched.get(def.id);
        const docId = byId[def.id].idDoc;
        await updateDoc(doc(db, 'proyectos', id, 'etapas', docId), {
          fechaInicio: s.fechaInicio,
          fechaFin: s.fechaFin,
        });
      }
    } catch (e) {
      console.error('Error cambiando fecha de inicio:', e);
      Alert.alert('Error', 'No fue posible actualizar la fecha de inicio del proyecto.');
    }
  };

  //  Render tareas agrupadas
  const renderGroupedTasks = () => {
    const ordenIds = DEFINICION_TAREAS.map((t) => t.id);

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

          // métricas de la fase
          const minFecha = tareas.reduce(
            (min, t) => (min < t.fechaInicio ? min : t.fechaInicio),
            tareas[0].fechaInicio
          );
          const maxFecha = tareas.reduce(
            (max, t) => (max > t.fechaFin ? max : t.fechaFin),
            tareas[0].fechaFin
          );
          const diasFase = contarDiasHabiles(minFecha, maxFecha);

          if (!fechaInicioProyecto || minFecha < fechaInicioProyecto) fechaInicioProyecto = minFecha;
          if (!fechaFinProyecto || maxFecha > fechaFinProyecto) fechaFinProyecto = maxFecha;

          return (
            <View key={fase} style={{ marginBottom: 20 }}>
              <Text style={{ color: '#90CDF4', fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
                {fase} (Duración real: {diasFase} días hábiles)
              </Text>

              {tareas.map((t) => {
                const retraso = diasRetrasoHabiles(t.fechaFin);
                const estado = t.cumplida ? 'cumplida' : retraso > 0 ? 'retraso' : 'pendiente';

                // ⏳ Calcular días restantes
                const hoyISO = new Date().toISOString().split('T')[0];
                const diasRestantes =
                  new Date(hoyISO) <= new Date(t.fechaFin)
                    ? contarDiasHabiles(hoyISO, t.fechaFin)
                    : -1;

                return (
                  <View key={t.idDoc} style={[styles.taskCard, t.cumplida && { opacity: 0.5 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.taskTitle}>{t.titulo}</Text>

                      {/* Badge (click solo si tiene permiso) */}
                      {canMarkStateRole ? (
                        <TouchableOpacity onPress={() => toggleCumplida(t)}>
                          <Text
                            style={[
                              styles.badge,
                              estado === 'cumplida'
                                ? styles.badgeOk
                                : estado === 'retraso'
                                ? styles.badgeDelay
                                : styles.badgePending,
                            ]}
                          >
                            {estado === 'cumplida' ? 'Cumplida' : estado === 'retraso' ? 'Retraso' : 'Pendiente'}
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <Text
                          style={[
                            styles.badge,
                            estado === 'cumplida'
                              ? styles.badgeOk
                              : estado === 'retraso'
                              ? styles.badgeDelay
                              : styles.badgePending,
                          ]}
                        >
                          {estado === 'cumplida' ? 'Cumplida' : estado === 'retraso' ? 'Retraso' : 'Pendiente'}
                        </Text>
                      )}
                    </View>

                    <Text style={styles.taskDate}>Inicio: {t.fechaInicio} · Fin: {t.fechaFin}</Text>
                    <Text style={{ color: '#ECC94B' }}>
                      Días de actividad: {diasActividadHabiles(t.fechaInicio, t.fechaFin)}
                    </Text>

                    {!t.cumplida && diasRestantes >= 0 && (
                      <Text style={{ color: '#63B3ED' }}>
                        ⏳ Días restantes: {diasRestantes}
                      </Text>
                    )}

                    {!t.cumplida && retraso > 0 && (
                      <Text style={{ color: '#F56565', fontWeight: 'bold' }}>⚠️ Retraso: {retraso} días</Text>
                    )}

                    {!!t.prorrogas && (
                      <Text style={styles.taskNote}>Prórrogas acumuladas: {t.prorrogas} días</Text>
                    )}

                    {(t.notas?.length ?? 0) > 0 && (
                      <View style={{ marginTop: 6 }}>
                        {t.notas.map((n, i) => (
                          <Text key={i} style={styles.noteItem}>
                            • {n}
                          </Text>
                        ))}
                      </View>
                    )}

                    {canProrrogaRole && !t.cumplida && (
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                        <TouchableOpacity
                          style={[styles.smallBtn, { backgroundColor: '#ECC94B' }]}
                          onPress={() => openProrroga(t)}
                        >
                          <Text style={styles.smallBtnText}>➕ Prórroga</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          );
        })}

        {fechaInicioProyecto && fechaFinProyecto && (
          <>
            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold', marginTop: 10 }}>
              ⏳ Duración total del proyecto: {contarDiasHabiles(fechaInicioProyecto, fechaFinProyecto)} días hábiles
            </Text>

            {/* ✅ Días hábiles restantes hasta la última fecha fin del proyecto */}
            {(() => {
              const hoyISO = new Date().toISOString().split('T')[0];
              const restantes =
                new Date(hoyISO) <= new Date(fechaFinProyecto)
                  ? contarDiasHabiles(hoyISO, fechaFinProyecto)
                  : 0;
              return (
                <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold', marginTop: 6 }}>
                  📅 Días hábiles restantes: {restantes}
                </Text>
              );
            })()}
          </>
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

      {/* Solo Administrador puede cambiar la fecha de inicio */}
      <View style={styles.row}>
        <Text style={styles.label}>Fecha de inicio del proyecto:</Text>
        {canChangeStartDateRole ? (
          <TouchableOpacity onPress={() => setShowDatePicker(true)}>
            <Text style={styles.link}>{projectStartISO}</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.value}>{projectStartISO}</Text>
        )}
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={new Date(projectStartISO)}
          mode="date"
          display="default"
          onChange={(e, date) => {
            setShowDatePicker(false);
            if (date) handleChangeStartDate(date);
          }}
        />
      )}

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {renderGroupedTasks()}
      </ScrollView>

      {/* Modal de prórroga */}
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, justifyContent: 'center' },
  label: { color: '#CCC' },
  value: { color: '#FFF' },
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
  smallBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, marginTop: 6 },
  smallBtnText: { color: '#1A202C', fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: '#000000aa', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { backgroundColor: '#2C2C3A', padding: 24, borderRadius: 12, width: '85%' },
  modalTitle: { color: '#FFF', fontSize: 18, marginBottom: 12, textAlign: 'center' },
  input: { backgroundColor: '#1E1E2F', color: '#FFF', padding: 12, borderRadius: 8, width: '100%', marginBottom: 16 },
  button: { backgroundColor: '#48BB78', padding: 12, borderRadius: 8, marginBottom: 8 },
  buttonText: { color: '#1A202C', fontWeight: 'bold', textAlign: 'center' },
  cancelText: { color: '#F56565', textAlign: 'center' },
});
