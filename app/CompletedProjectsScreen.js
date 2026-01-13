// screens/CompletedProjectsScreen.js
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// Firebase
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

// Context + hooks
import { useUser } from '../context/UserContext';
import { useCompletedProjects } from '../hooks/useCompletedProjects';
import { useMultiModal } from '../hooks/useModal';
import { usePersonal } from '../hooks/usePersonal';

// Services
import { personalService } from '../services/personalService';

// Components (mismos de Home)
import AssignPersonModal from '../components/home/AssignPersonModal';
import ProjectList from '../components/home/ProjectList';
import SearchModal from '../components/home/SearchModal';
import FABMenu from '../components/shared/FABMenu';

/**
 * Pantalla de proyectos completados que muestra todos los proyectos finalizados.
 * 
 * Esta pantalla:
 * - Muestra una lista de proyectos con estado 100% completado
 * - Permite ver detalles de proyectos en modo solo lectura
 * - Mantiene funcionalidades de asignación (para administradores/ingenieros)
 * - Permite auto-asignación (para técnicos/supervisores)
 * - Incluye búsqueda y navegación al home
 * 
 * @component
 * @example
 * // Navegación desde HomeScreen:
 * // router.push('/CompletedProjectsScreen')
 * 
 * @returns {JSX.Element} Componente de la pantalla de proyectos completados
 */
