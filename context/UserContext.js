// context/UserContext.js
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase/firebaseConfig";

/* ======================================================
 * CONTEXTO
 * ====================================================== */
const UserContext = createContext(null);

/* ======================================================
 * HOOK
 * ====================================================== */
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser debe ser usado dentro de un UserProvider");
  }
  return context;
};

/* ======================================================
 * PROVIDER
 * ====================================================== */
export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          setUser(firebaseUser);

          const userRef = doc(db, "usuarios_permitidos", firebaseUser.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const data = userSnap.data();

            // Rol
            setRole(data.rol || null);

            // Registrar última actividad (NO último login)
            await updateDoc(userRef, {
              lastActivity: serverTimestamp(),
            });
          } else {
            // Usuario autenticado pero no permitido
            setRole(null);
          }
        } else {
          setUser(null);
          setRole(null);
        }
      } catch (error) {
        console.error("Error en UserContext:", error);
        setUser(null);
        setRole(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  /* ======================================================
   * VALOR DEL CONTEXTO
   * ====================================================== */
  const value = {
    user,
    role,
    loading,
    setUser,
    setRole,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};
