// components/inventory/project/AddExternalMaterialModal.js

import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useGeneralInventory } from "../../../hooks/useGeneralInventory";
import normalize from "../../../utils/normalize";

/**
 * Modal para agregar materiales externos desde el inventario general a un proyecto específico.
 * Implementa búsqueda en tiempo real con normalización de texto (sin acentos, minúsculas)
 * y permite seleccionar materiales del catálogo general para transferirlos al proyecto.
 * 
 * Características mejoradas:
 * 1. Búsqueda en tiempo real con normalización de texto
 * 2. Selección de materiales del catálogo general
 * 3. Precio unitario opcional con fallback automático
 * 4. Validación de cantidad y precio
 * 5. Indicadores de carga y feedback visual
 * 
 * @component
 * @example
 * const handleAddExternalMaterial = async ({ material, cantidad }) => {
 *   try {
 *     await addMaterialToProject(projectId, {
 *       ...material,
 *       cantidad,
 *       transferredAt: new Date()
 *     });
 *     console.log('Material externo agregado:', material.nombre);
 *   } catch (error) {
 *     console.error('Error agregando material:', error);
 *   }
 * };
 * 
 * return (
 *   <AddExternalMaterialModal
 *     visible={isModalVisible}
 *     onClose={() => setModalVisible(false)}
 *     onAdd={handleAddExternalMaterial}
 *     loading={isProcessing}
 *   />
 * );
 * 
 * @param {Object} props - Propiedades del componente
 * @param {boolean} props.visible - Controla la visibilidad del modal
 * @param {function} props.onClose - Callback al cerrar el modal
 * @param {function} props.onAdd - Callback al agregar el material externo
 * @param {boolean} [props.loading=false] - Indica si está procesando la adición
 * 
 * @returns {React.ReactElement} Modal para agregar materiales externos a proyecto
 * 
 * @see useGeneralInventory Hook personalizado para obtener inventario general
 * @see normalize Utilidad para normalización de texto en búsquedas
 * @see Modal Componente de modal nativo de React Native
 */
