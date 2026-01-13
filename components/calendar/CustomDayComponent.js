// components/calendar/CustomDayComponent.js
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

/**
 * Componente personalizado para representar un día en el calendario.
 * Muestra el número del día, emojis según el tipo de evento y maneja estados visuales.
 * 
 * @component
 * @example
 * const markedDates = {
 *   '2024-01-15': { tipo: 'cumplida', color: '#4CAF50' },
 *   '2024-01-20': { tipo: 'inicio', color: '#2196F3' }
 * };
 * 
 * return (
 *   <CustomDayComponent
 *     date={{ day: 15, dateString: '2024-01-15' }}
 *     state=""
 *     markedDates={markedDates}
 *     onPress={() => console.log('Día presionado')}
 *     isSelected={false}
 *   />
 * );
 * 
 * @param {Object} props - Propiedades del componente
 * @param {Object} props.date - Objeto que contiene información sobre la fecha
 * @param {number} props.date.day - Día del mes (1-31)
 * @param {string} props.date.dateString - Fecha en formato ISO (YYYY-MM-DD)
 * @param {string} props.state - Estado del día ('disabled', 'today', '')
 * @param {Object} props.markedDates - Objeto con las fechas marcadas y sus propiedades
 * @param {string} [props.markedDates[].tipo] - Tipo de evento que determina el emoji a mostrar
 * @param {string} [props.markedDates[].color] - Color de fondo para el día
 * @param {function} props.onPress - Función callback cuando se presiona el día
 * @param {boolean} [props.isSelected=false] - Indica si el día está actualmente seleccionado
 * 
 * @returns {React.ReactElement} Componente de día renderizado
 */
export default function CustomDayComponent({
  date,
  state,
  markedDates = {},
  onPress,
  isSelected = false
}) {
  const mark = markedDates[date.dateString];
  const emoji = getEmojiForDate(date.dateString, markedDates);

  return (
    <TouchableOpacity
      style={[
        styles.dayContainer,
        mark?.color ? { backgroundColor: mark.color } : {},
        isSelected && styles.selectedDay,
        state === 'disabled' && styles.disabledDay
      ]}
      onPress={onPress}
      disabled={state === 'disabled'}
    >
      <Text style={[
        styles.dayText,
        state === 'disabled' && styles.disabledText,
        isSelected && styles.selectedText
      ]}>
        {date.day}{emoji}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * Determina el emoji apropiado para mostrar según el tipo de evento del día.
 * 
 * @function
 * @param {string} dateString - Fecha en formato ISO (YYYY-MM-DD)
 * @param {Object} markedDates - Objeto con las fechas marcadas
 * @param {string} [markedDates[].tipo] - Tipo de evento
 * 
 * @returns {string} Emoji correspondiente al tipo de evento o cadena vacía si no hay coincidencia
 * 
 * @example
 * const markedDates = {
 *   '2024-01-15': { tipo: 'cumplida' }
 * };
 * const emoji = getEmojiForDate('2024-01-15', markedDates); // Retorna ' 🙂'
 */
function getEmojiForDate(dateString, markedDates) {
  const mark = markedDates[dateString];
  if (!mark) return '';

  switch (mark.tipo) {
    case 'cumplida':
      return ' 🙂'; // Tarea cumplida/completada
    case 'inicio-fin':
      return ' 🎯'; // Inicio y fin del mismo día
    case 'inicio':
      return ' 🚀'; // Inicio de tarea/evento
    case 'fin':
      return ' ⏰'; // Fin de tarea/evento
    case 'prorroga':
      return ' 📅'; // Prórroga/extensión
    case 'nota':
      return ' 📝'; // Nota o recordatorio
    default:
      return '';
  }
}

const styles = StyleSheet.create({
  dayContainer: {
    width: 40,
    height: 40,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
  },
  selectedDay: {
    borderWidth: 2,
    borderColor: '#5A67D8',
  },
  disabledDay: {
    opacity: 0.3,
  },
  dayText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  disabledText: {
    color: '#555',
  },
  selectedText: {
    color: '#FFF',
  },
});