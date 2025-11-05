// components/notes/NavigationButtons.js
import { useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function NavigationButtons({ projectId, projectTitle }) {
  const router = useRouter();

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
   
  ];

  const handleNavigation = (button) => {
    // Validar que tenemos el projectId
    if (!projectId) {
      Alert.alert('Error', 'No se pudo identificar el proyecto. Por favor, regresa y vuelve a entrar.');
      console.error('❌ Error: projectId es undefined o null');
      return;
    }

    // Parámetros base para todas las pantallas
    const baseParams = { 
      id: projectId, 
      title: projectTitle || 'Proyecto'
    };

    // Para ProjectStockScreen, agregar projectId como parámetro adicional
    const finalParams = button.path === '/ProjectStockScreen' 
      ? { ...baseParams, projectId: projectId }
      : baseParams;

    router.push({
      pathname: button.path,
      params: finalParams,
    });
  };

  return (
    <View style={styles.container}>
      {buttons.map((button, index) => (
        <TouchableOpacity
          key={index}
          style={[styles.button, { backgroundColor: button.color }]}
          onPress={() => handleNavigation(button)}
        >
          <Text style={styles.buttonText}>{button.title}</Text>
        </TouchableOpacity>
      ))}
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