// app/_layout.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DrawerContentScrollView, DrawerItem, DrawerItemList } from "@react-navigation/drawer";
import { CommonActions } from "@react-navigation/native";
import { Drawer } from "expo-router/drawer";
import { signOut } from "firebase/auth";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { UserProvider, useUser } from "../context/UserContext";
import { auth } from "../firebase/firebaseConfig";
import { usePermissions } from "../hooks/usePermissions";
import { configureNotifications, programProjectNotificationsFromCache } from "../notifications";

// Importar Notifications para el manejo de clicks
import * as Notifications from 'expo-notifications';
import { useRouter, useSegments } from 'expo-router';

function CustomDrawerContent(props) {
  const { user } = useUser();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      await AsyncStorage.multiRemove(["userData", "hasSeenWelcome"]);
      
      props.navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "WelcomeScreen" }],
        })
      );
    } catch (error) {
      console.error('Error durante logout:', error);
    }
  };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <DrawerItemList {...props} />
      </View>

      <View style={styles.footer}>
        {user && (
          <>
            <Text style={styles.userEmail}>{user.email}</Text>
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

function RootDrawer() {
  const router = useRouter();
  const segments = useSegments();
  const { user, loading } = useUser();
  const { canProrrogaRole, canAdministrativosRole, canIngenerioRole } = usePermissions();

  // Manejar clicks en notificaciones
  useEffect(() => {
    let isMounted = true;

    const notificationListener = Notifications.addNotificationResponseReceivedListener((response) => {
      if (!isMounted) return;
      
      console.log('🔔 Notificación clickeada:', response.notification);
      
      const { data } = response.notification.request.content;
      console.log('📱 Datos de la notificación:', data);

      if (data && data.projectId) {
        handleNotificationNavigation(data);
      }
    });

    const receivedListener = Notifications.addNotificationReceivedListener((notification) => {
      console.log('📨 Notificación recibida:', notification);
    });

    const handleNotificationNavigation = (notificationData) => {
      const { projectId, screen = 'ProjectStepScreen', taskId } = notificationData;
      
      if (!projectId) {
        console.log('❌ No hay projectId en la notificación');
        return;
      }

      const getProjectTitle = async () => {
        try {
          const cached = await AsyncStorage.getItem('@projects_cache');
          if (cached) {
            const projects = JSON.parse(cached);
            return projects[projectId]?.title || 'Proyecto';
          }
        } catch (error) {
          console.error('Error obteniendo título del proyecto:', error);
        }
        return 'Proyecto';
      };

      const navigateToProject = async () => {
        const projectTitle = await getProjectTitle();
        
        console.log(`🚀 Navegando a ${screen} - ${projectId}: ${projectTitle}`);
        
        if (segments[0] === '(auth)' || segments.length === 0) {
          router.replace({
            pathname: `/${screen}`,
            params: { 
              id: projectId,
              title: projectTitle,
              focusedTask: taskId || ''
            }
          });
        } else {
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

      navigateToProject();
    };

    return () => {
      isMounted = false;
      notificationListener.remove();
      receivedListener.remove();
    };
  }, [router, segments, user]);

  // Inicialización de notificaciones cuando el usuario se autentica
  useEffect(() => {
    if (user && !loading) {
      console.log('👤 Usuario autenticado, inicializando notificaciones...');
      
      const initializeNotifications = async () => {
        try {
          await configureNotifications();
          await programProjectNotificationsFromCache({ daysAhead: 7 });
          console.log('✅ Notificaciones inicializadas correctamente en _layout');
        } catch (error) {
          console.error('❌ Error inicializando notificaciones en _layout:', error);
        }
      };

      initializeNotifications();

      const refreshInterval = setInterval(() => {
        console.log('🔄 Verificación periódica de notificaciones');
        programProjectNotificationsFromCache({ daysAhead: 7 });
      }, 12 * 60 * 60 * 1000);

      return () => {
        console.log('🧹 Limpiando intervalo de notificaciones');
        clearInterval(refreshInterval);
      };
    }
  }, [user, loading]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#5A67D8" />
        <Text style={{ marginTop: 10, color: '#5A67D8' }}>Cargando...</Text>
      </View>
    );
  }

  return (
    <Drawer
      backBehavior="history"
      initialRouteName={user ? "HomeScreen" : "WelcomeScreen"}
      screenOptions={{ 
        headerShown: true,
        headerStyle: {
          backgroundColor: '#FF4500',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        drawerStyle: {
          backgroundColor: '#f8f9fa',
        }
      }}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen
        name="WelcomeScreen"
        options={{
          title: "Inicio",
          headerShown: false,
          drawerItemStyle: { display: "none" },
        }}
      />

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

      <Drawer.Screen
        name="LoginScreen"
        options={{
          title: "Iniciar sesión",
          headerShown: false,
          drawerItemStyle: { display: "none" },
        }}
      />

      <Drawer.Screen 
        name="HomeScreen" 
        options={{ 
          title: "Inicio",
          headerStyle: {
            backgroundColor: '#FF4500',
          },
          headerTintColor: '#fff',
        }} 
      />

      <Drawer.Screen 
        name="PersonalScreen" 
        options={{ 
          title: "Personal",
          headerStyle: {
            backgroundColor: '#3182CE',
          },
          headerTintColor: '#fff',
        }} 
      />

      <Drawer.Screen 
        name="PersonalHistoryScreen" 
        options={{ 
          title: "Historial de Personal",
          headerStyle: {
            backgroundColor: '#3182CE',
          },
          headerTintColor: '#fff',
        }} 
      />

      <Drawer.Screen
        name="GeneralStockScreen"
        options={{ 
          title: "Inventario General",
          headerStyle: {
            backgroundColor: '#38A169',
          },
          headerTintColor: '#fff',
        }}
      />

      <Drawer.Screen
        name="InventoryHistoryScreen"
        options={{ 
          title: "Historial de Inventario",
          headerStyle: {
            backgroundColor: '#38A169',
          },
          headerTintColor: '#fff',
        }}
      />

      <Drawer.Screen
        name="CompletedProjectsScreen"
        options={{ 
          title: "Proyectos Completados",
          headerStyle: {
            backgroundColor: '#38A169',
          },
          headerTintColor: '#fff',
        }}
      />

      <Drawer.Screen
        name="EquipmentStockScreen"
        options={{ 
          title: "Inventario de Herramientas",
          headerStyle: {
            backgroundColor: '#38A169',
          },
          headerTintColor: '#fff',
        }}
      />

      <Drawer.Screen
  name="HorariosScreen"
  options={{ 
    title: "Horarios",
    headerStyle: {
      backgroundColor: '#2D3748',
    },
    headerTintColor: '#fff',
    drawerItemStyle: canIngenerioRole ? {} : { display: "none" }
  }}
/>


      <Drawer.Screen
        name="NoteScreen"
        options={{
          title: "Bitácora",
          headerShown: true,
          drawerItemStyle: { display: "none" },
          headerStyle: {
            backgroundColor: '#6B46C1',
          },
          headerTintColor: '#fff',
        }}
      />

      <Drawer.Screen
        name="CalendarScreen"
        options={{
          title: "Calendario",
          headerShown: true,
          drawerItemStyle: { display: "none" },
          headerStyle: {
            backgroundColor: '#D69E2E',
          },
          headerTintColor: '#fff',
        }}
      />

      <Drawer.Screen
        name="ProjectStepScreen"
        options={{
          title: "Etapas del Proyecto",
          headerShown: true,
          drawerItemStyle: { display: "none" },
          headerStyle: {
            backgroundColor: '#E53E3E',
          },
          headerTintColor: '#fff',
        }}
      />

      <Drawer.Screen
        name="ProjectStockScreen"
        options={{
          title: "Inventario del Proyecto",
          headerShown: true,
          drawerItemStyle: { display: "none" },
          headerStyle: {
            backgroundColor: '#38A169',
          },
          headerTintColor: '#fff',
        }}
      />

      <Drawer.Screen
        name="EquipmentHistoryScreen"
        options={{
          title: "Historial de Herramientas",
          headerShown: true,
          drawerItemStyle: { display: "none" },
          headerStyle: {
            backgroundColor: '#3182CE',
          },
          headerTintColor: '#fff',
        }}
      />


      <Drawer.Screen
        name="ImageViewerScreen"
        options={{
          title: "Visor de Imágenes",
          headerShown: false,
          drawerItemStyle: { display: "none" },
        }}
      />

      <Drawer.Screen 
        name="TarifasManoObraScreen" 
        options={{ 
          title: "Tarifas de Mano de Obra",
          headerStyle: {
            backgroundColor: '#03490dff',
          },
          headerTintColor: '#fff',
          drawerItemStyle: canAdministrativosRole ? {} : { display: "none" }
        }} 
      />

      <Drawer.Screen
        name="AdminHistoryScreen"
        options={{ 
          title: "Estadísticas Admin",
          headerStyle: {
            backgroundColor: '#805AD5',
          },
          headerTintColor: '#fff',
          drawerItemStyle: canProrrogaRole ? {} : { display: "none" }
        }}
      />
    </Drawer>
  );
}

export default function RootLayout() {
  return (
    <UserProvider>
      <RootDrawer />
    </UserProvider>
  );
}

const styles = StyleSheet.create({
  footer: {
    borderTopWidth: 1,
    borderColor: "#b3b3b3ff",
    padding: 16,
    backgroundColor: '#fff',
  },
  userEmail: {
    marginBottom: 12,
    fontWeight: "bold",
    color: "#333",
    fontSize: 14,
    textAlign: 'center',
  },
  logoutLabel: {
    color: "red",
    fontWeight: "bold",
  },
});