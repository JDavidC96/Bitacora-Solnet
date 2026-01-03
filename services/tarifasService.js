// services/tarifasService.js
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

const ROLES_COLLECTION = "tarifas_mano_obra";
const USERS_COLLECTION = "tarifas_mano_obra_usuarios";

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const tarifasService = {
  /* ======================================================
   * TARIFAS POR ROL (compatibilidad / fallback)
   * ====================================================== */

  /**
   * Devuelve: [{ rol, tarifaHora }]
   */
  async getAll() {
    const snap = await getDocs(collection(db, ROLES_COLLECTION));
    return snap.docs.map((d) => {
      const data = d.data() || {};
      return {
        rol: d.id,
        tarifaHora: toNumber(data.tarifaHora ?? data.tarifa ?? 0),
      };
    });
  },

  /**
   * Obtiene tarifa por rol (docId = rol)
   */
  async getTarifaByRol(rol) {
    if (!rol) return 0;
    const ref = doc(db, ROLES_COLLECTION, String(rol));
    const snap = await getDoc(ref);
    if (!snap.exists()) return 0;

    const data = snap.data() || {};
    return toNumber(data.tarifaHora ?? data.tarifa ?? 0);
  },

  /**
   * Mapa { rol -> tarifaHora }
   */
  async getTarifasMap() {
    const snap = await getDocs(collection(db, ROLES_COLLECTION));
    const map = new Map();
    snap.forEach((d) => {
      const data = d.data() || {};
      map.set(d.id, toNumber(data.tarifaHora ?? data.tarifa ?? 0));
    });
    return map;
  },

  /**
   * Crea/actualiza tarifa por rol (docId = rol)
   */
  async upsertTarifa(rol, tarifaHora) {
    const cleanRol = String(rol || "").trim();
    if (!cleanRol) throw new Error("Rol inválido");

    const valor = toNumber(tarifaHora);

    await setDoc(
      doc(db, ROLES_COLLECTION, cleanRol),
      {
        rol: cleanRol,
        tarifaHora: valor,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return { rol: cleanRol, tarifaHora: valor };
  },

  async deleteTarifa(rol) {
    if (!rol) return;
    await deleteDoc(doc(db, ROLES_COLLECTION, String(rol)));
    return { ok: true };
  },

  /* ======================================================
   * TARIFAS POR USUARIO (personalId) - NUEVO
   * ====================================================== */

  /**
   * Devuelve: [{ personalId, nombre, rol, tarifaHora }]
   */
  async getAllUserTarifas() {
    const snap = await getDocs(collection(db, USERS_COLLECTION));
    return snap.docs.map((d) => {
      const data = d.data() || {};
      return {
        personalId: d.id,
        nombre: data.nombre || "",
        rol: data.rol || "",
        tarifaHora: toNumber(data.tarifaHora ?? data.tarifa ?? 0),
      };
    });
  },

  /**
   * Obtiene tarifa por personalId (docId = personalId)
   */
  async getTarifaByUser(personalId) {
    if (!personalId) return 0;
    const ref = doc(db, USERS_COLLECTION, String(personalId));
    const snap = await getDoc(ref);
    if (!snap.exists()) return 0;

    const data = snap.data() || {};
    return toNumber(data.tarifaHora ?? data.tarifa ?? 0);
  },

  /**
   * Mapa { personalId -> tarifaHora }
   */
  async getUserTarifasMap() {
    const snap = await getDocs(collection(db, USERS_COLLECTION));
    const map = new Map();
    snap.forEach((d) => {
      const data = d.data() || {};
      map.set(d.id, toNumber(data.tarifaHora ?? data.tarifa ?? 0));
    });
    return map;
  },

  /**
   * Crea/actualiza tarifa por personalId (docId = personalId)
   */
  async upsertTarifaUser(personalId, payload) {
    const id = String(personalId || "").trim();
    if (!id) throw new Error("personalId inválido");

    const tarifaHora = toNumber(payload?.tarifaHora ?? payload?.tarifa ?? 0);

    await setDoc(
      doc(db, USERS_COLLECTION, id),
      {
        personalId: id,
        nombre: payload?.nombre || "",
        rol: payload?.rol || "",
        tarifaHora,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return { personalId: id, tarifaHora };
  },

  async deleteTarifaUser(personalId) {
    if (!personalId) return;
    await deleteDoc(doc(db, USERS_COLLECTION, String(personalId)));
    return { ok: true };
  },
};

export default tarifasService;
