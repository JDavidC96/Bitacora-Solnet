import { useUser } from '../context/UserContext';

export const usePermissions = () => {
  const { role } = useUser();

  const canMarkState = ['Administrador', 'Ingeniero', 'Supervisor'];
  const canProrroga = ['Administrador'];
  const canChangeStartDate = ['Administrador'];

  return {
    canMarkStateRole: canMarkState.includes(role),
    canProrrogaRole: canProrroga.includes(role),
    canChangeStartDateRole: canChangeStartDate.includes(role),
  };
};