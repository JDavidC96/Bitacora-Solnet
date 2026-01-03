// components/notes/NavigationButtons.js - ACTUALIZAR COMPLETO
import { useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useUser } from '../../context/UserContext';

export default function NavigationButtons({ projectId, projectTitle }) {
  const router = useRouter();
  const { role } = useUser();

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
      roles: ['Administrador', 'Ingeniero', 'Supervisor']
    },
  ];

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
        // Ocultar botones que requieren roles específicos
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