import { useUser } from '../context/UserContext';

export const usePermissions = () => {
  const { role } = useUser();

  const canMarkState = ['Administrador', 'Ingeniero', 'Supervisor'];
  const canProrroga = ['Administrador'];
  const canChangeStartDate = ['Administrador'];
  const canAdministrativos = ['Administrador', 'Administrativo'];
  const canIngenerioRole = ['Administrador', 'Ingeniero']; 

  return {
    canMarkStateRole: canMarkState.includes(role),
    canProrrogaRole: canProrroga.includes(role),
    canChangeStartDateRole: canChangeStartDate.includes(role),
    canAdministrativosRole: canAdministrativos.includes(role),
    canIngenerioRole: canIngenerioRole.includes(role),
  };
};