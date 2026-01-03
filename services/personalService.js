// services/personalService.js
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "../firebase/firebaseConfig";
import { calculateWorkHours } from "../utils/calculateWorkHours";
import { horasLaboralesService } from "./horasLaboralesService";
import realExpensesService from "./realExpensesService";
import tarifasService from "./tarifasService";

export const personalService = {
  /**************************************************************
   * 1) Obtener todo el personal
   **************************************************************/
  async getAll() {
    const snap = await getDocs(collection(db, "personal"));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  listenAll(callback) {
  const ref = collection(db, "personal");
  return onSnapshot(ref, (snap) => {
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(data);
  });
},

  /**************************************************************
   * 2) Crear persona
   **************************************************************/
  async create(data) {
    const payload = {
      nombre: data.nombre,
      documento: data.documento || "",
      telefono: data.telefono || "",
      rol: data.cargo || "Tecnico",

      estado: "libre",
      proyectoAsignado: "",
      proyectoId: null,
      tipoAsignacion: "",
      asignadoEn: null,

      createdAt: new Date().toISOString(),
    };

    await addDoc(collection(db, "personal"), payload);
    return { ok: true };
  },

  /**************************************************************
   * 3) Asignar a proyecto REAL
   *    project = { id, title }
   **************************************************************/
  async assignToProject(personId, project) {
  if (!project?.id) {
    throw new Error("Proyecto inválido (ID requerido)");
  }

  const ref = doc(db, "personal", personId);
  const snap = await getDoc(ref);

  if (!snap.exists()) throw new Error("Persona no encontrada");
  if (snap.data().estado === "ocupado")
    throw new Error("La persona ya está asignada");

  const now = new Date().toISOString();

  await updateDoc(ref, {
    estado: "ocupado",
    proyectoAsignado: project.title,
    proyectoId: project.id,
    tipoAsignacion: "proyecto",
    asignadoEn: now,
  });

  await addDoc(collection(db, "historial_personal"), {
    personalId: personId,
    nombre: snap.data().nombre,
    destino: project.title,
    tipoAsignacion: "proyecto",
    proyectoId: project.id,

    fechaInicio: now,
    fechaFin: null,
    estado: "en_curso",

    createdAt: now,
  });

  return { ok: true };
},

  /**************************************************************
   * 4) Asignar a destino especial (Bodega / RETIE / Manual)
   **************************************************************/
  async assignToDestination(personId, destino) {
  const ref = doc(db, "personal", personId);
  const snap = await getDoc(ref);

  if (!snap.exists()) throw new Error("Persona no encontrada");
  if (snap.data().estado === "ocupado")
    throw new Error("La persona ya está asignada");

  const now = new Date().toISOString();
  const destinoKey = destino.toLowerCase().replace(/\s+/g, "-");

  // 🔹 ACTUALIZAR PERSONAL
  await updateDoc(ref, {
    estado: "ocupado",
    proyectoAsignado: destino,
    proyectoId: null,
    tipoAsignacion: destinoKey,
    asignadoEn: now,
  });

  // 🔹 CREAR JORNADA (UN SOLO DOC)
  await addDoc(collection(db, "historial_personal"), {
    personalId: personId,
    nombre: snap.data().nombre,
    destino,
    tipoAsignacion: destinoKey,
    proyectoId: null,

    fechaInicio: now,
    fechaFin: null,
    estado: "en_curso",

    createdAt: now,
  });

  return { ok: true };
},


  /**************************************************************
   * 5) Liberar persona (CIERRA JORNADA)
   **************************************************************/
  async liberar(personId) {
  const ref = doc(db, "personal", personId);
  const snap = await getDoc(ref);

  if (!snap.exists()) throw new Error("Persona no encontrada");

  const data = snap.data();
  if (data.estado !== "ocupado" || !data.asignadoEn) {
    throw new Error("La persona ya está libre");
  }

  const fechaInicio = new Date(data.asignadoEn);
  const fechaFin = new Date();
  const nowISO = fechaFin.toISOString();

  /* ==============================
   * CÁLCULO DE HORAS
   * ============================== */
  const { normalHours, extraHours } = calculateWorkHours(
    fechaInicio.toISOString(),
    fechaFin.toISOString()
  );

  const horasNormales = normalHours;
  const horasExtras = extraHours;
  const totalHoras = horasNormales + horasExtras;

  /* ==============================
   * REGISTRO DE HORAS (SE MANTIENE)
   * ============================== */
  await horasLaboralesService.registrarJornada({
    personalId: personId,
    nombre: data.nombre,
    cargo: data.cargo || "Tecnico",

    fechaInicio: fechaInicio.toISOString(),
    fechaFin: fechaFin.toISOString(),

    horasNormales,
    horasExtras,
    totalHoras,

    destino: data.proyectoAsignado,
    tipoAsignacion: data.tipoAsignacion,
    proyectoId: data.proyectoId,

    createdAt: nowISO,
    source: "liberacion",
  });

  /* ==============================
   * HISTORIAL (ACTUALIZAR, NO CREAR)
   * ============================== */
  const q = query(
    collection(db, "historial_personal"),
    where("personalId", "==", personId),
    where("estado", "==", "en_curso"),
    limit(1)
  );

  const snapHist = await getDocs(q);

  if (snapHist.empty) {
    throw new Error("No se encontró jornada activa para cerrar");
  }

  await updateDoc(snapHist.docs[0].ref, {
    fechaFin: nowISO,
    estado: "finalizado",
  });

  /* ==============================
   * GASTO REAL (SE MANTIENE)
   * ============================== */
  if (data.proyectoId) {
    try {
      const tarifaHora = await tarifasService.getTarifaByRol(
        data.cargo || "Tecnico"
      );

      const costoNormal = horasNormales * tarifaHora;
      const costoExtra = horasExtras * tarifaHora * 1.25;
      const costoTotal = costoNormal + costoExtra;

      await realExpensesService.createManoObra({
        projectId: data.proyectoId,
        personalId: personId,
        nombre: data.nombre,
        rol: data.cargo || "Tecnico",

        horasNormales,
        horasExtras,

        tarifaHora,
        costoNormal,
        costoExtra,
        costoTotal,

        fechaInicio: fechaInicio.toISOString(),
        fechaFin: fechaFin.toISOString(),

        source: "horas_personal",
        createdAt: nowISO,
      });
    } catch (err) {
      console.error("Error creando gasto real:", err);
    }
  }

  /* ==============================
   * LIBERAR PERSONA
   * ============================== */
  await updateDoc(ref, {
    estado: "libre",
    proyectoAsignado: "",
    proyectoId: null,
    tipoAsignacion: "",
    asignadoEn: null,
  });

  return { ok: true, horasNormales, horasExtras, totalHoras };
}
,

  /**************************************************************
   * 6) Eliminar persona
   **************************************************************/
  async delete(personId) {
    await deleteDoc(doc(db, "personal", personId));
    return { ok: true };
  },
};

export default personalService;
