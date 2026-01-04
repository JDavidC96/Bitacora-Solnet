// services/authService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';

export const authService = {
  /**
   * Registrar último login en usuarios_permitidos
   */
  registerLastLogin: async (user, role) => {
  try {
    await updateDoc(doc(db, 'usuarios_permitidos', user.uid), {
      ultimoLogin: serverTimestamp(),
      lastActivity: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error registrando último login:', error);
  }
},


  /**
   * Obtener rol del usuario desde Firestore
   */
  getUserRole: async (uid) => {
    try {
      if (!uid) return null;
      
      const ref = doc(db, 'usuarios_permitidos', uid);
      const snap = await getDoc(ref);
      
      if (!snap.exists()) return null;
      
      const data = snap.data();
      return typeof data?.rol === 'string' ? data.rol : null;
    } catch (error) {
      console.error('Error obteniendo rol:', error);
      return null;
    }
  },

  /**
   * Login con email y contraseña
   */
  loginWithEmail: async (email, password) => {
    try {
      // Autenticar con Firebase
      const cred = await signInWithEmailAndPassword(auth, email, password);

      // Obtener rol del usuario
      const role = await authService.getUserRole(cred.user.uid);
      if (!role) {
        await signOut(auth);
        throw new Error('Este usuario no está autorizado.');
      }

      // Registrar el último login
      await authService.registerLastLogin(cred.user, role);

      // Guardar credenciales localmente
      await authService.saveCredentials(email, password, role);

      return {
        user: cred.user,
        role: role
      };
    } catch (error) {
      console.error('Error en login:', error);
      
      // Manejar errores específicos de Firebase
      if (error.code === 'auth/invalid-email') {
        throw new Error('El formato del correo es inválido.');
      } else if (error.code === 'auth/user-not-found') {
        throw new Error('No existe una cuenta con este correo.');
      } else if (error.code === 'auth/wrong-password') {
        throw new Error('Contraseña incorrecta.');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Demasiados intentos fallidos. Intenta más tarde.');
      } else {
        throw new Error('Error al iniciar sesión. Verifica tu conexión.');
      }
    }
  },

  /**
   * Guardar credenciales localmente
   */
  saveCredentials: async (email, password, role) => {
    try {
      await AsyncStorage.setItem("userData", JSON.stringify({
        email,
        password,
        role,
        savedAt: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error guardando credenciales:', error);
    }
  },

  /**
   * Obtener credenciales guardadas
   */
  getSavedCredentials: async () => {
    try {
      const saved = await AsyncStorage.getItem("userData");
      if (saved) {
        return JSON.parse(saved);
      }
      return null;
    } catch (error) {
      console.error('Error obteniendo credenciales:', error);
      return null;
    }
  },

  /**
   * Eliminar credenciales guardadas
   */
  clearCredentials: async () => {
    try {
      await AsyncStorage.multiRemove(["userData", "hasSeenWelcome"]);
    } catch (error) {
      console.error('Error limpiando credenciales:', error);
    }
  },

  /**
   * Cerrar sesión
   */
  logout: async () => {
    try {
      await signOut(auth);
      await authService.clearCredentials();
      return { success: true };
    } catch (error) {
      console.error('Error cerrando sesión:', error);
      throw new Error('No se pudo cerrar sesión');
    }
  }
};

export default authService;