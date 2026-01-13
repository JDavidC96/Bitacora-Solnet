// components/inventory/project/AddMaterialModal.js

import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useGeneralInventory } from "../../../hooks/useGeneralInventory";
import ModalBase from "../../ModalBase";

/**
 * Función auxiliar para normalizar texto en búsquedas.
 * Convierte a minúsculas, elimina acentos y espacios extras.
 * 
 * @function
 * @param {string} text - Texto a normalizar
 * @returns {string} Texto normalizado para comparación insensible
 * 
 * @private
 */
function normalize(text) {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD") // Descompone caracteres con acentos
    .replace(/[\u0300-\u036f]/g, "") // Elimina marcas diacríticas
    .trim(); // Elimina espacios al inicio y final
}

/**
 * Modal para agregar materiales desde el inventario general a un proyecto.
 * Implementa búsqueda en tiempo real con normalización de texto,
 * validación de stock disponible y selección de materiales existentes.
 * 
 * @component
 * @example
 * const handleAddMaterial = async ({ material, cantidad }) => {
 *   try {
 *     await transferMaterialToProject(projectId, material.id, cantidad);
 *     console.log('Material transferido:', material.nombre, cantidad);
 *   } catch (error) {
 *     console.error('Error transferiendo material:', error);
 *   }
 * };
 * 
 * return (
 *   <AddMaterialModal
 *     visible={isModalVisible}
 *     onClose={() => setModalVisible(false)}
 *     onAdd={handleAddMaterial}
 *     loading={isProcessing}
 *   />
 * );
 * 
 * @param {Object} props - Propiedades del componente
 * @param {boolean} props.visible - Controla la visibilidad del modal
 * @param {function} props.onClose - Callback al cerrar el modal
 * @param {function} props.onAdd - Callback al agregar el material al proyecto
 * @param {boolean} [props.loading=false] - Indica si está procesando la adición
 * 
 * @returns {React.ReactElement} Modal para transferir materiales a proyecto
 * 
 * @see ModalBase Componente base de modal reutilizable
 * @see useGeneralInventory Hook para obtener inventario general
 * @see normalize Función de normalización de texto para búsquedas
 */
