// components/home/ProjectActionsModal.js
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import ModalBase from '../ModalBase';

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
  if (!project) return null;

  return (
    <ModalBase
      visible={visible}
      title={`Acciones: ${project.title || ''}`}
      onClose={onClose}
    >
      <Text style={styles.projectInfo}>
        Proyecto: {project.title}
        {project.ubicacion && `\nUbicación: ${project.ubicacion}`}
      </Text>

      <View style={styles.actionsContainer}>
        {/* Estado de loading */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF4500" />
            <Text style={styles.loadingText}>Eliminando proyecto...</Text>
          </View>
        ) : (
          <>
            {/* Asignar personal */}
            <TouchableOpacity
              style={[styles.actionButton, styles.assignButton]}
              onPress={onAssign}
            >
              <Text style={styles.actionButtonText}>➕ Asignar personal</Text>
            </TouchableOpacity>

            {/* Editar proyecto */}
            {canManage && (
              <TouchableOpacity
                style={[styles.actionButton, styles.editButton]}
                onPress={onEdit}
              >
                <Text style={styles.actionButtonText}>✏️ Editar proyecto</Text>
              </TouchableOpacity>
            )}

            {/* Eliminar proyecto */}
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

const styles = {
  projectInfo: {
    color: '#CCC',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 20,
  },
  actionsContainer: {
    gap: 12,
  },
  actionButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  assignButton: {
    backgroundColor: '#3182CE',
  },
  editButton: {
    backgroundColor: '#5A67D8',
  },
  deleteButton: {
    backgroundColor: '#E53E3E',
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  //  loading
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
};