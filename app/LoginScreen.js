// app/LoginScreen.js
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

/**
 * Pantalla de inicio de sesión principal de la aplicación.
 * 
 * Esta pantalla proporciona:
 * - Autenticación con correo electrónico y contraseña
 * - Animaciones de transición suaves al iniciar sesión
 * - Recordatorio de credenciales guardadas
 * - Notificaciones de tareas atrasadas después del login
 * - Diseño visual atractivo con campo de estrellas animado
 * 
 * Flujo de autenticación:
 * 1. Validación de campos de entrada
 * 2. Verificación de credenciales con Firebase Auth
 * 3. Obtención de rol y datos del usuario desde Firestore
 * 4. Actualización del contexto global de usuario
 * 5. Transición animada hacia la pantalla principal
 * 6. Notificación de tareas pendientes/atrasadas
 * 
 * @component
 * @returns {JSX.Element} Componente de pantalla de login
 */
export default function LoginScreen() {
  const router = useRouter();
  const { setUser, setRole } = useUser(); // Contexto global de usuario
  
  // Estados del formulario
  const [email, setEmail] = useState(''); // Correo electrónico del usuario
  const [password, setPassword] = useState(''); // Contraseña del usuario
  const [showPassword, setShowPassword] = useState(false); // Visibilidad de contraseña
  const [loading, setLoading] = useState(false); // Estado de carga durante login
  const [transition] = useState(new Animated.Value(0)); // Valor para animación de transición

  // Hooks personalizados para notificaciones
  useNotifications(); // Configuración general del sistema de notificaciones
  const { notifyDelayedTasks } = useDelayedTasksNotifier(); // Notificador de tareas atrasadas

  /**
   * Efecto para cargar credenciales guardadas al montar el componente
   * Carga el email y contraseña almacenados localmente si existen
   */
  useEffect(() => {
    const loadSavedCredentials = async () => {
      try {
        const savedCredentials = await authService.getSavedCredentials();
        if (savedCredentials) {
          setEmail(savedCredentials.email || '');
          setPassword(savedCredentials.password || '');
          
          // Notificar solo tareas atrasadas inmediatas (no reprogramar todo)
          await notifyDelayedTasks();
        }
      } catch (error) {
        console.error('Error cargando credenciales:', error);
      }
    };

    loadSavedCredentials();
  }, []);

  /**
   * Ejecuta la animación de transición hacia la pantalla principal
   * Anima el fondo de color y navega a HomeScreen al completarse
   */
  const goToHome = () => {
    Animated.timing(transition, {
      toValue: 1,
      duration: 2000, // Duración de 2 segundos para transición suave
      useNativeDriver: false, // No usar driver nativo para animar background color
    }).start(() => {
      router.replace({ pathname: 'HomeScreen' }); // Navegación sin historial
    });
  };

  /**
   * Maneja el proceso de inicio de sesión con correo y contraseña
   * @async
   * @throws {Error} Si las credenciales son inválidas o hay error de red
   */
  const loginWithEmail = async () => {
    // Validación básica de campos
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu correo y contraseña');
      return;
    }

    setLoading(true);
    try {
      // Autenticación con Firebase Auth y obtención de datos de usuario
      const result = await authService.loginWithEmail(
        email.trim().toLowerCase(), // Normalizar email a minúsculas
        password.trim()
      );

      // Actualizar contexto global con datos del usuario
      if (typeof setUser === "function") {
        setUser(result.user);
      }
      if (typeof setRole === "function") {
        setRole(result.role);
      }

      // Notificar tareas atrasadas después del login exitoso
      await notifyDelayedTasks();

      setLoading(false);
      goToHome(); // Iniciar transición animada hacia pantalla principal
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      Alert.alert('Error', error.message || 'Correo o contraseña incorrectos.');
      setLoading(false);
    }
  };

  /**
   * Interpolación de color de fondo para animación de transición
   * @type {Animated.AnimatedInterpolation<string>}
   */
  const bgColor = transition.interpolate({
    inputRange: [0, 1],
    outputRange: ['#1E1E2F', '#ffc782'], // De azul oscuro a naranja claro
  });

  return (
    <Animated.View style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Fondo decorativo con estrellas animadas */}
      <StarField />
      
      {/* Contenido principal del formulario */}
      <View style={styles.content}>
        <Text style={styles.title}>Iniciar Sesión</Text>
        <Text style={styles.subtitle}>Bienvenido a Terrall</Text>

        {/* Campo de entrada para correo electrónico */}
        <TextInput
          placeholder="Correo electrónico"
          placeholderTextColor="#AAA"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          editable={!loading} // Deshabilitar durante carga
        />

        {/* Componente personalizado para entrada de contraseña */}
        <PasswordInput
          value={password}
          onChangeText={setPassword}
          showPassword={showPassword}
          onToggleShowPassword={() => setShowPassword(!showPassword)}
          placeholder="Contraseña"
          editable={!loading} // Deshabilitar durante carga
        />

        {/* Indicador de carga o botón de login */}
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
            activeOpacity={0.8} // Feedback visual al presionar
          >
            <Text style={styles.buttonText}>Entrar</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

// ========== ESTILOS ==========
const styles = StyleSheet.create({
  /**
   * Contenedor principal
   * Ocupa toda la pantalla con fondo animado
   */
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /**
   * Contenedor del formulario
   * Ancho máximo para mejor legibilidad en tablets
   */
  content: {
    width: '100%',
    maxWidth: 400, // Limitar ancho máximo en pantallas grandes
    zIndex: 10, // Asegurar que esté sobre las estrellas
  },

  /**
   * Título principal
   * Texto grande y destacado
   */
  title: {
    fontSize: 32,
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },

  /**
   * Subtítulo
   * Texto secundario descriptivo
   */
  subtitle: {
    fontSize: 16,
    color: '#CCCCCC',
    marginBottom: 32,
    textAlign: 'center',
  },

  /**
   * Campo de entrada de texto
   * Diseño oscuro con bordes sutiles
   */
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

  /**
   * Botón de acción principal (login)
   * Diseño llamativo con efectos de sombra
   */
  button: {
    backgroundColor: '#5A67D8', // Azul índigo
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4, // Sombra en Android
  },

  /**
   * Texto del botón
   * Blanco con buen contraste sobre fondo azul
   */
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
