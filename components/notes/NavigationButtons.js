// components/notes/NavigationButtons.js 
import { useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useUser } from '../../context/UserContext';

/**
 * Componente de botones de navegación para funcionalidades del proyecto
 * Muestra botones para acceder a diferentes módulos del proyecto con validación de permisos
 * 
 * @component
 * @param {Object} props - Propiedades del componente
 * @param {string} props.projectId - ID del proyecto actual
 * @param {string} props.projectTitle - Título del proyecto actual
 * @returns {JSX.Element} Grid de botones de navegación para diferentes módulos del proyecto
 * 
 * @example
 * // Uso básico
 * <NavigationButtons
 *   projectId="123"
 *   projectTitle="Construcción Edificio A"
 * />
 */
export default function NavigationButtons({ projectId, projectTitle }) {
  const router = useRouter();
  const { role } = useUser();

  /**
   * Configuración de botones de navegación disponibles
   * @constant {Array<Object>}
   */
  const buttons = [
    {
      title: '📅 Ver Calendario',
      path: '/CalendarScreen',
      color: '#38B2AC'
    },
    {
      title: '🛠️ Etapas del Proyecto',
      path: '/ProjectStepScreen',
      color: '#ECC94B'
    },
    {
      title: '📦 Inventario del Proyecto',
      path: '/ProjectStockScreen',
      color: '#48BB78'
    },
    {
      title: '💰 Presupuesto',
      path: '/BudgetScreen',
      color: '#9F7AEA',
      roles: ['Administrador', 'Ingeniero', 'Supervisor'] // Roles con acceso restringido
    },
  ];

  /**
   * Maneja la navegación al presionar un botón
   * Valida permisos y projectId antes de navegar
   * 
   * @function handleNavigation
   * @param {Object} button - Botón presionado con su configuración
   */
  const handleNavigation = (button) => {
    // Validar permisos para botones restringidos
    if (button.roles && !button.roles.includes(role)) {
      Alert.alert('Acceso restringido', 'No tienes permisos para acceder a esta función');
      return;
    }

    // Validar que tenemos el projectId
    if (!projectId) {
      Alert.alert('Error', 'No se pudo identificar el proyecto. Por favor, regresa y vuelve a entrar.');
      console.error('❌ Error: projectId es undefined o null');
      return;
    }

    // Parámetros base para todas las pantallas
    const baseParams = { 
      projectId: projectId, // Cambiar a projectId para consistencia
      title: projectTitle || 'Proyecto'
    };

    router.push({
      pathname: button.path,
      params: baseParams,
    });
  };

  return (
    <View style={styles.container}>
      {buttons.map((button, index) => {
        // Ocultar botones que requieren roles específicos y el usuario no tiene acceso
        if (button.roles && !button.roles.includes(role)) {
          return null;
        }
        
        return (
          <TouchableOpacity
            key={index}
            style={[styles.button, { backgroundColor: button.color }]}
            onPress={() => handleNavigation(button)}
          >
            <Text style={styles.buttonText}>{button.title}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    gap: 10,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});