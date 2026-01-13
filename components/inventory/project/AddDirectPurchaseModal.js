// components/inventory/project/AddDirectPurchaseModal.js

import { collection, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../../../firebase/firebaseConfig";
import ModalBase from "../../ModalBase";

/**
 * Modal para registrar compras directas de materiales para un proyecto específico.
 * Permite buscar en el catálogo general de inventario, seleccionar items y
 * agregarlos directamente al proyecto sin pasar por el inventario general.
 * 
 * @component
 * @example
 * const handleSavePurchase = async (purchaseData) => {
 *   try {
 *     await addDirectPurchaseToProject(projectId, purchaseData);
 *     console.log('Compra directa registrada:', purchaseData);
 *   } catch (error) {
 *     console.error('Error registrando compra:', error);
 *   }
 * };
 * 
 * return (
 *   <AddDirectPurchaseModal
 *     visible={isModalVisible}
 *     onClose={() => setModalVisible(false)}
 *     onSave={handleSavePurchase}
 *     loading={isProcessing}
 *     setLoading={setProcessing}
 *     user={currentUser}
 *   />
 * );
 * 
 * @param {Object} props - Propiedades del componente
 * @param {boolean} props.visible - Controla la visibilidad del modal
 * @param {function} props.onClose - Callback al cerrar el modal
 * @param {function} props.onSave - Callback al guardar la compra directa
 * @param {boolean} props.loading - Indica si está procesando el guardado
 * @param {function} props.setLoading - Función para actualizar estado de carga
 * @param {Object} props.user - Información del usuario actual
 * @param {string} props.user.email - Email del usuario que registra la compra
 * 
 * @returns {React.ReactElement} Modal para compras directas de proyecto
 * 
 * @see ModalBase Componente base de modal reutilizable
 * @see firebase/firestore Para operaciones de base de datos
 * @see firebaseConfig Configuración de Firebase
 */
export default function AddDirectPurchaseModal({
  visible,
  onClose,
  onSave,
  loading,
  setLoading,
  user,
}) {
  // Estado del catálogo de inventario general
  const [catalogItems, setCatalogItems] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  // Estado de la interfaz y selección
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);

  // Estado del formulario de compra
  const [cantidad, setCantidad] = useState("");
  const [notas, setNotas] = useState("");

  /**
   * Carga el catálogo y reinicia el formulario cuando se abre el modal.
   * 
   * @effect
   * @listens visible
   */
  useEffect(() => {
    if (visible) {
      loadCatalog();
      reset();
    }
  }, [visible]);

  /**
   * Carga el catálogo de inventario general desde Firestore.
   * Obtiene todos los items disponibles para compra directa.
   * 
   * @async
   * @function
   * @returns {Promise<void>}
   */
  const loadCatalog = async () => {
    setCatalogLoading(true);
    try {
      const snap = await getDocs(collection(db, "inventario_general"));
      const items = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setCatalogItems(items);
    } catch (err) {
      console.error("Error cargando catálogo:", err);
      Alert.alert("Error", "No se pudo cargar el inventario general.");
    }
    setCatalogLoading(false);
  };

  /**
   * Reinicia el formulario a valores iniciales.
   * 
   * @function
   * @returns {void}
   */
  const reset = () => {
    setSearchQuery("");
    setSelectedItem(null);
    setCantidad("");
    setNotas("");
  };

  /**
   * Filtra los items del catálogo según la búsqueda.
   * Busca tanto en nombre como en código del item.
   * 
   * @constant
   * @type {Array<Object>}
   */
  const filteredItems = catalogItems.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.nombre?.toLowerCase().includes(q) ||
      item.codigo?.toLowerCase().includes(q)
    );
  });

  /**
   * Selecciona un item del catálogo y lo establece como seleccionado.
   * También actualiza el campo de búsqueda con el nombre del item.
   * 
   * @function
   * @param {Object} item - Item del catálogo seleccionado
   * @returns {void}
   */
  const handleSelect = (item) => {
    setSelectedItem(item);
    setSearchQuery(item.nombre);
  };

  /**
   * Valida y procesa el guardado de la compra directa.
   * Calcula precios y prepara los datos para enviar al backend.
   * 
   * @async
   * @function
   * @returns {Promise<void>}
   * 
   * @fires onSave Con los datos de la compra directa
   */
  const handleSave = async () => {
    // Validación: item seleccionado
    if (!selectedItem) {
      Alert.alert(
        "Item no encontrado",
        "Solicite al administrador crear el nuevo item."
      );
      return;
    }

    // Validación: cantidad válida
    if (!cantidad || Number(cantidad) <= 0) {
      Alert.alert("Error", "La cantidad debe ser válida.");
      return;
    }

    // Preparar payload con datos completos de la compra
    const payload = {
      nombre: selectedItem.nombre,
      cantidadOriginal: Number(cantidad),
      cantidadActual: Number(cantidad),
      tipo_medida: selectedItem.tipo_medida,
      precioUnitario: Number(selectedItem.precio),
      precioTotal: Number(selectedItem.precio) * Number(cantidad),
      codigo: selectedItem.codigo || "",
      notas,
      idGeneral: selectedItem.id, // 🔒 Referencia al catálogo general
      usuario: user?.email || "Sistema",
      fromPurchase: true, // Marca que viene de compra directa
    };

    try {
      setLoading(true);
      await onSave(payload);
      onClose();
      reset();
    } catch (err) {
      console.error("Error compra directa:", err);
      Alert.alert("Error", "No se pudo registrar la compra directa.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalBase
      visible={visible}
      title="Compra directa para el proyecto"
      onClose={() => {
        reset();
        onClose();
      }}
      footer={
        <TouchableOpacity
          style={[
            styles.addBtn,
            (!selectedItem || loading) && { opacity: 0.6 },
          ]}
          onPress={handleSave}
          disabled={!selectedItem || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.addText}>Agregar al proyecto</Text>
          )}
        </TouchableOpacity>
      }
    >
      {/* Buscador de items del catálogo */}
      <TextInput
        style={styles.input}
        placeholder="Buscar por nombre o código..."
        placeholderTextColor="#999"
        value={searchQuery}
        onChangeText={setSearchQuery}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {/* Lista de items filtrados o indicador de carga */}
      {catalogLoading ? (
        <ActivityIndicator color="#FFF" />
      ) : filteredItems.length > 0 ? (
        <FlatList
          data={filteredItems}
          keyboardShouldPersistTaps="handled" // Permite tap en items con teclado abierto
          style={{ maxHeight: 220 }} // Altura máxima para la lista
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.itemRow,
                item.id === selectedItem?.id && styles.itemSelected,
              ]}
              onPress={() => handleSelect(item)}
            >
              <View>
                <Text style={styles.itemName}>{item.nombre}</Text>
                <Text style={styles.meta}>
                  Código: {item.codigo} · {item.tipo_medida}
                </Text>
              </View>

              {/* Precio unitario del item */}
              <Text style={styles.itemPrice}>
                ${Number(item.precio).toLocaleString("es-CO")}
              </Text>
            </TouchableOpacity>
          )}
        />
      ) : (
        /* Estado: No hay resultados de búsqueda */
        <View style={styles.noResults}>
          <Text style={styles.noResultsText}>
            Solicite al administrador crear el nuevo item.
          </Text>
        </View>
      )}

      {/* Campo: Cantidad a comprar */}
      <TextInput
        style={styles.input}
        placeholder="Cantidad"
        placeholderTextColor="#999"
        keyboardType="numeric"
        value={cantidad}
        onChangeText={setCantidad}
      />

      {/* Campo: Notas adicionales (opcional) */}
      <TextInput
        style={[styles.input, { height: 70 }]}
        placeholder="Notas (opcional)"
        placeholderTextColor="#999"
        multiline
        value={notas}
        onChangeText={setNotas}
      />
    </ModalBase>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: "#1E1E2F", // Azul oscuro
    borderRadius: 10,
    padding: 12,
    color: "#FFF",
    marginBottom: 12,
  },
  itemRow: {
    backgroundColor: "rgba(15,23,42,0.9)", // Azul muy oscuro semi-transparente
    padding: 12,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.3)", // Borde gris azulado claro
    flexDirection: "row",
    justifyContent: "space-between",
  },
  itemSelected: {
    borderColor: "#0EA5E9", // Azul cielo para selección
  },
  itemName: {
    color: "#FFF",
    fontWeight: "700",
  },
  itemPrice: {
    color: "#FACC15", // Amarillo para precios
    fontWeight: "700",
  },
  meta: {
    color: "#AAA", // Gris claro para metadatos
    fontSize: 12,
  },
  noResults: {
    backgroundColor: "#1E1E2F",
    padding: 20,
    borderRadius: 8,
    alignItems: "center",
  },
  noResultsText: {
    color: "#F87171", // Rojo claro para mensajes de error
    fontWeight: "600",
  },
  addBtn: {
    backgroundColor: "#0EA5E9", // Azul cielo
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  addText: {
    color: "#FFF",
    fontWeight: "700",
  },
});