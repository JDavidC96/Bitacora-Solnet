import { Text, View } from 'react-native';
import { DEFINICION_TAREAS } from '../../helper';
import { contarDiasHabiles } from '../../utils/dateUtils';
import styles from './styles';
import { TaskCard } from './TaskCard';

export const TaskGroup = ({ tasks, canMarkStateRole, canProrrogaRole, toggleCumplida, openProrroga }) => {
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
            <Text style={styles.groupTitle}>
              {fase} (Duración real: {diasFase} días hábiles)
            </Text>

            {tareas.map((tarea) => (
              <TaskCard
                key={tarea.idDoc}
                tarea={tarea}
                canMarkStateRole={canMarkStateRole}
                canProrrogaRole={canProrrogaRole}
                toggleCumplida={toggleCumplida}
                openProrroga={openProrroga}
              />
            ))}
          </View>
        );
      })}

      {fechaInicioProyecto && fechaFinProyecto && (
        <ProjectSummary 
          fechaInicio={fechaInicioProyecto} 
          fechaFin={fechaFinProyecto} 
        />
      )}
    </>
  );
};

const ProjectSummary = ({ fechaInicio, fechaFin }) => {
  const hoyISO = new Date().toISOString().split('T')[0];
  const hoy = new Date(hoyISO);
  const fin = new Date(fechaFin);

  const duracionTotal = contarDiasHabiles(fechaInicio, fechaFin);
  
  let contenidoRestantes = null;
  if (hoy <= fin) {
    const restantes = contarDiasHabiles(hoyISO, fechaFin);
    contenidoRestantes = (
      <Text style={styles.summaryText}>
        📅 Días hábiles restantes: {restantes}
      </Text>
    );
  } else {
    const retraso = contarDiasHabiles(fechaFin, hoyISO);
    contenidoRestantes = (
      <Text style={styles.summaryWarning}>
        🚨 Proyecto retrasado: {retraso} día{retraso !== 1 ? "s" : ""}
      </Text>
    );
  }

  return (
    <>
      <Text style={styles.summaryText}>
        ⏳ Duración total del proyecto: {duracionTotal} días hábiles
      </Text>
      {contenidoRestantes}
    </>
  );
};