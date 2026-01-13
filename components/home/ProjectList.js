// components/home/ProjectList.js
import { FlatList, StyleSheet, Text, View } from "react-native";
import ProjectCard from "./ProjectCard";

/**
 * Componente contenedor que renderiza una lista de proyectos usando FlatList.
 * Maneja estados de carga, listas vacías y propaga propiedades a cada ProjectCard.
 * Optimizado para rendimiento con extracción de claves personalizada.
 * 
 * @component
 * @example
 * const handleProjectPress = (project) => {
 *   navigation.navigate('ProjectDetails', { projectId: project.id });
 * };
 * 
 * const handleLongPress = (project) => {
 *   setSelectedProject(project);
 *   setShowActionsModal(true);
 * };
 * 
 * return (
 *   <ProjectList
 *     projects={projectsData}
 *     personal={staffList}
 *     viewerRole="Administrador"
 *     viewerPersonalId="user123"
 *     canManage={true}
 *     onProjectPress={handleProjectPress}
 *     onProjectLongPress={handleLongPress}
 *     onLiberarPersona={(person) => handleReleasePerson(person)}
 *     loading={isLoading}
 *   />
 * );
 * 
 * @param {Object} props - Propiedades del componente
 * @param {Array<Object>} [props.projects=[]] - Lista de proyectos a mostrar
 * @param {Object} props.projects[].idDoc - ID del documento (preferido)
 * @param {string} props.projects[].id - ID alternativo del proyecto
 * @param {string} props.projects[].title - Título del proyecto (usado como fallback)
 * @param {Array<Object>} [props.personal=[]] - Lista de personal disponible
 * @param {string} props.viewerRole - Rol del usuario que visualiza (Administrador, Ingeniero, Técnico, Supervisor, Administrativo)
 * @param {string} [props.viewerPersonalId] - ID del usuario actual (para técnicos/supervisores)
 * @param {boolean} [props.canManage=false] - Permisos para gestionar personal y proyectos
 * @param {function} props.onProjectPress - Callback al hacer tap en un proyecto
 * @param {function} props.onProjectLongPress - Callback al mantener presionado un proyecto
 * @param {function} props.onLiberarPersona - Callback para liberar personal de un proyecto
 * @param {boolean} [props.loading=false] - Indica si está cargando los datos
 * 
 * @returns {React.ReactElement} Lista de proyectos con manejo de estados
 * 
 * @see ProjectCard Componente de tarjeta de proyecto individual
 * @see FlatList Componente de lista virtualizada de React Native
 */
export default function ProjectList({
  projects,
  personal,
  viewerRole,
  viewerPersonalId,
  canManage,
  onProjectPress,
  onProjectLongPress,
  onLiberarPersona,
  loading = false,
}) {
  // Estado: Cargando datos
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando proyectos...</Text>
      </View>
    );
  }

  // Estado: Lista vacía
  if (!projects || projects.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No hay proyectos creados</Text>
        <Text style={styles.emptySubtext}>
          {canManage
            ? "Presiona el botón ＋ para crear tu primer proyecto"
            : "Contacta al administrador para crear nuevos proyectos"}
        </Text>
      </View>
    );
  }

  /**
   * Renderiza una tarjeta de proyecto individual.
   * 
   * @function
   * @param {Object} param0 - Parámetros de renderizado de FlatList
   * @param {Object} param0.item - Datos del proyecto a renderizar
   * @returns {React.ReactElement} Componente ProjectCard renderizado
   */
  const renderItem = ({ item }) => (
    <ProjectCard
      item={item}
      personal={personal}
      viewerRole={viewerRole}
      viewerPersonalId={viewerPersonalId}
      canManage={canManage}
      onPress={onProjectPress}
      onLongPress={onProjectLongPress}
      onLiberarPersona={onLiberarPersona}
    />
  );

  /**
   * Genera una clave única para cada elemento de la lista.
   * Prioriza diferentes identificadores en este orden:
   * 1. idDoc (preferido)
   * 2. id (alternativo)
   * 3. title + índice (fallback)
   * 4. índice generado (último recurso)
   * 
   * @function
   * @param {Object} item - Elemento del array de proyectos
   * @param {number} index - Índice del elemento en el array
   * @returns {string} Clave única para el elemento
   * 
   * @see FlatList#keyExtractor Documentación de React Native sobre extracción de claves
   */
  const keyExtractor = (item, index) => {
    if (item.idDoc) return item.idDoc;          // ID de documento preferido
    if (item.id) return item.id;                // ID alternativo
    if (item.title) return `${item.title}-${index}`; // Fallback con título
    return `project-${index}`;                  // Último recurso: índice
  };

  // Estado: Lista con datos
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
    flex: 1, // Ocupa todo el espacio disponible
  },
  list: { 
    paddingBottom: 120, // Espacio para botones flotantes o tab bar
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: { 
    color: "#4B5563", // Gris medio
    fontSize: 15 
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
    paddingHorizontal: 24,
  },
  emptyText: {
    color: "#111827", // Gris oscuro casi negro
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtext: { 
    color: "#6B7280", // Gris medio
    fontSize: 14, 
    textAlign: "center" 
  },
});