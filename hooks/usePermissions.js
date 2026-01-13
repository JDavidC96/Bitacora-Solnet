import { useUser } from '../context/UserContext';

/**
 * Hook centralizado para la gestión de permisos basados en roles de usuario
 * Unifica toda la lógica de permisos en un solo lugar para evitar duplicación
 * 
 * @hook
 * @returns {Object} Objeto con funciones y valores booleanos que indican los permisos del usuario
 * 
 * @example
 * // Uso básico
 * const { canWrite, canAccessBudget, canAddViaticos } = usePermissions();
 * 
 * @example
 * // Uso condicional
 * const { canMarkStateRole } = usePermissions();
 * if (canMarkStateRole) {
 *   // Mostrar funcionalidad para cambiar estado
 * }
 */
export const usePermissions = () => {
  const { role } = useUser();

  // Definición de grupos de permisos por rol
  const canWrite = ['Administrador', 'Ingeniero', 'Supervisor', 'Tecnico'];
  const canAccessBudget = ['Administrador', 'Administrativo', 'Ingeniero'];
  const canAddViaticos = ['Administrador', 'Administrativo', 'Ingeniero', 'Supervisor'];
  const canMarkState = ['Administrador', 'Ingeniero', 'Supervisor'];
  const canProrroga = ['Administrador'];
  const canChangeStartDate = ['Administrador'];
  const canAdministrativos = ['Administrador', 'Administrativo'];
  const canIngenerioRole = ['Administrador', 'Ingeniero'];
  const canAccessCalendar = ['Administrador', 'Ingeniero', 'Supervisor', 'Tecnico'];
  const canAccessProjectSteps = ['Administrador', 'Ingeniero', 'Supervisor', 'Tecnico'];
  const canAccessProjectInventory = ['Administrador', 'Ingeniero', 'Supervisor', 'Tecnico'];

  return {
    // Permisos de escritura y contenido
    canWrite: canWrite.includes(role),
    canAccessBudget: canAccessBudget.includes(role),
    canAddViaticos: canAddViaticos.includes(role),
    
    // Permisos de gestión de proyecto
    canMarkStateRole: canMarkState.includes(role),
    canProrrogaRole: canProrroga.includes(role),
    canChangeStartDateRole: canChangeStartDate.includes(role),
    canAdministrativosRole: canAdministrativos.includes(role),
    canIngenerioRole: canIngenerioRole.includes(role),
    
    // Permisos de acceso a módulos
    canAccessCalendar: canAccessCalendar.includes(role),
    canAccessProjectSteps: canAccessProjectSteps.includes(role),
    canAccessProjectInventory: canAccessProjectInventory.includes(role),
    
    // Rol actual para lógica personalizada
    currentRole: role,
    
    // Funciones de validación
    hasRole: (roles) => Array.isArray(roles) ? roles.includes(role) : false,
    hasAnyRole: (...rolesArray) => rolesArray.some(roles => roles.includes(role)),
  };
};
