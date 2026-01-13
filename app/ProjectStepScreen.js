/**
 * PANTALLA DE SEGUIMIENTO DE ETAPAS DEL PROYECTO
 * 
 * Descripción:
 * Pantalla principal para el seguimiento y gestión de las etapas/tareas de un proyecto.
 * Muestra todas las tareas organizadas por categorías, permite marcar cumplimiento,
 * gestionar prórrogas, editar cronogramas y detecta automáticamente la finalización del proyecto.
 * 
 * Características principales:
 * 1. Visualización de tareas del proyecto organizadas en grupos
 * 2. Marcado de cumplimiento de tareas con validación de permisos
 * 3. Gestión de prórrogas para tareas atrasadas
 * 4. Edición personalizada del cronograma del proyecto
 * 5. Detección automática de finalización del proyecto (100%)
 * 6. Integración con notificaciones push para recordatorios
 * 7. Soporte para tareas de mantenimiento y "no aplica"
 * 8. Enfoque automático en tareas desde notificaciones
 * 
 * Estados principales:
 * - projectId: Identificador único del proyecto desde parámetros de navegación
 * - projectTitle: Título del proyecto para visualización
 * - focusedTask: ID de tarea para enfocar (desde notificaciones)
 * - projectCompleted: Estado de finalización del proyecto (100%)
 * - showEditSchedule: Control de visibilidad del modal de edición de cronograma
 * - savingSchedule: Estado de carga durante la actualización del cronograma
 * 
 * Hooks personalizados utilizados:
 * - usePermissions: Gestión de permisos basados en roles
 * - useProjectData: Manejo de datos del proyecto (fecha de inicio)
 * - useTasks: Gestión de tareas, prórrogas y estados
 * - useStepsNotifications: Notificaciones push para recordatorios de tareas
 * 
 * @component
 * @returns {JSX.Element} Pantalla de seguimiento de etapas del proyecto
 * 
 * @example
 * <ProjectStepScreen />
 */

// Importaciones de librerías y dependencias
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';

// Componentes personalizados
import { EditScheduleModal } from '../components/project-steps/EditScheduleModal';
import { ProjectHeader } from '../components/project-steps/ProjectHeader';
import { ProrrogaModal } from '../components/project-steps/ProrrogaModal';
import { TaskGroup } from '../components/project-steps/TaskGroup';

// Estilos y hooks personalizados
import styles from '../components/project-steps/styles';
import { usePermissions } from '../hooks/usePermissions';
import { useProjectData } from '../hooks/useProjectData';
import { useStepsNotifications } from '../hooks/useStepsNotifications';
import { useTasks } from '../hooks/useTasks';
import { projectService } from '../services/projectService';

/**
 * Componente principal de seguimiento de etapas del proyecto
 * 
 * @function ProjectStepScreen
 * @returns {JSX.Element} Pantalla renderizada con todas las funcionalidades
 */
