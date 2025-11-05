import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { contarDiasHabiles, diasRetrasoHabiles, diffDiasHabiles, formatDate } from '../../utils/dateUtils';
import styles from './styles';

export const TaskCard = ({ 
  tarea, 
  canMarkStateRole, 
  canProrrogaRole, 
  toggleCumplida, 
  openProrroga,
  markAsNotApplicable,
  unmarkAsNotApplicable 
}) => {
  const estado = getEstado(tarea);
  const retraso = diasRetrasoHabiles(tarea.fechaFin);
  
  const hoyISO = new Date().toISOString().split('T')[0];
  const diasRestantes = new Date(hoyISO) <= new Date(tarea.fechaFin)
    ? contarDiasHabiles(hoyISO, tarea.fechaFin)
    : -1;

  const handleNoAplicaPress = () => {
    if (tarea.noAplica) {
      // Si ya está marcada como No Aplica, preguntar si quieres reactivar
      Alert.alert(
        'Reactivar Tarea',
        `¿Quieres reactivar la tarea "${tarea.titulo}"?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Reactivar', 
            onPress: () => unmarkAsNotApplicable(tarea) 
          }
        ]
      );
    } else {
      // Si no está marcada, preguntar si marcar como No Aplica
      Alert.alert(
        'Marcar como No Aplica',
        `¿Estás seguro de que la tarea "${tarea.titulo}" no aplica para este proyecto?\n\nEsta acción no se puede deshacer automáticamente.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Marcar como No Aplica', 
            style: 'destructive',
            onPress: () => markAsNotApplicable(tarea) 
          }
        ]
      );
    }
  };

  // Si la tarea no aplica, mostrar estilo diferente
  if (tarea.noAplica) {
    return (
      <View style={[styles.taskCard, styles.noAplicaCard]}>
        <View style={styles.taskHeader}>
          <Text style={styles.noAplicaTitle}>{tarea.titulo}</Text>
          <NoAplicaBadge 
            onPress={handleNoAplicaPress}
            canManage={canMarkStateRole}
          />
        </View>

        <Text style={styles.noAplicaText}>❌ NO APLICA PARA ESTE PROYECTO</Text>
        
        {tarea.fechaNoAplica && (
          <Text style={styles.noAplicaDate}>
            Marcada el: {formatDate(tarea.fechaNoAplica)}
          </Text>
        )}

        {canMarkStateRole && (
          <TouchableOpacity
            style={[styles.smallBtn, styles.reactivateBtn]}
            onPress={handleNoAplicaPress}
          >
            <Text style={styles.smallBtnText}>🔄 Reactivar</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

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

      <View style={styles.actionsContainer}>
        {canMarkStateRole && !tarea.cumplida && (
          <TouchableOpacity
            style={[styles.smallBtn, styles.noAplicaBtn]}
            onPress={handleNoAplicaPress}
          >
            <Text style={styles.smallBtnText}>🚫 No Aplica</Text>
          </TouchableOpacity>
        )}

        {canProrrogaRole && !tarea.cumplida && !tarea.noAplica && (
          <TouchableOpacity
            style={[styles.smallBtn, { backgroundColor: '#ECC94B' }]}
            onPress={() => openProrroga(tarea)}
          >
            <Text style={styles.smallBtnText}>➕ Prórroga</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// Helper functions
const getEstado = (tarea) => {
  if (tarea.noAplica) return 'no-aplica';
  if (tarea.cumplida) return 'cumplida';
  const hoyISO = new Date().toISOString().split('T')[0];
  if (new Date(hoyISO) > new Date(tarea.fechaFin)) return 'retraso';
  return 'pendiente';
};

const estadoEmoji = (estado) =>
  estado === 'cumplida' ? '🟢' : 
  estado === 'no-aplica' ? '⚫' :
  estado === 'retraso' ? '🔴' : '🟡';

const EstadoBadge = ({ estado, canMarkStateRole, onPress }) => {
  const badgeConfig = {
    'cumplida': { text: '🟢 Cumplida', style: styles.badgeOk },
    'no-aplica': { text: '⚫ No Aplica', style: styles.badgeNoAplica },
    'retraso': { text: '🔴 Retraso', style: styles.badgeDelay },
    'pendiente': { text: '🟡 Pendiente', style: styles.badgePending },
  };

  const config = badgeConfig[estado];

  if (canMarkStateRole && estado !== 'no-aplica') {
    return (
      <TouchableOpacity onPress={onPress}>
        <Text style={[styles.badge, config.style]}>{config.text}</Text>
      </TouchableOpacity>
    );
  }

  return <Text style={[styles.badge, config.style]}>{config.text}</Text>;
};

const NoAplicaBadge = ({ onPress, canManage }) => {
  if (canManage) {
    return (
      <TouchableOpacity onPress={onPress}>
        <Text style={[styles.badge, styles.badgeNoAplica]}>⚫ No Aplica</Text>
      </TouchableOpacity>
    );
  }

  return <Text style={[styles.badge, styles.badgeNoAplica]}>⚫ No Aplica</Text>;
};

export default TaskCard;