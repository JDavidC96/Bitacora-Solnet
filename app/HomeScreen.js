// screens/HomeScreen.js
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

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

export default function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { role, user } = useUser();
  
  // Estados
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(false);

  // Hooks personalizados
  const { projects, loading: projectsLoading, error: projectsError } = useProjects();
  const { personal, loading: personalLoading } = usePersonal();
  const { modals, openModal, closeModal, closeAllModals } = useMultiModal({
    add: false,
    edit: false,
    assign: false,
    actions: false
  });
  
  // Hooks de utilidad
  useBackHandler();
  useNotifications();

  // Permisos
  const canManage = ["Administrador", "Ingeniero", "Supervisor"].includes(role);

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

  const handleProjectLongPress = (project) => {
    setSelectedProject(project);
    openModal('actions');
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

  const handleAssignPerson = async (personId) => {
  if (!selectedProject || !personId) return;
  
  setLoading(true);
  try {
    // Buscar la persona seleccionada
    const persona = personal.find(p => p.id === personId);
    if (!persona) {
      throw new Error('Persona no encontrada');
    }

    // Usar el servicio directamente (sin import dinámico)
    await personalService.assignToProject(persona.id, selectedProject.title);
    
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
              const { personalService } = await import('../services/personalService');
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
          <Text style={styles.title}>Proyectos Solares</Text>

          {/* Loading state */}
          {(projectsLoading || personalLoading) && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF4500" />
              <Text style={styles.loadingText}>Cargando proyectos...</Text>
            </View>
          )}

          {/* Lista de proyectos */}
          {!projectsLoading && (
            <ProjectList
              projects={projects}
              personal={personal}
              canManage={canManage}
              onProjectPress={handleProjectPress}
              onProjectLongPress={handleProjectLongPress}
              onLiberarPersona={handleLiberarPersona}
            />
          )}

          {/* Botón flotante para agregar proyecto */}
          {canManage && !projectsLoading && (
            <TouchableOpacity
              style={styles.fab}
              onPress={() => openModal('add')}
            >
              <Text style={styles.fabText}>+</Text>
            </TouchableOpacity>
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
          />
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 26,
    color: '#000000',
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  fab: {
    position: "absolute",
    right: 24,
    bottom: 24,
    backgroundColor: "#ff7300",
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  fabText: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '900',
    marginTop: -2,
  },
  bgImage: {
    position: "absolute",
    width: 250,
    height: 120,
    marginTop: 390,
    opacity: 0.4,
    marginLeft: 85,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#000000',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E1E2F',
    padding: 20,
  },
  errorText: {
    color: '#F56565',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    color: '#CCC',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#5A67D8',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});