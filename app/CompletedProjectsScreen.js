// screens/CompletedProjectsScreen.js
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

import { useCompletedProjects } from '../hooks/useCompletedProjects';

export default function CompletedProjectsScreen() {
  const router = useRouter();
  const { completedProjects, loading, error } = useCompletedProjects();

  const handleProjectPress = (project) => {
    // Usar NoteScreen existente en modo solo lectura
    router.push({
      pathname: '/NoteScreen',
      params: { 
        id: project.id,
        title: project.title,
        readOnly: 'true',  // Para deshabilitar escritura
        isCompleted: 'true'
      }
    });
  };

  // Componente de tarjeta de proyecto simplificado
  const ProjectCard = ({ project, onPress }) => (
    <TouchableOpacity 
      style={styles.projectCard}
      onPress={onPress}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.projectTitle}>{project.title}</Text>
        <View style={styles.completedBadge}>
          <Text style={styles.completedBadgeText}>✅ COMPLETADO</Text>
        </View>
      </View>
      
      <Text style={styles.projectLocation}>{project.ubicacion}</Text>
      
      {project.completedAt && (
        <Text style={styles.completedDate}>
          Completado: {new Date(project.completedAt).toLocaleDateString('es-ES')}
        </Text>
      )}
      
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '100%' }]} />
        </View>
        <Text style={styles.progressText}>100% Completado</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Cargando proyectos completados...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error cargando proyectos</Text>
        <Text style={styles.errorSubtext}>{error.message}</Text>
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
    <LinearGradient colors={['#4CAF50', '#2E7D32']} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>✅ Proyectos Completados</Text>
        <Text style={styles.subtitle}>
          {completedProjects.length} proyecto{completedProjects.length !== 1 ? 's' : ''} finalizado{completedProjects.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <FlatList
        data={completedProjects}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProjectCard 
            project={item}
            onPress={() => handleProjectPress(item)}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay proyectos completados</Text>
            <Text style={styles.emptySubtext}>
              Los proyectos se moverán aquí cuando estén al 100%
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={styles.backButtonText}>← Volver a Proyectos Activos</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    color: '#FFF',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#E8F5E8',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  projectCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  projectTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    flex: 1,
    marginRight: 8,
  },
  completedBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completedBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  projectLocation: {
    color: '#E8F5E8',
    fontSize: 14,
    marginBottom: 8,
  },
  completedDate: {
    color: '#C8E6C9',
    fontSize: 12,
    marginBottom: 12,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFF',
    borderRadius: 3,
  },
  progressText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E1E2F',
  },
  loadingText: {
    color: '#FFF',
    marginTop: 12,
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
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    color: '#E8F5E8',
    fontSize: 14,
    textAlign: 'center',
  },
  backButton: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});