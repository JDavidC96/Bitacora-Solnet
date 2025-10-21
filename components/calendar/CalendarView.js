// components/calendar/CalendarView.js
import { StyleSheet, Text, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import CustomDayComponent from './CustomDayComponent';

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