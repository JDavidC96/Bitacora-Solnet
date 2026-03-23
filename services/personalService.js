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

async function abrirJornadaHistorial({
  personId,
  nombre,
  destino,
  tipoAsignacion,
  proyectoId,
  nowISO,
  actividad,
}) {
  await addDoc(collection(db, "historial_personal"), {
    personalId: personId,
    nombre: nombre || "",
    destino: destino || "",
    tipoAsignacion: tipoAsignacion || "",
    proyectoId: proyectoId ?? null,
    actividad: actividad || "",

    fechaInicio: nowISO,
    fechaFin: null,
    estado: "en_curso",

    createdAt: nowISO,
  });
}

export const personalService = {
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
      actividad: "",

      createdAt: new Date().toISOString(),
    };

    await addDoc(collection(db, "personal"), payload);
    return { ok: true };
  },

  /**
   * selfAssignToProject(personId, project, actividad?)
   * actividad is optional — only Administrador/Ingeniero provide it
   */
  async selfAssignToProject(personId, project, actividad = "") {
    if (!project?.id) throw new Error("Proyecto inválido");

    const now = new Date().toISOString();

    const ref = doc(db, "personal", personId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      throw new Error("No se encontró el registro de personal");
    }

    const data = snap.data();

    await updateDoc(ref, {
      proyectoAsignado: project.title || "",
      proyectoId: project.id,
      estado: "ocupado",
      tipoAsignacion: "proyecto",
      asignadoEn: now,
      actividad: actividad || "",
      updatedAt: now,
    });

    await addDoc(collection(db, "historial_personal"), {
      personalId: personId,
      nombre: data?.nombre || "",
      destino: project.title || "",
      tipoAsignacion: "proyecto",
      proyectoId: project.id,
      actividad: actividad || "",

      fechaInicio: now,
      fechaFin: null,
      estado: "en_curso",

      createdAt: now,
    });

    return { ok: true };
  },

  async selfUnassign(personId) {
    const now = new Date().toISOString();

    await updateDoc(doc(db, "personal", personId), {
      proyectoAsignado: "",
      proyectoId: "",

      estado: "libre",
      tipoAsignacion: "",
      asignadoEn: "",
      actividad: "",

      updatedAt: now,
    });

    return { ok: true };
  },

  /**
   * assignToProject(personId, project, actividad?)
   * actividad is optional — only Administrador/Ingeniero provide it
   */
  async assignToProject(personId, project, actividad = "") {
    if (!project?.id) throw new Error("Proyecto inválido (ID requerido)");

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
      actividad: actividad || "",
    });

    await addDoc(collection(db, "historial_personal"), {
      personalId: personId,
      nombre: snap.data().nombre,
      destino: project.title,
      tipoAsignacion: "proyecto",
      proyectoId: project.id,
      actividad: actividad || "",

      fechaInicio: now,
      fechaFin: null,
      estado: "en_curso",

      createdAt: now,
    });

    return { ok: true };
  },

  async assignToDestination(personId, destino) {
    const ref = doc(db, "personal", personId);
    const snap = await getDoc(ref);

    if (!snap.exists()) throw new Error("Persona no encontrada");
    if (snap.data().estado === "ocupado")
      throw new Error("La persona ya está asignada");

    const now = new Date().toISOString();
    const destinoKey = destino.toLowerCase().replace(/\s+/g, "-");

    await updateDoc(ref, {
      estado: "ocupado",
      proyectoAsignado: destino,
      proyectoId: null,
      tipoAsignacion: destinoKey,
      asignadoEn: now,
      actividad: "",
    });

    await addDoc(collection(db, "historial_personal"), {
      personalId: personId,
      nombre: snap.data().nombre,
      destino,
      tipoAsignacion: destinoKey,
      proyectoId: null,
      actividad: "",

      fechaInicio: now,
      fechaFin: null,
      estado: "en_curso",

      createdAt: now,
    });

    return { ok: true };
  },

  /**
   * liberar(personId, destinoFinal)
   */
  async liberar(personId, destinoFinal) {
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

    const {
      normalHours = 0,
      extraHours = 0,
      nocturnalHours = 0,
      nocturnalExtraHours = 0,
      dominicalHours = 0,
      dominicalNocturnalHours = 0,
      dominicalExtraHours = 0,
      dominicalExtraNocturnalHours = 0,
    } = calculateWorkHours(fechaInicio.toISOString(), fechaFin.toISOString());

    const horasNormales = normalHours;
    const horasExtras = extraHours;
    const horasNocturnas = nocturnalHours;
    const horasExtrasNocturnas = nocturnalExtraHours;

    const horasDominicales = dominicalHours;
    const horasDominicalesNocturnas = dominicalNocturnalHours;
    const horasExtrasDominicales = dominicalExtraHours;
    const horasExtrasDominicalesNocturnas = dominicalExtraNocturnalHours;

    const totalHoras =
      horasNormales +
      horasExtras +
      horasNocturnas +
      horasExtrasNocturnas +
      horasDominicales +
      horasDominicalesNocturnas +
      horasExtrasDominicales +
      horasExtrasDominicalesNocturnas;

    const rol = data.rol || data.cargo || "Tecnico";
    const destinoRegistro = destinoFinal ?? data.proyectoAsignado ?? "Bodega";

    await horasLaboralesService.registrarJornada({
      personalId: personId,
      nombre: data.nombre,
      rol,

      fechaInicio: fechaInicio.toISOString(),
      fechaFin: fechaFin.toISOString(),

      horasNormales,
      horasExtras,
      totalHoras,

      horasNocturnas,
      horasExtrasNocturnas,

      horasDominicales,
      horasDominicalesNocturnas,
      horasExtrasDominicales,
      horasExtrasDominicalesNocturnas,

      destino: destinoRegistro,
      tipoAsignacion: data.tipoAsignacion,
      proyectoId: data.proyectoId,

      createdAt: nowISO,
      source: "liberacion",
    });

    const q = query(
      collection(db, "historial_personal"),
      where("personalId", "==", personId),
      where("estado", "==", "en_curso"),
      limit(1)
    );

    const snapHist = await getDocs(q);
    if (snapHist.empty)
      throw new Error("No se encontró jornada activa para cerrar");

    await updateDoc(snapHist.docs[0].ref, {
      fechaFin: nowISO,
      destino: destinoRegistro,
      estado: "finalizado",
    });

    await updateDoc(ref, {
      estado: "libre",
      proyectoAsignado: "",
      proyectoId: "",
      tipoAsignacion: "",
      asignadoEn: "",
      actividad: "",
      updatedAt: nowISO,
    });

    return {
      ok: true,
      horasNormales,
      horasExtras,
      horasNocturnas,
      horasExtrasNocturnas,
      horasDominicales,
      horasDominicalesNocturnas,
      horasExtrasDominicales,
      horasExtrasDominicalesNocturnas,
      totalHoras,
    };
  },

  async delete(personId) {
    await deleteDoc(doc(db, "personal", personId));
    return { ok: true };
  },
};

export default personalService;