export default function ProjectStepScreen() {
  // ============================================================
  // 1. OBTENCIÓN DE PARÁMETROS Y CONFIGURACIÓN INICIAL
  // ============================================================
  
  // Hook para obtener parámetros de navegación
  const params = useLocalSearchParams();
  const router = useRouter();
  
  // Estados principales del componente
  const [projectId, setProjectId] = useState(null);          // ID único del proyecto
  const [projectTitle, setProjectTitle] = useState('');      // Título del proyecto para mostrar
  const [focusedTask, setFocusedTask] = useState(null);      // Tarea a enfocar desde notificación
  const [projectCompleted, setProjectCompleted] = useState(false); // Estado de completado
  
  // Estados para gestión de cronograma (feature 3.2)
  const [showEditSchedule, setShowEditSchedule] = useState(false); // Visibilidad modal edición
  const [savingSchedule, setSavingSchedule] = useState(false);     // Estado de guardado

  /**
   * Efecto para procesar parámetros de navegación
   * Extrae y valida el ID del proyecto, título y tarea enfocada
   * Se ejecuta cuando cambian los parámetros
   */
  useEffect(() => {
    console.log('🔍 Parámetros recibidos en ProjectStepScreen:', params);
    
    // Procesamiento seguro de parámetros (manejo de arrays)
    let id = params.id;
    if (Array.isArray(id)) id = id[0];
    
    let title = params.title;
    if (Array.isArray(title)) title = title[0];
    
    let focused = params.focusedTask;
    if (Array.isArray(focused)) focused = focused[0];
    
    // Validación y establecimiento de estados
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

  // ============================================================
  // 2. HOOKS PERSONALIZADOS PARA FUNCIONALIDADES
  // ============================================================

  /**
   * Hook para gestión de permisos basados en roles
   * @typedef {Object} Permissions
   * @property {Function} canMarkStateRole - Permiso para marcar estado de tareas
   * @property {Function} canProrrogaRole - Permiso para gestionar prórrogas
   * @property {Function} canChangeStartDateRole - Permiso para cambiar fecha inicio
   */
  const { canMarkStateRole, canProrrogaRole, canChangeStartDateRole } = usePermissions();

  /**
   * Hook para gestión de datos del proyecto
   * @typedef {Object} ProjectData
   * @property {string} projectStartISO - Fecha de inicio en formato ISO
   * @property {Function} handleChangeStartDate - Handler para cambiar fecha inicio
   * @property {boolean} showDatePicker - Estado del selector de fecha
   * @property {Function} setShowDatePicker - Setter para selector de fecha
   */
  const { projectStartISO, handleChangeStartDate, showDatePicker, setShowDatePicker } = useProjectData(projectId);

  /**
   * Hook para gestión de tareas y prórrogas
   * @typedef {Object} TasksHook
   * @property {Array} tasks - Lista de tareas del proyecto
   * @property {boolean} prorrogaModal - Visibilidad modal de prórroga
   * @property {Function} setProrrogaModal - Setter para modal de prórroga
   * @property {Object} prorrogaTarget - Tarea objetivo de prórroga
   * @property {Function} setProrrogaTarget - Setter para tarea objetivo
   * @property {number} prorrogaDias - Días de prórroga a aplicar
   * @property {Function} setProrrogaDias - Setter para días de prórroga
   * @property {Function} applyProrroga - Función para aplicar prórroga
   * @property {Function} toggleCumplida - Alternar estado de cumplimiento
   * @property {Function} openProrroga - Abrir modal de prórroga
   * @property {Function} markAsNotApplicable - Marcar tarea como no aplica
   * @property {Function} unmarkAsNotApplicable - Quitar marca de no aplica
   */
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
  
  // Hook para notificaciones push de tareas
  useStepsNotifications(tasks, projectTitle, projectId);

  // ============================================================
  // 3. PERMISOS Y HANDLERS PARA CRONOGRAMA (FEATURE 3.2)
  // ============================================================

  /**
   * Determina si el usuario puede editar el cronograma
   * @constant {boolean} canEditSchedule
   */
  const canEditSchedule = canChangeStartDateRole;

  /**
   * Handler para guardar cambios en el cronograma
   * Aplica sobrescrituras de duraciones base a Firestore
   * 
   * @async
   * @param {Object} baseDurationsPayload - Payload con duraciones personalizadas
   * @param {Object} baseDurationsPayload.[taskId] - Duración personalizada por tarea
   * @throws {Error} Si falla la actualización en Firestore
   */
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

  // ============================================================
  // 4. DETECCIÓN AUTOMÁTICA DE FINALIZACIÓN DEL PROYECTO
  // ============================================================

  /**
   * Efecto para verificar si el proyecto está completado al 100%
   * Se ejecuta cuando cambian las tareas, ID, título o estado de completado
   * Excluye tareas de mantenimiento y marcadas como "no aplica"
   * Marca automáticamente el proyecto como completado en Firestore
   */
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
          // Marcar automáticamente como completado en Firestore
          await projectService.markAsCompleted(projectId, projectTitle);
          setProjectCompleted(true);
          
          // Alertar al usuario sobre el completado
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

  // ============================================================
  // 5. MANEJO DE TAREA ENFOCADA DESDE NOTIFICACIÓN
  // ============================================================

  /**
   * Efecto para manejar el enfoque en tarea específica desde notificación
   * Busca la tarea por ID y registra si se encontró o no
   */
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

  // ============================================================
  // 6. PANTALLAS DE CARGA Y ESTADOS INTERMEDIOS
  // ============================================================

  /**
   * Pantalla de carga cuando no se ha identificado el proyecto
   */
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

  /**
   * Pantalla de carga cuando se está obteniendo la fecha de inicio
   */
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

  // ============================================================
  // 7. RENDERIZADO PRINCIPAL
  // ============================================================

  return (
    <LinearGradient colors={["#42275a", "#734b6d"]} style={styles.container}>
      {/* Header del proyecto con información básica */}
      <ProjectHeader 
        title={projectTitle}
        projectStartISO={projectStartISO}
        canChangeStartDateRole={canChangeStartDateRole}
        showDatePicker={showDatePicker}
        setShowDatePicker={setShowDatePicker}
        handleChangeStartDate={handleChangeStartDate}
      />

      {/* Botón para editar cronograma (solo con permisos) */}
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

      {/* Lista de tareas organizadas por grupos */}
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

      {/* Modal para gestión de prórrogas */}
      <ProrrogaModal
        visible={prorrogaModal}
        target={prorrogaTarget}
        dias={prorrogaDias}
        onClose={() => setProrrogaModal(false)}
        onDiasChange={setProrrogaDias}
        onApply={applyProrroga}
      />

      {/* Modal para edición de cronograma */}
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

// ============================================================
// 8. ESTILOS PARA BANNER DE PROYECTO COMPLETADO
// ============================================================

/**
 * Estilos específicos para el banner de proyecto completado
 * @constant {Object} completedBannerStyles
 * @property {Object} banner - Contenedor del banner
 * @property {Object} bannerText - Texto principal del banner
 * @property {Object} bannerSubtext - Texto secundario del banner
 */
const completedBannerStyles = {
  banner: {
    backgroundColor: '#4CAF50', // Verde de éxito
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