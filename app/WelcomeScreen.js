/**
 * PANTALLA DE BIENVENIDA Y GESTIÓN DE SESIÓN INICIAL
 * 
 * Descripción:
 * Pantalla inicial de la aplicación que maneja el flujo de bienvenida y
 * verificación de sesión de usuario. Realiza comprobaciones automáticas de
 * autenticación y redirecciona según el estado del usuario.
 * 
 * Características principales:
 * 1. Verificación automática de sesión de usuario usando UserContext
 * 2. Redirección automática a HomeScreen si hay usuario autenticado
 * 3. Pantalla de bienvenida con logo y botón de inicio si no hay sesión
 * 4. Almacenamiento local para control de primer uso
 * 5. Diseño con gradiente y branding de Terrall
 * 
 * Flujo de la pantalla:
 * 1. Al montar: Verifica estado de carga del contexto de usuario
 * 2. Si hay usuario autenticado: Redirección automática a HomeScreen
 * 3. Si no hay usuario: Muestra pantalla de bienvenida
 * 4. Al presionar "Comenzar": Navega a LoginScreen y marca welcome como vista
 * 
 * Estados de sesión:
 * - loading: Contexto aún verificando autenticación
 * - user: null (no autenticado) o objeto (autenticado)
 * - hasCheckedSession: Control interno para mostrar contenido apropiado
 * 
 * Persistencia:
 * - AsyncStorage: Almacena 'hasSeenWelcome' para controlar primer uso
 * - Firestore/Auth: La autenticación real se maneja en UserContext
 * 
 * @component
 * @param {Object} props - Propiedades del componente
 * @param {Function} props.onFinish - Callback opcional al finalizar
 * @returns {JSX.Element} Pantalla de bienvenida renderizada
 * 
 * @example
 * <WelcomeScreen onFinish={() => console.log('Welcome completed')} />
 */

// Importaciones de React Native y librerías
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useUser } from '../context/UserContext'; // Contexto de autenticación

/**
 * Componente principal de pantalla de bienvenida
 * 
 * @function WelcomeScreen
 * @param {Object} props - Propiedades del componente
 * @param {Function} props.onFinish - Callback al finalizar (opcional)
 * @returns {JSX.Element} Pantalla de bienvenida renderizada
 */
export default function WelcomeScreen({ onFinish }) {
  // ==================== HOOKS Y CONTEXTO ====================
  
  const router = useRouter();                      // Hook de navegación de expo-router
  const { user, loading } = useUser();            // Contexto de usuario (autenticación)
  const [hasCheckedSession, setHasCheckedSession] = useState(false); // Control de verificación

  // ==================== EFECTO DE VERIFICACIÓN DE SESIÓN ====================
  
  /**
   * Efecto para manejar la lógica de verificación de sesión
   * Se ejecuta cuando cambia el estado de usuario o loading
   * 
   * Lógica:
   * 1. Espera a que el contexto termine de cargar (loading = false)
   * 2. Si hay usuario autenticado: redirecciona a HomeScreen
   * 3. Si no hay usuario: muestra pantalla de bienvenida
   */
  useEffect(() => {
    // Solo procesar cuando el loading termine
    if (!loading) {
      console.log('🔍 Estado de usuario:', user ? 'Autenticado' : 'No autenticado');
      
      if (user) {
        // Caso: Usuario autenticado → redirección automática
        console.log('✅ Usuario autenticado, redirigiendo a HomeScreen');
        router.replace('/HomeScreen'); // replace evita volver a welcome con back
      } else {
        // Caso: No hay usuario → mostrar bienvenida
        console.log('👤 No hay usuario autenticado, mostrando WelcomeScreen');
        setHasCheckedSession(true); // Marcar que ya se verificó la sesión
      }
    }
  }, [user, loading]); // Dependencias: se ejecuta cuando user o loading cambian

  // ==================== MANEJO DE INICIO ====================
  
  /**
   * Maneja el evento de presionar "Comenzar"
   * 
   * Acciones:
   * 1. Marca en AsyncStorage que el usuario ya vio la pantalla de bienvenida
   * 2. Navega a la pantalla de LoginScreen
   * 3. Ejecuta callback onFinish si fue proporcionado
   * 
   * @async
   */
  const handleStart = async () => {
    // 1. Guardar flag de que ya se vio el welcome (para futuras sesiones)
    await AsyncStorage.setItem('hasSeenWelcome', 'true');

    // 2. Navegar a pantalla de login
    router.replace('/LoginScreen'); // replace para no poder volver con back
    
    // 3. Ejecutar callback opcional
    if (onFinish) onFinish();
  };

  // ==================== ESTADO DE CARGA ====================
  
  // Mostrar pantalla de carga mientras UserContext verifica la autenticación
  // Esto evita mostrar contenido incorrecto durante la verificación
  if (loading || !hasCheckedSession) {
    return (
      <LinearGradient
        colors={['#edf2b1ff', '#ffc782ff', '#FF4500']}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          {/* Logo de la empresa durante carga */}
          <Image
            source={require('../assets/images/terrall.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          {/* Texto indicativo de verificación */}
          <Text style={styles.loadingText}>Verificando sesión...</Text>
        </View>
      </LinearGradient>
    );
  }

  // ==================== RENDER PRINCIPAL (BIENVENIDA) ====================
  
  // Mostrar la pantalla de bienvenida normal (cuando no hay usuario autenticado)
  return (
    <LinearGradient
      colors={['#edf2b1ff', '#ffc782ff', '#FF4500']}
      style={styles.container}
    >
      {/* Logo principal de Terrall */}
      <Image
        source={require('../assets/images/terrall.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      {/* Título principal de bienvenida */}
      <Text style={styles.title}>Bienvenido a Terrall</Text>
      
      {/* Subtítulo descriptivo */}
      <Text style={styles.subtitle}>Energía Solar a tu alcance</Text>

      {/* Botón para iniciar sesión/registro */}
      <TouchableOpacity style={styles.button} onPress={handleStart}>
        <Text style={styles.buttonText}>Comenzar</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

// ==================== ESTILOS DEL COMPONENTE ====================

/**
 * Estilos del componente
 * 
 * @constant {Object} styles
 */
const styles = StyleSheet.create({
  // Contenedor principal con gradiente
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Contenedor para estado de carga
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Logo de la empresa (consistente entre estados)
  logo: {
    width: 250,
    height: 120,
    marginBottom: 40,
  },
  
  // Título principal
  title: {
    fontSize: 30,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  
  // Subtítulo descriptivo
  subtitle: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 40,
  },
  
  // Botón de acción principal
  button: {
    backgroundColor: '#ffffffaa', // Blanco semitransparente
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  
  // Texto del botón
  buttonText: {
    color: '#FF4500', // Naranja Terrall
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Texto durante estado de carga
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 20,
  },
});