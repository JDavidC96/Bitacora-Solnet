// components/home/AddProjectModal.js
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import ModalBase from '../ModalBase';

/**
 * Modal para crear nuevos proyectos de energía solar fotovoltaica.
 * Captura información básica del proyecto incluyendo datos técnicos como
 * potencia AC/DC y cantidad de paneles, con validaciones específicas.
 * 
 * @component
 * @example
 * const handleAddProject = (projectData) => {
 *   console.log('Proyecto creado:', projectData);
 *   // Enviar datos al backend
 * };
 * 
 * return (
 *   <AddProjectModal
 *     visible={isModalVisible}
 *     onClose={() => setIsModalVisible(false)}
 *     onAddProject={handleAddProject}
 *     loading={isCreating}
 *   />
 * );
 * 
 * @param {Object} props - Propiedades del componente
 * @param {boolean} props.visible - Controla la visibilidad del modal
 * @param {function} props.onClose - Función callback cuando se cierra el modal
 * @param {function} props.onAddProject - Función callback para crear el proyecto
 * @param {boolean} [props.loading=false] - Indica si está en proceso de creación
 * 
 * @returns {React.ReactElement} Modal con formulario para creación de proyectos
 * 
 * @see ModalBase Componente base de modal utilizado
 * @see DateTimePicker Selector de fechas de la comunidad React Native
 */
