// components/inventory/MoveItemModal.js
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import DropdownSelect from '../DropdownSelect';

/**
 * Modal para mover items del inventario entre ubicaciones (proyectos o inventario general).
 * Permite transferir cantidades específicas de materiales/equipos con validaciones
 * de stock, cálculos de valor y selección de destinos.
 * 
 * @component
 * @example
 * const handleMoveItem = (moveData) => {
 *   console.log('Moviendo item:', moveData);
 *   // Ejecutar transferencia en backend
 * };
 * 
 * return (
 *   <MoveItemModal
 *     visible={isModalVisible}
 *     selectedItem={selectedInventoryItem}
 *     projects={projectsList}
 *     onMove={handleMoveItem}
 *     onClose={() => setModalVisible(false)}
 *     loading={isProcessing}
 *   />
 * );
 * 
 * @param {Object} props - Propiedades del componente
 * @param {boolean} props.visible - Controla la visibilidad del modal
 * @param {Object|null} props.selectedItem - Item del inventario seleccionado para mover
 * @param {string} props.selectedItem.nombre - Nombre del item
 * @param {string} [props.selectedItem.codigo] - Código/identificador del item
 * @param {number} props.selectedItem.cantidad - Cantidad disponible actualmente
 * @param {string} [props.selectedItem.tipo_medida] - Unidad de medida (Unidad, kg, m, etc.)
 * @param {number} [props.selectedItem.precio] - Precio unitario del item
 * @param {string} [props.selectedItem.notas] - Notas adicionales del item
 * @param {string} [props.selectedItem.id] - ID único del item
 * @param {Array<Object>} [props.projects=[]] - Lista de proyectos disponibles como destino
 * @param {string} props.projects[].id - ID del proyecto
 * @param {string} props.projects[].title - Título del proyecto
 * @param {string} [props.projects[].description] - Descripción del proyecto
 * @param {number} [props.projects[].progress] - Progreso del proyecto (0-1)
 * @param {function} props.onMove - Callback al confirmar el movimiento
 * @param {function} props.onClose - Callback al cerrar el modal
 * @param {boolean} [props.loading=false] - Indica si está procesando el movimiento
 * 
 * @returns {React.ReactElement|null} Modal de movimiento de inventario o null si no hay item
 * 
 * @see DropdownSelect Componente de selector desplegable para destinos
 * @see Modal Componente de modal nativo de React Native
 */
