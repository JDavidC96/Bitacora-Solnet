// components/home/ProjectList.js
import { FlatList, StyleSheet, Text, View } from 'react-native';
import ProjectCard from './ProjectCard';

export default function ProjectList({ 
  projects, 
  personal, 
  canManage, 
  onProjectPress, 
  onProjectLongPress, 
  onLiberarPersona,
  loading = false 
}) {
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando proyectos...</Text>
      </View>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No hay proyectos creados</Text>
        <Text style={styles.emptySubtext}>
          {canManage ? 'Presiona el botón + para crear tu primer proyecto' : 'Contacta al administrador'}
        </Text>
      </View>
    );
  }

  const renderItem = ({ item }) => (
    <ProjectCard
      item={item}
      personal={personal}
      canManage={canManage}
      onPress={onProjectPress}
      onLongPress={onProjectLongPress}
      onLiberarPersona={onLiberarPersona}
    />
  );

  const keyExtractor = (item, index) => {
    // Prioridad 1: idDoc
    if (item.idDoc) return item.idDoc;
    // Prioridad 2: id
    if (item.id) return item.id;
    // Prioridad 3: título + índice (como fallback)
    if (item.title) return `${item.title}-${index}`;
    // Último recurso: índice
    return `project-${index}`;
  };

  return (
    <View style={styles.container}>
     
      <FlatList
        data={projects}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    paddingBottom: 120,
  },
  resultsHeader: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  resultsText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    color: '#000000',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#666666',
    fontSize: 14,
    textAlign: 'center',
  },
});