// app/_layout.js
// ============================================================================
// LAYOUT PRINCIPAL DE LA APLICACIÓN
// Este archivo define la estructura de navegación principal, manejo de usuario,
// sistema de notificaciones y control de acceso basado en roles.
// ============================================================================

// ----------------------------------------------------------------------------
// IMPORTACIONES
// ----------------------------------------------------------------------------

// Almacenamiento local asíncrono
import AsyncStorage from "@react-native-async-storage/async-storage";

// Componentes de navegación drawer (menú lateral)
import { DrawerContentScrollView, DrawerItem, DrawerItemList } from "@react-navigation/drawer";
import { CommonActions } from "@react-navigation/native";
import { Drawer } from "expo-router/drawer";

// Autenticación Firebase
import { signOut } from "firebase/auth";

// Hooks de React
import { useEffect } from "react";

// Componentes UI de React Native
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

// Contexto global del usuario
import { UserProvider, useUser } from "../context/UserContext";

// Configuración de Firebase
import { auth } from "../firebase/firebaseConfig";

// Hook personalizado para permisos basados en roles
import { usePermissions } from "../hooks/usePermissions";

// Funciones para gestión de notificaciones
import { configureNotifications, programProjectNotificationsFromCache } from "../notifications";

// Sistema de notificaciones de Expo
import * as Notifications from 'expo-notifications';

// Navegación de Expo Router
import { useRouter, useSegments } from 'expo-router';

// ----------------------------------------------------------------------------
// COMPONENTE: CustomDrawerContent
// Propósito: Renderiza el contenido personalizado del drawer lateral
// ----------------------------------------------------------------------------
function CustomDrawerContent(props) {
  // Obtiene el estado del usuario desde el contexto global
  const { user } = useUser();

  /**
   * Maneja el proceso de cierre de sesión
   * 1. Cierra sesión en Firebase
   * 2. Limpia el almacenamiento local
   * 3. Redirige a la pantalla de bienvenida
   */
  const handleLogout = async () => {
    try {
      // Paso 1: Cerrar sesión en Firebase Authentication
      await signOut(auth);
      
      // Paso 2: Eliminar datos persistentes del usuario
      await AsyncStorage.multiRemove(["userData", "hasSeenWelcome"]);
      
      // Paso 3: Resetear la navegación y redirigir a WelcomeScreen
      props.navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "WelcomeScreen" }],
        })
      );
    } catch (error) {
      // Manejo de errores durante el logout
      console.error('Error durante logout:', error);
    }
  };

  return (
    // ScrollView para el contenido del drawer (permite scroll si hay muchos items)
    <DrawerContentScrollView {...props} contentContainerStyle={{ flex: 1 }}>
      {/* Contenedor principal que ocupa todo el espacio disponible */}
      <View style={{ flex: 1 }}>
        {/* Renderiza automáticamente los items del drawer basados en las pantallas definidas */}
        <DrawerItemList {...props} />
      </View>

      {/* Footer fijo en la parte inferior del drawer */}
      <View style={styles.footer}>
        {/* Muestra información del usuario solo si está autenticado */}
        {user && (
          <>
            {/* Email del usuario actual */}
            <Text style={styles.userEmail}>{user.email}</Text>
            
            {/* Botón para cerrar sesión */}
            <DrawerItem
              label="Cerrar sesión"
              labelStyle={styles.logoutLabel}
              onPress={handleLogout}
            />
          </>
        )}
      </View>
    </DrawerContentScrollView>
  );
}

