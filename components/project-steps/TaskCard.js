import { Text, TouchableOpacity, View } from 'react-native';
import { contarDiasHabiles, diasRetrasoHabiles, diffDiasHabiles, formatDate } from '../../utils/dateUtils';
import styles from './styles';

export const TaskCard = ({ tarea, canMarkStateRole, canProrrogaRole, toggleCumplida, openProrroga }) => {
  const estado = getEstado(tarea);
  const retraso = diasRetrasoHabiles(tarea.fechaFin);
  
  const hoyISO = new Date().toISOString().split('T')[0];
  const diasRestantes = new Date(hoyISO) <= new Date(tarea.fechaFin)
    ? contarDiasHabiles(hoyISO, tarea.fechaFin)
    : -1;

  return (
    <View style={[styles.taskCard, tarea.cumplida && { opacity: 0.5 }]}>
      <View style={styles.taskHeader}>
        <Text style={styles.taskTitle}>{tarea.titulo}</Text>
        <EstadoBadge 
          estado={estado} 
          canMarkStateRole={canMarkStateRole}
          onPress={() => toggleCumplida(tarea)}
        />
      </View>

      <Text style={styles.taskDate}>
        Inicio: {formatDate(tarea.fechaInicio)} · Fin: {formatDate(tarea.fechaFin)}
      </Text>
      <Text style={styles.taskDuration}>
        Días de actividad: {diffDiasHabiles(tarea.fechaInicio, tarea.fechaFin)}
      </Text>

      {!tarea.cumplida && diasRestantes >= 0 && (
        <Text style={styles.daysRemaining}>
          ⏳ Días restantes: {diasRestantes}
        </Text>
      )}

      {!tarea.cumplida && retraso > 0 && (
        <Text style={styles.delayText}>
          ⚠️ Retraso: {retraso} días
        </Text>
      )}

      {!!tarea.prorrogas && (
        <Text style={styles.taskNote}>Prórrogas acumuladas: {tarea.prorrogas} días</Text>
      )}

      {(tarea.notas?.length ?? 0) > 0 && (
        <View style={styles.notesContainer}>
          {tarea.notas.map((nota, index) => (
            <Text key={index} style={styles.noteItem}>• {nota}</Text>
          ))}
        </View>
      )}

      {canProrrogaRole && !tarea.cumplida && (
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.smallBtn, { backgroundColor: '#ECC94B' }]}
            onPress={() => openProrroga(tarea)}
          >
            <Text style={styles.smallBtnText}>➕ Prórroga</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// Helper functions
const getEstado = (tarea) => {
  if (tarea.cumplida) return 'cumplida';
  const hoyISO = new Date().toISOString().split('T')[0];
  if (new Date(hoyISO) > new Date(tarea.fechaFin)) return 'retraso';
  return 'pendiente';
};

const estadoEmoji = (estado) =>
  estado === 'cumplida' ? '🟢' : estado === 'retraso' ? '🔴' : '🟡';

const EstadoBadge = ({ estado, canMarkStateRole, onPress }) => {
  const badgeConfig = {
    cumplida: { text: '🟢 Cumplida', style: styles.badgeOk },
    retraso: { text: '🔴 Retraso', style: styles.badgeDelay },
    pendiente: { text: '🟡 Pendiente', style: styles.badgePending },
  };

  const config = badgeConfig[estado];

  if (canMarkStateRole) {
    return (
      <TouchableOpacity onPress={onPress}>
        <Text style={[styles.badge, config.style]}>{config.text}</Text>
      </TouchableOpacity>
    );
  }

  return <Text style={[styles.badge, config.style]}>{config.text}</Text>;
};