export default function CompletedProjectsScreen() {
  const router = useRouter();
  const { role, user } = useUser();

  // Hooks para obtener datos
  const { completedProjects, loading: projectsLoading, error: projectsError } = useCompletedProjects();
  const { personal, loading: personalLoading } = usePersonal();

  // Estados locales
  const [selectedProject, setSelectedProject] = useState(null); // Proyecto seleccionado para acciones
  const [loading, setLoading] = useState(false); // Estado de carga para operaciones

  // Estados para gestión del usuario actual
  const [myPersonalId, setMyPersonalId] = useState(null); // ID del personal asociado al usuario
  const [myPersonalLoading, setMyPersonalLoading] = useState(true); // Carga del personal del usuario

  // Gestión de modales múltiples
  const { modals, openModal, closeModal, closeAllModals } = useMultiModal({
    assign: false, // Modal de asignación de personal
    actions: false, // Modal de acciones (no usado aquí, mantenido por compatibilidad)
    search: false, // Modal de búsqueda
  });

  // Permisos basados en el rol del usuario
  const canManage = useMemo(() => ['Administrador', 'Ingeniero'].includes(role), [role]); // Puede gestionar asignaciones
  const canSelfAssign = useMemo(() => ['Tecnico', 'Supervisor'].includes(role), [role]); // Puede auto-asignarse

  /**
   * Obtiene el personalId del usuario actual desde la colección 'usuarios_permitidos'
   * Similar a la implementación en HomeScreen
   */
  useEffect(() => {
    let cancelled = false; // Flag para prevenir actualizaciones después de desmontar

    (async () => {
      try {
        if (!user?.uid) return; // Verifica que exista un usuario
        const ref = doc(db, 'usuarios_permitidos', user.uid);
        const snap = await getDoc(ref);
        const pid = snap.exists() ? snap.data()?.personalId : null; // Extrae personalId

        if (!cancelled) setMyPersonalId(pid || null);
      } catch (e) {
        console.error('Error leyendo personalId del usuario:', e);
        if (!cancelled) setMyPersonalId(null);
      } finally {
        if (!cancelled) setMyPersonalLoading(false);
      }
    })();

    return () => {
      cancelled = true; // Limpia al desmontar el componente
    };
  }, [user?.uid]);

  /**
   * Encuentra el objeto de personal correspondiente al usuario actual
   * @returns {Object|null} Objeto del personal del usuario o null si no existe
   */
  const myPersona = useMemo(() => {
    if (!myPersonalId) return null;
    return (personal || []).find((p) => p.id === myPersonalId) || null;
  }, [personal, myPersonalId]);

  // --- Registro de actividad (igual que en HomeScreen) ---

  /**
   * Marca actividad de asignación en Firestore
   */
  const markAssignActivity = async () => {
    if (!user?.uid) return;
    await updateDoc(doc(db, 'usuarios_permitidos', user.uid), {
      ultimoLogin: serverTimestamp(),
      lastActivity: serverTimestamp(),
    });
  };

  /**
   * Marca actividad de liberación en Firestore
   */
  const markUnassignActivity = async () => {
    if (!user?.uid) return;
    await updateDoc(doc(db, 'usuarios_permitidos', user.uid), {
      lastActivity: serverTimestamp(),
    });
  };

  // --- Navegación ---

  /**
   * Navega a la pantalla de notas del proyecto en modo solo lectura
   * @param {Object} project - Proyecto seleccionado
   */
  const handleProjectPress = (project) => {
    router.push({
      pathname: '/NoteScreen',
      params: {
        id: project.id,
        title: project.title || 'Proyecto',
        readOnly: 'true', // Modo solo lectura para proyectos completados
        isCompleted: 'true', // Indica que es un proyecto completado
      },
    });
  };

  // --- Asignación de personal (Administrador/Ingeniero) ---

  /**
   * Asigna una persona a un proyecto (similar a HomeScreen)
   * @param {string} personId - ID de la persona a asignar
   */
  const handleAssignPerson = async (personId) => {
    if (!selectedProject || !personId) return;

    setLoading(true);
    try {
      const persona = (personal || []).find((p) => p.id === personId);
      if (!persona) throw new Error('Persona no encontrada');

      await personalService.assignToProject(persona.id, {
        id: selectedProject.id,
        title: selectedProject.title,
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
   * Libera a una persona de su asignación actual
   * @param {Object} persona - Objeto de personal a liberar
   */
  const handleLiberarPersona = async (persona) => {
    if (!persona) return;

    Alert.alert('Liberar personal', `¿Liberar a ${persona.nombre} del proyecto?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Liberar',
        style: 'destructive',
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
    ]);
  };

  // --- Auto-asignación (Técnico/Supervisor) ---

  /**
   * Permite que un técnico o supervisor se asigne a sí mismo a un proyecto
   * @param {Object} project - Proyecto al cual auto-asignarse
   */
  const handleSelfAssign = async (project) => {
    if (!canSelfAssign) return;
    if (myPersonalLoading) return Alert.alert('Espera', 'Cargando tu perfil...');
    if (!myPersona?.id) return Alert.alert('Error', 'No se encontró tu personalId (usuarios_permitidos.personalId).');

    setLoading(true);
    try {
      await personalService.selfAssignToProject(myPersona.id, { id: project.id, title: project.title });
      await markAssignActivity();
      Alert.alert('Éxito', 'Te asignaste al proyecto.');
    } catch (e) {
      console.error('Error auto-asignando:', e);
      Alert.alert('Error', e?.message || 'No se pudo asignar.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Muestra confirmación para auto-liberarse de un proyecto
   * @param {Object} project - Proyecto del cual liberarse
   */
  const confirmSelfUnassign = (project) => {
    Alert.alert('Liberar personal', '¿Liberarte del proyecto?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Liberar',
        style: 'destructive',
        onPress: () => handleSelfUnassign(project),
      },
    ]);
  };

  /**
   * Permite que un técnico o supervisor se libere de su asignación actual
   */
  const handleSelfUnassign = async () => {
    if (!canSelfAssign) return;
    if (myPersonalLoading) return Alert.alert('Espera', 'Cargando tu perfil...');
    if (!myPersona?.id) return Alert.alert('Error', 'No se encontró tu personalId (usuarios_permitidos.personalId).');

    setLoading(true);
    try {
      await personalService.liberar(myPersona.id);
      await markUnassignActivity();
      Alert.alert('Éxito', 'Te liberaste del proyecto.');
    } catch (e) {
      console.error('Error auto-liberando:', e);
      Alert.alert('Error', e?.message || 'No se pudo liberar.');
    } finally {
      setLoading(false);
    }
  };

  // --- Manejo de presión larga (long press) ---

  /**
   * Maneja el evento de presión larga sobre un proyecto
   * Muestra diferentes opciones según el rol del usuario
   * @param {Object} project - Proyecto sobre el que se hizo long press
   */
  const handleProjectLongPress = (project) => {
    setSelectedProject(project);

    // Acciones para Técnico/Supervisor (auto-asignación)
    if (canSelfAssign) {
      if (!myPersona?.id) {
        return Alert.alert('Error', 'No se encontró tu personalId (usuarios_permitidos.personalId).');
      }

      const iAmAssignedHere =
        myPersona.proyectoId === project.id || myPersona.proyectoAsignado === project.title;

      Alert.alert(project.title || 'Proyecto', 'Acción', [
        !iAmAssignedHere
          ? { text: 'Asignarme a este proyecto', onPress: () => handleSelfAssign(project) }
          : { text: 'Liberarme', style: 'destructive', onPress: () => confirmSelfUnassign(project) },
        { text: 'Cancelar', style: 'cancel' },
      ]);

      return;
    }

    // Acciones para Administrador/Ingeniero (abre modal de asignación)
    if (canManage) {
      openModal('assign');
    }
  };

  /**
   * Prepara los proyectos completados para mostrar en la lista
   * Asegura que todos tengan progress: 1 (100%) y los ordena por fecha
   * @returns {Array} Lista de proyectos procesados
   */
  const completedWithProgress = useMemo(() => {
    const list = Array.isArray(completedProjects) ? completedProjects : [];
    return list
      .map((p) => ({
        ...p,
        progress: 1, // 100% completado
        retrasada: false, // Los proyectos completados no están retrasados
      }))
      .sort((a, b) => {
        // Ordena por fecha (más reciente primero)
        const dateA = a.completedAt || a.createdAt || a.startDate || 0;
        const dateB = b.completedAt || b.createdAt || b.startDate || 0;
        return new Date(dateB) - new Date(dateA);
      });
  }, [completedProjects]);

  // Render de estado de error
  if (projectsError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error cargando proyectos completados</Text>
        <Text style={styles.errorSubtext}>{projectsError.message}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
          <Text style={styles.retryButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    // Fondo con gradiente de naranjas
    <LinearGradient colors={['#edf2b1ff', '#ffc782ff', '#FF4500']} style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        {/* Imagen de fondo con logo */}
        <Image
          source={require('../assets/images/terrall.png')}
          style={styles.bgImage}
          resizeMode="contain"
        />

        <View style={styles.container}>
          {/* Encabezado con título y rol del usuario */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Proyectos Completados</Text>
              <Text style={styles.subtitle}>
                {completedWithProgress.length} proyecto{completedWithProgress.length !== 1 ? 's' : ''} finalizado
                {completedWithProgress.length !== 1 ? 's' : ''}
              </Text>
            </View>

            {!!role && (
              <View style={styles.userChip}>
                <Text style={styles.userChipText}>{role}</Text>
              </View>
            )}
          </View>

          {/* Indicador de carga */}
          {(projectsLoading || personalLoading) && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF7A00" />
              <Text style={styles.loadingText}>Cargando...</Text>
            </View>
          )}

          {/* Lista de proyectos completados */}
          {!projectsLoading && (
            <ProjectList
              projects={completedWithProgress}
              personal={personal}
              viewerRole={role}
              viewerPersonalId={myPersonalId}
              canManage={canManage}
              onProjectPress={handleProjectPress}
              onProjectLongPress={handleProjectLongPress}
              onLiberarPersona={handleLiberarPersona}
              loading={false}
            />
          )}

          {/* Menú FAB: búsqueda + navegación al home */}
          <FABMenu
            showHome={true}
            showSearch={true}
            onHome={() => router.push('/HomeScreen')}
            onSearch={() => openModal('search')}
            mainIcon="menu"
          />

          {/* Modal para asignar personal (solo Administrador/Ingeniero) */}
          <AssignPersonModal
            visible={modals.assign}
            project={selectedProject}
            personal={personal}
            onClose={closeAllModals}
            onAssign={handleAssignPerson}
            loading={loading}
          />

          {/* Modal de búsqueda de proyectos */}
          <SearchModal
            visible={modals.search}
            onClose={closeAllModals}
            projects={completedWithProgress}
            personal={personal}
            onProjectPress={handleProjectPress}
            onProjectLongPress={handleProjectLongPress}
          />
        </View>
      </View>
    </LinearGradient>
  );
}

// Estilos de la pantalla
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40, // Espacio para status bar
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: 'rgba(255, 248, 242, 0.85)', // Fondo semitransparente sobre gradiente
  },

  header: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },

  title: { fontSize: 24, fontWeight: '800', color: '#111827' }, // Título principal
  subtitle: { marginTop: 4, color: '#6B7280', fontSize: 13 }, // Subtítulo descriptivo

  userChip: {
    backgroundColor: '#111827',
    borderRadius: 999, // Círculo perfecto
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  userChipText: { color: '#F9FAFB', fontSize: 12, fontWeight: '700' }, // Texto del chip de rol

  loadingContainer: { paddingVertical: 24, alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#4B5563' },

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  errorText: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 6, textAlign: 'center' },
  errorSubtext: { color: '#6B7280', textAlign: 'center', marginBottom: 12 },
  retryButton: {
    backgroundColor: '#111827',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryButtonText: { color: '#FFF', fontWeight: '700' },

  bgImage: {
    position: 'absolute',
    width: 260,
    height: 130,
    bottom: 40,
    left: '50%',
    marginLeft: -130, // Centra horizontalmente (mitad del ancho)
    opacity: 0.22, // Baja opacidad para no interferir con contenido
  },
});