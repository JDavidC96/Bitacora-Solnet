import { Text, View } from 'react-native';
import { DEFINICION_TAREAS } from '../../helper';
import { contarDiasHabiles } from '../../utils/dateUtils';
import styles from './styles';
import { TaskCard } from './TaskCard';

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

  return (
    <>
      {fasesOrdenadas.map((fase) => {
        // Filtrar tareas que no son mantenimientos y no están marcadas como no aplica para el cálculo
        const tareasParaCalculo = grouped[fase].filter(t => !t.esMantenimiento && !t.noAplica);
        const tareas = grouped[fase].sort(
          (a, b) => ordenIds.indexOf(a.idTarea) - ordenIds.indexOf(b.idTarea)
        );

        const minFecha = tareasParaCalculo.length > 0 ? tareasParaCalculo.reduce(
          (min, t) => (min < t.fechaInicio ? min : t.fechaInicio),
          tareasParaCalculo[0].fechaInicio
        ) : null;
        
        const maxFecha = tareasParaCalculo.length > 0 ? tareasParaCalculo.reduce(
          (max, t) => (max > t.fechaFin ? max : t.fechaFin),
          tareasParaCalculo[0].fechaFin
        ) : null;
        
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
              {fase} {diasFase > 0 ? `(Duración real: ${diasFase} días hábiles)` : '(Sin tareas activas)'}
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

export default TaskGroup;