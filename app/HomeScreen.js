// screens/HomeScreen.js
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

//Firebase
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

// Hooks personalizados
import { useUser } from '../context/UserContext';
import { useBackHandler } from '../hooks/useBackHandler';
import { useCompletedProjects } from '../hooks/useCompletedProjects';
import { useMultiModal } from '../hooks/useModal';
import { useNotifications } from '../hooks/useNotifications';
import { usePersonal } from '../hooks/usePersonal';
import { useProjects } from '../hooks/useProjects';

// Servicios
import { personalService } from '../services/personalService';
import { projectService } from '../services/projectService';

// Componentes modulares
import AddProjectModal from '../components/home/AddProjectModal';
import AssignPersonModal from '../components/home/AssignPersonModal';
import EditProjectModal from '../components/home/EditProjectModal';
import ProjectActionsModal from '../components/home/ProjectActionsModal';
import ProjectList from '../components/home/ProjectList';
import SearchModal from '../components/home/SearchModal';
import FABMenu from '../components/shared/FABMenu';

//Utils
import formatPowerKw from '../utils/formatPower';

/**
 * Pantalla principal de la aplicación - Dashboard de proyectos solares.
 * 
 * Esta pantalla sirve como el hub central de la aplicación, proporcionando:
 * - Vista general de todos los proyectos solares activos
 * - Métricas clave de rendimiento (potencia instalada, CO2 evitado, etc.)
 * - Acceso rápido a funcionalidades principales (agregar, buscar, completados)
 * - Gestión de personal y asignaciones por proyecto
 * - Navegación a pantallas de detalle de proyectos
 * 
 * La pantalla incluye:
 * - Estadísticas en tiempo real de proyectos
 * - Lista de proyectos ordenados por fecha
 * - Sistema de roles y permisos
 * - Notificaciones y manejo de actividad
 * 
 * @component
 * @returns {JSX.Element} Componente de la pantalla principal
 */
