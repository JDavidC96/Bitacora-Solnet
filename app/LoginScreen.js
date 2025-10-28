// screens/LoginScreen.js
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

// Usar el contexto existente
import { useUser } from '../context/UserContext';

// Hooks personalizados
import { useDelayedTasksNotifier, useNotifications } from '../hooks/useNotifications';

// Componentes
import PasswordInput from '../components/auth/PasswordInput';
import StarField from '../components/auth/StarField';

// Servicios
import { authService } from '../services/authService';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const { setUser, setRole } = useUser();
  
  // Estados
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transition] = useState(new Animated.Value(0));

  // Hooks personalizados
  useNotifications();
  const { notifyDelayedTasks } = useDelayedTasksNotifier();

  // Cargar datos guardados
  useEffect(() => {
    const loadSavedCredentials = async () => {
      try {
        const savedCredentials = await authService.getSavedCredentials();
        if (savedCredentials) {
          setEmail(savedCredentials.email || '');
          setPassword(savedCredentials.password || '');
          
          // ✅ Notificar solo tareas atrasadas inmediatas (no reprogramar todo)
          await notifyDelayedTasks();
        }
      } catch (error) {
        console.error('Error cargando credenciales:', error);
      }
    };

    loadSavedCredentials();
  }, []);

  // Animación de transición
  const goToHome = () => {
    Animated.timing(transition, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: false,
    }).start(() => {
      router.replace({ pathname: 'HomeScreen' });
    });
  };

  // Login con correo y contraseña
  const loginWithEmail = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu correo y contraseña');
      return;
    }

    setLoading(true);
    try {
      const result = await authService.loginWithEmail(
        email.trim().toLowerCase(), 
        password.trim()
      );

      // Guardar en contexto
      if (typeof setUser === "function") {
        setUser(result.user);
      }
      if (typeof setRole === "function") {
        setRole(result.role);
      }

      // ✅ Notificar solo tareas atrasadas inmediatas (no reprogramar todo)
      await notifyDelayedTasks();

      setLoading(false);
      goToHome();
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      Alert.alert('Error', error.message || 'Correo o contraseña incorrectos.');
      setLoading(false);
    }
  };

  const bgColor = transition.interpolate({
    inputRange: [0, 1],
    outputRange: ['#1E1E2F', '#ffc782'],
  });

  return (
    <Animated.View style={[styles.container, { backgroundColor: bgColor }]}>
      <StarField />
      
      <View style={styles.content}>
        <Text style={styles.title}>Iniciar Sesión</Text>
        <Text style={styles.subtitle}>Bienvenido a Terrall</Text>

        <TextInput
          placeholder="Correo electrónico"
          placeholderTextColor="#AAA"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <PasswordInput
          value={password}
          onChangeText={setPassword}
          showPassword={showPassword}
          onToggleShowPassword={() => setShowPassword(!showPassword)}
          placeholder="Contraseña"
        />

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#5A67D8"
            style={{ marginVertical: 16 }}
          />
        ) : (
          <TouchableOpacity 
            style={styles.button} 
            onPress={loginWithEmail}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Entrar</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 400,
  },
  title: {
    fontSize: 32,
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#CCCCCC',
    marginBottom: 32,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#2C2C3A',
    color: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#3A3A4A',
  },
  button: {
    backgroundColor: '#5A67D8',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
});