// app/_layout.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DrawerContentScrollView, DrawerItem, DrawerItemList } from "@react-navigation/drawer";
import { CommonActions } from "@react-navigation/native";
import { Drawer } from "expo-router/drawer";
import { signOut } from "firebase/auth";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { UserProvider, useUser } from "../context/UserContext";
import { auth } from "../firebase/firebaseConfig";
import { usePermissions } from "../hooks/usePermissions"; // ← Importar usePermissions

function CustomDrawerContent(props) {
  const { user } = useUser();

  const handleLogout = async () => {
    await signOut(auth);
    await AsyncStorage.removeItem("userData");
    await AsyncStorage.removeItem("hasSeenWelcome");

    props.navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "WelcomeScreen" }],
      })
    );
  };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <DrawerItemList {...props} />
      </View>

      <View style={styles.footer}>
        {user && <Text style={styles.userEmail}>{user.email}</Text>}
        {user && (
          <DrawerItem
            label="Cerrar sesión"
            labelStyle={styles.logoutLabel}
            onPress={handleLogout}
          />
        )}
      </View>
    </DrawerContentScrollView>
  );
}

function RootDrawer() {
  const { user, loading } = useUser();
  const { canProrrogaRole } = usePermissions(); // ← Obtener permisos aquí

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#5A67D8" />
      </View>
    );
  }

  return (
    <Drawer
      backBehavior="history"
      initialRouteName={user ? "HomeScreen" : "WelcomeScreen"}
      screenOptions={{ headerShown: true }}
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
        name="index"
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
        name="ImageViewerScreen"
        options={{
          title: "Visor de Imágenes",
          headerShown: false,
          drawerItemStyle: { display: "none" },
        }}
      />

      <Drawer.Screen name="HomeScreen" 
      options={{ title: "Inicio" }} />

      <Drawer.Screen name="PersonalScreen" 
      options={{ title: "Personal" }} />

      <Drawer.Screen name="PersonalHistoryScreen" 
      options={{ title: "Historial de Personal" }} />

      {/* === Inventario === */}
      <Drawer.Screen
        name="GeneralStockScreen"
        options={{ title: "Inventario General" }}
      />

      <Drawer.Screen
        name="InventoryHistoryScreen"
        options={{ title: "Historial de Inventario" }}
      />

      <Drawer.Screen
        name="EquipmentStockScreen"
        options={{ title: "Inventario de Herramientas" }}
      />
      <Drawer.Screen
        name="NoteScreen"
        options={{
          title: "Notas",
          drawerItemStyle: { display: "none" },
        }}
      />
      <Drawer.Screen
        name="CalendarScreen"
        options={{
          title: "Calendario",
          drawerItemStyle: { display: "none" },
        }}
      />
      <Drawer.Screen
        name="ProjectStepScreen"
        options={{
          title: "Proyectos",
          drawerItemStyle: { display: "none" },
        }}
      />

      <Drawer.Screen
        name="ProjectStockScreen"
        options={{
          title: "Inventario del Proyecto",
          drawerItemStyle: { display: "none" },
        }}
      />

      <Drawer.Screen
        name="EquipmentHistoryScreen"
        options={{
          title: "Historial de Herramientas",
          drawerItemStyle: { display: "none" },
        }}
      />

      {/* NUEVA PANTALLA - SOLO PARA ADMINISTRADORES */}
      <Drawer.Screen
        name="AdminHistoryScreen"
        options={{ 
          title: "Historial Admin",
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
  },
  userEmail: {
    marginBottom: 8,
    fontWeight: "bold",
    color: "#333",
  },
  logoutLabel: {
    color: "red",
    fontWeight: "bold",
  },
});