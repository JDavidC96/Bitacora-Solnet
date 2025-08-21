import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Image, StyleSheet, Text, TouchableOpacity } from 'react-native';

export default function WelcomeScreen({ onFinish }) {
  const router = useRouter();

  const handleStart = async () => {
    // Guardamos que ya se vio el welcome
    await AsyncStorage.setItem('hasSeenWelcome', 'true');

    // Si quieres ir primero al login:
    router.replace('/LoginScreen');
    
    // Además, por si recibiste la prop desde _layout.js
    if (onFinish) onFinish();
  };

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
});
