// app/PersonalScreen.js

/**
 * PANTALLA PRINCIPAL DE GESTIÓN DE PERSONAL
 * 
 * Descripción:
 * Pantalla central para la gestión completa del personal de la organización.
 * Permite visualizar, crear, asignar, liberar y administrar el personal,
 * con control de permisos basado en roles y sincronización en tiempo real.
 * 
 * Características principales:
 * 1. Visualización de lista de personal con filtro de búsqueda
 * 2. Creación de nuevo personal (Administrador/Ingeniero)
 * 3. Asignación a destinos específicos (Bodega, Oficina, Visita RETIE, personalizado)
 * 4. Liberación de personal con cálculo automático de horas
 * 5. Exportación de registros laborales a Excel por persona
 * 6. Navegación a pantallas de historial y reportes
 * 7. Listener en tiempo real de Firestore para actualizaciones automáticas
 * 
 * Roles y permisos:
 * - Administrador: Acceso completo (crear, eliminar, asignar, liberar)
 * - Ingeniero: Puede crear y asignar, pero no eliminar
 * - Otros roles: Solo visualización y acceso limitado
 * 
 * Dependencias:
 * - Firestore para almacenamiento y sincronización en tiempo real
 * - Servicios personalizados para lógica de negocio
 * - Componentes modulares reutilizables
 * 
 * @component
 * @returns {JSX.Element} Componente de pantalla de gestión de personal
 * 
 * @example
 * <PersonalScreen />
 */

// Importaciones de React y librerías externas
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

// Componentes personalizados
import SearchHeader from "../components/inventory/SearchHeader";
import PersonalActionsModal from "../components/personal/PersonalActionsModal";
import PersonalForm from "../components/personal/PersonalForm";
import PersonalHeader from "../components/personal/PersonalHeader";
import PersonalList from "../components/personal/PersonalList";

// Servicios de negocio
import { horasLaboralesService } from "../services/horasLaboralesService";
import { personalService } from "../services/personalService";
import { exportRegistroLaboralExcel } from "../utils/exportExcelRegistroLaboral";

// Firestore realtime
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

/**
 * Componente principal de gestión de personal
 * 
 * @function PersonalScreen
 */
