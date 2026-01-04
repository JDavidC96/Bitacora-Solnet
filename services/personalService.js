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
}) {
  await addDoc(collection(db, "historial_personal"), {
    personalId: personId,
    nombre: nombre || "",
    destino: destino || "",
    tipoAsignacion: tipoAsignacion || "",
    proyectoId: proyectoId ?? null,

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

      createdAt: new Date().toISOString(),
    };

    await addDoc(collection(db, "personal"), payload);
    return { ok: true };
  },

  async selfAssignToProject(personId, project) {
    if (!project?.id) throw new Error("Proyecto inválido");

    const now = new Date().toISOString();

    // 1) Leer la persona para tener el nombre (snap)
    const ref = doc(db, "personal", personId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      throw new Error("No se encontró el registro de personal");
    }

    const data = snap.data();

    // 2) Marcar como ocupado y asignado al proyecto (cumple rules)
    await updateDoc(ref, {
      proyectoAsignado: project.title || "",
      proyectoId: project.id,
      estado: "ocupado",
      tipoAsignacion: "proyecto",
      asignadoEn: now,
      updatedAt: now,
    });

    // 3) Abrir jornada en historial_personal (para que liberar() la encuentre)
    await addDoc(collection(db, "historial_personal"), {
      personalId: personId,
      nombre: data?.nombre || "",
      destino: project.title || "",
      tipoAsignacion: "proyecto",
      proyectoId: project.id,

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

      updatedAt: now,
    });

    return { ok: true };
  },

  // project = { id, title }
  async assignToProject(personId, project) {
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
    });

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

  /**
   * liberar(personId, destinoFinal)
   * - destinoFinal: "Bodega", "Oficina", etc. (seleccionado por el usuario al liberarse)
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

    // ✅ Con dominicales/festivos + nocturnas
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

    // totalHoras conserva compatibilidad (incluye todo)
    const totalHoras =
      horasNormales +
      horasExtras +
      horasNocturnas +
      horasExtrasNocturnas +
      horasDominicales +
      horasDominicalesNocturnas +
      horasExtrasDominicales +
      horasExtrasDominicalesNocturnas;

    // ✅ Rol/cargo consistente
    const rol = data.rol || data.cargo || "Tecnico";

    // ✅ destino que queda registrado al cerrar jornada:
    // si el usuario seleccionó destinoFinal, se usa ese; si no, fallback al proyectoAsignado.
    const destinoRegistro = destinoFinal ?? data.proyectoAsignado ?? "Bodega";

    // REGISTRO DE HORAS
    await horasLaboralesService.registrarJornada({
      personalId: personId,
      nombre: data.nombre,
      rol,

      fechaInicio: fechaInicio.toISOString(),
      fechaFin: fechaFin.toISOString(),

      // Campos existentes
      horasNormales,
      horasExtras,
      totalHoras,

      // ✅ NUEVOS campos para reportes futuros (reformas)
      horasNocturnas,
      horasExtrasNocturnas,

      // ✅ DOMINICALES/FESTIVOS
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

    // CERRAR HISTORIAL ACTIVO
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

    // LIBERAR PERSONA
    await updateDoc(ref, {
      estado: "libre",
      proyectoAsignado: "",
      proyectoId: "",
      tipoAsignacion: "",
      asignadoEn: "",
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