// screens/CompletedProjectsScreen.js
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import FABMenu from '../components/shared/FABMenu';
import { useUser } from '../context/UserContext';
import { useCompletedProjects } from '../hooks/useCompletedProjects';
import { usePersonal } from '../hooks/usePersonal';
import personalService from '../services/personalService';

export default function CompletedProjectsScreen() {
  const router = useRouter();
  const { role } = useUser();

  const { completedProjects, loading, error } = useCompletedProjects();
  const { personal } = usePersonal();

  const [selectedProject, setSelectedProject] = useState(null);
  const [assignVisible, setAssignVisible] = useState(false);

  const canManage = ["Administrador", "Ingeniero", "Supervisor"].includes(role);

  const handleAssign = (project) => {
    setSelectedProject(project);
    setAssignVisible(true);
  };

  const handleLiberar = async (persona) => {
  if (!persona) return;

  try {
    await personalService.liberar(persona.id);
    alert(`${persona.nombre} ha sido liberado del proyecto`);
  } catch (err) {
    alert('Error liberando personal');
    console.log(err);
  }
};


  const ProjectCardCompleted = ({ project }) => {
    const asignados = personal.filter(p => p.proyectoAsignado === project.title);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          router.push({
            pathname: '/NoteScreen',
            params: { 
              id: project.id,
              title: project.title,
              readOnly: 'true',
              isCompleted: 'true'
            }
          })
        }
      >
        {/* Header */}
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>{project.title}</Text>

          <View style={styles.badge}>
            <Text style={styles.badgeText}>✔ Completado</Text>
          </View>
        </View>

        {/* Ubicación */}
        {project.ubicacion ? (
          <Text style={styles.location}>📍 {project.ubicacion}</Text>
        ) : (
          <Text style={styles.locationMuted}>📍 (Sin ubicación)</Text>
        )}

        {/* Fecha de finalización */}
        {project.completedAt && (
          <Text style={styles.completedDate}>
            Finalizado: {new Date(project.completedAt).toLocaleDateString()}
          </Text>
        )}

        {/* Progreso */}
        <View style={styles.progressBar}>
          <View style={styles.progressFill} />
        </View>
        <Text style={styles.progressText}>100% Completado</Text>

        {/* Personal asignado */}
        <View style={styles.personalContainer}>
          <View style={styles.rowBetween}>
            <Text style={styles.personalTitle}>👥 Personal asignado</Text>

            {canManage && (
              <TouchableOpacity onPress={() => handleAssign(project)}>
                <Text style={styles.assignButton}>Asignar</Text>
              </TouchableOpacity>
            )}
          </View>

          {asignados.length > 0 ? (
            asignados.map(p => (
              <View key={p.id} style={styles.personItem}>
                <View>
                  <Text style={styles.personName}>{p.nombre}</Text>
                  <Text style={styles.personRole}>{p.cargo}</Text>
                </View>

                {canManage && (
                  <TouchableOpacity 
                    style={styles.liberarBtn}
                    onPress={() => handleLiberar(p)}
                  >
                    <Text style={styles.liberarText}>Liberar</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          ) : (
            <Text style={styles.noPersonal}>Sin personal asignado</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF7A00" />
        <Text style={styles.loadingText}>Cargando proyectos completados...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Error cargando proyectos</Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={['#edf2b1ff', '#ffc782ff', '#FF4500']} style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>

        {/* Fondo con imagen suave */}
        <Image
          source={require('../assets/images/terrall.png')}
          style={styles.bgImage}
          resizeMode="contain"
        />

        <View style={styles.container}>

          {/* Header similar a Home */}
          <View style={styles.header}>
            <Text style={styles.title}>Proyectos Completados</Text>
            <Text style={styles.subtitle}>
              {completedProjects.length} proyecto
              {completedProjects.length !== 1 ? 's' : ''} finalizado
              {completedProjects.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {/* Lista */}
          <FlatList
            data={completedProjects}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ProjectCardCompleted project={item} />
            )}
            contentContainerStyle={{ paddingBottom: 100 }}
          />

          {/* FAB MENU */}
          <FABMenu
            showHome={true}
            showSearch={true}  
            onHome={() => router.push('/HomeScreen')}
            onSearch={() => console.log("Buscar completados")}
            onCompleted={() => router.back()}  // abrir activos
          />

          {/* MODAL ASIGNAR */}
          onAssign={(id) => {
  setAssignVisible(false);

  const persona = personal.find(p => p.id === id);
  if (!persona) return;

  personalService.assignToProject(persona.id, selectedProject.id);
}}

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
  },

  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },

  subtitle: {
    marginTop: 4,
    color: '#6B7280',
    fontSize: 13,
  },

  card: {
    backgroundColor: '#111827ee',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.32)',
  },

  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F9FAFB',
  },

  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(34,197,94,0.2)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#22C55E',
  },

  badgeText: {
    color: '#22C55E',
    fontSize: 12,
    fontWeight: '700',
  },

  location: {
    color: '#93C5FD',
    fontSize: 13,
    marginTop: 4,
  },

  locationMuted: {
    color: '#6B7280',
    fontSize: 13,
    marginTop: 4,
  },

  completedDate: {
    marginTop: 6,
    color: '#9CA3AF',
    fontSize: 12,
  },

  progressBar: {
    height: 8,
    backgroundColor: '#1F2937',
    borderRadius: 999,
    marginTop: 10,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    width: '100%',
    backgroundColor: '#22C55E',
  },

  progressText: {
    color: '#E5E7EB',
    fontSize: 12,
    marginTop: 4,
  },

  personalContainer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    paddingTop: 10,
  },

  personalTitle: {
    color: '#F9FAFB',
    fontSize: 14,
    fontWeight: '600',
  },

  assignButton: {
    color: '#3B82F6',
    fontSize: 13,
    fontWeight: '600',
  },

  personItem: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  personName: {
    color: '#F3F4F6',
    fontSize: 14,
    fontWeight: '500',
  },

  personRole: {
    color: '#9CA3AF',
    fontSize: 12,
  },

  liberarBtn: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
  },

  liberarText: {
    color: '#F87171',
    fontWeight: '600',
    fontSize: 12,
  },

  noPersonal: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 12,
    color: '#4B5563',
  },

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