export default function AddExternalMaterialModal({
  visible,
  onClose,
  onAdd,
  loading,
}) {
  // Obtener catálogo de inventario general usando hook personalizado
  const { items: catalogRaw, loading: loadingCatalog } = useGeneralInventory();
  const catalog = catalogRaw || []; // Fallback a array vacío

  // Estados del formulario
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [cantidad, setCantidad] = useState("");
  
  /**
   * Estado para el precio unitario personalizado
   * Si está vacío → se usa el precio del inventario general (selectedItem.precio)
   * Si tiene valor → se sobrescribe material.precio antes de enviar el onAdd
   * @type {[string, Function]}
   */
  const [precioUnitario, setPrecioUnitario] = useState("");

  /**
   * Limpia el formulario cuando el modal se cierra.
   * Incluye reset del precio unitario personalizado.
   * 
   * @effect
   * @listens visible
   */
  useEffect(() => {
    if (!visible) {
      setSearch("");
      setCantidad("");
      setSelectedItem(null);
      setPrecioUnitario("");
    }
  }, [visible]);

  // ------------------------------
  // AUTOCOMPLETADO CON NORMALIZACIÓN
  // ------------------------------

  /**
   * Filtra y normaliza los resultados de búsqueda en tiempo real.
   * Busca en nombre, código y categoría del material.
   * Limita a 25 resultados para mejor rendimiento.
   * 
   * @constant
   * @type {Array<Object>}
   * 
   * @see normalize Función que elimina acentos y convierte a minúsculas
   */
  const filtered = useMemo(() => {
    const q = normalize(search);
    if (!q) return [];

    return catalog
      .filter((item) => {
        const name = normalize(item.nombre);
        const code = normalize(item.codigo || "");
        const cat = normalize(item.categoria || "");
        return name.includes(q) || code.includes(q) || cat.includes(q);
      })
      .slice(0, 25); // Limitar resultados para mejor rendimiento
  }, [search, catalog]);

  // ------------------------------
  // VALIDACIÓN Y GUARDADO
  // ------------------------------

  /**
   * Valida y procesa la adición del material externo al proyecto.
   * Maneja el precio unitario con lógica de fallback:
   * - Si no se ingresa precio → usa el del inventario general
   * - Si se ingresa precio → sobrescribe el valor
   * 
   * @function
   * @returns {void}
   * 
   * @fires onAdd Con el material seleccionado y la cantidad
   */
  const handleAdd = () => {
    // Validación: material debe estar seleccionado
    if (!selectedItem) {
      return Alert.alert(
        "No existe",
        "Este material no existe en el inventario general. Solicite al administrador crearlo."
      );
    }

    // Validación: cantidad válida
    if (!cantidad || Number(cantidad) <= 0) {
      return Alert.alert("Error", "Ingrese una cantidad válida.");
    }

    /**
     * Protocolo de precio unitario:
     * - Si NO se ingresa precio (string vacío) → usar el del inventario general (selectedItem.precio)
     * - Si se ingresa → sobrescribir el precio
     * 
     * @constant {string} overridePrice - Precio ingresado por el usuario (trimmed)
     * @constant {number} finalPrice - Precio final a utilizar
     */
    const overridePrice = precioUnitario?.toString().trim();
    const finalPrice =
      overridePrice === "" ? Number(selectedItem.precio ?? 0) : Number(overridePrice);

    /**
     * Material con precio ajustado según la lógica de fallback
     * @constant {Object} materialToSend
     */
    const materialToSend = {
      ...selectedItem,
      precio: Number.isFinite(finalPrice) ? finalPrice : Number(selectedItem.precio ?? 0),
    };

    // Enviar datos al componente padre
    onAdd({ 
      material: materialToSend, 
      cantidad: Number(cantidad) 
    });
  };

  /**
   * Renderiza una opción en la lista de resultados de búsqueda.
   * Muestra información adicional incluyendo precio del inventario general.
   * 
   * @function
   * @param {Object} param0 - Parámetros de renderizado de FlatList
   * @param {Object} param0.item - Material a renderizar
   * @returns {React.ReactElement} Opción táctil para seleccionar material
   */
  const renderOption = ({ item }) => (
    <TouchableOpacity
      style={styles.option}
      onPress={() => {
        setSelectedItem(item);
        setSearch(item.nombre);
        setPrecioUnitario(""); // Reset del precio personalizado al seleccionar otro item
      }}
    >
      <Text style={styles.optionName}>{item.nombre}</Text>
      {item.codigo ? (
        <Text style={styles.optionCode}>Código: {item.codigo}</Text>
      ) : null}
      <Text style={styles.optionInfo}>
        {item.categoria} - {item.tipo_medida}
      </Text>
      <Text style={styles.optionInfo}>
        Precio general: ${Number(item.precio ?? 0).toLocaleString("es-CO")}
      </Text>
    </TouchableOpacity>
  );

  // ------------------------------
  // COMPONENTE DE LOADING OVERLAY
  // ------------------------------

  /**
   * Componente overlay que se muestra durante el proceso de guardado.
   * Bloquea la interfaz y muestra un indicador de carga.
   * 
   * @function
   * @returns {React.ReactElement} Overlay de carga modal
   */
  const LoadingOverlay = () => (
    <View style={styles.loadingOverlay}>
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text style={styles.loadingText}>Guardando...</Text>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        {/* Contenedor principal del modal */}
        <View style={styles.modalBox}>
          <Text style={styles.title}>Material Externo</Text>

          {/* Campo de búsqueda */}
          <TextInput
            style={styles.input}
            placeholder="Buscar material..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
            editable={!loading}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* Indicador de carga del catálogo */}
          {loadingCatalog && (
            <ActivityIndicator color="#38BDF8" style={{ marginBottom: 10 }} />
          )}

          {/* Lista de resultados de búsqueda (solo si hay resultados y no hay selección) */}
          {filtered.length > 0 && !selectedItem && (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              renderItem={renderOption}
              style={styles.list}
              keyboardShouldPersistTaps="handled"
            />
          )}

          {/* Vista del material seleccionado */}
          {selectedItem && (
            <View style={styles.selectedBox}>
              <Text style={styles.selectedName}>{selectedItem.nombre}</Text>
              {selectedItem.codigo ? (
                <Text style={styles.selectedCode}>
                  Código: {selectedItem.codigo}
                </Text>
              ) : null}
              <Text style={styles.selectedInfo}>
                {selectedItem.categoria} - {selectedItem.tipo_medida}
              </Text>
              <Text style={styles.selectedInfo}>
                Precio general: ${Number(selectedItem.precio ?? 0).toLocaleString("es-CO")}
              </Text>
            </View>
          )}

          {/* Campo para cantidad */}
          <TextInput
            style={styles.input}
            placeholder="Cantidad"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
            value={cantidad}
            onChangeText={setCantidad}
            editable={!loading}
          />

          {/* Campo para precio unitario opcional */}
          <TextInput
            style={styles.input}
            placeholder="Precio unitario (opcional)"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
            value={precioUnitario}
            onChangeText={setPrecioUnitario}
            editable={!loading}
          />
          {/* Texto de ayuda para el precio unitario */}
          <Text style={styles.hint}>
            Si lo dejas vacío, se usa el precio del inventario general.
          </Text>

          {/* Botones de acción */}
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.btn, styles.cancel]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.btnText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.confirm]}
              onPress={handleAdd}
              disabled={loading}
            >
              <Text style={styles.btnText}>
                {loading ? "Guardando..." : "Agregar"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Overlay de carga durante el guardado */}
        {loading && <LoadingOverlay />}
      </View>
    </Modal>
  );
}

