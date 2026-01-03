// services/projectUtilityService.js
import { budgetService } from './budgetService';

export const projectUtilityService = {
  /**
   * Calcular utilidad de un proyecto basado en el presupuesto
   */
  async calculateProjectUtility(projectId) {
    try {
      const budget = await budgetService.getByProject(projectId);
      
      if (!budget) {
        return 0;
      }

      // La utilidad está en calculosGlobales.utilidad
      const utility = budget.calculosGlobales?.utilidad || 0;
      
      return utility;
    } catch (error) {
      console.error('Error calculando utilidad:', error);
      return 0;
    }
  },

  /**
   * Obtener utilidad para múltiples proyectos
   */
  async getUtilitiesForProjects(projects) {
    try {
      const projectsWithUtility = await Promise.all(
        projects.map(async (project) => {
          const utility = await this.calculateProjectUtility(project.id);
          return {
            ...project,
            utility
          };
        })
      );

      return projectsWithUtility;
    } catch (error) {
      console.error('Error obteniendo utilidades:', error);
      return projects.map(project => ({ ...project, utility: 0 }));
    }
  }
};