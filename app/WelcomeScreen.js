import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useUser } from '../context/UserContext'; // ← Importar el contexto

export default function WelcomeScreen({ onFinish }) {
  const router = useRouter();
  const { user, loading } = useUser(); // ← Usar el contexto
  const [hasCheckedSession, setHasCheckedSession] = useState(false);

  useEffect(() => {
    // Solo procesar cuando el loading termine
    if (!loading) {
      console.log('🔍 Estado de usuario:', user ? 'Autenticado' : 'No autenticado');
      
      if (user) {
        // Si hay usuario autenticado, ir directamente a HomeScreen
        console.log('✅ Usuario autenticado, redirigiendo a HomeScreen');
        router.replace('/HomeScreen');
      } else {
        // No hay usuario, mostrar pantalla de bienvenida
        console.log('👤 No hay usuario autenticado, mostrando WelcomeScreen');
        setHasCheckedSession(true);
      }
    }
  }, [user, loading]); // ← Se ejecuta cuando user o loading cambian

  const handleStart = async () => {
    // Guardamos que ya se vio el welcome
    await AsyncStorage.setItem('hasSeenWelcome', 'true');

    // Ir al login
    router.replace('/LoginScreen');
    
    if (onFinish) onFinish();
  };

  // Mostrar loading mientras UserContext verifica la autenticación
  if (loading || !hasCheckedSession) {
    return (
      <LinearGradient
        colors={['#edf2b1ff', '#ffc782ff', '#FF4500']}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <Image
            source={require('../assets/images/terrall.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.loadingText}>Verificando sesión...</Text>
        </View>
      </LinearGradient>
    );
  }

  // Mostrar la pantalla de bienvenida normal
  return (
    <LinearGradient
      colors={['#edf2b1ff', '#ffc782ff', '#FF4500']}
      style={styles.container}
    >
      <Image
        source={require('../assets/images/terrall.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.title}>Bienvenido a Terrall</Text>
      <Text style={styles.subtitle}>Energía Solar a tu alcance</Text>

      <TouchableOpacity style={styles.button} onPress={handleStart}>
        <Text style={styles.buttonText}>Comenzar</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 250,
    height: 120,
    marginBottom: 40,
  },
  title: {
    fontSize: 30,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#ffffffaa',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  buttonText: {
    color: '#FF4500',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 20,
  },
});