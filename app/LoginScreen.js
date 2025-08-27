import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, StyleSheet, Text, TextInput, TouchableOpacity, View, } from 'react-native';

// Firebase
import { GoogleAuthProvider, signInWithCredential, signInWithEmailAndPassword, signOut, } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';

// Google Sign-In
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

// Iconos
import { Ionicons } from '@expo/vector-icons';

// Contexto de usuario (para guardar el rol)
import { useUser } from '../context/UserContext';

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');
const REDIRECT_URI = 'https://auth.expo.io/@davidc1296/bitacora-app';

// Estrellas animadas
function StarField() {
  const stars = Array.from({ length: 40 }).map((_, i) => ({
    id: i,
    left: Math.random() * width,
    top: Math.random() * height * 0.6,
    size: Math.random() * 2 + 1,
    opacity: new Animated.Value(0.3 + Math.random() * 0.7),
  }));

  stars.forEach((star) => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(star.opacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(star.opacity, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  });

  return stars.map((star) => (
    <Animated.View
      key={star.id}
      style={{
        position: 'absolute',
        left: star.left,
        top: star.top,
        width: star.size,
        height: star.size,
        borderRadius: star.size / 2,
        backgroundColor: 'white',
        opacity: star.opacity,
      }}
    />
  ));
}

/**
 * 🔎 Obtiene el rol del usuario autenticado leyendo
 *    /usuarios_permitidos/{uid}. Devuelve el string del rol o null.
 *    (Las reglas de Firestore permiten esta lectura solo al propio usuario).
 */
async function fetchUserRole(uid) {
  try {
    if (!uid) return null;
    const ref = doc(db, 'usuarios_permitidos', uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data();
    return typeof data?.rol === 'string' ? data.rol : null;
  } catch (error) {
    console.error('❌ Error obteniendo rol del usuario:', error);
    return null;
  }
}

export default function LoginScreen() {
  const router = useRouter();
  const { setUser, setRole } = useUser?.() ?? {}; 

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transition] = useState(new Animated.Value(0));

  // Google Auth Request
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId:
      '851831454488-3pk92d9gpjbddfci41q050fe2oi8f6r8.apps.googleusercontent.com',
    androidClientId:
      '851831454488-ntdbqvqsnp7h3g3jm27p9tn2sts6ser1.apps.googleusercontent.com',
    webClientId:
      '851831454488-civogi30bdo554mrp0i3nkfdf01rmpoc.apps.googleusercontent.com',
    redirectUri: REDIRECT_URI,
  });

  // Animación de transición
  const goToHome = () => {
    Animated.timing(transition, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: false,
    }).start(() => {
      router.push({ pathname: 'HomeScreen' });
    });
  };

  // ⏩ Login con correo y contraseña
  const loginWithEmail = async () => {
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        password
      );

      // lee rol después de autenticado
      const role = await fetchUserRole(cred.user.uid);
      if (!role) {
        Alert.alert('Acceso denegado', 'Este usuario no está autorizado.');
        await signOut(auth);
        setLoading(false);
        return;
      }

      // Guardar rol en el contexto
      if (typeof setUser === 'function') {
        console.log("👉 UID:", cred.user.uid, "Rol leído:", role);
        setUser({ uid: cred.user.uid, email: cred.user.email ?? '', role });
      } else if (typeof setRole === 'function') {
        setRole(role);
      }

      setLoading(false);
      goToHome();
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      Alert.alert('Error', 'Correo o contraseña incorrectos.');
      setLoading(false);
    }
  };

  // ⏩ Login con Google
  useEffect(() => {
    const handleGoogleSignIn = async () => {
      if (response?.type === 'success') {
        setLoading(true);
        const { id_token } = response.params;
        const credential = GoogleAuthProvider.credential(id_token);

        try {
          const result = await signInWithCredential(auth, credential);

          // 🚩 Leer rol del usuario
          const role = await fetchUserRole(result.user.uid);
          if (!role) {
            Alert.alert(
              'Acceso denegado',
              'Tu cuenta de Google no está autorizada.'
            );
            await signOut(auth);
            setLoading(false);
            return;
          }

          // Guardar rol en el contexto
          if (typeof setUser === 'function') {
            setUser({
              uid: result.user.uid,
              email: result.user.email ?? '',
              role,
            });
          } else if (typeof setRole === 'function') {
            setRole(role);
          }

          setLoading(false);
          goToHome();
        } catch (error) {
          console.error('Error al iniciar sesión con Google:', error);
          Alert.alert('Error', 'No se pudo iniciar sesión con Google.');
          setLoading(false);
        }
      }
    };
    handleGoogleSignIn();
  }, [response]);

  const bgColor = transition.interpolate({
    inputRange: [0, 1],
    outputRange: ['#1E1E2F', '#ffc782'],
  });

  return (
    <Animated.View style={[styles.container, { backgroundColor: bgColor }]}>
      <StarField />

      <Text style={styles.title}>Iniciar Sesión</Text>

      <TextInput
        placeholder="Correo electrónico"
        placeholderTextColor="#AAA"
        style={styles.input}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <View style={styles.passwordContainer}>
        <TextInput
          placeholder="Contraseña"
          placeholderTextColor="#AAA"
          style={styles.passwordInput}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <Ionicons
            name={showPassword ? 'eye-off' : 'eye'}
            size={24}
            color="#AAA"
          />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#5A67D8"
          style={{ marginVertical: 16 }}
        />
      ) : (
        <TouchableOpacity style={styles.button} onPress={loginWithEmail}>
          <Text style={styles.buttonText}>Entrar</Text>
        </TouchableOpacity>
      )}

      <Text style={{ color: '#AAA', marginVertical: 20 }}>— O —</Text>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#DB4437' }]}
        onPress={() => promptAsync()}
        disabled={!request || loading}
      >
        <Text style={styles.buttonText}>Iniciar sesión con Google</Text>
      </TouchableOpacity>
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
  title: {
    fontSize: 28,
    color: '#FFFFFF',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#2C2C3A',
    color: '#FFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C3A',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    width: '100%',
  },
  passwordInput: {
    flex: 1,
    color: '#FFF',
    paddingVertical: 12,
  },
  button: {
    backgroundColor: '#5A67D8',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
    width: '100%',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
