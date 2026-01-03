// app/PersonalScreen.js
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useUser } from "../context/UserContext";

import SearchHeader from "../components/inventory/SearchHeader";
import PersonalActionsModal from "../components/personal/PersonalActionsModal";
import PersonalForm from "../components/personal/PersonalForm";
import PersonalHeader from "../components/personal/PersonalHeader";
import PersonalList from "../components/personal/PersonalList";

import { horasLaboralesService } from "../services/horasLaboralesService";
import { personalService } from "../services/personalService";
import { exportRegistroLaboralExcel } from "../utils/exportExcelRegistroLaboral";

// Firestore realtime
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

export default function PersonalScreen() {
  const router = useRouter();
  const { role } = useUser();

  const [personnel, setPersonnel] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

  /* =====================================================
   * ROLES
   * ===================================================== */
  const canManage = useMemo(
    () => ["Administrador", "Ingeniero"].includes(role),
    [role]
  );

  const isAdmin = role === "Administrador";

  /* =====================================================
   * LISTENER EN TIEMPO REAL (CLAVE)
   * ===================================================== */
  useEffect(() => {
    setLoadingInitial(true);

    const q = query(
      collection(db, "personal"),
      orderBy("nombre", "asc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setPersonnel(data);
        setLoadingInitial(false);
      },
      (err) => {
        console.error("Listener personal error:", err);
        setLoadingInitial(false);
        Alert.alert("Error", "No se pudo escuchar cambios del personal");
      }
    );

    return () => unsub();
  }, []);

  /* =====================================================
   * CREAR PERSONAL
   * ===================================================== */
  const handleAddPersonnel = async (personData) => {
    setLoading(true);
    try {
      await personalService.create(personData);
      setShowForm(false);
      Alert.alert("Éxito", "Persona creada correctamente");
      // ⛔ NO recargar: listener se encarga
    } catch (error) {
      console.error("Error agregando personal:", error);
      Alert.alert("Error", error.message || "No se pudo crear la persona");
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
   * ELIMINAR PERSONAL (SOLO ADMIN)
   * ===================================================== */
  const handleDeletePersonnel = (person) => {
    if (!isAdmin) return;

    Alert.alert("Confirmar", `¿Eliminar a ${person.nombre}?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          setLoading(true);
          try {
            await personalService.delete(person.id);
            Alert.alert("Éxito", "Persona eliminada correctamente");
          } catch (error) {
            console.error("Error eliminando personal:", error);
            Alert.alert("Error", error.message || "No se pudo eliminar");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  /* =====================================================
   * ASIGNACIONES (DESTINOS)
   * ===================================================== */
  const handleAssignToWarehouse = async (person) => {
    setLoading(true);
    try {
      await personalService.assignToDestination(person.id, "Bodega");
      setSelectedPerson(null);
      Alert.alert("Éxito", `${person.nombre} asignado a Bodega`);
    } catch (error) {
      Alert.alert("Error", error.message || "No se pudo asignar");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignToRetie = async (person) => {
    setLoading(true);
    try {
      await personalService.assignToDestination(
        person.id,
        "Visita RETIE"
      );
      setSelectedPerson(null);
      Alert.alert("Éxito", `${person.nombre} asignado a Visita RETIE`);
    } catch (error) {
      Alert.alert("Error", error.message || "No se pudo asignar");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignToOffice = async (person) => {
    setLoading(true);
    try {
      await personalService.assignToDestination(
        person.id,
        "Oficina"
      );
      setSelectedPerson(null);
      Alert.alert("Éxito", `${person.nombre} asignado a la Oficina`);
    } catch (error) {
      Alert.alert("Error", error.message || "No se pudo asignar");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignManual = async (person, destino) => {
    if (!destino?.trim()) return;

    setLoading(true);
    try {
      await personalService.assignToDestination(
        person.id,
        destino.trim()
      );
      setSelectedPerson(null);
      Alert.alert("Éxito", `${person.nombre} asignado a ${destino}`);
    } catch (error) {
      Alert.alert("Error", error.message || "No se pudo asignar");
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
   * LIBERAR PERSONAL
   * ===================================================== */
  const handleReleasePersonnel = async (person) => {
    setLoading(true);
    try {
      const res = await personalService.liberar(person.id);
      setSelectedPerson(null);

      Alert.alert(
        "Liberado",
        `${person.nombre} fue liberado.\nHoras normales: ${
          res?.horasNormales || 0
        }\nHoras extra: ${res?.horasExtras || 0}`
      );
    } catch (error) {
      Alert.alert("Error", error.message || "No se pudo liberar");
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
   * EXPORTAR EXCEL POR PERSONA
   * ===================================================== */
  const handleExportExcelPersona = async (person) => {
    setLoading(true);
    try {
      const registros =
        await horasLaboralesService.getRegistrosPorPersona(person.id);

      if (!registros || registros.length === 0) {
        Alert.alert(
          "Exportación",
          "Esta persona no tiene registros aún."
        );
        return;
      }

      const { ok, message } =
        await exportRegistroLaboralExcel(registros);

      if (!ok) {
        Alert.alert(
          "Error",
          message || "No se pudo exportar el Excel"
        );
      }
    } catch (error) {
      Alert.alert("Error", error.message || "Error exportando Excel");
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
   * NAVEGACIÓN
   * ===================================================== */
  const handleNavigateToHistory = (person) => {
    router.push({
      pathname: "/RegistroLaboralScreen",
      params: {
        personaId: person.id,
        nombre: person.nombre,
      },
    });
  };

  const handleOpenRegistroLaboral = () =>
    router.push("/RegistroLaboralScreen");

  const handleOpenReporteGeneral = () =>
    router.push("/ReporteGeneralScreen");

  /* =====================================================
   * FILTRO
   * ===================================================== */
  const filteredPersonnel = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return personnel;

    return personnel.filter((p) =>
      (p.nombre || "").toLowerCase().includes(q)
    );
  }, [personnel, searchQuery]);

  /* =====================================================
   * LOADING INICIAL
   * ===================================================== */
  if (loadingInitial) {
    return (
      <LinearGradient
        colors={["#11998e", "#38ef7d"]}
        style={styles.container}
      >
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>
            Cargando personal...
          </Text>
        </View>
      </LinearGradient>
    );
  }

  /* =====================================================
   * RENDER
   * ===================================================== */
  return (
    <LinearGradient
      colors={["#11998e", "#38ef7d"]}
      style={styles.container}
    >
      <PersonalHeader
        role={role}
        showForm={showForm}
        onToggleForm={() => setShowForm((v) => !v)}
        onOpenRegistroLaboral={handleOpenRegistroLaboral}
        onOpenReporteGeneral={handleOpenReporteGeneral}
      />

      <SearchHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder="Buscar personal..."
      />

      <PersonalForm
        visible={showForm}
        onSave={handleAddPersonnel}
        onCancel={() => setShowForm(false)}
      />

      <PersonalList
        personnel={filteredPersonnel}
        onItemPress={handleNavigateToHistory}
        onItemLongPress={(p) => {
          if (!canManage) return;
          setSelectedPerson(p);
        }}
        onDelete={handleDeletePersonnel}
        role={role}
        loading={loading}
        emptyMessage="No hay personal registrado"
      />

      <PersonalActionsModal
        visible={!!selectedPerson}
        selectedPerson={selectedPerson}
        onAssignToWarehouse={handleAssignToWarehouse}
        onAssignToOffice={handleAssignToOffice}
        onAssignToRetie={handleAssignToRetie}
        onAssignManual={handleAssignManual}
        onRelease={handleReleasePersonnel}
        onExportExcel={handleExportExcelPersona}
        onClose={() => setSelectedPerson(null)}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#111827",
    fontWeight: "600",
  },
});
