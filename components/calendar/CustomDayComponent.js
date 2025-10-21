// components/calendar/CustomDayComponent.js
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

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

// Función para obtener emoji según eventos del día
function getEmojiForDate(dateString, markedDates) {
  const mark = markedDates[dateString];
  if (!mark) return '';

  switch (mark.tipo) {
    case 'cumplida':
      return ' 🙂';
    case 'inicio-fin':
      return ' 🎯';
    case 'inicio':
      return ' 🚀';
    case 'fin':
      return ' ⏰';
    case 'prorroga':
      return ' 📅';
    case 'nota':
      return ' 📝';
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