export default function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { role, user } = useUser();

  // Estados locales
  const [selectedProject, setSelectedProject] = useState(null); // Proyecto seleccionado para acciones
  const [loading, setLoading] = useState(false); // Estado de carga para operaciones
  const [myPersonalId, setMyPersonalId] = useState(null); // ID del personal asociado al usuario
  const [myPersonalLoading, setMyPersonalLoading] = useState(true); // Carga del personal del usuario

  // Hooks personalizados para obtener datos
  const { projects, loading: projectsLoading, error: projectsError } = useProjects(); // Proyectos activos
  const { personal, loading: personalLoading } = usePersonal(); // Personal disponible
  const { completedProjects } = useCompletedProjects(); // Proyectos completados
  const { modals, openModal, closeModal, closeAllModals } = useMultiModal({
    add: false,    // Modal agregar proyecto
    edit: false,   // Modal editar proyecto
    assign: false, // Modal asignar personal
    actions: false,// Modal acciones del proyecto
    search: false  // Modal búsqueda
  });

  // Hooks de utilidad
  useBackHandler(); // Manejo del botón atrás en Android
  useNotifications(); // Sistema de notificaciones

  // Definición de permisos basados en el rol del usuario
  const canManage = ["Administrador", "Ingeniero"].includes(role); // Permisos de gestión completa
  const canSelfAssign = ["Tecnico", "Supervisor"].includes(role); // Permisos de auto-asignación

  /**
   * Encuentra el objeto de personal correspondiente al usuario actual
   * basado en el personalId almacenado en usuarios_permitidos
   * @returns {Object|null} Objeto del personal del usuario o null si no existe
   */
  const myPersona = useMemo(() => {
    if (!myPersonalId) return null;
    return (personal || []).find(p => p.id === myPersonalId) || null;
  }, [personal, myPersonalId]);

  /**
   * Efecto para obtener el personalId del usuario desde Firestore
   * Lee el documento del usuario en 'usuarios_permitidos' para obtener su personalId asociado
   */
  useMemo(() => {
    let cancelled = false;

    (async () => {
      try {
        if (!user?.uid) return;
        const ref = doc(db, "usuarios_permitidos", user.uid);
        const snap = await getDoc(ref);
        const pid = snap.exists() ? snap.data()?.personalId : null;

        if (!cancelled) setMyPersonalId(pid || null);
      } catch (e) {
        console.error("Error leyendo personalId del usuario:", e);
        if (!cancelled) setMyPersonalId(null);
      } finally {
        if (!cancelled) setMyPersonalLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user?.uid]);

  // =========================
  // CÁLCULO DE ESTADÍSTICAS
  // =========================

  /**
   * Combina proyectos activos y completados para cálculos totales
   * @returns {Array} Lista combinada de todos los proyectos
   */
  const allProjects = useMemo(() => {
    return [
      ...(Array.isArray(projects) ? projects : []),
      ...(Array.isArray(completedProjects) ? completedProjects : []),
    ];
  }, [projects, completedProjects]);

  /**
   * Calcula la potencia total AC instalada en kW
   * Busca en diferentes campos de nombre para compatibilidad
   * @returns {number} Potencia total AC en kW
   */
  const totalKwAc = useMemo(() => {
    return allProjects.reduce((acc, p) => {
      const kw = Number(
        p?.potenciaAcKw ??
        p?.potenciaACKw ??
        p?.potenciaAC ??
        p?.potenciaAc ??
        0
      );
      return acc + (isNaN(kw) ? 0 : kw);
    }, 0);
  }, [allProjects]);

  /**
   * Calcula la potencia total DC instalada en kW
   * Busca en diferentes campos de nombre para compatibilidad
   * @returns {number} Potencia total DC en kW
   */
  const totalKwDc = useMemo(() => {
    return allProjects.reduce((acc, p) => {
      const kw = Number(
        p?.potenciaDcKw ??
        p?.potenciaDCKw ??
        p?.potenciaDC ??
        p?.potenciaDc ??
        p?.potenciaDcTotalKw ??
        0
      );
      return acc + (isNaN(kw) ? 0 : kw);
    }, 0);
  }, [allProjects]);

  /**
   * Calcula el total de paneles solares instalados
   * Busca en diferentes campos de nombre para compatibilidad
   * @returns {number} Total de paneles instalados
   */
  const totalPaneles = useMemo(() => {
    return allProjects.reduce((acc, p) => {
      const n = Number(
        p?.panelesInstalados ??
        p?.paneles ??
        p?.cantidadPaneles ??
        0
      );
      return acc + (isNaN(n) ? 0 : n);
    }, 0);
  }, [allProjects]);

  /**
   * Calcula la reducción aproximada de CO2 en toneladas por año
   * Basado en la potencia DC instalada y factores de conversión estándar
   * 
   * Fórmula: (kW DC) × (horas/año) × (factor capacidad) × (emisiones grid) ÷ 1000
   * 
   * @returns {number} Toneladas de CO2 evitadas por año
   */
  const co2TonsPerYear = useMemo(() => {
    const CAPACITY_FACTOR = 0.18;        // Factor de capacidad típico residencial/comercial (18%)
    const GRID_CO2_KG_PER_KWH = 0.4;     // Emisiones de la red eléctrica (0.4 kg CO2 por kWh)
    const HOURS_YEAR = 8760;             // Horas en un año

    const kwhYear = totalKwDc * HOURS_YEAR * CAPACITY_FACTOR; // kWh generados por año
    const kgCo2Year = kwhYear * GRID_CO2_KG_PER_KWH; // kg CO2 evitados
    const tons = kgCo2Year / 1000; // Conversión a toneladas

    if (!Number.isFinite(tons) || tons <= 0) return 0;
    return tons;
  }, [totalKwDc]);

  /**
   * Funciones de formato para números
   */
  const formatInt = (n) => Number(n || 0).toLocaleString("es-CO"); // Formato entero
  const formatTons = (n) =>
    Number(n || 0).toLocaleString("es-CO", { maximumFractionDigits: 2 }); // Formato decimal para toneladas

  // ========== HANDLERS (Manejadores de eventos) ==========

  /**
   * Maneja la creación de un nuevo proyecto
   * @param {Object} projectData - Datos del proyecto a crear
   */
  const handleAddProject = async (projectData) => {
    setLoading(true);
    try {
      const result = await projectService.create(projectData);

      // Crear etapas iniciales automáticamente para el nuevo proyecto
      await projectService.createInitialStages(
        result.id,
        projectData.date.toISOString().split('T')[0]
      );

      closeAllModals();
      Alert.alert('Éxito', 'Proyecto creado correctamente');
    } catch (error) {
      console.error('Error agregando proyecto:', error);
      Alert.alert('Error', error.message || 'No se pudo crear el proyecto');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Maneja la edición de un proyecto existente
   * @param {Object} updates - Campos actualizados del proyecto
   */
  const handleEditProject = async (updates) => {
    if (!selectedProject) return;

    setLoading(true);
    try {
      await projectService.update(selectedProject.id, updates);
      closeAllModals();
      setSelectedProject(null);
      Alert.alert('Éxito', 'Proyecto actualizado correctamente');
    } catch (error) {
      console.error('Error editando proyecto:', error);
      Alert.alert('Error', error.message || 'No se pudo actualizar el proyecto');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Maneja la eliminación de un proyecto con confirmación
   */
  const handleDeleteProject = async () => {
    if (!selectedProject) return;

    Alert.alert(
      'Confirmar eliminación',
      `¿Estás seguro de que quieres eliminar el proyecto "${selectedProject.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const projectIdToDelete = selectedProject.idDoc || selectedProject.id;

              if (!projectIdToDelete) {
                throw new Error('No se pudo obtener el ID del proyecto');
              }

              await projectService.delete(projectIdToDelete, selectedProject.title);
              closeAllModals();
              setSelectedProject(null);
              Alert.alert('✅ Éxito', 'Proyecto eliminado correctamente');
            } catch (error) {
              console.error('❌ Error eliminando proyecto:', error);
              Alert.alert('❌ Error', error.message || 'No se pudo eliminar el proyecto');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  /**
   * Permite que un técnico o supervisor se asigne a sí mismo a un proyecto
   * @param {Object} project - Proyecto al cual auto-asignarse
   */
  const handleSelfAssign = async (project) => {
    if (!canSelfAssign) return;
    if (myPersonalLoading) return Alert.alert("Espera", "Cargando tu perfil...");
    if (!myPersona?.id) return Alert.alert("Error", "No se encontró tu personalId (usuarios_permitidos.personalId).");

    setLoading(true);
    try {
      await personalService.selfAssignToProject(myPersona.id, { id: project.id, title: project.title });
      await markAssignActivity();
      Alert.alert("Éxito", "Te asignaste al proyecto.");
    } catch (e) {
      console.error("Error auto-asignando:", e);
      Alert.alert("Error", e?.message || "No se pudo asignar.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Muestra confirmación para auto-liberarse de un proyecto
   * @param {Object} project - Proyecto del cual liberarse
   */
  const confirmSelfUnassign = (project) => {
    Alert.alert(
      "Liberar personal",
      `¿Liberarte del proyecto?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Liberar",
          style: "destructive",
          onPress: () => handleSelfUnassign(project),
        },
      ]
    );
  };

  /**
   * Permite que un técnico o supervisor se libere de su asignación actual
   * @param {Object} project - Proyecto del cual liberarse
   */
  const handleSelfUnassign = async (project) => {
    if (!canSelfAssign) return;
    if (myPersonalLoading) return Alert.alert("Espera", "Cargando tu perfil...");
    if (!myPersona?.id) {
      return Alert.alert("Error", "No se encontró tu personalId (usuarios_permitidos.personalId).");
    }

    setLoading(true);
    try {
      await personalService.liberar(myPersona.id);
      await markUnassignActivity();
      Alert.alert("Éxito", "Te liberaste del proyecto.");
    } catch (e) {
      console.error("Error auto-liberando:", e);
      Alert.alert("Error", e?.message || "No se pudo liberar.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Maneja el evento de presión larga sobre un proyecto
   * Muestra diferentes opciones según el rol del usuario
   * @param {Object} project - Proyecto sobre el que se hizo long press
   */
  const handleProjectLongPress = (project) => {
    setSelectedProject(project);

    // Acciones para Técnico/Supervisor (auto-asignación/liberación)
    if (canSelfAssign) {
      if (!myPersona?.id) {
        return Alert.alert("Error", "No se encontró tu personalId (usuarios_permitidos.personalId).");
      }

      const iAmAssignedHere = myPersona.proyectoId === project.id || myPersona.proyectoAsignado === project.title;

      Alert.alert(
        project.title || "Proyecto",
        "Acción",
        [
          !iAmAssignedHere
            ? { text: "Asignarme a este proyecto", onPress: () => handleSelfAssign(project) }
            : { text: "Liberarme", style: "destructive", onPress: () => confirmSelfUnassign(project) },
          { text: "Cancelar", style: "cancel" },
        ]
      );

      return;
    }

    // Acciones para Administrador/Ingeniero (abre modal de acciones)
    openModal("actions");
  };

  /**
   * Navega a la pantalla de notas/detalles de un proyecto
   * @param {Object} project - Proyecto seleccionado
   */
  const handleProjectPress = (project) => {
    router.push({
      pathname: '/NoteScreen',
      params: {
        id: project.id,
        title: project.title || "Proyecto"
      },
    });
  };

  /**
   * Marca actividad de asignación en Firestore
   * Actualiza los campos de actividad del usuario
   */
  const markAssignActivity = async () => {
    if (!user?.uid) return;

    await updateDoc(doc(db, "usuarios_permitidos", user.uid), {
      ultimoLogin: serverTimestamp(),
      lastActivity: serverTimestamp(),
    });
  };

  /**
   * Marca actividad de liberación en Firestore
   * Actualiza solo el campo lastActivity
   */
  const markUnassignActivity = async () => {
    if (!user?.uid) return;

    await updateDoc(doc(db, "usuarios_permitidos", user.uid), {
      lastActivity: serverTimestamp(),
    });
  };

  /**
   * Asigna una persona a un proyecto (Administrador/Ingeniero)
   * @param {string} personId - ID de la persona a asignar
   */
  const handleAssignPerson = async (personId) => {
    if (!selectedProject || !personId) return;

    setLoading(true);
    try {
      const persona = personal.find(p => p.id === personId);
      if (!persona) {
        throw new Error('Persona no encontrada');
      }

      await personalService.assignToProject(persona.id, {
        id: selectedProject.id,
        title: selectedProject.title
      });

      closeAllModals();
      setSelectedProject(null);
      Alert.alert('Éxito', `${persona.nombre} asignado al proyecto`);
    } catch (error) {
      console.error('Error asignando personal:', error);
      Alert.alert('Error', error.message || 'No se pudo asignar el personal');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Libera a una persona de su asignación actual (Administrador/Ingeniero)
   * @param {Object} persona - Objeto de personal a liberar
   */
  const handleLiberarPersona = async (persona) => {
    if (!persona) return;

    Alert.alert(
      'Liberar personal',
      `¿Liberar a ${persona.nombre} del proyecto?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Liberar',
          onPress: async () => {
            try {
              await personalService.liberar(persona.id);
              Alert.alert('Éxito', `${persona.nombre} liberado del proyecto`);
            } catch (error) {
              console.error('Error liberando personal:', error);
              Alert.alert('Error', 'No se pudo liberar al personal');
            }
          },
        },
      ]
    );
  };

  /**
   * Ordena proyectos por fecha de creación (más recientes primero)
   * @type {Array}
   */
  const sortedProjects = (Array.isArray(projects) ? projects : [])
    .sort((a, b) => {
      const dateA = a.createdAt || a.startDate || 0;
      const dateB = b.createdAt || b.startDate || 0;
      return new Date(dateB) - new Date(dateA);
    });

  // ========== RENDER (Interfaz de usuario) ==========

  // Manejo de estado de error en la carga de proyectos
  if (projectsError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error cargando proyectos</Text>
        <Text style={styles.errorSubtext}>{projectsError.message}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => window.location.reload()}
        >
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    // Fondo con gradiente de amarillos/naranjas
    <LinearGradient colors={['#edf2b1ff', '#ffc782ff', '#FF4500']} style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        {/* Imagen de fondo con logo */}
        <Image
          source={require("../assets/images/terrall.png")}
          style={styles.bgImage}
          resizeMode="contain"
        />

        <View style={styles.container}>
          {/* Encabezado con título y estadísticas */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Proyectos Solares</Text>
              <Text style={styles.subtitle}>
                Gestión y seguimiento de instalaciones
              </Text>

              {/* Estadísticas de proyectos */}
              <Text style={styles.kwTotal}>
                ⚡ {formatPowerKw(totalKwAc, { suffix: "AC" })} instalados
              </Text>

              <Text style={styles.kwTotal}>
                🔋 {formatPowerKw(totalKwDc, { suffix: "DC" })} instalados
              </Text>

              <Text style={styles.kwTotal}>
                🧩 {formatInt(totalPaneles)} panel{totalPaneles !== 1 ? "es" : ""} instalados
              </Text>

              <Text style={styles.kwTotal}>
                🌿 ~{formatTons(co2TonsPerYear)} tCO₂/año (aprox.)
              </Text>
            </View>

            {/* Chip que muestra el rol del usuario */}
            {user?.email && (
              <View style={styles.userChip}>
                <Text style={styles.userChipText}>
                  {role || 'Usuario'}
                </Text>
              </View>
            )}
          </View>

          {/* Indicador de carga */}
          {(projectsLoading || personalLoading) && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF7A00" />
              <Text style={styles.loadingText}>Cargando proyectos...</Text>
            </View>
          )}

          {/* Lista principal de proyectos */}
          {!projectsLoading && (
            <ProjectList
              projects={sortedProjects}
              personal={personal}

              // Permisos y roles
              viewerRole={role}
              viewerPersonalId={myPersonalId}
              canManage={canManage}

              // Navegación
              onProjectPress={handleProjectPress}
              onProjectLongPress={handleProjectLongPress}

              // Gestión de personal (solo administradores)
              onLiberarPersona={handleLiberarPersona}
            />
          )}

          {/* Menú de botones flotantes (FAB) */}
          {!projectsLoading && (
            <FABMenu
              showSearch={true}
              showCompleted={true}
              showAdd={canManage}
              onAdd={() => openModal('add')}
              onSearch={() => openModal('search')}
              onCompleted={() => router.push('/CompletedProjectsScreen')}
            />
          )}

          {/* ========== MODALES ========== */}

          {/* Modal: Agregar nuevo proyecto */}
          <AddProjectModal
            visible={modals.add}
            onClose={closeAllModals}
            onAddProject={handleAddProject}
            loading={loading}
          />

          {/* Modal: Editar proyecto existente */}
          <EditProjectModal
            visible={modals.edit}
            project={selectedProject}
            onClose={closeAllModals}
            onSave={handleEditProject}
            loading={loading}
          />

          {/* Modal: Asignar personal a proyecto */}
          <AssignPersonModal
            visible={modals.assign}
            project={selectedProject}
            personal={personal}
            onClose={closeAllModals}
            onAssign={handleAssignPerson}
            loading={loading}
          />

          {/* Modal: Acciones disponibles para un proyecto */}
          <ProjectActionsModal
            visible={modals.actions}
            project={selectedProject}
            onClose={closeAllModals}
            onEdit={() => {
              closeModal('actions');
              openModal('edit');
            }}
            onAssign={() => {
              closeModal('actions');
              openModal('assign');
            }}
            onDelete={handleDeleteProject}
            canManage={canManage}
            loading={loading}
          />

          {/* Modal: Buscar proyectos por nombre, personal, etc. */}
          <SearchModal
            visible={modals.search}
            onClose={closeAllModals}
            projects={projects}
            personal={personal}
            onProjectPress={handleProjectPress}
            onProjectLongPress={handleProjectLongPress}
          />
        </View>
      </View>
    </LinearGradient>
  );
}

// ========== ESTILOS ==========
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40, // Espacio para status bar
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: 'rgba(255, 248, 242, 0.82)', // Fondo semitransparente sobre gradiente
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    color: '#111827', // Gris muy oscuro
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280', // Gris medio
    marginTop: 4,
  },
  kwTotal: {
    fontSize: 13,
    color: '#374151', // Gris oscuro
    marginTop: 6,
    fontWeight: '700',
  },
  userChip: {
    backgroundColor: '#111827', // Fondo oscuro
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999, // Forma circular
  },
  userChipText: {
    color: '#F9FAFB', // Blanco
    fontSize: 12,
    fontWeight: '600',
  },
  bgImage: {
    position: "absolute",
    width: 260,
    height: 130,
    bottom: 40,
    left: '50%',
    marginLeft: -130, // Centra horizontalmente (mitad del ancho)
    opacity: 0.22, // Baja opacidad para no interferir con contenido
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 12,
    color: '#4B5563', // Gris
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A', // Azul oscuro
    padding: 20,
  },
  errorText: {
    color: '#F97373', // Rojo anaranjado
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    color: '#CBD5F5', // Azul muy claro
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4F46E5', // Azul índigo
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});
