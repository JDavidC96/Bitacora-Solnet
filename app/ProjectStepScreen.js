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

export default function ProjectScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [projectId, setProjectId] = useState(null);
  const [projectTitle, setProjectTitle] = useState('');
  
  // Procesar parámetros correctamente
  useEffect(() => {
    console.log('🔍 Parámetros recibidos en ProjectScreen:', params);
    
    // Extraer id - manejar diferentes formatos
    let id = params.id;
    if (Array.isArray(id)) {
      id = id[0]; // Tomar el primer elemento si es array
    }
    
    // Extraer title
    let title = params.title;
    if (Array.isArray(title)) {
      title = title[0];
    }
    
    console.log('📋 ID procesado:', id);
    console.log('📋 Title procesado:', title);
    
    if (id && typeof id === 'string' && id !== 'undefined') {
      setProjectId(id);
      setProjectTitle(title || 'Proyecto sin nombre');
      console.log('✅ Project ID establecido:', id);
    } else {
      console.log('❌ ID no válido:', id);
    }
  }, [params]);

  const { canMarkStateRole, canProrrogaRole, canChangeStartDateRole } = usePermissions();
  const { projectStartISO, handleChangeStartDate, showDatePicker, setShowDatePicker } = useProjectData(projectId);
  const { tasks, prorrogaModal, setProrrogaModal, prorrogaTarget, setProrrogaTarget, prorrogaDias, setProrrogaDias, applyProrroga, toggleCumplida, openProrroga } = useTasks(projectId, projectStartISO, canMarkStateRole, canProrrogaRole);
  
  useStepsNotifications(tasks, projectTitle);

  // Mostrar loading si no hay ID válido
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