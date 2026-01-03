// firebase/firebaseConfig.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: "AIzaSyB5Re2R1Va12BfjzvxyK7fBdChBUB0UHoY",
  authDomain: "bitacorassolnet.firebaseapp.com",
  projectId: "bitacorassolnet",
  storageBucket: "bitacorassolnet.firebasestorage.app",
  messagingSenderId: "851831454488",
  appId: "1:851831454488:web:b6f409e173e519f390fc6d",
  measurementId: "G-5Z1KW7XFVH"
};

const app = initializeApp(firebaseConfig);

// Detecta si estamos en web o en móvil
let auth;
if (Platform.OS === 'web') {
  // En web ya usa localStorage automáticamente
  auth = getAuth(app);
} else {
  // En React Native usamos AsyncStorage
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}

const db = getFirestore(app);

export { auth, db };