// ================================ ESTILOS ================================
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)", // Fondo semi-transparente
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalBox: {
    width: "100%",
    backgroundColor: "#1E293B", // Azul oscuro
    borderRadius: 10,
    padding: 16,
  },
  title: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
  },
  input: {
    backgroundColor: "#0F172A", // Azul más oscuro
    color: "#FFF",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155", // Borde gris azulado
    marginBottom: 10,
  },
  hint: {
    color: "#CBD5E1", // Gris claro para texto de ayuda
    fontSize: 12,
    marginTop: -6,
    marginBottom: 10,
    opacity: 0.85,
  },
  list: { 
    maxHeight: 150, // Altura máxima para la lista
    marginBottom: 10 
  },
  option: {
    backgroundColor: "#0F172A",
    padding: 10,
    borderRadius: 6,
    marginBottom: 6,
  },
  optionName: { 
    color: "#FFF", 
    fontWeight: "600" 
  },
  optionCode: { 
    color: "#93C5FD", // Azul claro para códigos
    fontSize: 12 
  },
  optionInfo: { 
    color: "#CBD5E1", // Gris claro para información
    fontSize: 12 
  },
  selectedBox: {
    padding: 12,
    backgroundColor: "#0F172A",
    borderRadius: 8,
    marginBottom: 10,
  },
  selectedName: { 
    color: "#FFF", 
    fontWeight: "700", 
    fontSize: 15 
  },
  selectedCode: { 
    color: "#93C5FD", 
    marginTop: 4 
  },
  selectedInfo: { 
    color: "#CBD5E1", 
    marginTop: 4 
  },
  row: { 
    flexDirection: "row", 
    justifyContent: "space-between" 
  },
  btn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 4, // Separación entre botones
  },
  cancel: { 
    backgroundColor: "#64748B" // Gris azulado para cancelar
  },
  confirm: { 
    backgroundColor: "#0EA5E9" // Azul cielo para confirmar
  },
  btnText: { 
    color: "#FFF", 
    fontWeight: "600" 
  },

  // LOADING OVERLAY
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject, // Cubre toda la pantalla
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingBox: {
    backgroundColor: "#1E293B",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  loadingText: {
    color: "#FFF",
    marginTop: 10,
    fontWeight: "600",
  },
});