export default function PersonalScreen() {
  // Hooks de navegación y contexto
  const router = useRouter();
  const { role } = useUser();

  // Estados principales del componente
  const [personnel, setPersonnel] = useState([]);          // Lista completa de personal
  const [searchQuery, setSearchQuery] = useState("");     // Texto de búsqueda
  const [showForm, setShowForm] = useState(false);        // Visibilidad del formulario de creación
  const [selectedPerson, setSelectedPerson] = useState(null); // Persona seleccionada para acciones
  const [loading, setLoading] = useState(false);          // Estado de carga para operaciones
  const [loadingInitial, setLoadingInitial] = useState(true); // Carga inicial de datos

  /* =====================================================
   * ROLES Y PERMISOS
   * ===================================================== 
   * 
   * Determina las capacidades del usuario actual basado en su rol
   */
  const canManage = useMemo(
    () => ["Administrador", "Ingeniero"].includes(role),
    [role]
  );

  const isAdmin = role === "Administrador";

  /* =====================================================
   * LISTENER EN TIEMPO REAL (CLAVE)
   * ===================================================== 
   * 
   * Configura un listener en tiempo real para la colección 'personal'
   * Escucha cambios automáticos y actualiza el estado local
   * Se ejecuta solo al montar el componente
   */
  useEffect(() => {
    setLoadingInitial(true);

    // Crear query ordenada por nombre ascendente
    const q = query(
      collection(db, "personal"),
      orderBy("nombre", "asc")
    );

    // Configurar listener en tiempo real
    const unsub = onSnapshot(
      q,
      (snap) => {
        // Transformar documentos Firestore a objetos planos
        const data = snap.docs.map((d) => ({
          id: d.id,           // ID del documento
          ...d.data(),        // Datos del documento
        }));
        setPersonnel(data);   // Actualizar estado
        setLoadingInitial(false); // Finalizar carga inicial
      },
      (err) => {
        // Manejo de errores del listener
        console.error("Listener personal error:", err);
        setLoadingInitial(false);
        Alert.alert("Error", "No se pudo escuchar cambios del personal");
      }
    );

    // Cleanup: remover listener al desmontar
    return () => unsub();
  }, []); // Solo se ejecuta una vez al montar

  /* =====================================================
   * CREAR PERSONAL
   * ===================================================== 
   * 
   * Maneja la creación de nuevo personal en el sistema
   * 
   * @async
   * @param {Object} personData - Datos de la nueva persona
   * @param {string} personData.nombre - Nombre completo
   * @param {string} personData.cargo - Cargo/posición
   * @param {string} personData.telefono - Número de teléfono
   * @param {string} personData.email - Correo electrónico
   * @param {string} personData.direccion - Dirección de residencia
   * @throws {Error} Si falla la creación en Firestore
   */
  const handleAddPersonnel = async (personData) => {
    setLoading(true);
    try {
      await personalService.create(personData);
      setShowForm(false);
      Alert.alert("Éxito", "Persona creada correctamente");
      // NO recargar: listener se encarga de actualizar automáticamente
    } catch (error) {
      console.error("Error agregando personal:", error);
      Alert.alert("Error", error.message || "No se pudo crear la persona");
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
   * ELIMINAR PERSONAL (SOLO ADMIN)
   * ===================================================== 
   * 
   * Maneja la eliminación de personal con confirmación
   * Solo disponible para usuarios con rol Administrador
   * 
   * @param {Object} person - Persona a eliminar
   * @param {string} person.id - ID de la persona
   * @param {string} person.nombre - Nombre de la persona
   */
  const handleDeletePersonnel = (person) => {
    if (!isAdmin) return; // Verificación de permisos

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
   * ===================================================== 
   * 
   * Funciones para asignar personal a diferentes destinos
   * Cada función actualiza el estado 'destino' de la persona
   */

  /**
   * Asigna persona a Bodega
   * @param {Object} person - Persona a asignar
   */
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

  /**
   * Asigna persona a Visita RETIE
   * @param {Object} person - Persona a asignar
   */
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

  /**
   * Asigna persona a Oficina
   * @param {Object} person - Persona a asignar
   */
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

  /**
   * Asigna persona a destino manual personalizado
   * @param {Object} person - Persona a asignar
   * @param {string} destino - Destino personalizado
   */
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
   * ===================================================== 
   * 
   * Libera a una persona de su asignación actual
   * Calcula automáticamente horas normales y extras
   * 
   * @param {Object} person - Persona a liberar
   */
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
   * ===================================================== 
   * 
   * Exporta los registros laborales de una persona específica a Excel
   * 
   * @param {Object} person - Persona cuyos registros se exportarán
   */
  const handleExportExcelPersona = async (person) => {
    setLoading(true);
    try {
      // Obtener registros de la persona
      const registros =
        await horasLaboralesService.getRegistrosPorPersona(person.id);

      if (!registros || registros.length === 0) {
        Alert.alert(
          "Exportación",
          "Esta persona no tiene registros aún."
        );
        return;
      }

      // Exportar a Excel
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
   * ===================================================== 
   * 
   * Funciones de navegación a otras pantallas
   */

  /**
   * Navega al historial laboral de una persona específica
   * @param {Object} person - Persona cuyo historial se verá
   */
  const handleNavigateToHistory = (person) => {
    router.push({
      pathname: "/RegistroLaboralScreen",
      params: {
        personaId: person.id,
        nombre: person.nombre,
      },
    });
  };

  /**
   * Navega a la pantalla de registro laboral general
   */
  const handleOpenRegistroLaboral = () =>
    router.push("/RegistroLaboralScreen");

  /**
   * Navega a la pantalla de reporte general
   */
  const handleOpenReporteGeneral = () =>
    router.push("/ReporteGeneralScreen");

  /* =====================================================
   * FILTRO
   * ===================================================== 
   * 
   * Filtra la lista de personal basado en el texto de búsqueda
   * Optimizado con useMemo para evitar recálculos innecesarios
   * 
   * @type {Array}
   */
  const filteredPersonnel = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return personnel; // Sin filtro si no hay búsqueda

    // Filtrar por nombre (case insensitive)
    return personnel.filter((p) =>
      (p.nombre || "").toLowerCase().includes(q)
    );
  }, [personnel, searchQuery]);

  /* =====================================================
   * LOADING INICIAL
   * ===================================================== 
   * 
   * Pantalla de carga mientras se obtienen los datos iniciales
   */
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
   * RENDER PRINCIPAL
   * ===================================================== 
   */
  return (
    <LinearGradient
      colors={["#11998e", "#38ef7d"]}
      style={styles.container}
    >
      {/* Header con acciones principales */}
      <PersonalHeader
        role={role}
        showForm={showForm}
        onToggleForm={() => setShowForm((v) => !v)}
        onOpenRegistroLaboral={handleOpenRegistroLaboral}
        onOpenReporteGeneral={handleOpenReporteGeneral}
      />

      {/* Barra de búsqueda */}
      <SearchHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder="Buscar personal..."
      />

      {/* Formulario de creación de personal (condicional) */}
      <PersonalForm
        visible={showForm}
        onSave={handleAddPersonnel}
        onCancel={() => setShowForm(false)}
      />

      {/* Lista de personal */}
      <PersonalList
        personnel={filteredPersonnel}
        onItemPress={handleNavigateToHistory}
        onItemLongPress={(p) => {
          if (!canManage) return; // Solo si tiene permisos
          setSelectedPerson(p);
        }}
        onDelete={handleDeletePersonnel}
        role={role}
        loading={loading}
        emptyMessage="No hay personal registrado"
      />

      {/* Modal de acciones para personal seleccionado */}
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

/**
 * Estilos del componente
 * 
 * @constant {Object} styles
 * @property {Object} container - Estilo del contenedor principal con gradiente
 * @property {Object} center - Estilo para centrar contenido
 * @property {Object} loadingText - Estilo del texto de carga
 */
const styles = StyleSheet.create({
  // Contenedor principal con gradiente verde
  container: { 
    flex: 1, 
    padding: 16 
  },
  
  // Estilo para centrar contenido vertical y horizontalmente
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  
  // Texto de carga debajo del spinner
  loadingText: {
    marginTop: 10,
    color: "#111827",
    fontWeight: "600",
  },
});