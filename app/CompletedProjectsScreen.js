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

export default function CompletedProjectsScreen() {
  const router = useRouter();
  const { role, user } = useUser();

  const { completedProjects, loading: projectsLoading, error: projectsError } = useCompletedProjects();
  const { personal, loading: personalLoading } = usePersonal();

  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(false);

  const [myPersonalId, setMyPersonalId] = useState(null);
  const [myPersonalLoading, setMyPersonalLoading] = useState(true);

  const { modals, openModal, closeModal, closeAllModals } = useMultiModal({
    assign: false,
    actions: false, // lo dejamos por compatibilidad, pero no lo usamos aquí
    search: false,
  });

  // Permisos idénticos a Home
  const canManage = useMemo(() => ['Administrador', 'Ingeniero'].includes(role), [role]);
  const canSelfAssign = useMemo(() => ['Tecnico', 'Supervisor'].includes(role), [role]);

  // Leer personalId desde usuarios_permitidos (igual Home)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (!user?.uid) return;
        const ref = doc(db, 'usuarios_permitidos', user.uid);
        const snap = await getDoc(ref);
        const pid = snap.exists() ? snap.data()?.personalId : null;

        if (!cancelled) setMyPersonalId(pid || null);
      } catch (e) {
        console.error('Error leyendo personalId del usuario:', e);
        if (!cancelled) setMyPersonalId(null);
      } finally {
        if (!cancelled) setMyPersonalLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const myPersona = useMemo(() => {
    if (!myPersonalId) return null;
    return (personal || []).find((p) => p.id === myPersonalId) || null;
  }, [personal, myPersonalId]);

  // --- Activity tracking (igual Home) ---
  const markAssignActivity = async () => {
    if (!user?.uid) return;
    await updateDoc(doc(db, 'usuarios_permitidos', user.uid), {
      ultimoLogin: serverTimestamp(),
      lastActivity: serverTimestamp(),
    });
  };

  const markUnassignActivity = async () => {
    if (!user?.uid) return;
    await updateDoc(doc(db, 'usuarios_permitidos', user.uid), {
      lastActivity: serverTimestamp(),
    });
  };

  // --- Navegación ---
  const handleProjectPress = (project) => {
    router.push({
      pathname: '/NoteScreen',
      params: {
        id: project.id,
        title: project.title || 'Proyecto',
        readOnly: 'true',
        isCompleted: 'true',
      },
    });
  };

  // --- Asignación Admin/Ing (igual Home) ---
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

  // --- Auto-asignación Técnico/Supervisor (igual Home) ---
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

  // --- Long press (igual Home) ---
  const handleProjectLongPress = (project) => {
    setSelectedProject(project);

    // Técnico/Supervisor: self actions
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

    // Admin/Ingeniero: abrir modal de asignación directo
    if (canManage) {
      openModal('assign');
    }
  };

  // Ajustar data para que el card se vea coherente (100%)
  const completedWithProgress = useMemo(() => {
    const list = Array.isArray(completedProjects) ? completedProjects : [];
    return list
      .map((p) => ({
        ...p,
        progress: 1, // 100%
        retrasada: false,
      }))
      .sort((a, b) => {
        const dateA = a.completedAt || a.createdAt || a.startDate || 0;
        const dateB = b.completedAt || b.createdAt || b.startDate || 0;
        return new Date(dateB) - new Date(dateA);
      });
  }, [completedProjects]);

  // Render loading/error
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
    <LinearGradient colors={['#edf2b1ff', '#ffc782ff', '#FF4500']} style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <Image
          source={require('../assets/images/terrall.png')}
          style={styles.bgImage}
          resizeMode="contain"
        />

        <View style={styles.container}>
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

          {(projectsLoading || personalLoading) && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF7A00" />
              <Text style={styles.loadingText}>Cargando...</Text>
            </View>
          )}

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

          {/* FAB: buscar + volver al home */}
          <FABMenu
            showHome={true}
            showSearch={true}
            onHome={() => router.push('/HomeScreen')}
            onSearch={() => openModal('search')}
            mainIcon="menu"
          />

          {/* Modal asignación (Admin/Ing) */}
          <AssignPersonModal
            visible={modals.assign}
            project={selectedProject}
            personal={personal}
            onClose={closeAllModals}
            onAssign={handleAssignPerson}
            loading={loading}
          />

          {/* Modal búsqueda */}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: 'rgba(255, 248, 242, 0.85)',
  },

  header: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },

  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  subtitle: { marginTop: 4, color: '#6B7280', fontSize: 13 },

  userChip: {
    backgroundColor: '#111827',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  userChipText: { color: '#F9FAFB', fontSize: 12, fontWeight: '700' },

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
    marginLeft: -130,
    opacity: 0.22,
  },
});
