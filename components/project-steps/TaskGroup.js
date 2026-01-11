import { Text, View } from 'react-native';
import { DEFINICION_TAREAS } from '../../helper';
import { contarDiasHabiles } from '../../utils/dateUtils';
import styles from './styles';
import { TaskCard } from './TaskCard';

const getUltimaEtapaRequerida = (tasks) => {
  // Recorre DEFINICION_TAREAS desde el final y toma la primera tarea
  // que exista en Firestore y NO esté marcada como noAplica (y no sea mantenimiento).
  for (let i = DEFINICION_TAREAS.length - 1; i >= 0; i--) {
    const def = DEFINICION_TAREAS[i];
    const etapa = tasks.find(
      (t) => t.idTarea === def.id && !t.esMantenimiento
    );
    if (etapa && !etapa.noAplica) return etapa;
  }
  return null;
};

export const TaskGroup = ({
  tasks,
  canMarkStateRole,
  canProrrogaRole,
  toggleCumplida,
  openProrroga,
  markAsNotApplicable,
  unmarkAsNotApplicable,
  focusedTask
}) => {
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

  // ✅ Última etapa aplicable (para congelar retraso cuando ya se finalizó el proyecto)
  const ultimaRequerida = getUltimaEtapaRequerida(tasks);

  return (
    <>
      {fasesOrdenadas.map((fase) => {
        // Para cálculo de duración de fase: excluir mantenimientos y noAplica
        const tareasParaCalculo = grouped[fase].filter(
          (t) => !t.esMantenimiento && !t.noAplica
        );

        const tareas = grouped[fase].sort(
          (a, b) => ordenIds.indexOf(a.idTarea) - ordenIds.indexOf(b.idTarea)
        );

        const minFecha =
          tareasParaCalculo.length > 0
            ? tareasParaCalculo.reduce(
                (min, t) => (min < t.fechaInicio ? min : t.fechaInicio),
                tareasParaCalculo[0].fechaInicio
              )
            : null;

        const maxFecha =
          tareasParaCalculo.length > 0
            ? tareasParaCalculo.reduce(
                (max, t) => (max > t.fechaFin ? max : t.fechaFin),
                tareasParaCalculo[0].fechaFin
              )
            : null;

        const diasFase = minFecha && maxFecha ? contarDiasHabiles(minFecha, maxFecha) : 0;

        if (minFecha && (!fechaInicioProyecto || minFecha < fechaInicioProyecto)) {
          fechaInicioProyecto = minFecha;
        }
        if (maxFecha && (!fechaFinProyecto || maxFecha > fechaFinProyecto)) {
          fechaFinProyecto = maxFecha;
        }

        return (
          <View key={fase} style={{ marginBottom: 20 }}>
            <Text style={styles.groupTitle}>
              {fase}{' '}
              {diasFase > 0
                ? `(Duración real: ${diasFase} días hábiles)`
                : '(Sin tareas activas)'}
            </Text>

            {tareas.map((tarea) => (
              <TaskCard
                key={tarea.idDoc}
                tarea={tarea}
                canMarkStateRole={canMarkStateRole}
                canProrrogaRole={canProrrogaRole}
                toggleCumplida={toggleCumplida}
                openProrroga={openProrroga}
                markAsNotApplicable={markAsNotApplicable}
                unmarkAsNotApplicable={unmarkAsNotApplicable}
                focusedTask={focusedTask}
              />
            ))}
          </View>
        );
      })}

      {fechaInicioProyecto && fechaFinProyecto && (
        <ProjectSummary
          fechaInicio={fechaInicioProyecto}
          fechaFinPlan={fechaFinProyecto}
          ultimaRequerida={ultimaRequerida}
        />
      )}
    </>
  );
};

const ProjectSummary = ({ fechaInicio, fechaFinPlan, ultimaRequerida }) => {
  const hoyISO = new Date().toISOString().split('T')[0];

  // Duración planificada total (según cronograma)
  const duracionTotal = contarDiasHabiles(fechaInicio, fechaFinPlan);

  // ✅ Si ya se completó la última etapa requerida, congelamos el conteo en su fecha de cierre
  const fechaCierreISO =
    (ultimaRequerida?.cumplida && ultimaRequerida?.fechaCumplida) ||
    (ultimaRequerida?.noAplica && ultimaRequerida?.fechaNoAplica) ||
    null;

  const proyectoCerrado = Boolean(fechaCierreISO);

  if (proyectoCerrado) {
    // Si cerró tarde, calculamos retraso FINAL (no sigue aumentando)
    const retrasoFinal =
      new Date(fechaCierreISO) > new Date(fechaFinPlan)
        ? contarDiasHabiles(fechaFinPlan, fechaCierreISO)
        : 0;

    return (
      <>
        <Text style={styles.summaryText}>
          ⏳ Duración total del proyecto: {duracionTotal} días hábiles
        </Text>

        {retrasoFinal > 0 ? (
          <Text style={styles.summaryWarning}>
            🚨 Retraso final: {retrasoFinal} día{retrasoFinal !== 1 ? 's' : ''} (cerró: {fechaCierreISO})
          </Text>
        ) : (
          <Text style={styles.summaryText}>
            ✅ Proyecto finalizado (cerró: {fechaCierreISO})
          </Text>
        )}
      </>
    );
  }

  // Proyecto aún activo: se muestra “restantes” o “retraso” contra HOY
  const hoy = new Date(hoyISO);
  const fin = new Date(fechaFinPlan);

  return (
    <>
      <Text style={styles.summaryText}>
        ⏳ Duración total del proyecto: {duracionTotal} días hábiles
      </Text>

      {hoy <= fin ? (
        <Text style={styles.summaryText}>
          📅 Días hábiles restantes: {contarDiasHabiles(hoyISO, fechaFinPlan)}
        </Text>
      ) : (
        <Text style={styles.summaryWarning}>
          🚨 Proyecto retrasado: {contarDiasHabiles(fechaFinPlan, hoyISO)} día
          {contarDiasHabiles(fechaFinPlan, hoyISO) !== 1 ? 's' : ''}
        </Text>
      )}
    </>
  );
};

export default TaskGroup;
