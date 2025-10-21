export const useInventoryPermissions = (role) => {
  const canAdd = role === "Almacenista" || role === "Administrador" || role === "Supervisor";
  
  const rolesConPermisoMover = ["Administrador", "Ingeniero", "Supervisor", "Almacenista"];
  const canMove = rolesConPermisoMover.includes(role);

  return { canAdd, canMove };
};