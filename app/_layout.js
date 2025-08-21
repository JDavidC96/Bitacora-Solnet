import AsyncStorage from "@react-native-async-storage/async-storage";
import { DrawerContentScrollView, DrawerItem, DrawerItemList, } from "@react-navigation/drawer";
import { usePathname } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { signOut } from "firebase/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import { StyleSheet, Text, View } from "react-native";
import { auth } from "../firebase/firebaseConfig";

function CustomDrawerContent(props) {
  const [user] = useAuthState(auth);

  const handleLogout = async () => {
    await signOut(auth);
    await AsyncStorage.removeItem("hasSeenWelcome");
    props.navigation.navigate("WelcomeScreen");
  };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <DrawerItemList {...props} />
      </View>

      <View style={styles.footer}>
        {user && <Text style={styles.userEmail}>{user.email}</Text>}
        <DrawerItem
          label="Cerrar sesión"
          labelStyle={styles.logoutLabel}
          onPress={handleLogout}
        />
      </View>
    </DrawerContentScrollView>
  );
}

export default function RootLayout() {
  const pathname = usePathname();
  const isHome = pathname === "/HomeScreen";
  const isPersonal = pathname === "/PersonalScreen";

  return (
    <Drawer
      screenOptions={{ headerShown: true }}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      {/* Ocultas siempre */}
      <Drawer.Screen
        name="WelcomeScreen"
        options={{
          title: "Inicio",
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

      {/* Home */}
      <Drawer.Screen
        name="HomeScreen"
        options={{
          title: "Inicio",
          drawerItemStyle: isPersonal ? {} : isHome ? { display: "none" } : {},
        }}
      />

      {/* Personal */}
      <Drawer.Screen
        name="PersonalScreen"
        options={{
          title: "Personal",
          drawerItemStyle: isHome ? {} : isPersonal ? { display: "none" } : {},
        }}
      />

      {/* Siempre montadas pero ocultas según contexto */}
      <Drawer.Screen
        name="NoteScreen"
        options={{
          title: "Notas",
          drawerItemStyle: isHome || isPersonal ? { display: "none" } : {},
        }}
      />
      <Drawer.Screen
        name="CalendarScreen"
        options={{
          title: "Calendario",
          drawerItemStyle: isHome || isPersonal ? { display: "none" } : {},
        }}
      />
      <Drawer.Screen
        name="ProjectStepScreen"
        options={{
          title: "Proyectos",
          drawerItemStyle: isHome || isPersonal ? { display: "none" } : {},
        }}
      />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  footer: {
    borderTopWidth: 1,
    borderColor: "#ccc",
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
