// components/calendar/DayDetailsModal.js
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import ModalBase from '../ModalBase';

/**
 * Modal que muestra los detalles de un día específico en el calendario.
 * Presenta notas y etapas relacionadas con la fecha seleccionada,
 * incluyendo información sobre eventos, autores, horas y estados de cumplimiento.
 * 
 * @component
 * @example
 * const notes = [
 *   {
 *     id: '1',
 *     fechaISO: '2024-01-15',
 *     texto: 'Revisión de proyecto',
 *     autor: 'Juan Pérez',
 *     hora: '10:30 AM'
 *   }
 * ];
 * 
 * const stages = [
 *   {
 *     idDoc: 'stage1',
 *     titulo: 'Diseño UI',
 *     fechaInicio: '2024-01-15',
 *     fechaFin: '2024-01-20',
 *     cumplida: false
 *   }
 * ];
 * 
 * return (
 *   <DayDetailsModal
 *     visible={true}
 *     selectedDate="2024-01-15"
 *     notes={notes}
 *     stages={stages}
 *     onClose={() => console.log('Modal cerrado')}
 *   />
 * );
 * 
 * @param {Object} props - Propiedades del componente
 * @param {boolean} props.visible - Controla la visibilidad del modal
 * @param {string|null} props.selectedDate - Fecha seleccionada en formato ISO (YYYY-MM-DD)
 * @param {Array<Object>} [props.notes=[]] - Lista de notas para mostrar
 * @param {Array<Object>} [props.stages=[]] - Lista de etapas/eventos para mostrar
 * @param {function} props.onClose - Función callback cuando se cierra el modal
 * 
 * @returns {React.ReactElement|null} Modal de detalles del día o null si no hay fecha seleccionada
 */
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

/**
 * Componente interno para mostrar un evento de etapa con su estado visual.
 * Determina el color, emoji y etiqueta según la relación de la fecha con la etapa.
 * 
 * @component
 * @param {Object} props - Propiedades del componente
 * @param {Object} props.stage - Objeto de etapa con sus propiedades
 * @param {string} props.stage.idDoc - ID único de la etapa
 * @param {string} props.stage.titulo - Título de la etapa
 * @param {string} props.stage.fechaInicio - Fecha de inicio en formato ISO
 * @param {string} props.stage.fechaFin - Fecha de fin en formato ISO
 * @param {string} [props.stage.fechaFinOriginal] - Fecha original de fin (para prórrogas)
 * @param {string} [props.stage.fechaCumplida] - Fecha de cumplimiento en formato ISO
 * @param {boolean} [props.stage.cumplida=false] - Indica si la etapa está cumplida
 * @param {string} props.date - Fecha actual que se está evaluando en formato ISO
 * 
 * @returns {React.ReactElement} Elemento visual que representa el evento de etapa
 */
function StageEvent({ stage, date }) {
  let color = '#FFF';
  let label = '';
  let emoji = '';

  // Determinar tipo de evento según la fecha
  if (stage.fechaInicio === date && stage.fechaFin === date) {
    color = 'purple';      // Inicio y fin mismo día
    label = `Inicio y Fin: ${stage.titulo}`;
    emoji = '🎯';
  } else if (stage.fechaInicio === date) {
    color = 'green';       // Inicio de etapa
    label = `Inicio: ${stage.titulo}`;
    emoji = '🚀';
  } else if (stage.fechaFinOriginal === date) {
    color = 'yellow';      // Prórroga/extensión
    label = `Prórroga: ${stage.titulo}`;
    emoji = '📅';
  } else if (stage.fechaFin === date && !stage.cumplida) {
    color = 'red';         // Fin sin cumplir
    label = `Fin: ${stage.titulo}`;
    emoji = '⏰';
  } else if (stage.fechaCumplida === date) {
    color = 'green';       // Cumplida
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

/**
 * Formatea una fecha ISO en una cadena legible en español (es-CO).
 * 
 * @function
 * @param {string} dateString - Fecha en formato ISO (YYYY-MM-DD)
 * @returns {string} Fecha formateada (ej: "lunes, 15 de enero de 2024")
 * 
 * @example
 * const formatted = formatDisplayDate('2024-01-15');
 * // Retorna: "lunes, 15 de enero de 2024"
 */
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