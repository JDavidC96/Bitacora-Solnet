// components/home/EditProjectModal.js
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import ModalBase from "../ModalBase";

/**
 * Modal para editar los detalles de un proyecto existente.
 * Permite modificar nombre, ubicación y datos técnicos como potencia AC/DC
 * y cantidad de paneles, con soporte para múltiples formatos de propiedades.
 * 
 * @component
 * @example
 * const handleSave = (updatedData) => {
 *   console.log('Proyecto actualizado:', updatedData);
 *   // Enviar cambios al backend
 * };
 * 
 * return (
 *   <EditProjectModal
 *     visible={isModalVisible}
 *     project={selectedProject}
 *     onClose={() => setIsModalVisible(false)}
 *     onSave={handleSave}
 *     loading={isSaving}
 *   />
 * );
 * 
 * @param {Object} props - Propiedades del componente
 * @param {boolean} props.visible - Controla la visibilidad del modal
 * @param {Object|null} props.project - Proyecto a editar con sus datos actuales
 * @param {string} props.project.title - Título/nombre actual del proyecto
 * @param {string} [props.project.ubicacion] - Ubicación actual del proyecto
 * @param {number|string} [props.project.potenciaAC] - Potencia AC actual en kW (múltiples formatos soportados)
 * @param {number|string} [props.project.potenciaAcKw] - Potencia AC en formato alternativo
 * @param {number|string} [props.project.potenciaACKw] - Potencia AC en formato alternativo
 * @param {number|string} [props.project.potenciaDcKw] - Potencia DC en formato alternativo
 * @param {number|string} [props.project.potenciaDCKw] - Potencia DC en formato alternativo
 * @param {number|string} [props.project.panelesInstalados] - Paneles instalados (múltiples formatos soportados)
 * @param {number|string} [props.project.paneles] - Paneles en formato alternativo
 * @param {number|string} [props.project.cantidadPaneles] - Paneles en formato alternativo
 * @param {function} props.onClose - Función callback cuando se cierra el modal
 * @param {function} props.onSave - Función callback para guardar los cambios
 * @param {boolean} [props.loading=false] - Indica si está en proceso de guardado
 * 
 * @returns {React.ReactElement|null} Modal de edición o null si no hay proyecto
 * 
 * @see ModalBase Componente base de modal utilizado
 */