export default function MoveItemModal({
  visible,
  selectedItem,
  projects = [],
  onMove,
  onClose,
  loading = false
}) {
  // Estado del formulario de movimiento
  const [moveData, setMoveData] = useState({
    cantidad: '',
    destino: 'proyecto',
    proyectoDestino: null
  });

  /**
   * Inicializa el formulario cuando se abre el modal con un item seleccionado.
   * 
   * @effect
   * @listens visible, selectedItem
   */
  useEffect(() => {
    if (visible && selectedItem) {
      setMoveData({
        cantidad: '',
        destino: 'proyecto',
        proyectoDestino: null
      });
    }
  }, [visible, selectedItem]);

  /**
   * Valida y procesa el movimiento del item.
   * Realiza validaciones de cantidad, stock y destino.
   * 
   * @function
   * @returns {void}
   * 
   * @fires onMove Con los datos validados del movimiento
   */
  const handleMove = () => {
    // Validación: cantidad requerida
    if (!moveData.cantidad) {
      alert('Por favor indica la cantidad a mover');
      return;
    }

    // Validación: cantidad numérica válida
    const cantidadInt = parseInt(moveData.cantidad);
    if (isNaN(cantidadInt) || cantidadInt <= 0) {
      alert('La cantidad debe ser un número válido');
      return;
    }

    // Validación: no superar stock disponible
    if (cantidadInt > selectedItem.cantidad) {
      alert('No puedes mover más de lo disponible');
      return;
    }

    // Validación: proyecto destino requerido si destino es proyecto
    if (moveData.destino === 'proyecto' && !moveData.proyectoDestino) {
      alert('Por favor selecciona un proyecto destino');
      return;
    }

    // Enviar datos validados
    onMove({
      cantidad: cantidadInt,
      proyectoDestino: moveData.proyectoDestino
    });
  };

  /**
   * Cierra el modal y limpia el formulario.
   * 
   * @function
   * @returns {void}
   * 
   * @fires onClose Para notificar al componente padre
   */
  const handleClose = () => {
    setMoveData({
      cantidad: '',
      destino: 'proyecto',
      proyectoDestino: null
    });
    onClose();
  };

  /**
   * Filtra proyectos activos (progreso < 100%).
   * Solo proyectos en curso pueden recibir materiales.
   * 
   * @constant
   * @type {Array<Object>}
   */
  const proyectosActivos = projects.filter(proyecto => 
    (proyecto.progress || 0) < 1
  );

  /**
   * Encuentra el proyecto seleccionado para mostrar información adicional.
   * 
   * @constant
   * @type {Object|undefined}
   */
  const proyectoSeleccionado = proyectosActivos.find(p => p.id === moveData.proyectoDestino);

  // Validación: no renderizar si no hay item seleccionado
  if (!selectedItem) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header del modal */}
          <View style={styles.header}>
            <Text style={styles.title}>Mover {selectedItem.nombre}</Text>
          </View>

          {/* Contenido desplazable */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Información detallada del item */}
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{selectedItem.nombre}</Text>
              
              {/* Código del item (si existe) */}
              {selectedItem.codigo && (
                <Text style={styles.itemCode}>Código: {selectedItem.codigo}</Text>
              )}
              
              {/* Disponibilidad actual */}
              <Text style={styles.itemDetails}>
                Disponible: {selectedItem.cantidad} {selectedItem.tipo_medida || 'Unidad'}
              </Text>
              
              {/* Información de precios y valor total */}
              {selectedItem.precio > 0 && (
                <View style={styles.priceInfo}>
                  <Text style={styles.priceText}>
                    Precio: ${selectedItem.precio.toLocaleString()} {selectedItem.tipo_medida === 'Unidad' ? 'c/u' : ''}
                  </Text>
                  <Text style={styles.totalValueText}>
                    Valor total: ${(selectedItem.precio * selectedItem.cantidad).toLocaleString()}
                  </Text>
                </View>
              )}
              
              {/* Notas adicionales */}
              {selectedItem.notas && (
                <Text style={styles.itemNotes}>Notas: {selectedItem.notas}</Text>
              )}
            </View>

            {/* Campo: Cantidad a mover */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Cantidad a mover *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: 100"
                placeholderTextColor="#666"
                keyboardType="numeric"
                value={moveData.cantidad}
                onChangeText={(text) => {
                  // Validación: solo números enteros
                  if (/^\d*$/.test(text)) {
                    setMoveData(prev => ({ ...prev, cantidad: text }));
                  }
                }}
                editable={!loading}
              />
              {/* Información de stock restante y valor del movimiento */}
              {moveData.cantidad && !isNaN(parseInt(moveData.cantidad)) && (
                <View style={styles.remainingInfo}>
                  <Text style={styles.remainingText}>
                    Quedarán: {selectedItem.cantidad - parseInt(moveData.cantidad)} {selectedItem.tipo_medida || 'Unidad'}
                  </Text>
                  {/* Valor monetario del movimiento */}
                  {selectedItem.precio > 0 && (
                    <Text style={styles.moveValueText}>
                      Valor del movimiento: ${(selectedItem.precio * parseInt(moveData.cantidad)).toLocaleString()}
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* Selector: Destino del movimiento */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Destino *</Text>
              <DropdownSelect
                data={[
                  { label: "📦 Proyecto", value: "proyecto" },
                  { label: "🏢 Inventario General", value: "general" },
                ]}
                value={moveData.destino}
                placeholder="Selecciona destino"
                onChange={(val) => {
                  setMoveData(prev => ({ 
                    ...prev, 
                    destino: val,
                    proyectoDestino: val === 'proyecto' ? prev.proyectoDestino : null
                  }));
                }}
                disabled={loading}
              />
            </View>

            {/* Selector: Proyecto destino (solo si destino es proyecto) */}
            {moveData.destino === 'proyecto' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Proyecto destino *</Text>
                {proyectosActivos.length === 0 ? (
                  // Estado: No hay proyectos activos disponibles
                  <View style={styles.noProjects}>
                    <Text style={styles.noProjectsText}>
                      No hay proyectos activos disponibles
                    </Text>
                  </View>
                ) : (
                  <>
                    <DropdownSelect
                      key={`proyectos-${selectedItem.id}`} // Forzar re-render al cambiar item
                      data={proyectosActivos.map((p) => ({
                        label: p.title || "Proyecto sin título",
                        value: p.id,
                      }))}
                      value={moveData.proyectoDestino}
                      placeholder="Selecciona un proyecto"
                      onChange={(val) => {
                        setMoveData(prev => ({ ...prev, proyectoDestino: val }));
                      }}
                      disabled={loading}
                    />
                    {/* Información del proyecto seleccionado */}
                    {proyectoSeleccionado && (
                      <View style={styles.selectedProjectInfo}>
                        <Text style={styles.selectedProjectText}>
                          📋 {proyectoSeleccionado.title}
                        </Text>
                        {proyectoSeleccionado.description && (
                          <Text style={styles.selectedProjectDescription}>
                            {proyectoSeleccionado.description}
                          </Text>
                        )}
                      </View>
                    )}
                  </>
                )}
              </View>
            )}

            {/* Mensaje de validación del formulario */}
            <View style={styles.validationInfo}>
              <Text style={styles.validationText}>
                {!moveData.cantidad && '⚠️ Ingresa una cantidad'}
                {moveData.cantidad && moveData.destino === 'proyecto' && !moveData.proyectoDestino && '⚠️ Selecciona un proyecto'}
                {moveData.cantidad && moveData.proyectoDestino && '✅ Listo para mover'}
              </Text>
            </View>
          </ScrollView>

          {/* Footer con botones de acción */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.button, 
                styles.confirmButton, 
                (!moveData.cantidad || !moveData.proyectoDestino || loading) && styles.disabledButton
              ]}
              onPress={handleMove}
              disabled={!moveData.cantidad || !moveData.proyectoDestino || loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.confirmButtonText}>Aceptar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  container: {
    backgroundColor: '#2D3748', // Gris azulado oscuro
    borderRadius: 16,
    width: '95%',
    height: '85%',
    maxWidth: 450, // Ancho máximo para tablets
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  header: {
    backgroundColor: '#4A5568',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  title: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  itemInfo: {
    backgroundColor: 'rgba(44, 44, 58, 0.8)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#3182CE', // Azul indicador
  },
  itemName: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  itemCode: {
    color: '#805AD5', // Púrpura para códigos
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    backgroundColor: 'rgba(128, 90, 213, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  itemDetails: {
    color: '#81E6D9', // Verde agua
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  priceInfo: {
    backgroundColor: 'rgba(56, 161, 105, 0.1)', // Verde suave
    padding: 10,
    borderRadius: 6,
    marginVertical: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#38A169',
  },
  priceText: {
    color: '#38A169', // Verde
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  totalValueText: {
    color: '#2D3748', // Texto oscuro sobre fondo claro
    fontSize: 14,
    fontWeight: 'bold',
  },
  itemNotes: {
    color: '#CCC',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 4,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#000',
    minHeight: 50,
  },
  remainingInfo: {
    marginTop: 6,
  },
  remainingText: {
    color: '#38B2AC', // Turquesa
    fontSize: 14,
    marginTop: 6,
    fontWeight: '500',
  },
  moveValueText: {
    color: '#D69E2E', // Amarillo mostaza
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  noProjects: {
    backgroundColor: 'rgba(229, 62, 62, 0.1)', // Rojo suave
    padding: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E53E3E',
  },
  noProjectsText: {
    color: '#FEB2B2', // Rojo claro
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  selectedProjectInfo: {
    backgroundColor: 'rgba(56, 161, 105, 0.1)',
    padding: 14,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 2,
    borderColor: '#38A169',
  },
  selectedProjectText: {
    color: '#9AE6B4', // Verde claro
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  selectedProjectDescription: {
    color: '#CBD5E0', // Gris claro
    fontSize: 13,
    fontStyle: 'italic',
  },
  validationInfo: {
    backgroundColor: 'rgba(44, 44, 58, 0.6)',
    padding: 14,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 2,
    borderColor: '#FBD38D', // Amarillo/naranja
  },
  validationText: {
    color: '#FBD38D',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    padding: 16,
    backgroundColor: '#4A5568',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  cancelButton: {
    backgroundColor: '#DC2626', // Rojo
  },
  confirmButton: {
    backgroundColor: '#16A34A', // Verde
  },
  disabledButton: {
    backgroundColor: '#6B7280', // Gris
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  confirmButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
});