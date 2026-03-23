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
import { formatPowerDc, formatPowerKw } from '../utils/formatPower';

export default function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { role, user } = useUser();

  // Estados locales
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [myPersonalId, setMyPersonalId] = useState(null);
  const [myPersonalLoading, setMyPersonalLoading] = useState(true);

  // Hooks personalizados para obtener datos
  const { projects, loading: projectsLoading, error: projectsError } = useProjects();
  const { personal, loading: personalLoading } = usePersonal();
  const { completedProjects } = useCompletedProjects();
  const { modals, openModal, closeModal, closeAllModals } = useMultiModal({
    add: false,
    edit: false,
    assign: false,
    actions: false,
    search: false
  });

  // Hooks de utilidad
  useBackHandler();
  useNotifications();

  // Permisos basados en el rol
  const canManage = ["Administrador", "Ingeniero"].includes(role);
  const canSelfAssign = ["Tecnico", "Supervisor"].includes(role);

  const myPersona = useMemo(() => {
    if (!myPersonalId) return null;
    return (personal || []).find(p => p.id === myPersonalId) || null;
  }, [personal, myPersonalId]);

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

  const allProjects = useMemo(() => {
    return [
      ...(Array.isArray(projects) ? projects : []),
      ...(Array.isArray(completedProjects) ? completedProjects : []),
    ];
  }, [projects, completedProjects]);

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

  const co2TonsPerYear = useMemo(() => {
    const CAPACITY_FACTOR = 0.18;
    const GRID_CO2_KG_PER_KWH = 0.4;
    const HOURS_YEAR = 8760;

    const kwhYear = totalKwDc * HOURS_YEAR * CAPACITY_FACTOR;
    const kgCo2Year = kwhYear * GRID_CO2_KG_PER_KWH;
    const tons = kgCo2Year / 1000;

    if (!Number.isFinite(tons) || tons <= 0) return 0;
    return tons;
  }, [totalKwDc]);

  const formatInt = (n) => Number(n || 0).toLocaleString("es-CO");
  const formatTons = (n) =>
    Number(n || 0).toLocaleString("es-CO", { maximumFractionDigits: 2 });

  // ========== HANDLERS ==========

  const handleAddProject = async (projectData) => {
    setLoading(true);
    try {
      const result = await projectService.create(projectData);

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
   * Auto-asignarse a un proyecto (Técnico/Supervisor).
   * Para Administrador/Ingeniero se muestra un prompt opcional de actividad.
   */
  const handleSelfAssign = async (project) => {
    if (!canSelfAssign && !canManage) return;
    if (myPersonalLoading) return Alert.alert("Espera", "Cargando tu perfil...");
    if (!myPersona?.id) return Alert.alert("Error", "No se encontró tu personalId (usuarios_permitidos.personalId).");

    // For Administrador/Ingeniero: show optional activity prompt
    if (canManage) {
      Alert.prompt(
        "Actividad (opcional)",
        "¿Qué se va a hacer en este proyecto?",
        [
          { text: "Omitir", onPress: () => doSelfAssign(project, "") },
          {
            text: "Guardar",
            onPress: (actividad) => doSelfAssign(project, actividad || ""),
          },
        ],
        "plain-text",
        "",
        "default"
      );
      return;
    }

    // For Técnico/Supervisor: assign directly without activity
    doSelfAssign(project, "");
  };

  const doSelfAssign = async (project, actividad) => {
    setLoading(true);
    try {
      await personalService.selfAssignToProject(
        myPersona.id,
        { id: project.id, title: project.title },
        actividad
      );
      await markAssignActivity();
      Alert.alert("Éxito", "Te asignaste al proyecto.");
    } catch (e) {
      console.error("Error auto-asignando:", e);
      Alert.alert("Error", e?.message || "No se pudo asignar.");
    } finally {
      setLoading(false);
    }
  };

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

  const handleSelfUnassign = async (project) => {
    if (!canSelfAssign && !canManage) return;
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

  const handleProjectPress = (project) => {
    router.push({
      pathname: '/NoteScreen',
      params: {
        id: project.id,
        title: project.title || "Proyecto"
      },
    });
  };

  const markAssignActivity = async () => {
    if (!user?.uid) return;

    await updateDoc(doc(db, "usuarios_permitidos", user.uid), {
      ultimoLogin: serverTimestamp(),
      lastActivity: serverTimestamp(),
    });
  };

  const markUnassignActivity = async () => {
    if (!user?.uid) return;

    await updateDoc(doc(db, "usuarios_permitidos", user.uid), {
      lastActivity: serverTimestamp(),
    });
  };

  /**
   * Asigna una persona a un proyecto (Administrador/Ingeniero).
   * Now receives actividad as second argument from AssignPersonModal.
   */
  const handleAssignPerson = async (personId, actividad = "") => {
    if (!selectedProject || !personId) return;

    setLoading(true);
    try {
      const persona = personal.find(p => p.id === personId);
      if (!persona) {
        throw new Error('Persona no encontrada');
      }

      await personalService.assignToProject(
        persona.id,
        { id: selectedProject.id, title: selectedProject.title },
        actividad
      );

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

  const sortedProjects = (Array.isArray(projects) ? projects : [])
    .sort((a, b) => {
      const dateA = a.createdAt || a.startDate || 0;
      const dateB = b.createdAt || b.startDate || 0;
      return new Date(dateB) - new Date(dateA);
    });

  // ========== RENDER ==========

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
    <LinearGradient colors={['#edf2b1ff', '#ffc782ff', '#FF4500']} style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <Image
          source={require("../assets/images/terrall.png")}
          style={styles.bgImage}
          resizeMode="contain"
        />

        <View style={styles.container}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Proyectos Solares</Text>
              <Text style={styles.subtitle}>
                Gestión y seguimiento de instalaciones
              </Text>

              <Text style={styles.kwTotal}>
                ⚡ {formatPowerKw(totalKwAc, { suffix: "AC" })} instalados
              </Text>

              <Text style={styles.kwTotal}>
                🔋 {formatPowerDc(totalKwDc, { suffix: "DC" })} instalados
              </Text>

              <Text style={styles.kwTotal}>
                🧩 {formatInt(totalPaneles)} panel{totalPaneles !== 1 ? "es" : ""} instalados
              </Text>

              <Text style={styles.kwTotal}>
                🌿 ~{formatTons(co2TonsPerYear)} tCO₂/año (aprox.)
              </Text>
            </View>

            {user?.email && (
              <View style={styles.userChip}>
                <Text style={styles.userChipText}>
                  {role || 'Usuario'}
                </Text>
              </View>
            )}
          </View>

          {(projectsLoading || personalLoading) && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF7A00" />
              <Text style={styles.loadingText}>Cargando proyectos...</Text>
            </View>
          )}

          {!projectsLoading && (
            <ProjectList
              projects={sortedProjects}
              personal={personal}
              viewerRole={role}
              viewerPersonalId={myPersonalId}
              canManage={canManage}
              onProjectPress={handleProjectPress}
              onProjectLongPress={handleProjectLongPress}
              onLiberarPersona={handleLiberarPersona}
            />
          )}

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

          <AddProjectModal
            visible={modals.add}
            onClose={closeAllModals}
            onAddProject={handleAddProject}
            loading={loading}
          />

          <EditProjectModal
            visible={modals.edit}
            project={selectedProject}
            onClose={closeAllModals}
            onSave={handleEditProject}
            loading={loading}
          />

          {/* AssignPersonModal now receives role to show activity field */}
          <AssignPersonModal
            visible={modals.assign}
            project={selectedProject}
            personal={personal}
            onClose={closeAllModals}
            onAssign={handleAssignPerson}
            loading={loading}
            role={role}
          />

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
    paddingTop: 40,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: 'rgba(255, 248, 242, 0.82)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    color: '#111827',
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  kwTotal: {
    fontSize: 13,
    color: '#374151',
    marginTop: 6,
    fontWeight: '700',
  },
  userChip: {
    backgroundColor: '#111827',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  userChipText: {
    color: '#F9FAFB',
    fontSize: 12,
    fontWeight: '600',
  },
  bgImage: {
    position: "absolute",
    width: 260,
    height: 130,
    bottom: 40,
    left: '50%',
    marginLeft: -130,
    opacity: 0.22,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 12,
    color: '#4B5563',
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: 20,
  },
  errorText: {
    color: '#F97373',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    color: '#CBD5F5',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});