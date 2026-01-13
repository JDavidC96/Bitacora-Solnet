// components/inventory/project/AddMaterialButton.js

import { StyleSheet, Text, TouchableOpacity } from "react-native";

/**
 * Componente de botón reutilizable para agregar materiales a un proyecto.
 * Diseñado con un estilo distintivo azul brillante y un icono de adición (+)
 * para indicar claramente su función de agregar nuevos elementos.
 * 
 * @component
 * @example
 * const handleAddMaterial = () => {
 *   // Abrir modal de selección de materiales
 *   setShowAddMaterialModal(true);
 * };
 * 
 * return (
 *   <AddMaterialButton onPress={handleAddMaterial} />
 * );
 * 
 * @example
 * // Uso en una lista de proyectos
 * <View>
 *   <ProjectCard project={project} />
 *   <AddMaterialButton onPress={() => handleAddToProject(project.id)} />
 * </View>
 * 
 * @param {Object} props - Propiedades del componente
 * @param {function} props.onPress - Callback al presionar el botón
 * 
 * @returns {React.ReactElement} Botón para agregar materiales
 * 
 * @see AddExternalMaterialModal Modal para agregar materiales externos
 * @see AddDirectPurchaseModal Modal para compras directas
 * @see ProjectInventoryScreen Pantalla donde se utiliza comúnmente
 */
export default function AddMaterialButton({ onPress }) {
  return (
    <TouchableOpacity 
      style={styles.addButton} 
      onPress={onPress}
      accessibilityLabel="Agregar material al proyecto"
      accessibilityHint="Abre modal para agregar materiales al inventario del proyecto"
      accessibilityRole="button"
    >
      <Text style={styles.addButtonText}>➕ Agregar Material</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  addButton: {
    backgroundColor: "#055bfaff", // Azul brillante con opacidad completa (ff)
    paddingVertical: 12, // Espaciado vertical
    borderRadius: 8, // Bordes redondeados
    alignItems: "center", // Centrar contenido horizontalmente
    marginBottom: 16, // Margen inferior para separar de otros elementos
    /**
     * Propiedades adicionales recomendadas para mejor UX:
     * - elevation: 3 (Android shadow)
     * - shadowColor: "#000" (iOS shadow)
     * - shadowOffset: { width: 0, height: 2 }
     * - shadowOpacity: 0.25
     * - shadowRadius: 3.84
     */
  },
  addButtonText: { 
    color: "#ffffffff", // Blanco puro con opacidad completa
    fontSize: 16, // Tamaño de fuente legible
    fontWeight: "bold", // Peso de fuente para énfasis
    
  },
});