// components/home/SearchModal.js
import { useEffect, useState } from 'react';
import { FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import ModalBase from '../ModalBase';

export default function SearchModal({ 
  visible, 
  onClose, 
  projects, // Recibir todos los proyectos
  personal, // Recibir el personal para mostrar en las tarjetas
  onProjectPress, // Para navegar al proyecto
  onProjectLongPress // Para acciones del proyecto
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProjects, setFilteredProjects] = useState([]);

  // Filtrar proyectos cuando cambia la búsqueda
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

  // Contenido principal del modal
  const modalContent = (
    <>
      {/* Campo de búsqueda */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder="Escribe el nombre del proyecto..."
          placeholderTextColor="#AAA"
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

      {/* Información de resultados */}
      <View style={styles.resultsInfo}>
        <Text style={styles.resultsText}>
          {searchQuery ? (
            filteredProjects.length === 0 ? 
              'No se encontraron proyectos' : 
              `${filteredProjects.length} proyecto${filteredProjects.length !== 1 ? 's' : ''} encontrado${filteredProjects.length !== 1 ? 's' : ''}`
          ) : (
            'Escribe para buscar proyectos'
          )}
        </Text>
      </View>

      {/* Lista de resultados */}
      {filteredProjects.length > 0 ? (
        <View style={styles.resultsContainer}>
          <FlatList
            data={filteredProjects}
            keyExtractor={(item) => item.idDoc || item.id || `project-${item.title}`}
            renderItem={renderProjectItem}
            style={styles.resultsList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
        </View>
      ) : searchQuery ? (
        /* Mensaje cuando no hay resultados */
        <View style={styles.noResults}>
          <Text style={styles.noResultsText}>No hay proyectos que coincidan con "{searchQuery}"</Text>
          <Text style={styles.noResultsHint}>Intenta con otras palabras</Text>
        </View>
      ) : (
        /* Mensaje cuando no se ha buscado nada */
        <View style={styles.initialState}>
          <Text style={styles.initialStateText}>🔍</Text>
          <Text style={styles.initialStateText}>Busca proyectos por nombre</Text>
          <Text style={styles.initialStateSubtext}>Los resultados aparecerán aquí</Text>
        </View>
      )}
    </>
  );

  return (
    <ModalBase
      visible={visible}
      title="Buscar Proyectos"
      onClose={onClose}
    >
      {modalContent}
    </ModalBase>
  );
}

const styles = {
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  input: {
    flex: 1,
    backgroundColor: '#3A3A4A',
    color: '#FFF',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    marginRight: 8,
  },
  clearButton: {
    backgroundColor: '#718096',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultsInfo: {
    backgroundColor: '#2D3748',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  resultsText: {
    color: '#E2E8F0',
    fontSize: 14,
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
    paddingBottom: 10,
  },
  projectItem: {
    backgroundColor: '#3A3A4A',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3182CE',
  },
  projectName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  projectLocation: {
    color: '#90CDF4',
    fontSize: 14,
    marginBottom: 4,
  },
  projectProgress: {
    color: '#AAA',
    fontSize: 12,
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noResultsText: {
    color: '#FFF',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  noResultsHint: {
    color: '#AAA',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  initialState: {
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  initialStateText: {
    color: '#FFF',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 8,
  },
  initialStateSubtext: {
    color: '#AAA',
    fontSize: 14,
    textAlign: 'center',
  },
};