// ----------------------------------------------------------------------------
// COMPONENTE: RootDrawer
// Propósito: Componente principal que gestiona toda la navegación y lógica de la app
// ----------------------------------------------------------------------------
function RootDrawer() {
  // Hook para navegación programática
  const router = useRouter();
  
  // Hook para obtener los segmentos de la ruta actual (ej: ['(auth)', 'HomeScreen'])
  const segments = useSegments();
  
  // Estado del usuario y loading desde el contexto
  const { user, loading } = useUser();
  
  // Permisos basados en roles del usuario
  const { canProrrogaRole, canAdministrativosRole, canIngenerioRole } = usePermissions();

  // ==========================================================================
  // USEEFFECT #1: Manejo de clicks en notificaciones
  // Propósito: Escuchar cuando el usuario hace click en una notificación push
  // y navegar a la pantalla correspondiente
  // ==========================================================================
  useEffect(() => {
    let isMounted = true; // Flag para prevenir actualizaciones en componentes desmontados

    // Listener para cuando el usuario responde a una notificación (hace click)
    const notificationListener = Notifications.addNotificationResponseReceivedListener((response) => {
      if (!isMounted) return; // Prevenir ejecución si el componente está desmontado
      
      console.log('🔔 Notificación clickeada:', response.notification);
      
      // Extraer datos personalizados de la notificación
      const { data } = response.notification.request.content;
      console.log('📱 Datos de la notificación:', data);

      // Si la notificación contiene un projectId, manejar la navegación
      if (data && data.projectId) {
        handleNotificationNavigation(data);
      }
    });

    // Listener para cuando se recibe una notificación (solo para logging)
    const receivedListener = Notifications.addNotificationReceivedListener((notification) => {
      console.log('📨 Notificación recibida:', notification);
    });

    /**
     * Función para manejar la navegación desde una notificación
     * @param {Object} notificationData - Datos de la notificación
     * @param {string} notificationData.projectId - ID del proyecto relacionado
     * @param {string} [notificationData.screen='ProjectStepScreen'] - Pantalla destino
     * @param {string} [notificationData.taskId] - ID de tarea específica (opcional)
     */
    const handleNotificationNavigation = (notificationData) => {
      // Extraer datos con valores por defecto
      const { projectId, screen = 'ProjectStepScreen', taskId } = notificationData;
      
      // Validar que haya un projectId
      if (!projectId) {
        console.log('❌ No hay projectId en la notificación');
        return;
      }

      /**
       * Obtiene el título del proyecto desde la caché local
       * @returns {Promise<string>} Título del proyecto o 'Proyecto' por defecto
       */
      const getProjectTitle = async () => {
        try {
          // Intentar obtener proyectos desde AsyncStorage
          const cached = await AsyncStorage.getItem('@projects_cache');
          if (cached) {
            const projects = JSON.parse(cached);
            // Retornar título del proyecto o valor por defecto
            return projects[projectId]?.title || 'Proyecto';
          }
        } catch (error) {
          console.error('Error obteniendo título del proyecto:', error);
        }
        return 'Proyecto'; // Valor por defecto si hay error
      };

      /**
       * Navega a la pantalla del proyecto
       */
      const navigateToProject = async () => {
        // Obtener título del proyecto desde caché
        const projectTitle = await getProjectTitle();
        
        console.log(`🚀 Navegando a ${screen} - ${projectId}: ${projectTitle}`);
        
        // Decidir si usar replace o push basado en la ubicación actual
        if (segments[0] === '(auth)' || segments.length === 0) {
          // Si estamos en el flujo de autenticación o la app acaba de abrir,
          // usar replace para limpiar el stack de navegación
          router.replace({
            pathname: `/${screen}`,
            params: { 
              id: projectId,
              title: projectTitle,
              focusedTask: taskId || '' // Pasar taskId vacío si no existe
            }
          });
        } else {
          // Navegación normal, agregar a la pila actual
          router.push({
            pathname: `/${screen}`,
            params: { 
              id: projectId,
              title: projectTitle,
              focusedTask: taskId || ''
            }
          });
        }
      };

      // Ejecutar navegación
      navigateToProject();
    };

    // Cleanup: Remover listeners cuando el componente se desmonte
    return () => {
      isMounted = false;
      notificationListener.remove();
      receivedListener.remove();
    };
  }, [router, segments, user]); // Dependencias: se re-ejecuta cuando cambian estos valores

  // ==========================================================================
  // USEEFFECT #2: Inicialización de notificaciones
  // Propósito: Configurar el sistema de notificaciones cuando el usuario se autentica
  // ==========================================================================
  useEffect(() => {
    // Solo ejecutar si hay un usuario autenticado y no está en estado de loading
    if (user && !loading) {
      console.log('👤 Usuario autenticado, inicializando notificaciones...');
      
      /**
       * Función asíncrona para inicializar notificaciones
       */
      const initializeNotifications = async () => {
        try {
          // Paso 1: Configurar permisos y canales de notificación
          await configureNotifications();
          
          // Paso 2: Programar notificaciones para proyectos próximos (7 días)
          await programProjectNotificationsFromCache({ daysAhead: 7 });
          
          console.log('✅ Notificaciones inicializadas correctamente en _layout');
        } catch (error) {
          console.error('❌ Error inicializando notificaciones en _layout:', error);
        }
      };

      // Ejecutar inicialización
      initializeNotifications();

      // Configurar intervalo para refrescar notificaciones periódicamente
      // Se ejecuta cada 12 horas (12 * 60 * 60 * 1000 ms)
      const refreshInterval = setInterval(() => {
        console.log('🔄 Verificación periódica de notificaciones');
        programProjectNotificationsFromCache({ daysAhead: 7 });
      }, 12 * 60 * 60 * 1000); // 12 horas en milisegundos

      // Cleanup: Limpiar intervalo cuando el componente se desmonte
      return () => {
        console.log('🧹 Limpiando intervalo de notificaciones');
        clearInterval(refreshInterval);
      };
    }
  }, [user, loading]); // Dependencias: se re-ejecuta cuando cambia el estado de autenticación

  // ==========================================================================
  // ESTADO DE LOADING
  // Muestra un indicador de carga mientras se verifica la autenticación
  // ==========================================================================
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#5A67D8" />
        <Text style={{ marginTop: 10, color: '#5A67D8' }}>Cargando...</Text>
      </View>
    );
  }

  // ==========================================================================
  // RENDERIZADO PRINCIPAL
  // Retorna el componente Drawer con todas las pantallas configuradas
  // ==========================================================================
  return (
    <Drawer
      // Comportamiento del botón "atrás" en Android/iOS
      backBehavior="history"
      
      // Ruta inicial basada en autenticación
      initialRouteName={user ? "HomeScreen" : "WelcomeScreen"}
      
      // Opciones globales para todas las pantallas
      screenOptions={{ 
        headerShown: true, // Mostrar header por defecto
        headerStyle: {
          backgroundColor: '#FF4500', // Color naranja corporativo
        },
        headerTintColor: '#fff', // Color blanco para texto/icons del header
        headerTitleStyle: {
          fontWeight: 'bold', // Texto en negrita
        },
        drawerStyle: {
          backgroundColor: '#f8f9fa', // Color de fondo del drawer (gris claro)
        }
      }}
      
      // Componente personalizado para el contenido del drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      {
      // ======================================================================
      // DEFINICIÓN DE TODAS LAS PANTALLAS DE LA APLICACIÓN
      // Cada Drawer.Screen representa una ruta en la navegación
      // ======================================================================

      // ----------------------------------------------------------------------
      // PANTALLAS DE AUTENTICACIÓN (Ocultas en drawer)
      // ----------------------------------------------------------------------
    }  
      {/* Pantalla de bienvenida - visible solo para usuarios no autenticados */}
      <Drawer.Screen
        name="WelcomeScreen"
        options={{
          title: "Inicio",
          headerShown: false, // Sin header
          drawerItemStyle: { display: "none" }, // Ocultar en drawer menu
        }}
      />

      {/* Pantalla de inicio de sesión */}
      <Drawer.Screen
        name="LoginScreen"
        options={{
          title: "Iniciar sesión",
          headerShown: false,
          drawerItemStyle: { display: "none" },
        }}
      />
      {
      // ----------------------------------------------------------------------
      // PANTALLAS DE PRESUPUESTO (Ocultas en drawer - acceso por navegación)
      // ----------------------------------------------------------------------
      }

      <Drawer.Screen
        name="BudgetScreen"
        options={{
          title: "Pantalla de Presupuesto",
          headerShown: false,
          drawerItemStyle: { display: "none" },
        }}
      />

      <Drawer.Screen
        name="BudgetStatScreen"
        options={{
          title: "Estadísticas de Presupuesto",
          headerShown: false,
          drawerItemStyle: { display: "none" },
        }}
      />

      <Drawer.Screen
        name="BudgetVsRealScreen"
        options={{
          title: "Presupuesto vs Real",
          headerShown: false,
          drawerItemStyle: { display: "none" },
        }}
      />
      {
      // ----------------------------------------------------------------------
      // PANTALLAS DE GESTIÓN (Ocultas en drawer)
      // ----------------------------------------------------------------------
      }

      <Drawer.Screen
        name="RegistroLaboralScreen"
        options={{
          headerShown: false,
          drawerItemStyle: { display: "none" },
        }}
      />

      <Drawer.Screen
        name="RealExpensesScreen"
        options={{
          title: "Gastos Reales",
          headerShown: false,
          drawerItemStyle: { display: "none" },
        }}
      />

      <Drawer.Screen
        name="DuplicateDetectorScreen"
        options={{
          title: "Encontrar Duplicados",
          headerShown: false,
          drawerItemStyle: { display: "none" },
        }}
      />

      {/* Página índice/principal */}
      <Drawer.Screen
        name="index"
        options={{
          headerShown: false,
          drawerItemStyle: { display: "none" },
        }}
      />

      <Drawer.Screen
        name="ReporteGeneralScreen"
        options={{
          headerShown: false,
          drawerItemStyle: { display: "none" },
        }}
      />

      {
      // ----------------------------------------------------------------------
      // PANTALLAS PRINCIPALES (Visibles en drawer)
      // ----------------------------------------------------------------------
      }

      {/* Pantalla de inicio principal */}
      <Drawer.Screen 
        name="HomeScreen" 
        options={{ 
          title: "Inicio",
          headerStyle: {
            backgroundColor: '#FF4500', // Naranja - módulo principal
          },
          headerTintColor: '#fff',
        }} 
      />

      {/* Gestión de personal */}
      <Drawer.Screen 
        name="PersonalScreen" 
        options={{ 
          title: "Personal",
          headerStyle: {
            backgroundColor: '#3182CE', // Azul - módulo de personal
          },
          headerTintColor: '#fff',
        }} 
      />

      {/* Elementos no vinculantes */}
      <Drawer.Screen 
        name="NoVinculantesScreen" 
        options={{ 
          title: "No Vinculantes",
          headerStyle: {
            backgroundColor: '#eb910bff', // Naranja oscuro
          },
          headerTintColor: '#fff',
        }} 
      />

      {/* Historial de personal */}
      <Drawer.Screen 
        name="PersonalHistoryScreen" 
        options={{ 
          title: "Historial de Personal",
          headerStyle: {
            backgroundColor: '#3182CE', // Azul - mismo módulo que PersonalScreen
          },
          headerTintColor: '#fff',
        }} 
      />

      {
      // ----------------------------------------------------------------------
      // PANTALLAS DE INVENTARIO (Visibles en drawer)
      // ----------------------------------------------------------------------
      }

      {/* Inventario general */}
      <Drawer.Screen
        name="GeneralStockScreen"
        options={{ 
          title: "Inventario General",
          headerStyle: {
            backgroundColor: '#38A169', // Verde - módulo de inventario
          },
          headerTintColor: '#fff',
        }}
      />

      {/* Historial de inventario */}
      <Drawer.Screen
        name="InventoryHistoryScreen"
        options={{ 
          title: "Historial de Inventario",
          headerStyle: {
            backgroundColor: '#38A169', // Verde - mismo módulo
          },
          headerTintColor: '#fff',
        }}
      />

      {/* Proyectos completados */}
      <Drawer.Screen
        name="CompletedProjectsScreen"
        options={{ 
          title: "Proyectos Completados",
          headerStyle: {
            backgroundColor: '#38A169', // Verde - relacionados con inventario
          },
          headerTintColor: '#fff',
        }}
      />

      {/* Inventario de herramientas */}
      <Drawer.Screen
        name="EquipmentStockScreen"
        options={{ 
          title: "Inventario de Herramientas",
          headerStyle: {
            backgroundColor: '#38A169', // Verde - sub-módulo de inventario
          },
          headerTintColor: '#fff',
        }}
      />

      {
      // ----------------------------------------------------------------------
      // PANTALLAS CON ACCESO POR ROL (Visibles condicionalmente)
      // ----------------------------------------------------------------------
      }

      {/* Horarios - solo para rol de ingeniería */}
      <Drawer.Screen
        name="HorariosScreen"
        options={{ 
          title: "Horarios",
          headerStyle: {
            backgroundColor: '#2D3748', // Gris oscuro
          },
          headerTintColor: '#fff',
          // Mostrar en drawer solo si tiene permiso de ingeniería
          drawerItemStyle: canIngenerioRole ? {} : { display: "none" }
        }}
      />

      {
      // ----------------------------------------------------------------------
      // PANTALLAS DE DETALLE (Ocultas en drawer - acceso por navegación profunda)
      // ----------------------------------------------------------------------
      }

      {/* Bitácora de notas */}
      <Drawer.Screen
        name="NoteScreen"
        options={{
          title: "Bitácora",
          headerShown: true,
          drawerItemStyle: { display: "none" }, // No aparece en drawer
          headerStyle: {
            backgroundColor: '#6B46C1', // Púrpura - módulo de notas
          },
          headerTintColor: '#fff',
        }}
      />

      {/* Calendario */}
      <Drawer.Screen
        name="CalendarScreen"
        options={{
          title: "Calendario",
          headerShown: true,
          drawerItemStyle: { display: "none" },
          headerStyle: {
            backgroundColor: '#D69E2E', // Ámbar - módulo de calendario
          },
          headerTintColor: '#fff',
        }}
      />

      {/* Etapas del proyecto (destino principal de notificaciones) */}
      <Drawer.Screen
        name="ProjectStepScreen"
        options={{
          title: "Etapas del Proyecto",
          headerShown: true,
          drawerItemStyle: { display: "none" },
          headerStyle: {
            backgroundColor: '#E53E3E', // Rojo - módulo de proyectos
          },
          headerTintColor: '#fff',
        }}
      />

      {/* Inventario específico de proyecto */}
      <Drawer.Screen
        name="ProjectStockScreen"
        options={{
          title: "Inventario del Proyecto",
          headerShown: true,
          drawerItemStyle: { display: "none" },
          headerStyle: {
            backgroundColor: '#38A169', // Verde - inventario de proyecto
          },
          headerTintColor: '#fff',
        }}
      />

      {/* Historial de herramientas */}
      <Drawer.Screen
        name="EquipmentHistoryScreen"
        options={{
          title: "Historial de Herramientas",
          headerShown: true,
          drawerItemStyle: { display: "none" },
          headerStyle: {
            backgroundColor: '#3182CE', // Azul - historial
          },
          headerTintColor: '#fff',
        }}
      />

      {/* Visor de imágenes */}
      <Drawer.Screen
        name="ImageViewerScreen"
        options={{
          title: "Visor de Imágenes",
          headerShown: false, // Header oculto para visor full-screen
          drawerItemStyle: { display: "none" },
        }}
      />

      { 
      // ----------------------------------------------------------------------
      // PANTALLAS ADMINISTRATIVAS (Acceso restringido por rol)
      // ----------------------------------------------------------------------
      }

      {/* Tarifas de mano de obra - solo para rol administrativo */}
      <Drawer.Screen 
        name="TarifasManoObraScreen" 
        options={{ 
          title: "Tarifas de Mano de Obra",
          headerStyle: {
            backgroundColor: '#03490dff', // Verde oscuro
          },
          headerTintColor: '#fff',
          // Mostrar solo si tiene permiso administrativo
          drawerItemStyle: canAdministrativosRole ? {} : { display: "none" }
        }} 
      />

      {/* Estadísticas administrativas - solo para rol de prórroga */}
      <Drawer.Screen
        name="AdminHistoryScreen"
        options={{ 
          title: "Estadísticas Admin",
          headerStyle: {
            backgroundColor: '#805AD5', // Violeta - módulo admin
          },
          headerTintColor: '#fff',
          // Mostrar solo si tiene permiso de prórroga
          drawerItemStyle: canProrrogaRole ? {} : { display: "none" }
        }}
      />
    </Drawer>
  );
}

