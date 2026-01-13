// components/home/SearchModal.js
import { useEffect, useState } from 'react';
import { FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import ModalBase from '../ModalBase';

/**
 * Modal de búsqueda para localizar rápidamente proyectos por nombre.
 * Implementa búsqueda en tiempo real con filtrado client-side y
 * proporciona múltiples estados visuales (inicial, búsqueda, sin resultados).
 * 
 * @component
 * @example
 * const handleProjectSelect = (project) => {
 *   navigation.navigate('ProjectDetails', { projectId: project.id });
 *   setSearchModalVisible(false);
 * };
 * 
 * return (
 *   <SearchModal
 *     visible={isSearchVisible}
 *     onClose={() => setSearchModalVisible(false)}
 *     projects={projectsList}
 *     personal={staffList} // Prop mantenida por compatibilidad
 *     onProjectPress={handleProjectSelect}
 *     onProjectLongPress={(project) => handleProjectActions(project)}
 *   />
 * );
 * 
 * @param {Object} props - Propiedades del componente
 * @param {boolean} props.visible - Controla la visibilidad del modal
 * @param {function} props.onClose - Función callback cuando se cierra el modal
 * @param {Array<Object>} props.projects - Lista completa de proyectos a buscar
 * @param {string} props.projects[].title - Título del proyecto para búsqueda
 * @param {string} [props.projects[].ubicacion] - Ubicación del proyecto
 * @param {number} [props.projects[].progress] - Progreso del proyecto (0-1)
 * @param {string} [props.projects[].idDoc] - ID del documento (para keyExtractor)
 * @param {string} [props.projects[].id] - ID alternativo del proyecto
 * @param {Array<Object>} [props.personal] - Lista de personal (mantenido por compatibilidad, no usado actualmente)
 * @param {function} props.onProjectPress - Callback al seleccionar un proyecto
 * @param {function} props.onProjectLongPress - Callback al mantener presionado un proyecto
 * 
 * @returns {React.ReactElement} Modal de búsqueda con interfaz interactiva
 * 
 * @see ModalBase Componente base de modal utilizado
 * @see ProjectCard Componente de tarjeta de proyecto para vista detallada
 */
export default function SearchModal({ 
  visible, 
  onClose, 
  projects,
  personal, // Mantenido por compatibilidad con versiones anteriores
  onProjectPress,
  onProjectLongPress
}) {
  // Estado para la consulta de búsqueda
  const [searchQuery, setSearchQuery] = useState('');
  
  // Estado para proyectos filtrados
  const [filteredProjects, setFilteredProjects] = useState([]);

  /**
   * Filtra los proyectos en tiempo real según la consulta de búsqueda.
   * Se ejecuta cada vez que cambia `searchQuery` o `projects`.
   * 
   * @effect
   * @listens searchQuery, projects
   */
  useEffect(() => {
    if (searchQuery.trim() === '') {
      // Estado: Sin consulta → lista vacía
      setFilteredProjects([]);
    } else {
      // Estado: Con consulta → filtrar por título
      const filtered = projects.filter(project =>
        project.title?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredProjects(filtered);
    }
  }, [searchQuery, projects]);

  /**
   * Maneja la selección de un proyecto, navega y cierra el modal.
   * 
   * @function
   * @param {Object} project - Proyecto seleccionado
   * @returns {void}
   * 
   * @fires onProjectPress Con el proyecto seleccionado
   * @fires onClose Para cerrar el modal automáticamente
   */
  const handleProjectSelect = (project) => {
    onProjectPress(project);
    onClose();
  };

  /**
   * Maneja el gesto de mantener presionado un proyecto.
   * 
   * @function
   * @param {Object} project - Proyecto sobre el que se hizo long press
   * @returns {void}
   * 
   * @fires onProjectLongPress Con el proyecto seleccionado
   * @fires onClose Para cerrar el modal automáticamente
   */
  const handleProjectLongPress = (project) => {
    onProjectLongPress(project);
    onClose();
  };

  /**
   * Limpia el campo de búsqueda y restablece los resultados.
   * 
   * @function
   * @returns {void}
   */
  const handleClearSearch = () => {
    setSearchQuery('');
  };

  /**
   * Renderiza un elemento individual de proyecto en la lista de resultados.
   * 
   * @function
   * @param {Object} param0 - Parámetros de renderizado de FlatList
   * @param {Object} param0.item - Datos del proyecto a renderizar
   * @returns {React.ReactElement} Elemento táctil con información del proyecto
   */
  const renderProjectItem = ({ item }) => (
    <TouchableOpacity
      style={styles.projectItem}
      onPress={() => handleProjectSelect(item)}
      onLongPress={() => handleProjectLongPress(item)}
      delayLongPress={300}
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

  /**
   * Genera la etiqueta descriptiva según el estado de búsqueda actual.
   * 
   * @function
   * @returns {string} Texto descriptivo para el estado actual
   */
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
      {/* Campo de búsqueda con botón de limpiar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder="Nombre del proyecto..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus={true} // Enfocar automáticamente al abrir
        />
        {/* Botón para limpiar búsqueda (solo visible cuando hay texto) */}
        {searchQuery.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={handleClearSearch}>
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Etiqueta informativa del estado de búsqueda */}
      <View style={styles.resultsInfo}>
        <Text style={styles.resultsText}>
          {resultsLabel()}
        </Text>
      </View>

      {/* Renderizado condicional según el estado de búsqueda */}
      {filteredProjects.length > 0 ? (
        // Estado: Resultados encontrados
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
        // Estado: Sin búsqueda (pantalla inicial)
        <View style={styles.initialState}>
          <Text style={styles.initialStateIcon}>🔍</Text>
          <Text style={styles.initialStateText}>Busca proyectos por nombre</Text>
          <Text style={styles.initialStateSubtext}>Los resultados aparecerán aquí</Text>
        </View>
      ) : (
        // Estado: Búsqueda sin resultados
        <View style={styles.noResults}>
          <Text style={styles.noResultsText}>
            No hay proyectos que coincidan con "{searchQuery}"
          </Text>
          <Text style={styles.noResultsHint}>
            Prueba con otro término o revisa la ortografía
          </Text>
        </View>
      )}
    </ModalBase>
  );
}

// Estilos del componente
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
    backgroundColor: '#4B5563', // Gris oscuro
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
    minHeight: 200,  // Altura mínima para lista
    maxHeight: 400,  // Altura máxima para lista
  },
  resultsList: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 8, // Espacio inferior para scroll
  },
  projectItem: {
    backgroundColor: '#111827',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2563EB', // Borde azul indicador
  },
  projectName: {
    color: '#F9FAFB',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  projectLocation: {
    color: '#93C5FD', // Azul claro
    fontSize: 13,
    marginBottom: 4,
  },
  projectProgress: {
    color: '#9CA3AF', // Gris medio
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