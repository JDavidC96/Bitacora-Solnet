import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { ProjectHeader } from '../components/project-steps/ProjectHeader';
import { ProrrogaModal } from '../components/project-steps/ProrrogaModal';
import { TaskGroup } from '../components/project-steps/TaskGroup';

import styles from '../components/project-steps/styles';
import { usePermissions } from '../hooks/usePermissions';
import { useProjectData } from '../hooks/useProjectData';
import { useStepsNotifications } from '../hooks/useStepsNotifications';
import { useTasks } from '../hooks/useTasks';

export default function ProjectStepScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [projectId, setProjectId] = useState(null);
  const [projectTitle, setProjectTitle] = useState('');
  const [focusedTask, setFocusedTask] = useState(null);

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
  const { tasks, prorrogaModal, setProrrogaModal, prorrogaTarget, setProrrogaTarget, prorrogaDias, setProrrogaDias, applyProrroga, toggleCumplida, openProrroga } = useTasks(projectId, projectStartISO, canMarkStateRole, canProrrogaRole);
  
  useStepsNotifications(tasks, projectTitle, projectId);

  // Efecto para manejar la tarea enfocada desde la notificación
  useEffect(() => {
    if (focusedTask && tasks.length > 0) {
      console.log('🎯 Buscando tarea enfocada:', focusedTask);
      const taskToFocus = tasks.find(t => t.idDoc === focusedTask);
      if (taskToFocus) {
        console.log('✅ Tarea enfocada encontrada:', taskToFocus.titulo);
        // Aquí puedes implementar scroll automático o highlight
        // Por ejemplo: scrollToTask(focusedTask);
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

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TaskGroup 
          tasks={tasks}
          canMarkStateRole={canMarkStateRole}
          canProrrogaRole={canProrrogaRole}
          toggleCumplida={toggleCumplida}
          openProrroga={openProrroga}
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
    </LinearGradient>
  );
}