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
 * Estructura en Firestore:
 * collection: "config"
 * doc:        "noVinculantes"
 *
 * {
 *   A: 6155745.12,          // Constante precio
 *   B: 0.12,                // Exponente precio
 *   factorEmision: 0.493,   // kgCO2/kWh
 *   factorPerdidas: 0.03,   // 3% pérdidas sistema
 *   valorExportacion: 200,  // COP/kWh excedentes (C38)
 *   valorComercializacion: 50, // COP/kWh comercialización OR (C39)
 *   updatedAt, updatedBy
 * }
 */
const COLLECTION = "config";
const DOC_ID = "noVinculantes";

const DEFAULTS = {
  A: 6155745.12,
  B: 0.12,
  factorEmision: 0.493,
  factorPerdidas: 0.03,
  valorExportacion: 200,       // COP/kWh — tarifa excedentes CREG 174 (C38)
  valorComercializacion: 50,   // COP/kWh — tarifa comercialización OR (C39)
};

function sanitizeNumber(n, fallback) {
  const v = Number(n);
  return Number.isFinite(v) ? v : fallback;
}

async function ensureDocExists() {
  const ref = doc(db, COLLECTION, DOC_ID);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { ...DEFAULTS, createdAt: serverTimestamp() });
  }
  return ref;
}

export async function getNoVinculantesConstants() {
  const ref = await ensureDocExists();
  const snap = await getDoc(ref);
  const data = snap.data() || {};
  return {
    A:                    sanitizeNumber(data.A,                    DEFAULTS.A),
    B:                    sanitizeNumber(data.B,                    DEFAULTS.B),
    factorEmision:        sanitizeNumber(data.factorEmision,        DEFAULTS.factorEmision),
    factorPerdidas:       sanitizeNumber(data.factorPerdidas,       DEFAULTS.factorPerdidas),
    valorExportacion:     sanitizeNumber(data.valorExportacion,     DEFAULTS.valorExportacion),
    valorComercializacion:sanitizeNumber(data.valorComercializacion,DEFAULTS.valorComercializacion),
  };
}

export async function updateNoVinculantesConstants({
  A, B, factorEmision, factorPerdidas,
  valorExportacion, valorComercializacion,
  userId,
}) {
  const ref = await ensureDocExists();
  const payload = {
    A:                    sanitizeNumber(A,                    DEFAULTS.A),
    B:                    sanitizeNumber(B,                    DEFAULTS.B),
    factorEmision:        sanitizeNumber(factorEmision,        DEFAULTS.factorEmision),
    factorPerdidas:       sanitizeNumber(factorPerdidas,       DEFAULTS.factorPerdidas),
    valorExportacion:     sanitizeNumber(valorExportacion,     DEFAULTS.valorExportacion),
    valorComercializacion:sanitizeNumber(valorComercializacion,DEFAULTS.valorComercializacion),
    updatedAt: serverTimestamp(),
    updatedBy: userId || null,
  };
  await updateDoc(ref, payload);
  return {
    A:                    payload.A,
    B:                    payload.B,
    factorEmision:        payload.factorEmision,
    factorPerdidas:       payload.factorPerdidas,
    valorExportacion:     payload.valorExportacion,
    valorComercializacion:payload.valorComercializacion,
  };
}

// ─── Contador de propuestas ───────────────────────────────────────────────────
// collection: "contadores" / doc: "noVinculantes"
// { ultimo: 710, updatedAt }

const CONTADOR_DOC = "noVinculantes";
const CONTADOR_COL = "contadores";

/**
 * Obtiene y auto-incrementa el número de propuesta.
 * Devuelve el número formateado como "001", "002", etc.
 * @returns {Promise<string>} Número formateado "NNN"
 */
export async function getNextNumeroProyecto() {
  const ref = doc(db, CONTADOR_COL, CONTADOR_DOC);
  const snap = await getDoc(ref);

  let siguiente = 1;
  if (snap.exists()) {
    siguiente = (snap.data().ultimo || 0) + 1;
  }

  await setDoc(ref, { ultimo: siguiente, updatedAt: serverTimestamp() });
  return String(siguiente).padStart(3, "0");
}