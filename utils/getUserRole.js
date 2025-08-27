import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

/**
 * Obtiene el rol del usuario desde la colección usuarios_permitidos/{uid}
 * @param {string} uid - UID del usuario autenticado
 * @returns {Promise<string|null>} - Rol del usuario o null si no existe
 */
export async function getUserRole(uid) {
  if (!uid) return null;

  try {
    const ref = doc(db, "usuarios_permitidos", uid);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const data = snap.data();
      return typeof data?.rol === "string" ? data.rol : null;
    } else {
      console.warn("⚠️ No se encontró rol para este usuario:", uid);
      return null;
    }
  } catch (error) {
    console.error("❌ Error obteniendo rol:", error);
    return null;
  }
}
