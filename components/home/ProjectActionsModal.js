// components/home/ProjectActionsModal.js
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import ModalBase from '../ModalBase';

/**
 * Modal de menú contextual que presenta acciones disponibles para un proyecto específico.
 * Muestra diferentes opciones según los permisos del usuario (gestión vs. uso normal)
 * y proporciona feedback visual durante operaciones asíncronas.
 * 
 * @component
 * @example
 * const handleAction = (actionType) => {
 *   switch (actionType) {
 *     case 'edit': // Abrir modal de edición
 *     case 'assign': // Abrir modal de asignación
 *     case 'delete': // Confirmar eliminación
 *   }
 * };
 * 
 * return (
 *   <ProjectActionsModal
 *     visible={isModalVisible}
 *     project={selectedProject}
 *     onClose={() => setIsModalVisible(false)}
 *     onEdit={() => handleAction('edit')}
 *     onAssign={() => handleAction('assign')}
 *     onDelete={() => handleAction('delete')}
 *     canManage={userPermissions.canManageProjects}
 *     loading={isProcessing}
 *   />
 * );
 * 
 * @param {Object} props - Propiedades del componente
 * @param {boolean} props.visible - Controla la visibilidad del modal
 * @param {Object|null} props.project - Proyecto sobre el que se realizarán las acciones
 * @param {string} props.project.title - Título del proyecto para mostrar
 * @param {string} [props.project.ubicacion] - Ubicación del proyecto (opcional)
 * @param {function} props.onClose - Función callback cuando se cierra el modal
 * @param {function} props.onEdit - Función callback para editar el proyecto
 * @param {function} props.onAssign - Función callback para asignar personal
 * @param {function} props.onDelete - Función callback para eliminar el proyecto
 * @param {boolean} [props.canManage=true] - Permisos del usuario para acciones de gestión
 * @param {boolean} [props.loading=false] - Indica si hay una operación en proceso
 * 
 * @returns {React.ReactElement|null} Modal de acciones o null si no hay proyecto
 * 
 * @see ModalBase Componente base de modal utilizado
 * @see EditProjectModal Modal de edición de proyectos
 * @see AssignPersonModal Modal de asignación de personal
 */
export default function ProjectActionsModal({ 
  visible, 
  project, 
  onClose, 
  onEdit, 
  onAssign, 
  onDelete,
  canManage = true,
  loading = false 
}) {
  // Validación: no renderizar si no hay proyecto
  if (!project) return null;

  return (
    <ModalBase
      visible={visible}
      title={`Acciones del proyecto`}
      onClose={onClose}
    >
      {/* Información del proyecto */}
      <Text style={styles.projectInfo}>
        {project.title}
        {project.ubicacion && `\n📍 ${project.ubicacion}`}
      </Text>

      {/* Contenedor de acciones */}
      <View style={styles.actionsContainer}>
        {loading ? (
          // Estado: Cargando/Procesando
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F97316" />
            <Text style={styles.loadingText}>Procesando...</Text>
          </View>
        ) : (
          // Estado: Normal (acciones disponibles)
          <>
            {/* Acción: Asignar personal (disponible para todos) */}
            <TouchableOpacity
              style={[styles.actionButton, styles.assignButton]}
              onPress={onAssign}
            >
              <Text style={styles.actionButtonText}>➕ Asignar personal</Text>
            </TouchableOpacity>

            {/* Acción: Editar proyecto (solo con permisos de gestión) */}
            {canManage && (
              <TouchableOpacity
                style={[styles.actionButton, styles.editButton]}
                onPress={onEdit}
              >
                <Text style={styles.actionButtonText}>✏️ Editar proyecto</Text>
              </TouchableOpacity>
            )}

            {/* Acción: Eliminar proyecto (solo con permisos de gestión) */}
            {canManage && (
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={onDelete}
              >
                <Text style={styles.actionButtonText}>🗑️ Eliminar proyecto</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </ModalBase>
  );
}

// Estilos del componente
const styles = {
  projectInfo: {
    color: '#E5E7EB',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 20, // Mejor espaciado para múltiples líneas
  },
  actionsContainer: {
    gap: 10, // Espaciado uniforme entre botones
  },
  actionButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  assignButton: {
    backgroundColor: '#2563EB', // Azul: acción principal
  },
  editButton: {
    backgroundColor: '#4F46E5', // Índigo: acción secundaria
  },
  deleteButton: {
    backgroundColor: '#DC2626', // Rojo: acción destructiva
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: '#F9FAFB',
    fontSize: 15,
    fontWeight: '500',
  },
};