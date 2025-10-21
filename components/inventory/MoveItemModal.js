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

export default function MoveItemModal({
  visible,
  selectedItem,
  projects = [],
  onMove,
  onClose,
  loading = false
}) {
  const [moveData, setMoveData] = useState({
    cantidad: '',
    destino: 'proyecto',
    proyectoDestino: null
  });

  useEffect(() => {
    if (visible && selectedItem) {
      setMoveData({
        cantidad: '',
        destino: 'proyecto',
        proyectoDestino: null
      });
    }
  }, [visible, selectedItem]);

  const handleMove = () => {
    if (!moveData.cantidad) {
      alert('Por favor indica la cantidad a mover');
      return;
    }

    const cantidadInt = parseInt(moveData.cantidad);
    if (isNaN(cantidadInt) || cantidadInt <= 0) {
      alert('La cantidad debe ser un número válido');
      return;
    }

    if (cantidadInt > selectedItem.cantidad) {
      alert('No puedes mover más de lo disponible');
      return;
    }

    if (moveData.destino === 'proyecto' && !moveData.proyectoDestino) {
      alert('Por favor selecciona un proyecto destino');
      return;
    }

    onMove({
      cantidad: cantidadInt,
      proyectoDestino: moveData.proyectoDestino
    });
  };

  const handleClose = () => {
    setMoveData({
      cantidad: '',
      destino: 'proyecto',
      proyectoDestino: null
    });
    onClose();
  };

  // Filtrar proyectos activos
  const proyectosActivos = projects.filter(proyecto => 
    (proyecto.progress || 0) < 1
  );

  // Obtener proyecto seleccionado para mostrar info
  const proyectoSeleccionado = proyectosActivos.find(p => p.id === moveData.proyectoDestino);

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
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Mover {selectedItem.nombre}</Text>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Información del item */}
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{selectedItem.nombre}</Text>
              <Text style={styles.itemDetails}>
                Disponible: {selectedItem.cantidad} {selectedItem.tipo_medida || 'Unidad'}
              </Text>
              {selectedItem.notas && (
                <Text style={styles.itemNotes}>Notas: {selectedItem.notas}</Text>
              )}
            </View>

            {/* Cantidad a mover */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Cantidad a mover *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: 100"
                placeholderTextColor="#666"
                keyboardType="numeric"
                value={moveData.cantidad}
                onChangeText={(text) => {
                  if (/^\d*$/.test(text)) {
                    setMoveData(prev => ({ ...prev, cantidad: text }));
                  }
                }}
              />
              {moveData.cantidad && !isNaN(parseInt(moveData.cantidad)) && (
                <Text style={styles.remainingText}>
                  Quedarán: {selectedItem.cantidad - parseInt(moveData.cantidad)} {selectedItem.tipo_medida || 'Unidad'}
                </Text>
              )}
            </View>

            {/* Selector de destino */}
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
              />
            </View>

            {/* Selector de proyecto (solo si destino es proyecto) */}
            {moveData.destino === 'proyecto' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Proyecto destino *</Text>
                {proyectosActivos.length === 0 ? (
                  <View style={styles.noProjects}>
                    <Text style={styles.noProjectsText}>
                      No hay proyectos activos disponibles
                    </Text>
                  </View>
                ) : (
                  <>
                    <DropdownSelect
                      key={`proyectos-${selectedItem.id}`}
                      data={proyectosActivos.map((p) => ({
                        label: p.title || "Proyecto sin título",
                        value: p.id,
                      }))}
                      value={moveData.proyectoDestino}
                      placeholder="Selecciona un proyecto"
                      onChange={(val) => {
                        setMoveData(prev => ({ ...prev, proyectoDestino: val }));
                      }}
                    />
                    {proyectoSeleccionado && (
                      <View style={styles.selectedProjectInfo}>
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

            {/* Información de validación */}
            <View style={styles.validationInfo}>
              <Text style={styles.validationText}>
                {!moveData.cantidad && '⚠️ Ingresa una cantidad'}
                {moveData.cantidad && moveData.destino === 'proyecto' && !moveData.proyectoDestino && '⚠️ Selecciona un proyecto'}
                {moveData.cantidad && moveData.proyectoDestino && '✅ Listo para mover'}
              </Text>
            </View>
          </ScrollView>

          {/* Footer con botones */}
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
    backgroundColor: '#2D3748',
    borderRadius: 16,
    width: '95%',
    height: '85%',
    maxWidth: 450,
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
    borderLeftColor: '#3182CE',
  },
  itemName: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  itemDetails: {
    color: '#81E6D9',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
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
  remainingText: {
    color: '#38B2AC',
    fontSize: 14,
    marginTop: 6,
    fontWeight: '500',
  },
  noProjects: {
    backgroundColor: 'rgba(229, 62, 62, 0.1)',
    padding: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E53E3E',
  },
  noProjectsText: {
    color: '#FEB2B2',
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
    color: '#9AE6B4',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  selectedProjectDescription: {
    color: '#CBD5E0',
    fontSize: 13,
    fontStyle: 'italic',
  },
  validationInfo: {
    backgroundColor: 'rgba(44, 44, 58, 0.6)',
    padding: 14,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 2,
    borderColor: '#FBD38D',
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
    backgroundColor: '#DC2626',
  },
  confirmButton: {
    backgroundColor: '#16A34A',
  },
  disabledButton: {
    backgroundColor: '#6B7280',
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