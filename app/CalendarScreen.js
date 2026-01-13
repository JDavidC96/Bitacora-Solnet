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

/**
 * Pantalla principal del calendario que muestra la vista mensual
 * y permite ver detalles de días específicos.
 * 
 * Esta pantalla:
 * - Muestra un calendario con fechas marcadas según eventos/notas
 * - Permite hacer clic en cualquier día para ver detalles
 * - Utiliza un gradiente de fondo para la interfaz
 * - Maneja datos específicos del proyecto/proyecto actual
 * 
 * @component
 * @example
 * // Navegación desde otra pantalla:
 * // router.push(`/calendar?id=${projectId}&title=${projectTitle}`)
 * 
 * @returns {JSX.Element} Componente de la pantalla de calendario
 */
export default function CalendarScreen() {
  // Obtiene parámetros de navegación (ID y título del proyecto)
  const { id, title } = useLocalSearchParams();
  
  // Obtiene información del usuario actual desde el contexto
  const { role } = useUser();

  // Estados
  const [selectedDate, setSelectedDate] = useState(null); // Fecha seleccionada en formato YYYY-MM-DD
  const [modalVisible, setModalVisible] = useState(false); // Controla visibilidad del modal

  // Hook personalizado para datos del calendario
  // Obtiene notas, etapas y fechas marcadas para el proyecto actual
  const { notes, stages, markedDates, loading } = useCalendarData(id);

  /**
   * Maneja el evento de presionar un día en el calendario
   * @param {Object} day - Objeto día proporcionado por CalendarView
   * @param {string} day.dateString - Fecha en formato YYYY-MM-DD
   */
  const handleDayPress = (day) => {
    setSelectedDate(day.dateString);
    setModalVisible(true);
  };

  /**
   * Cierra el modal de detalles y limpia la fecha seleccionada
   */
  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedDate(null);
  };

  return (
    // KeyboardAvoidingView evita que el teclado cubra contenido en iOS/Android
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Fondo con gradiente para la pantalla completa */}
      <LinearGradient 
        colors={["#2c3e50", "#133750ff"]} 
        style={styles.container}
      >
        {/* Componente principal del calendario */}
        <CalendarView
          title={title} // Título del proyecto mostrado en el calendario
          markedDates={markedDates} // Fechas marcadas con diferentes colores/estados
          onDayPress={handleDayPress} // Callback cuando se presiona un día
          loading={loading} // Estado de carga para mostrar spinner
        />

        {/* Modal que muestra detalles del día seleccionado */}
        <DayDetailsModal
          visible={modalVisible} // Controla si el modal es visible
          selectedDate={selectedDate} // Fecha seleccionada para mostrar detalles
          notes={notes} // Notas filtradas por fecha
          stages={stages} // Etapas del proyecto
          onClose={handleCloseModal} // Callback para cerrar el modal
        />
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

// Estilos de la pantalla
const styles = StyleSheet.create({
  container: {
    flex: 1, // Ocupa toda la pantalla disponible
    backgroundColor: '#1E1E2F', // Color de respaldo en caso de que el gradiente falle
  },
});
