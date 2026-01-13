// components/inventory/equipment/EquipmentHeader.js
import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useUser } from "../../../context/UserContext";

/**
 * Componente de cabecera para la sección de herramientas/equipos.
 * Muestra el título, rol del usuario y botones de acción condicionales
 * basados en los permisos del usuario.
 * 
 * @component
 * @example
 * const handleAddPress = () => {
 *   setShowAddModal(true);
 * };
 * 
 * const handleAssignPress = () => {
 *   setShowAssignModal(true);
 * };
 * 
 * return (
 *   <EquipmentHeader
 *     onAddPress={handleAddPress}
 *     onAssignPress={handleAssignPress}
 *   />
 * );
 * 
 * @param {Object} props - Propiedades del componente
 * @param {function} props.onAddPress - Callback al presionar botón "Agregar"
 * @param {function} props.onAssignPress - Callback al presionar botón "Asignar"
 * 
 * @returns {React.ReactElement} Cabecera con botones de acción para herramientas
 * 
 * @see useUser Hook de contexto para obtener información del usuario
 * @see useRouter Hook de Expo Router para navegación
 * @see AddEquipmentModal Modal para agregar nuevas herramientas
 * @see AssignEquipmentModal Modal para asignar herramientas a personal
 */
export default function EquipmentHeader({ onAddPress, onAssignPress }) {
  // Obtener información del usuario desde el contexto
  const { role } = useUser();
  
  // Hook para navegación entre pantallas
  const router = useRouter();

  // Determinar permisos basados en el rol
  /**
   * Verifica si el usuario tiene permisos de administrador.
   * @constant
   * @type {boolean}
   */
  const isAdmin = role === "Administrador";
  
  /**
   * Verifica si el usuario puede gestionar herramientas.
   * Incluye Administrador, Ingeniero y Supervisor.
   * @constant
   * @type {boolean}
   */
  const canManage = ["Administrador", "Ingeniero", "Supervisor"].includes(role);

  return (
    <View style={styles.container}>
      {/* Título con icono y rol del usuario */}
      <Text style={styles.title}>🔧 Herramientas ({role})</Text>

      {/* Contenedor de botones de acción */}
      <View style={styles.topButtons}>
        {/* Botón: Agregar nueva herramienta (solo para gestores) */}
        {canManage && (
          <TouchableOpacity
            style={[styles.topButton, { backgroundColor: "#38A169" }]} // Verde
            onPress={onAddPress}
            accessibilityLabel="Agregar nueva herramienta"
            accessibilityHint="Abre modal para registrar nueva herramienta en inventario"
          >
            <Text style={styles.topButtonText}>+ Agregar</Text>
          </TouchableOpacity>
        )}

        {/* Botón: Asignar herramienta (solo para gestores) */}
        {canManage && (
          <TouchableOpacity
            style={[styles.topButton, { backgroundColor: "#3182CE" }]} // Azul
            onPress={onAssignPress}
            accessibilityLabel="Asignar herramienta a personal"
            accessibilityHint="Abre modal para asignar herramienta a miembro del personal"
          >
            <Text style={styles.topButtonText}>Asignar</Text>
          </TouchableOpacity>
        )}

        {/* Botón: Ver historial (disponible para todos los usuarios) */}
        <TouchableOpacity
          style={[styles.topButton, { backgroundColor: "#805AD5" }]} // Púrpura
          onPress={() => router.push("/EquipmentHistoryScreen")}
          accessibilityLabel="Ver historial de herramientas"
          accessibilityHint="Navega a pantalla de historial de movimientos de herramientas"
        >
          <Text style={styles.topButtonText}>Historial</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16, // Espaciado inferior para separar del contenido
  },
  title: {
    fontSize: 22,
    color: "#FFF", // Blanco
    marginBottom: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  topButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8, // Espacio entre botones
  },
  topButton: {
    flex: 1, // Cada botón ocupa igual espacio
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  topButtonText: {
    color: "#FFF",
    fontWeight: "bold",
  },
});