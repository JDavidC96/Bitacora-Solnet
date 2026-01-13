// components/inventory/equipment/EquipmentItem.js
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

/**
 * Componente para mostrar un item individual de herramienta/equipo en el inventario.
 * Presenta información detallada del equipo y botones de acción condicionales
 * basados en el estado del equipo y permisos del usuario.
 * 
 * @component
 * @example
 * const handleLoan = () => {
 *   // Abrir modal para prestar la herramienta
 *   setSelectedItem(item);
 *   setShowLoanModal(true);
 * };
 * 
 * const handleReturn = () => {
 *   // Confirmar devolución de la herramienta
 *   confirmReturn(item.id);
 * };
 * 
 * return (
 *   <EquipmentItem
 *     item={equipmentItem}
 *     onLoan={handleLoan}
 *     onTransfer={handleTransfer}
 *     onReturn={handleReturn}
 *     onDelete={handleDelete}
 *     canEdit={userCanEdit}
 *     isAdmin={userIsAdmin}
 *   />
 * );
 * 
 * @param {Object} props - Propiedades del componente
 * @param {Object} props.item - Datos de la herramienta/equipo
 * @param {string} props.item.nombre - Nombre de la herramienta
 * @param {string} props.item.estado - Estado actual (Nueva, Usada, Reparación, etc.)
 * @param {string} [props.item.serial] - Número de serie único (opcional)
 * @param {boolean} [props.item.asignada] - Indica si está asignada a un proyecto
 * @param {Object} [props.item.asignada.nombre] - Nombre del proyecto asignado
 * @param {boolean} [props.item.prestadaA] - Indica si está prestada a una persona
 * @param {Object} [props.item.prestadaA.nombre] - Nombre de la persona a quien se prestó
 * @param {function} [props.onLoan] - Callback al presionar botón "Prestar"
 * @param {function} [props.onTransfer] - Callback al presionar botón "Transferir"
 * @param {function} [props.onReturn] - Callback al presionar botón "Devolver"
 * @param {function} [props.onDelete] - Callback al presionar botón "Eliminar"
 * @param {boolean} [props.canEdit=false] - Permite mostrar botones de edición (Prestar, Transferir)
 * @param {boolean} [props.isAdmin=false] - Permite mostrar botón de eliminación
 * 
 * @returns {React.ReactElement} Item visual de herramienta con acciones
 * 
 * @see EquipmentHeader Cabecera de la sección de herramientas
 * @see AddEquipmentModal Modal para agregar nuevas herramientas
 * @see AssignEquipmentModal Modal para asignar herramientas
 */
export default function EquipmentItem({
  item,
  onLoan,
  onTransfer,
  onReturn,
  onDelete,
  canEdit = false,
  isAdmin = false
}) {
  return (
    <View style={styles.container}>
      {/* Sección de información de la herramienta */}
      <View style={styles.info}>
        {/* Nombre principal de la herramienta */}
        <Text style={styles.name}>{item.nombre}</Text>
        
        {/* Estado actual de la herramienta */}
        <Text style={styles.detail}>Estado: {item.estado}</Text>
        
        {/* Número de serie (si existe) */}
        {item.serial && <Text style={styles.detail}>Serial: {item.serial}</Text>}
        
        {/* Información de asignación a proyecto */}
        {item.asignada ? (
          <Text style={styles.detail}>Asignada a: {item.asignada.nombre}</Text>
        ) : (
          <Text style={styles.detail}>No asignada</Text>
        )}
        
        {/* Información de préstamo a persona */}
        {item.prestadaA && (
          <Text style={[styles.detail, { color: "#3182CE" }]}>
            Prestado a: {item.prestadaA.nombre}
          </Text>
        )}
      </View>

      {/* Sección de botones de acción (condicionales) */}
      <View style={styles.actions}>
        {/* Botón: Prestar herramienta (solo con permisos de edición) */}
        {canEdit && (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#3182CE" }]} // Azul
            onPress={onLoan}
            accessibilityLabel={`Prestar herramienta ${item.nombre}`}
            accessibilityHint="Registrar préstamo de esta herramienta a una persona"
          >
            <Text style={styles.buttonText}>Prestar</Text>
          </TouchableOpacity>
        )}

        {/* Botón: Transferir entre proyectos (solo con permisos de edición) */}
        {canEdit && (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#ECC94B" }]} // Amarillo
            onPress={onTransfer}
            accessibilityLabel={`Transferir herramienta ${item.nombre}`}
            accessibilityHint="Mover esta herramienta entre proyectos o ubicaciones"
          >
            <Text style={styles.buttonText}>Transferir</Text>
          </TouchableOpacity>
        )}

        {/* Botón: Devolver herramienta (solo si está prestada) */}
        {item.prestadaA && (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#48BB78" }]} // Verde
            onPress={onReturn}
            accessibilityLabel={`Devolver herramienta ${item.nombre}`}
            accessibilityHint="Registrar devolución de esta herramienta al inventario"
          >
            <Text style={styles.buttonText}>Devolver</Text>
          </TouchableOpacity>
        )}

        {/* Botón: Eliminar herramienta (solo para administradores) */}
        {isAdmin && (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#E53E3E" }]} // Rojo
            onPress={onDelete}
            accessibilityLabel={`Eliminar herramienta ${item.nombre}`}
            accessibilityHint="Eliminar permanentemente esta herramienta del inventario"
          >
            <Text style={styles.buttonText}>Eliminar</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(255, 255, 255, 0.9)", // Blanco semi-transparente
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2, // Sombra para Android
  },
  info: {
    flex: 1, // Ocupa espacio disponible
  },
  name: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2D3748", // Gris oscuro
    marginBottom: 4,
  },
  detail: {
    fontSize: 14,
    color: "#4A5568", // Gris medio
    marginBottom: 2,
  },
  actions: {
    flexDirection: "row",
    marginTop: 12,
    gap: 8, // Espacio entre botones
    flexWrap: "wrap", // Permite que botones se envuelvan en pantallas pequeñas
  },
  button: {
    flex: 1, // Botones ocupan igual ancho
    padding: 10,
    borderRadius: 6,
    alignItems: "center",
    minWidth: 80, // Ancho mínimo para mantener legibilidad
  },
  buttonText: {
    color: "#FFF", // Texto blanco para contraste
    fontWeight: "600",
    fontSize: 14,
  },
});