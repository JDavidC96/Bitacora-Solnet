// components/inventory/project/EmptyInventory.js

import { StyleSheet, Text } from "react-native";

/**
 * Componente de estado vacío para mostrar cuando no hay materiales en un proyecto.
 * Diseñado como un componente simple y reutilizable para proporcionar
 * feedback visual claro al usuario cuando una lista de materiales está vacía.
 * 
 * @component
 * @example
 * // Uso básico
 * return (
 *   <View style={styles.container}>
 *     {materials.length === 0 ? (
 *       <EmptyInventory />
 *     ) : (
 *       <MaterialList materials={materials} />
 *     )}
 *   </View>
 * );
 * 
 * @example
 * // Con mensaje personalizado
 * const CustomEmptyState = () => (
 *   <View>
 *     <EmptyInventory />
 *     <Text style={styles.hint}>
 *       Presiona el botón "+" para agregar tu primer material
 *     </Text>
 *   </View>
 * );
 * 
 * @returns {React.ReactElement} Componente de estado vacío para inventario
 * 
 * @see InventoryList Componente que puede usar este estado vacío
 * @see ProjectInventoryScreen Pantalla donde se muestra comúnmente
 * @see AddMaterialButton Botón complementario para agregar materiales
 */
export default function EmptyInventory() {
  return (
    <Text 
      style={styles.empty}
      accessibilityLabel="No hay materiales en este proyecto"
      accessibilityRole="text"
    >
      No hay materiales en este proyecto
    </Text>
  );
}

const styles = StyleSheet.create({
  empty: { 
    color: "#888", // Gris medio para indicar estado neutral/informativo
    textAlign: "center", 
    marginTop: 20,
    /**
     * Consideraciones de diseño:
     * - Color gris (#888) contrasta suficiente con fondos claros y oscuros
     * - Texto centrado para balance visual
     * - Margen superior para separación del contenido anterior
     * - Tamaño de fuente heredado del contexto (generalmente 14-16px)
     */
  },
});