export default function EditProjectModal({
  visible,
  project,
  onClose,
  onSave,
  loading = false,
}) {
  // Estados del formulario de edición
  const [editedName, setEditedName] = useState("");
  const [editedLocation, setEditedLocation] = useState("");
  const [potenciaAC, setPotenciaAC] = useState("");
  const [potenciaDC, setPotenciaDC] = useState("");
  const [panelesInstalados, setPanelesInstalados] = useState("");

  /**
   * Inicializa el formulario con los datos del proyecto cuando este cambia.
   * Maneja múltiples formatos de propiedades para compatibilidad con datos históricos.
   * 
   * @effect
   * @listens project
   */
  useEffect(() => {
    if (project) {
      setEditedName(project.title || "");
      setEditedLocation(project.ubicacion || "");

      // Extraer potencia AC de múltiples posibles propiedades (compatibilidad)
      const ac =
        project.potenciaAC ??        // Formato preferido
        project.potenciaAcKw ??      // Formato alternativo 1
        project.potenciaACKw ??      // Formato alternativo 2
        project.potenciaDcKw ??      // Formato alternativo 3 (posible error tipográfico)
        null;

      // Extraer potencia DC de múltiples posibles propiedades (compatibilidad)
      const dc =
        project.potenciaDC ??        // Formato preferido
        project.potenciaDcKw ??      // Formato alternativo 1
        project.potenciaDCKw ??      // Formato alternativo 2
        project.potenciaDcTotalKw ?? // Formato alternativo 3
        null;

      // Extraer paneles de múltiples posibles propiedades (compatibilidad)
      const pan =
        project.panelesInstalados ?? // Formato preferido
        project.paneles ??           // Formato alternativo 1
        project.cantidadPaneles ??   // Formato alternativo 2
        null;

      // Convertir a string para los inputs (o cadena vacía si es null/undefined)
      setPotenciaAC(ac !== null && ac !== undefined ? String(ac) : "");
      setPotenciaDC(dc !== null && dc !== undefined ? String(dc) : "");
      setPanelesInstalados(pan !== null && pan !== undefined ? String(pan) : "");
    }
  }, [project]);

  /**
   * Valida y procesa el guardado de los cambios del proyecto.
   * Realiza validaciones específicas para datos técnicos de energía solar.
   * 
   * @function
   * @returns {void}
   * 
   * @fires onSave Con los datos validados del proyecto
   */
  const handleSave = () => {
    // Validación: nombre requerido
    if (!editedName.trim()) {
      alert("El nombre del proyecto es requerido");
      return;
    }

    // Validación: potencia AC (kilovatios, permite decimales)
    const acParsed = potenciaAC !== "" ? Number(String(potenciaAC).replace(",", ".")) : null;
    if (acParsed !== null && (!Number.isFinite(acParsed) || acParsed < 0)) {
      alert("La potencia AC debe ser un número válido (>= 0)");
      return;
    }

    // Validación: potencia DC (kilovatios, permite decimales)
    const dcParsed = potenciaDC !== "" ? Number(String(potenciaDC).replace(",", ".")) : null;
    if (dcParsed !== null && (!Number.isFinite(dcParsed) || dcParsed < 0)) {
      alert("La potencia DC debe ser un número válido (>= 0)");
      return;
    }

    // Validación: paneles (número entero)
    const panelesParsed = panelesInstalados !== "" ? parseInt(panelesInstalados, 10) : null;
    if (panelesParsed !== null && (!Number.isFinite(panelesParsed) || panelesParsed < 0)) {
      alert("Paneles instalados debe ser un entero válido (>= 0)");
      return;
    }

    // Enviar datos validados al componente padre
    onSave({
      title: editedName.trim(),
      ubicacion: editedLocation.trim(),
      potenciaAC: acParsed,              // null si está vacío
      potenciaDC: dcParsed,              // null si está vacío
      panelesInstalados: panelesParsed,  // null si está vacío
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
    setEditedName("");
    setEditedLocation("");
    setPotenciaAC("");
    setPotenciaDC("");
    setPanelesInstalados("");
    onClose();
  };

  // Validación: no renderizar si no hay proyecto
  if (!project) return null;

  return (
    <ModalBase
      visible={visible}
      title="Editar proyecto"
      onClose={handleClose}
      footer={
        <TouchableOpacity
          style={[styles.confirmButton, loading && styles.disabledButton]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.confirmButtonText}>Guardar cambios</Text>
          )}
        </TouchableOpacity>
      }
    >
      <View style={styles.body}>
        {/* Campo: Nombre del proyecto (requerido) */}
        <Text style={styles.label}>Nombre</Text>
        <TextInput
          style={styles.input}
          placeholder="Nombre del proyecto"
          placeholderTextColor="#9CA3AF"
          value={editedName}
          onChangeText={setEditedName}
          autoCapitalize="sentences"
          editable={!loading}
        />

        {/* Campo: Ubicación (opcional) */}
        <Text style={styles.label}>Ubicación</Text>
        <TextInput
          style={styles.input}
          placeholder="Ubicación del proyecto"
          placeholderTextColor="#9CA3AF"
          value={editedLocation}
          onChangeText={setEditedLocation}
          autoCapitalize="sentences"
          editable={!loading}
        />

        {/* Campo: Potencia AC en kW (opcional) */}
        <Text style={styles.label}>Potencia total instalada (kW AC) (opcional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: 50"
          placeholderTextColor="#9CA3AF"
          value={potenciaAC}
          onChangeText={setPotenciaAC}
          keyboardType="numeric"
          editable={!loading}
        />

        {/* Campo: Potencia DC en kW (opcional) */}
        <Text style={styles.label}>Potencia total instalada (kWp DC) (opcional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: 60"
          placeholderTextColor="#9CA3AF"
          value={potenciaDC}
          onChangeText={setPotenciaDC}
          keyboardType="numeric"
          editable={!loading}
        />

        {/* Campo: Cantidad de paneles (opcional) */}
        <Text style={styles.label}>Paneles instalados (opcional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: 120"
          placeholderTextColor="#9CA3AF"
          value={panelesInstalados}
          onChangeText={setPanelesInstalados}
          keyboardType="number-pad" // Teclado numérico sin decimales
          editable={!loading}
        />
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
    color: "#E5E7EB",
    fontSize: 13,
    marginBottom: 2,
  },
  input: {
    backgroundColor: "#111827",
    color: "#F9FAFB",
    padding: 12,
    borderRadius: 10,
    marginBottom: 4,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#374151",
  },
  confirmButton: {
    backgroundColor: "#FF7A00", // Color naranja distintivo
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: "#9CA3AF",
    opacity: 0.7,
  },
  confirmButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "600",
  },
};