// components/calendar/DayDetailsModal.js
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import ModalBase from '../ModalBase';

export default function DayDetailsModal({
  visible,
  selectedDate,
  notes = [],
  stages = [],
  onClose
}) {
  if (!selectedDate) return null;

  // Filtrar notas y etapas para la fecha seleccionada
  const notesOfSelectedDay = notes.filter(note => note.fechaISO === selectedDate);
  const stagesOfSelectedDay = stages.filter(stage => 
    stage.fechaInicio === selectedDate ||
    stage.fechaFin === selectedDate ||
    stage.fechaFinOriginal === selectedDate ||
    stage.fechaCumplida === selectedDate
  );

  const hasNotes = notesOfSelectedDay.length > 0;
  const hasStages = stagesOfSelectedDay.length > 0;

  return (
    <ModalBase
      visible={visible}
      title={`Detalles del ${formatDisplayDate(selectedDate)}`}
      onClose={onClose}
    >
      <ScrollView style={styles.content}>
        {/* Notas del día */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Notas:</Text>
          {hasNotes ? (
            notesOfSelectedDay.map((note) => (
              <View key={note.id} style={styles.noteItem}>
                <Text style={styles.noteText}>
                  {note.texto || "(Vacía)"}
                </Text>
                <Text style={styles.noteAuthor}>
                  ✍️ {note.autor || "Anónimo"} - {note.hora}
                </Text>
                {note.imagenes && note.imagenes.length > 0 && (
                  <Text style={styles.imagesInfo}>
                    📎 {note.imagenes.length} imagen(es)
                  </Text>
                )}
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No hay notas este día</Text>
          )}
        </View>

        {/* Etapas del día */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🛠️ Etapas:</Text>
          {hasStages ? (
            stagesOfSelectedDay.map((stage) => (
              <StageEvent key={stage.idDoc} stage={stage} date={selectedDate} />
            ))
          ) : (
            <Text style={styles.emptyText}>No hay etapas este día</Text>
          )}
        </View>
      </ScrollView>
    </ModalBase>
  );
}

// Componente para mostrar evento de etapa
function StageEvent({ stage, date }) {
  let color = '#FFF';
  let label = '';
  let emoji = '';

  if (stage.fechaInicio === date && stage.fechaFin === date) {
    color = 'purple';
    label = `Inicio y Fin: ${stage.titulo}`;
    emoji = '🎯';
  } else if (stage.fechaInicio === date) {
    color = 'green';
    label = `Inicio: ${stage.titulo}`;
    emoji = '🚀';
  } else if (stage.fechaFinOriginal === date) {
    color = 'yellow';
    label = `Prórroga: ${stage.titulo}`;
    emoji = '📅';
  } else if (stage.fechaFin === date && !stage.cumplida) {
    color = 'red';
    label = `Fin: ${stage.titulo}`;
    emoji = '⏰';
  } else if (stage.fechaCumplida === date) {
    color = 'green';
    label = `Cumplida: ${stage.titulo}`;
    emoji = '✅';
  }

  return (
    <View style={styles.stageItem}>
      <Text style={[styles.stageText, { color }]}>
        {emoji} {label}
      </Text>
      {stage.cumplida && date === stage.fechaCumplida && (
        <Text style={styles.completedText}>¡Completada!</Text>
      )}
    </View>
  );
}

// Formatear fecha para display
function formatDisplayDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

const styles = StyleSheet.create({
  content: {
    maxHeight: 400,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#FFF',
    marginBottom: 12,
    fontWeight: '600',
  },
  noteItem: {
    backgroundColor: '#2C2C3A',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  noteText: {
    fontSize: 14,
    color: '#FFF',
    marginBottom: 4,
  },
  noteAuthor: {
    fontSize: 12,
    color: '#AAA',
  },
  imagesInfo: {
    fontSize: 12,
    color: '#63B3ED',
    marginTop: 4,
  },
  stageItem: {
    backgroundColor: '#2C2C3A',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  stageText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  completedText: {
    fontSize: 12,
    color: '#48BB78',
    fontStyle: 'italic',
  },
  emptyText: {
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
  },
});