// screens/CalendarScreen.js
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';

// Hooks personalizados
import { useUser } from '../context/UserContext';
import { useCalendarData } from '../hooks/useCalendarData';

// Componentes
import CalendarView from '../components/calendar/CalendarView';
import DayDetailsModal from '../components/calendar/DayDetailsModal';

export default function CalendarScreen() {
  const { id, title } = useLocalSearchParams();
  const { role } = useUser();

  // Estados
  const [selectedDate, setSelectedDate] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Hook personalizado para datos del calendario
  const { notes, stages, markedDates, loading } = useCalendarData(id);

  // Handlers
  const handleDayPress = (day) => {
    setSelectedDate(day.dateString);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedDate(null);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient colors={["#2c3e50", "#133750ff"]} style={styles.container}>
        <CalendarView
          title={title}
          markedDates={markedDates}
          onDayPress={handleDayPress}
          loading={loading}
        />

        <DayDetailsModal
          visible={modalVisible}
          selectedDate={selectedDate}
          notes={notes}
          stages={stages}
          onClose={handleCloseModal}
        />
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E2F',
  },
});