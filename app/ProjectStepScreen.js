import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { EditScheduleModal } from '../components/project-steps/EditScheduleModal';

import { ProjectHeader } from '../components/project-steps/ProjectHeader';
import { ProrrogaModal } from '../components/project-steps/ProrrogaModal';
import { TaskGroup } from '../components/project-steps/TaskGroup';

import styles from '../components/project-steps/styles';
import { usePermissions } from '../hooks/usePermissions';
import { useProjectData } from '../hooks/useProjectData';
import { useStepsNotifications } from '../hooks/useStepsNotifications';
import { useTasks } from '../hooks/useTasks';
import { projectService } from '../services/projectService';

export default function ProjectStepScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [projectId, setProjectId] = useState(null);
  const [projectTitle, setProjectTitle] = useState('');
  const [focusedTask, setFocusedTask] = useState(null);
  const [projectCompleted, setProjectCompleted] = useState(false);
  
  // 3.2 Estados para editar cronograma
  const [showEditSchedule, setShowEditSchedule] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);

  useEffect(() => {
    console.log('🔍 Parámetros recibidos en ProjectStepScreen:', params);
    
    let id = params.id;
    if (Array.isArray(id)) id = id[0];
    
    let title = params.title;
    if (Array.isArray(title)) title = title[0];
    
    let focused = params.focusedTask;
    if (Array.isArray(focused)) focused = focused[0];
    
    if (id && typeof id === 'string' && id !== 'undefined') {
      setProjectId(id);
      setProjectTitle(title || 'Proyecto sin nombre');
      setFocusedTask(focused || null);
      
      console.log('✅ Project ID establecido:', id);
      if (focused) {
        console.log('🎯 Tarea enfocada desde notificación:', focused);
      }
    } else {
      console.log('❌ ID no válido:', id);
    }
  }, [params]);

  const { canMarkStateRole, canProrrogaRole, canChangeStartDateRole } = usePermissions();
  const { projectStartISO, handleChangeStartDate, showDatePicker, setShowDatePicker } = useProjectData(projectId);
  const { 
    tasks, 
    prorrogaModal, 
    setProrrogaModal, 
    prorrogaTarget, 
    setProrrogaTarget, 
    prorrogaDias, 
    setProrrogaDias, 
    applyProrroga, 
    toggleCumplida, 
    openProrroga,
    markAsNotApplicable,
    unmarkAsNotApplicable
  } = useTasks(projectId, projectStartISO, canMarkStateRole, canProrrogaRole);
  
  useStepsNotifications(tasks, projectTitle, projectId);

  // 3.2 Permiso para editar cronograma
  const canEditSchedule = canChangeStartDateRole;

  // 3.3 Handler para guardar cronograma
  const handleSaveSchedule = async (baseDurationsPayload) => {
    if (!projectId || !projectStartISO) return;

    try {
      setSavingSchedule(true);
      await projectService.applyScheduleOverrides(projectId, baseDurationsPayload, projectStartISO);
      setShowEditSchedule(false);
      Alert.alert('✅ Listo', 'Cronograma actualizado correctamente.');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'No fue posible actualizar el cronograma.');
    } finally {
      setSavingSchedule(false);
    }
  };

  // Verificar si el proyecto está completado (excluyendo mantenimientos y tareas no aplica)
  useEffect(() => {
    const checkProjectCompletion = async () => {
      if (!projectId || tasks.length === 0) return;

      // Filtrar solo tareas normales activas (excluir mantenimientos y no aplica)
      const tareasNormalesActivas = tasks.filter(task => 
        !task.esMantenimiento && !task.noAplica
      );
      
      // Verificar si todas las tareas normales activas están cumplidas
      const allNormalTasksCompleted = tareasNormalesActivas.length > 0 && 
        tareasNormalesActivas.every(task => task.cumplida);
      
      if (allNormalTasksCompleted && !projectCompleted) {
        try {
          // Marcar automáticamente como completado
          await projectService.markAsCompleted(projectId, projectTitle);
          setProjectCompleted(true);
          
          Alert.alert(
            '🎉 ¡Proyecto Completado!',
            `El proyecto "${projectTitle}" ha sido completado al 100%. Será movido a la sección de proyectos completados.\n\nLos mantenimientos seguirán activos para notificaciones.`,
            [
              {
                text: 'OK',
                onPress: () => console.log('Usuario confirmó completado del proyecto')
              }
            ]
          );
        } catch (error) {
          console.error('❌ Error marcando proyecto como completado:', error);
        }
      } else if (!allNormalTasksCompleted && projectCompleted) {
        setProjectCompleted(false);
      }
    };

    checkProjectCompletion();
  }, [tasks, projectId, projectTitle, projectCompleted]);

  // Efecto para manejar la tarea enfocada desde la notificación
  useEffect(() => {
    if (focusedTask && tasks.length > 0) {
      console.log('🎯 Buscando tarea enfocada:', focusedTask);
      const taskToFocus = tasks.find(t => t.idDoc === focusedTask);
      if (taskToFocus) {
        console.log('✅ Tarea enfocada encontrada:', taskToFocus.titulo);
      } else {
        console.log('❌ Tarea enfocada no encontrada en las tareas actuales');
      }
    }
  }, [focusedTask, tasks]);

  if (!projectId) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Buscando proyecto...</Text>
        <Text style={styles.loadingText}>ID recibido: {JSON.stringify(params.id)}</Text>
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: '#48BB78', marginTop: 20 }]}
          onPress={() => router.back()}
        >
          <Text style={styles.buttonText}>Regresar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!projectStartISO) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando proyecto: {projectId}</Text>
        <Text style={styles.loadingText}>Título: {projectTitle}</Text>
        {focusedTask && (
          <Text style={styles.loadingText}>Tarea enfocada: {focusedTask}</Text>
        )}
      </View>
    );
  }

  return (
    <LinearGradient colors={["#42275a", "#734b6d"]} style={styles.container}>
      <ProjectHeader 
        title={projectTitle}
        projectStartISO={projectStartISO}
        canChangeStartDateRole={canChangeStartDateRole}
        showDatePicker={showDatePicker}
        setShowDatePicker={setShowDatePicker}
        handleChangeStartDate={handleChangeStartDate}
      />

      {/* 3.4 Botón para editar cronograma */}
      {canEditSchedule && (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#ECC94B', marginHorizontal: 20, marginTop: 10 }]}
          onPress={() => setShowEditSchedule(true)}
          disabled={savingSchedule}
        >
          <Text style={styles.buttonText}>
            {savingSchedule ? 'Aplicando...' : '🗓️ Editar cronograma'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Banner de proyecto completado */}
      {projectCompleted && (
        <View style={completedBannerStyles.banner}>
          <Text style={completedBannerStyles.bannerText}>
            ✅ PROYECTO COMPLETADO AL 100%
          </Text>
          <Text style={completedBannerStyles.bannerSubtext}>
            Este proyecto será movido a la sección de proyectos completados
          </Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TaskGroup 
          tasks={tasks}
          canMarkStateRole={canMarkStateRole}
          canProrrogaRole={canProrrogaRole}
          toggleCumplida={toggleCumplida}
          openProrroga={openProrroga}
          markAsNotApplicable={markAsNotApplicable}
          unmarkAsNotApplicable={unmarkAsNotApplicable}
          focusedTask={focusedTask}
        />
      </ScrollView>

      <ProrrogaModal
        visible={prorrogaModal}
        target={prorrogaTarget}
        dias={prorrogaDias}
        onClose={() => setProrrogaModal(false)}
        onDiasChange={setProrrogaDias}
        onApply={applyProrroga}
      />

      {/* 3.5 Modal para editar cronograma */}
      <EditScheduleModal
        visible={showEditSchedule}
        tasks={tasks}
        projectStartISO={projectStartISO}
        onClose={() => setShowEditSchedule(false)}
        onSave={handleSaveSchedule}
      />
    </LinearGradient>
  );
}

// Estilos para el banner de completado
const completedBannerStyles = {
  banner: {
    backgroundColor: '#4CAF50',
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  bannerText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  bannerSubtext: {
    color: '#E8F5E8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
};