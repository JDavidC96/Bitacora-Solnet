// components/calendar/CalendarView.js
import { StyleSheet, Text, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import CustomDayComponent from './CustomDayComponent';

/**
 * Componente de vista de calendario personalizado con días marcados y soporte para estados.
 * 
 * Este componente renderiza un calendario interactivo con un tema oscuro personalizado,
 * permitiendo marcar fechas específicas y manejar la interacción del usuario.
 * 
 * @component
 * @example
 * const markedDates = {
 *   '2024-01-15': { marked: true, dotColor: 'red' },
 *   '2024-01-20': { marked: true, dotColor: 'blue' }
 * };
 * 
 * return (
 *   <CalendarView
 *     title="Eventos"
 *     markedDates={markedDates}
 *     onDayPress={(day) => console.log('Día seleccionado:', day)}
 *     loading={false}
 *   />
 * );
 * 
 * @param {Object} props - Propiedades del componente
 * @param {string} props.title - Título que se mostrará sobre el calendario (ej: "Calendario de Eventos")
 * @param {Object} props.markedDates - Objeto con las fechas marcadas en formato compatible con `react-native-calendars`
 * @param {function} props.onDayPress - Función callback que se ejecuta cuando se presiona un día del calendario
 * @param {boolean} [props.loading=false] - Indica si el calendario está en estado de carga
 * 
 * @returns {React.ReactElement} Componente de calendario renderizado
 */
export default function CalendarView({
  title,
  markedDates = {},
  onDayPress,
  loading = false
}) {
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando calendario...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Calendario de {title}</Text>
      
      <Calendar
        onDayPress={onDayPress}
        markingType="custom"
        theme={calendarTheme}
        dayComponent={({ date, state }) => (
          <CustomDayComponent
            date={date}
            state={state}
            markedDates={markedDates}
            onPress={() => onDayPress(date)}
            isSelected={false}
          />
        )}
        style={styles.calendar}
      />
    </View>
  );
}

/**
 * Tema personalizado para el calendario con esquema de colores oscuro.
 * Define todos los colores, fuentes y tamaños para los elementos del calendario.
 * @constant {Object}
 */
const calendarTheme = {
  calendarBackground: '#1E1E2F',
  textSectionTitleColor: '#b6c1cd',
  selectedDayBackgroundColor: '#00adf5',
  selectedDayTextColor: '#ffffff',
  todayTextColor: '#00adf5',
  dayTextColor: '#2d4150',
  textDisabledColor: '#d9e1e8',
  dotColor: '#00adf5',
  selectedDotColor: '#ffffff',
  arrowColor: '#FFF',
  disabledArrowColor: '#d9e1e8',
  monthTextColor: '#FFF',
  indicatorColor: 'blue',
  textDayFontFamily: 'monospace',
  textMonthFontFamily: 'monospace',
  textDayHeaderFontFamily: 'monospace',
  textDayFontWeight: '300',
  textMonthFontWeight: 'bold',
  textDayHeaderFontWeight: '300',
  textDayFontSize: 16,
  textMonthFontSize: 16,
  textDayHeaderFontSize: 16
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 50,
  },
  title: {
    fontSize: 22,
    color: '#FFF',
    marginBottom: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  calendar: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFF',
    fontSize: 16,
  },
});