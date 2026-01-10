// services/noVinculantesService.js
import {
    doc,
    getDoc,
    serverTimestamp,
    setDoc,
    updateDoc,
} from "firebase/firestore";

import { db } from "../firebase/firebaseConfig";

/**
 * Estructura sugerida en Firestore:
 * collection: "config"
 * doc:        "noVinculantes"
 *
 * {
 *   A: 6155745.12,
 *   B: 0.12,
 *   updatedAt: <timestamp>,
 *   updatedBy: <uid>,
 * }
 */
const COLLECTION = "config";
const DOC_ID = "noVinculantes";

const DEFAULTS = {
  A: 6155745.12,
  B: 0.12,
};

function sanitizeNumber(n, fallback) {
  const v = Number(n);
  return Number.isFinite(v) ? v : fallback;
}

async function ensureDocExists() {
  const ref = doc(db, COLLECTION, DOC_ID);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      ...DEFAULTS,
      createdAt: serverTimestamp(),
    });
  }
  return ref;
}

export async function getNoVinculantesConstants() {
  const ref = await ensureDocExists();
  const snap = await getDoc(ref);
  const data = snap.data() || {};
  return {
    A: sanitizeNumber(data.A, DEFAULTS.A),
    B: sanitizeNumber(data.B, DEFAULTS.B),
  };
}

export async function updateNoVinculantesConstants({ A, B, userId }) {
  const ref = await ensureDocExists();

  const payload = {
    A: sanitizeNumber(A, DEFAULTS.A),
    B: sanitizeNumber(B, DEFAULTS.B),
    updatedAt: serverTimestamp(),
    updatedBy: userId || null,
  };

  await updateDoc(ref, payload);
  return { A: payload.A, B: payload.B };
}
