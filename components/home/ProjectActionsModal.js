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
      title={`Acciones del proyecto`}
      onClose={onClose}
    >
      <Text style={styles.projectInfo}>
        {project.title}
        {project.ubicacion && `\n📍 ${project.ubicacion}`}
      </Text>

      <View style={styles.actionsContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F97316" />
            <Text style={styles.loadingText}>Procesando...</Text>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.assignButton]}
              onPress={onAssign}
            >
              <Text style={styles.actionButtonText}>➕ Asignar personal</Text>
            </TouchableOpacity>

            {canManage && (
              <TouchableOpacity
                style={[styles.actionButton, styles.editButton]}
                onPress={onEdit}
              >
                <Text style={styles.actionButtonText}>✏️ Editar proyecto</Text>
              </TouchableOpacity>
            )}

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
    color: '#E5E7EB',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 20,
  },
  actionsContainer: {
    gap: 10,
  },
  actionButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  assignButton: {
    backgroundColor: '#2563EB',
  },
  editButton: {
    backgroundColor: '#4F46E5',
  },
  deleteButton: {
    backgroundColor: '#DC2626',
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
