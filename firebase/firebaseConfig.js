// firebase/firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

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
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };

