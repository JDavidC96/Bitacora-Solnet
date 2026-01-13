// components/inventory/equipment/EquipmentList.js
import { FlatList, StyleSheet, Text, View } from "react-native";
import EquipmentItem from "./EquipmentItem";

/**
 * Componente contenedor que renderiza una lista de herramientas/equipos usando FlatList.
 * Maneja estados de carga, listas vacías y propaga propiedades a cada EquipmentItem.
 * Optimizado para rendimiento con virtualización de lista.
 * 
 * @component
 * @example
 * const handleLoan = (equipment) => {
 *   // Abrir modal de préstamo para la herramienta específica
 *   setSelectedEquipment(equipment);
 *   setShowLoanModal(true);
 * };
 * 
 * const handleReturn = async (equipment) => {
 *   // Confirmar y procesar devolución
 *   await returnEquipment(equipment.id);
 * };
 * 
 * return (
 *   <EquipmentList
 *     equipment={equipmentData}
 *     onLoan={handleLoan}
 *     onTransfer={handleTransfer}
 *     onReturn={handleReturn}
 *     onDelete={handleDelete}
 *     canEdit={userCanEdit}
 *     isAdmin={userIsAdmin}
 *     loading={isLoading}
 *     emptyMessage="No se encontraron herramientas"
 *   />
 * );
 * 
 * @param {Object} props - Propiedades del componente
 * @param {Array<Object>} [props.equipment=[]] - Lista de herramientas/equipos a mostrar
 * @param {string|number} props.equipment[].id - Identificador único de la herramienta
 * @param {string} props.equipment[].nombre - Nombre de la herramienta
 * @param {string} props.equipment[].estado - Estado de la herramienta
 * @param {string} [props.equipment[].serial] - Número de serie (opcional)
 * @param {Object} [props.equipment[].asignada] - Información de proyecto asignado
 * @param {Object} [props.equipment[].prestadaA] - Información de préstamo a persona
 * @param {function} props.onLoan - Callback al solicitar préstamo de una herramienta
 * @param {function} props.onTransfer - Callback al solicitar transferencia de una herramienta
 * @param {function} props.onReturn - Callback al solicitar devolución de una herramienta
 * @param {function} props.onDelete - Callback al solicitar eliminación de una herramienta
 * @param {boolean} [props.canEdit=false] - Controla si mostrar botones de edición en items
 * @param {boolean} [props.isAdmin=false] - Controla si mostrar botón de eliminación en items
 * @param {boolean} [props.loading=false] - Indica si está cargando los datos
 * @param {string} [props.emptyMessage="No hay herramientas"] - Mensaje para lista vacía
 * 
 * @returns {React.ReactElement} Lista de herramientas con manejo de estados
 * 
 * @see EquipmentItem Componente de item individual de herramienta
 * @see EquipmentHeader Cabecera de la sección de herramientas
 * @see FlatList Componente de lista virtualizada de React Native
 */
export default function EquipmentList({
  equipment = [],
  onLoan,
  onTransfer,
  onReturn,
  onDelete,
  canEdit = false,
  isAdmin = false,
  loading = false,
  emptyMessage = "No hay herramientas"
}) {
  // Estado: Cargando datos
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando herramientas...</Text>
      </View>
    );
  }

  // Estado: Lista vacía
  if (equipment.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  // Estado: Lista con datos
  return (
    <FlatList
      data={equipment}
      keyExtractor={(item) => String(item.id)} // Asegurar string para clave
      renderItem={({ item }) => (
        <EquipmentItem
          item={item}
          onLoan={() => onLoan(item)}
          onTransfer={() => onTransfer(item)}
          onReturn={() => onReturn(item)}
          onDelete={() => onDelete(item)}
          canEdit={canEdit}
          isAdmin={isAdmin}
        />
      )}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      /**
       * Propiedades de performance de FlatList (opcionales):
       * - initialNumToRender: 10 (número inicial de items a renderizar)
       * - maxToRenderPerBatch: 10 (máximo por lote de renderizado)
       * - windowSize: 21 (número de viewports a mantener en memoria)
       * - removeClippedSubviews: true (mejora rendimiento en listas largas)
       */
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: 20, // Espacio inferior para scroll
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
  loadingText: {
    color: "#FFF", // Texto blanco para tema oscuro
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
  emptyText: {
    color: "#FFF", // Texto blanco para tema oscuro
    fontSize: 16,
    textAlign: "center",
  },
});