export default function AddProjectModal({
  visible,
  onClose,
  onAddProject,
  loading = false
}) {
  // Estados del formulario
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectLocation, setNewProjectLocation] = useState('');
  const [newProjectPotenciaAC, setNewProjectPotenciaAC] = useState('');
  const [newProjectPotenciaDC, setNewProjectPotenciaDC] = useState('');
  const [newProjectPaneles, setNewProjectPaneles] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  /**
   * Parsea un valor de entrada opcional a número, manejando decimales y validaciones.
   * Soporta tanto números enteros como flotantes según la configuración.
   * 
   * @function
   * @param {string|number|null} raw - Valor de entrada a parsear
   * @param {Object} [options] - Opciones de parseo
   * @param {boolean} [options.allowFloat=true] - Permite números decimales
   * @returns {number|null|NaN} Número parseado, null si está vacío, o NaN si es inválido
   * 
   * @example
   * parseOptionalNumber('150,5', { allowFloat: true }); // 150.5
   * parseOptionalNumber('320', { allowFloat: false }); // 320
   * parseOptionalNumber('', { allowFloat: true }); // null
   */
  const parseOptionalNumber = (raw, { allowFloat = true } = {}) => {
    const s = String(raw ?? '').trim();
    if (!s) return null;

    // Normalizar separador decimal (soporta coma europea)
    const normalized = s.replace(',', '.');
    const n = allowFloat ? Number(normalized) : parseInt(normalized, 10);

    if (!Number.isFinite(n) || n < 0) return NaN;
    return n;
  };

  /**
   * Valida y procesa la creación del nuevo proyecto.
   * Realiza validaciones específicas para datos técnicos de energía solar.
   * 
   * @function
   * @returns {void}
   * 
   * @fires onAddProject Con los datos validados del proyecto
   */
  const handleAdd = () => {
    // Validación: campos requeridos
    if (!newProjectName.trim() || !newProjectLocation.trim()) {
      alert('Por favor completa todos los campos');
      return;
    }

    // Validación: potencia AC (kilovatios)
    const potenciaAC = parseOptionalNumber(newProjectPotenciaAC, { allowFloat: true });
    if (potenciaAC !== null && Number.isNaN(potenciaAC)) {
      alert('Potencia AC inválida. Ingresa un número (>= 0).');
      return;
    }

    // Validación: potencia DC (kilovatios)
    const potenciaDC = parseOptionalNumber(newProjectPotenciaDC, { allowFloat: true });
    if (potenciaDC !== null && Number.isNaN(potenciaDC)) {
      alert('Potencia DC inválida. Ingresa un número (>= 0).');
      return;
    }

    // Validación: paneles (número entero)
    const paneles = parseOptionalNumber(newProjectPaneles, { allowFloat: false });
    if (paneles !== null && Number.isNaN(paneles)) {
      alert('Paneles inválido. Ingresa un entero (>= 0).');
      return;
    }

    // Enviar datos validados al componente padre
    onAddProject({
      name: newProjectName.trim(),
      location: newProjectLocation.trim(),
      date: selectedDate,
      ...(potenciaAC != null ? { potenciaAC } : {}),          // Incluir solo si tiene valor
      ...(potenciaDC != null ? { potenciaDC } : {}),          // Incluir solo si tiene valor
      ...(paneles != null ? { panelesInstalados: paneles } : {}), // Incluir solo si tiene valor
    });
  };

  /**
   * Cierra el modal y limpia todos los campos del formulario.
   * 
   * @function
   * @returns {void}
   * 
   * @fires onClose Para notificar al componente padre
   */
  const handleClose = () => {
    // Limpiar todos los campos
    setNewProjectName('');
    setNewProjectLocation('');
    setNewProjectPotenciaAC('');
    setNewProjectPotenciaDC('');
    setNewProjectPaneles('');
    setSelectedDate(new Date());
    onClose();
  };

  return (
    <ModalBase
      visible={visible}
      title="Nuevo proyecto"
      onClose={handleClose}
      footer={
        <TouchableOpacity
          style={[
            styles.confirmButton,
            loading && styles.disabledButton
          ]}
          onPress={handleAdd}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.confirmButtonText}>Agregar proyecto</Text>
          )}
        </TouchableOpacity>
      }
    >
      <View style={styles.body}>
        {/* Campo: Nombre del proyecto (requerido) */}
        <Text style={styles.label}>Nombre del proyecto</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Planta FV Bodega Central"
          placeholderTextColor="#9CA3AF"
          value={newProjectName}
          onChangeText={setNewProjectName}
          autoCapitalize="sentences"
          editable={!loading}
        />

        {/* Campo: Ubicación (requerido) */}
        <Text style={styles.label}>Ubicación</Text>
        <TextInput
          style={styles.input}
          placeholder="Dirección o enlace de Maps"
          placeholderTextColor="#9CA3AF"
          value={newProjectLocation}
          onChangeText={setNewProjectLocation}
          autoCapitalize="sentences"
          editable={!loading}
        />

        {/* Campo: Potencia AC en kW (opcional) */}
        <Text style={styles.label}>Potencia total instalada (kW AC) (opcional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: 150"
          placeholderTextColor="#9CA3AF"
          value={newProjectPotenciaAC}
          onChangeText={setNewProjectPotenciaAC}
          keyboardType="numeric"
          editable={!loading}
        />

        {/* Campo: Potencia DC en kW (opcional) */}
        <Text style={styles.label}>Potencia total instalada (kWp DC) (opcional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: 180"
          placeholderTextColor="#9CA3AF"
          value={newProjectPotenciaDC}
          onChangeText={setNewProjectPotenciaDC}
          keyboardType="numeric"
          editable={!loading}
        />

        {/* Campo: Cantidad de paneles (opcional) */}
        <Text style={styles.label}>Paneles instalados (opcional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: 320"
          placeholderTextColor="#9CA3AF"
          value={newProjectPaneles}
          onChangeText={setNewProjectPaneles}
          keyboardType="number-pad" // Teclado numérico sin decimales
          editable={!loading}
        />

        {/* Campo: Fecha inicial (requerido) */}
        <Text style={styles.label}>Fecha inicial</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowPicker(true)}
          disabled={loading}
        >
          <Text style={styles.dateButtonText}>
            {selectedDate.toLocaleDateString()}
          </Text>
        </TouchableOpacity>

        {/* Selector de fecha */}
        {showPicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowPicker(false);
              if (date) setSelectedDate(date);
            }}
          />
        )}
      </View>
    </ModalBase>
  );
}

// Estilos del componente
const styles = {
  body: {
    gap: 10, // Espaciado uniforme entre elementos
  },
  label: {
    color: '#E5E7EB',
    fontSize: 13,
    marginBottom: 2,
  },
  input: {
    backgroundColor: '#111827',
    color: '#F9FAFB',
    padding: 12,
    borderRadius: 10,
    marginBottom: 4,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#374151',
  },
  dateButton: {
    backgroundColor: '#111827',
    padding: 12,
    borderRadius: 10,
    marginBottom: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  dateButtonText: {
    color: '#F9FAFB',
    fontSize: 14,
  },
  confirmButton: {
    backgroundColor: '#FF7A00', // Color naranja distintivo
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
    opacity: 0.7,
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
};