// ----------------------------------------------------------------------------
// COMPONENTE: RootLayout
// Propósito: Componente raíz que envuelve toda la aplicación con el contexto
// ----------------------------------------------------------------------------

export default function RootLayout() {
  return (
    // Proveedor del contexto de usuario (estado global de autenticación)
    <UserProvider>
      {/* Componente principal de navegación */}
      <RootDrawer />
    </UserProvider>
  );
}

// ----------------------------------------------------------------------------
// ESTILOS
// ----------------------------------------------------------------------------

const styles = StyleSheet.create({
  // Footer del drawer (área inferior con información de usuario)
  footer: {
    borderTopWidth: 1, // Línea separadora
    borderColor: "#b3b3b3ff", // Gris claro
    padding: 16, // Espaciado interno
    backgroundColor: '#fff', // Fondo blanco
  },
  
  // Estilo para el email del usuario en el footer
  userEmail: {
    marginBottom: 12, // Espacio inferior
    fontWeight: "bold", // Texto en negrita
    color: "#333", // Color gris oscuro
    fontSize: 14, // Tamaño de fuente
    textAlign: 'center', // Centrado
  },
  
  // Estilo para la etiqueta de "Cerrar sesión"
  logoutLabel: {
    color: "red", // Color rojo para acción destructiva
    fontWeight: "bold", // Texto en negrita
  },
});

// ============================================================================
// FIN DEL ARCHIVO _layout.js
// ============================================================================