export default function AddMaterialModal({
  visible,
  onClose,
  onAdd,
  loading,
}) {
  // Obtener catálogo de inventario general
  const { items: catalogItems, loading: loadingCatalog } = useGeneralInventory();

  // Estados del formulario
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [cantidad, setCantidad] = useState("");

  /**
   * Limpia el formulario cuando el modal se cierra.
   * 
   * @effect
   * @listens visible
   */
  useEffect(() => {
    if (!visible) {
      setSearch("");
      setSelected(null);
      setCantidad("");
    }
  }, [visible]);

  /**
   * Filtra y normaliza los resultados de búsqueda en tiempo real.
   * Muestra los primeros 25 items cuando no hay búsqueda,
   * o hasta 40 items cuando se busca por término específico.
   * 
   * @constant
   * @type {Array<Object>}
   */
  const filtered = useMemo(() => {
    const q = normalize(search);
    // Si no hay término de búsqueda, mostrar primeros items
    if (!q) return catalogItems.slice(0, 25);
    
    // Filtrar por nombre, código o categoría
    return catalogItems
      .filter((item) => {
        const name = normalize(item.nombre);
        const code = normalize(item.codigo);
        const cat = normalize(item.categoria);
        return name.includes(q) || code.includes(q) || cat.includes(q);
      })
      .slice(0, 40); // Limitar resultados para mejor rendimiento
  }, [search, catalogItems]);

  /**
   * Valida y procesa la transferencia del material al proyecto.
   * Verifica stock disponible y prepara los datos para el callback.
   * 
   * @function
   * @returns {void}
   * 
   * @fires onAdd Con el material seleccionado y la cantidad
   */
  const handleConfirm = () => {
    // Validación: material seleccionado
    if (!selected) {
      alert("Debe seleccionar un material del inventario general.");
      return;
    }

    // Validación: cantidad válida
    const qty = Number(cantidad);
    if (!qty || qty <= 0) {
      alert("Ingrese una cantidad válida mayor a 0.");
      return;
    }

    // Validación: stock suficiente
    const disponible = Number(selected.cantidad || 0);
    if (qty > disponible) {
      alert(
        `No hay suficiente stock en inventario general.\nDisponible: ${disponible}`
      );
      return;
    }

    // Ejecutar callback con datos validados
    onAdd &&
      onAdd({
        material: selected,
        cantidad: qty,
      });
  };

  return (
    <ModalBase
      visible={visible}
      onClose={onClose}
      title="Agregar material al proyecto"
      footer={
        <TouchableOpacity
          style={[styles.btn, (loading || !selected) && { opacity: 0.7 }]}
          disabled={loading || !selected}
          onPress={handleConfirm}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.btnText}>Agregar al proyecto</Text>
          )}
        </TouchableOpacity>
      }
    >
      {/* Campo de búsqueda */}
      <Text style={styles.label}>Buscar en inventario general</Text>
      <TextInput
        style={styles.input}
        placeholder="Nombre, código o categoría..."
        placeholderTextColor="#6B7280"
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {/* Lista de resultados o indicador de carga */}
      {loadingCatalog ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#FFF" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          style={styles.list}
          keyboardShouldPersistTaps="handled" // Permite seleccionar con teclado abierto
          renderItem={({ item }) => {
            const isSelected = selected?.id === item.id;
            return (
              <TouchableOpacity
                style={[
                  styles.itemRow,
                  isSelected && styles.itemRowSelected,
                ]}
                onPress={() => setSelected(item)}
              >
                <View style={{ flex: 1 }}>
                  {/* Nombre del material */}
                  <Text style={styles.itemName}>{item.nombre}</Text>
                  
                  {/* Código y categoría */}
                  <Text style={styles.itemMeta}>
                    Código: {item.codigo || "—"} ·{" "}
                    {item.categoria || "Sin categoría"}
                  </Text>
                  
                  {/* Unidad de medida y stock disponible */}
                  <Text style={styles.itemMeta}>
                    Unidad: {item.tipo_medida || "Unidad"} · Stock:{" "}
                    {item.cantidad ?? 0}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            /* Mensaje cuando no hay resultados */
            <Text style={styles.emptyText}>
              No se encontraron materiales. Si el material no existe en el
              inventario general, solicite al administrador crearlo.
            </Text>
          }
        />
      )}

      {/* Sección del material seleccionado */}
      {selected && (
        <View style={styles.selectedBox}>
          <Text style={styles.selectedTitle}>Material seleccionado</Text>
          <Text style={styles.selectedName}>{selected.nombre}</Text>
          
          {/* Información del material seleccionado */}
          <Text style={styles.selectedMeta}>
            Código: {selected.codigo || "—"} ·{" "}
            {selected.categoria || "Sin categoría"}
          </Text>
          <Text style={styles.selectedMeta}>
            Unidad: {selected.tipo_medida || "Unidad"} · Stock disponible:{" "}
            {selected.cantidad ?? 0}
          </Text>

          {/* Campo para cantidad a transferir */}
          <Text style={styles.label}>Cantidad a asignar al proyecto</Text>
          <TextInput
            style={styles.input}
            placeholder="Cantidad"
            placeholderTextColor="#6B7280"
            keyboardType="numeric"
            value={cantidad}
            onChangeText={setCantidad}
          />
        </View>
      )}
    </ModalBase>
  );
}

const styles = StyleSheet.create({
  label: {
    color: "#E5E7EB", // Gris claro
    fontSize: 13,
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#111827", // Gris azulado muy oscuro
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: "#F9FAFB", // Blanco
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#1F2937", // Borde oscuro
  },
  loadingBox: {
    paddingVertical: 16,
    alignItems: "center",
  },
  list: {
    maxHeight: 220, // Altura máxima para la lista
    marginBottom: 8,
  },
  itemRow: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "#020617", // Azul muy oscuro
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  itemRowSelected: {
    borderColor: "#0EA5E9", // Azul cielo para selección
    backgroundColor: "#0B1120", // Fondo ligeramente más claro
  },
  itemName: {
    color: "#F9FAFB", // Blanco
    fontWeight: "600",
    fontSize: 13,
  },
  itemMeta: {
    color: "#9CA3AF", // Gris medio
    fontSize: 11,
    marginTop: 2,
  },
  emptyText: {
    color: "#9CA3AF", // Gris medio
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
  selectedBox: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  selectedTitle: {
    color: "#E5E7EB", // Gris claro
    fontWeight: "700",
    marginBottom: 4,
  },
  selectedName: {
    color: "#F9FAFB", // Blanco
    fontWeight: "600",
    fontSize: 13,
  },
  selectedMeta: {
    color: "#9CA3AF", // Gris medio
    fontSize: 11,
    marginTop: 2,
    marginBottom: 2,
  },
  btn: {
    backgroundColor: "#0EA5E9", // Azul cielo
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  btnText: {
    color: "#FFF", // Blanco
    fontWeight: "700",
    fontSize: 14,
  },
});