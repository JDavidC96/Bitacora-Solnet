// services/horasLaboralesService.js
import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";

import { db } from "../firebase/firebaseConfig";

export const horasLaboralesService = {
  /**************************************************************
   * Registrar jornada en horas_personal
   **************************************************************/
  async registrarJornada(data) {
    const payload = {
      personalId: data.personalId,
      nombre: data.nombre,
      rol: data.cargo || "Tecnico",

      fechaInicio: data.fechaInicio,
      fechaFin: data.fechaFin,

      horasNormales: data.horasNormales || 0,
      horasExtras: data.horasExtras || 0,
      totalHoras: data.totalHoras || 0,

      destino: data.destino || "",
      tipoAsignacion: data.tipoAsignacion || "",
      proyectoId: data.proyectoId || null,

      createdAt: new Date().toISOString(),
      source: data.source || "manual",
    };

    await addDoc(collection(db, "horas_personal"), payload);
    return payload;
  },

  /**************************************************************
   * Obtener todas las jornadas
   **************************************************************/
  async getRegistros() {
    const q = query(
      collection(db, "horas_personal"),
      orderBy("fechaInicio", "desc")
    );

    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  /**************************************************************
   * Obtener jornadas por persona
   **************************************************************/
  async getRegistrosPorPersona(personalId) {
    const q = query(
      collection(db, "horas_personal"),
      where("personalId", "==", personalId),
      orderBy("fechaInicio", "desc")
    );

    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  /**************************************************************
   * Agrupar para reportes
   **************************************************************/
  agruparPorPersona(registros) {
    const map = new Map();

    registros.forEach((r) => {
      const key = r.nombre || r.personalId;
      if (!map.has(key)) {
        map.set(key, {
          nombre: key,
          horasNormales: 0,
          horasExtras: 0,
          totalHoras: 0,
        });
      }

      const item = map.get(key);
      item.horasNormales += r.horasNormales || 0;
      item.horasExtras += r.horasExtras || 0;
      item.totalHoras += r.totalHoras || 0;
    });

    return Array.from(map.values());
  },
};

export default horasLaboralesService;
