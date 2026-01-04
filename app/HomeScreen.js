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

export default function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { role, user } = useUser();
  
  // Estados
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [myPersonalId, setMyPersonalId] = useState(null);
  const [myPersonalLoading, setMyPersonalLoading] = useState(true);

  // Hooks personalizados
  const { projects, loading: projectsLoading, error: projectsError } = useProjects();
  const { personal, loading: personalLoading } = usePersonal();
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

  // Permisos
  // Permisos (según punto 13)
const canManage = ["Administrador", "Ingeniero"].includes(role); // gestión real
const canSelfAssign = ["Tecnico", "Supervisor"].includes(role);  // auto-asignación / auto-liberación

// Persona del usuario (si ya cargó personal)
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

  // Total kW AC instalados (suma de todos los proyectos)
  const totalKwAc = useMemo(() => {
    const list = Array.isArray(projects) ? projects : [];
    const total = list.reduce((acc, p) => {
      const kw = Number(
        p?.potenciaAcKw ??
        p?.potenciaACKw ??
        p?.potenciaAC ??
        p?.potenciaAc ??
        0
      );
      return acc + (isNaN(kw) ? 0 : kw);
    }, 0);

    return total;
  }, [projects]);

  // ========== HANDLERS ==========

  const handleAddProject = async (projectData) => {
    setLoading(true);
    try {
      const result = await projectService.create(projectData);
      
      // Crear etapas automáticamente
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
              // Verificar ID del proyecto
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

  const handleSelfAssign = async (project) => {
  if (!canSelfAssign) return;
  if (myPersonalLoading) return Alert.alert("Espera", "Cargando tu perfil...");
  if (!myPersona?.id) return Alert.alert("Error", "No se encontró tu personalId (usuarios_permitidos.personalId).");

  setLoading(true);
  try {
    await personalService.selfAssignToProject(myPersona.id, { id: project.id, title: project.title });
    await markAssignActivity(); // asignar => ultimoLogin + lastActivity
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
  if (!canSelfAssign) return;
  if (myPersonalLoading) return Alert.alert("Espera", "Cargando tu perfil...");
  if (!myPersona?.id) {
    return Alert.alert("Error", "No se encontró tu personalId (usuarios_permitidos.personalId).");
  }

  setLoading(true);
  try {
    await personalService.liberar(myPersona.id);

    // desasignar => SOLO lastActivity
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

  // Técnico/Supervisor: self actions
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

  // Admin/Ingeniero: modal acciones
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


  const handleAssignPerson = async (personId) => {
    if (!selectedProject || !personId) return;
    
    setLoading(true);
    try {
      // Buscar la persona seleccionada
      const persona = personal.find(p => p.id === personId);
      if (!persona) {
        throw new Error('Persona no encontrada');
      }

      await personalService.assignToProject(persona.id, {
        id:selectedProject.id,
        title:selectedProject.title});
      
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

  // ORDENAR POR FECHA DE CREACIÓN (más recientes primero)
  const sortedProjects = projects
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
        {/* Imagen de fondo */}
        <Image
          source={require("../assets/images/terrall.png")}
          style={styles.bgImage}
          resizeMode="contain"
        />

        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Proyectos Solares</Text>
              <Text style={styles.subtitle}>
                Gestión y seguimiento de instalaciones
              </Text>

              {/* NUEVO: total de kW AC sumados */}
              <Text style={styles.kwTotal}>
                ⚡ {formatPowerKw(totalKwAc, { suffix: "AC" })} instalados
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

          {/* Loading state */}
          {(projectsLoading || personalLoading) && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF7A00" />
              <Text style={styles.loadingText}>Cargando proyectos...</Text>
            </View>
          )}

          {/* Lista de proyectos */}
          {!projectsLoading && (
            <ProjectList
  projects={sortedProjects}
  personal={personal}

  // roles/permisos
  viewerRole={role}
  viewerPersonalId={myPersonalId}
  canManage={canManage}

  // navegación
  onProjectPress={handleProjectPress}
  onProjectLongPress={handleProjectLongPress}

  // admin libera a otros
  onLiberarPersona={handleLiberarPersona}
/>

          )}

          {/* Botones flotantes */}
          {canManage && !projectsLoading && (
            <FABMenu
              showSearch={true}
              showAdd={true}
              showCompleted={true}
              onAdd={() => openModal('add')}
              onSearch={() => openModal('search')}
              onCompleted={() => router.push('/CompletedProjectsScreen')}
            />  
          )}

          {/* ========== MODALES ========== */}

          {/* Modal: Agregar Proyecto */}
          <AddProjectModal
            visible={modals.add}
            onClose={closeAllModals}
            onAddProject={handleAddProject}
            loading={loading}
          />

          {/* Modal: Editar Proyecto */}
          <EditProjectModal
            visible={modals.edit}
            project={selectedProject}
            onClose={closeAllModals}
            onSave={handleEditProject}
            loading={loading}
          />

          {/* Modal: Asignar Personal */}
          <AssignPersonModal
            visible={modals.assign}
            project={selectedProject}
            personal={personal}
            onClose={closeAllModals}
            onAssign={handleAssignPerson}
            loading={loading}
          />

          {/* Modal: Acciones del Proyecto */}
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

          {/* Modal: Buscar Proyectos */}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: 'rgba(255, 248, 242, 0.82)', // capa clara encima del gradiente
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
