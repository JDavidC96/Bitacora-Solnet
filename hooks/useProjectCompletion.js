// hooks/useProjectCompletion.js
import { useEffect } from 'react';
import { markProjectAsCompleted } from '../services/projectService';
import { useTasks } from './useTasks';

export const useProjectCompletion = (projectId, projectStartISO) => {
  const { tasks } = useTasks(projectId, projectStartISO);

  useEffect(() => {
    const checkProjectCompletion = async () => {
      if (!tasks.length) return;

      const allTasksCompleted = tasks.every(task => task.cumplida);
      
      if (allTasksCompleted) {
        try {
          await markProjectAsCompleted(projectId);
          console.log('✅ Proyecto marcado como completado automáticamente');
        } catch (error) {
          console.error('Error marcando proyecto como completado:', error);
        }
      }
    };

    checkProjectCompletion();
  }, [tasks, projectId]);
};