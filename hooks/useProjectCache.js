import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const PROJECTS_CACHE_KEY = '@projects_cache';
const CACHE_DURATION = 168 * 60 * 60 * 1000; // 168 horas

export const useProjectCache = () => {
  const [cache, setCache] = useState({});

  // Cargar cache al iniciar
  useEffect(() => {
    loadCache();
  }, []);

  const loadCache = async () => {
    try {
      const cached = await AsyncStorage.getItem(PROJECTS_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Limpiar cache expirado
        const now = Date.now();
        const validCache = {};
        
        Object.keys(parsed).forEach(projectId => {
          if (now - parsed[projectId].timestamp < CACHE_DURATION) {
            validCache[projectId] = parsed[projectId];
          }
        });
        
        setCache(validCache);
        await AsyncStorage.setItem(PROJECTS_CACHE_KEY, JSON.stringify(validCache));
      }
    } catch (error) {
      console.error('Error loading cache:', error);
    }
  };

  const saveProjectToCache = async (projectId, projectData, tasks) => {
    try {
      const updatedCache = {
        ...cache,
        [projectId]: {
          title: projectData.title || projectData.nombre || 'Proyecto sin nombre',
          startDate: projectData.startDate,
          tasks: tasks.map(task => ({
            idDoc: task.idDoc,
            idTarea: task.idTarea,
            titulo: task.titulo,
            fechaInicio: task.fechaInicio,
            fechaFin: task.fechaFin,
            cumplida: task.cumplida,
            fase: task.fase,
            prorrogas: task.prorrogas,
            notas: task.notas,
          })),
          timestamp: Date.now()
        }
      };
      
      setCache(updatedCache);
      await AsyncStorage.setItem(PROJECTS_CACHE_KEY, JSON.stringify(updatedCache));
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  };

  const getCachedProject = (projectId) => {
    return cache[projectId];
  };

  const clearCache = async () => {
    try {
      setCache({});
      await AsyncStorage.removeItem(PROJECTS_CACHE_KEY);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  };

  return {
    cache,
    saveProjectToCache,
    getCachedProject,
    clearCache
  };
};