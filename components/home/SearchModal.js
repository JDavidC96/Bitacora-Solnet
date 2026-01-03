// components/home/SearchModal.js
import { useEffect, useState } from 'react';
import { FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import ModalBase from '../ModalBase';

export default function SearchModal({ 
  visible, 
  onClose, 
  projects,
  personal, // (no se usa por ahora, lo dejo por compatibilidad)
  onProjectPress,
  onProjectLongPress
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProjects, setFilteredProjects] = useState([]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredProjects([]);
    } else {
      const filtered = projects.filter(project =>
        project.title?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredProjects(filtered);
    }
  }, [searchQuery, projects]);

  const handleProjectSelect = (project) => {
    onProjectPress(project);
    onClose();
  };

  const handleProjectLongPress = (project) => {
    onProjectLongPress(project);
    onClose();
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const renderProjectItem = ({ item }) => (
    <TouchableOpacity
      style={styles.projectItem}
      onPress={() => handleProjectSelect(item)}
      onLongPress={() => handleProjectLongPress(item)}
    >
      <Text style={styles.projectName}>{item.title}</Text>
      {item.ubicacion && (
        <Text style={styles.projectLocation}>📍 {item.ubicacion}</Text>
      )}
      <Text style={styles.projectProgress}>
        Progreso: {Math.round((item.progress || 0) * 100)}%
      </Text>
    </TouchableOpacity>
  );

  const resultsLabel = () => {
    if (!searchQuery) return 'Escribe para buscar proyectos por nombre';
    if (filteredProjects.length === 0) return 'No se encontraron proyectos';
    return `${filteredProjects.length} proyecto${filteredProjects.length !== 1 ? 's' : ''} encontrado${filteredProjects.length !== 1 ? 's' : ''}`;
  };

  return (
    <ModalBase
      visible={visible}
      title="Buscar proyectos"
      onClose={onClose}
    >
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder="Nombre del proyecto..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus={true}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={handleClearSearch}>
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.resultsInfo}>
        <Text style={styles.resultsText}>
          {resultsLabel()}
        </Text>
      </View>

      {filteredProjects.length > 0 ? (
        <View style={styles.resultsContainer}>
          <FlatList
            data={filteredProjects}
            keyExtractor={(item, index) => item.idDoc || item.id || `project-${item.title}-${index}`}
            renderItem={renderProjectItem}
            style={styles.resultsList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
        </View>
      ) : !searchQuery ? (
        <View style={styles.initialState}>
          <Text style={styles.initialStateIcon}>🔍</Text>
          <Text style={styles.initialStateText}>Busca proyectos por nombre</Text>
          <Text style={styles.initialStateSubtext}>Los resultados aparecerán aquí</Text>
        </View>
      ) : (
        <View style={styles.noResults}>
          <Text style={styles.noResultsText}>
            No hay proyectos que coincidan con "{searchQuery}"
          </Text>
          <Text style={styles.noResultsHint}>Prueba con otro término o revisa la ortografía</Text>
        </View>
      )}
    </ModalBase>
  );
}

const styles = {
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#111827',
    color: '#F9FAFB',
    padding: 10,
    borderRadius: 10,
    fontSize: 14,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  clearButton: {
    backgroundColor: '#4B5563',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultsInfo: {
    backgroundColor: '#111827',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  resultsText: {
    color: '#E5E7EB',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  resultsContainer: {
    flex: 1,
    minHeight: 200,
    maxHeight: 400,
  },
  resultsList: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 8,
  },
  projectItem: {
    backgroundColor: '#111827',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2563EB',
  },
  projectName: {
    color: '#F9FAFB',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  projectLocation: {
    color: '#93C5FD',
    fontSize: 13,
    marginBottom: 4,
  },
  projectProgress: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  noResultsText: {
    color: '#F9FAFB',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 6,
  },
  noResultsHint: {
    color: '#9CA3AF',
    fontSize: 13,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  initialState: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
  },
  initialStateIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  initialStateText: {
    color: '#F9FAFB',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 4,
  },
  initialStateSubtext: {
    color: '#9CA3AF',
    fontSize: 13,
    textAlign: 'center',
  },
};
