// components/inventory/project/MoveMaterialModal.js

import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import ModalBase from "../../ModalBase";

/**
 * Normaliza texto para búsquedas insensibles a acentos y mayúsculas.
 * 
 * @function
 * @param {string} t - Texto a normalizar
 * @returns {string} Texto normalizado en minúsculas sin acentos
 * 
 * @private
 */
function normalize(t) {
  return t
    ?.toString()
    .toLowerCase()
    .normalize("NFD") // Descompone caracteres con acentos
    .replace(/[\u0300-\u036f]/g, "") // Elimina marcas diacríticas
    .trim(); // Elimina espacios al inicio y final
}

/**
 * Calcula la cantidad disponible de un material considerando múltiples nombres de propiedades.
 * 
 * @function
 * @param {Object} item - Objeto del material del inventario
 * @returns {number} Cantidad disponible del material
 * 
 * @private
 */
function getCantidadDisponible(item) {
  // Prioridad de propiedades: cantidadActual → cantidad_disponible → cantidad
  if (typeof item.cantidadActual === "number") return item.cantidadActual;
  if (typeof item.cantidad_disponible === "number")
    return item.cantidad_disponible;
  if (typeof item.cantidad === "number") return item.cantidad;
  return 0; // Fallback a 0 si no se encuentra ninguna propiedad
}

/**
 * Modal para mover materiales entre ubicaciones (inventario general u otros proyectos).
 * Permite dos modos: devolución al inventario general o transferencia a otro proyecto,
 * con validación de stock disponible y selección de destino.
 * 
 * @component
 * @example
 * const handleReturnMaterial = async ({ cantidad }) => {
 *   try {
 *     await returnMaterialToGeneral(item.id, cantidad);
 *     console.log('Material devuelto:', item.nombre, cantidad);
 *   } catch (error) {
 *     console.error('Error devolviendo material:', error);
 *   }
 * };
 * 
 * const handleTransferMaterial = async ({ cantidad, proyectoDestino }) => {
 *   try {
 *     await transferMaterialToProject(item.id, proyectoDestino, cantidad);
 *     console.log('Material transferido a proyecto:', proyectoDestino);
 *   } catch (error) {
 *     console.error('Error transfiriendo material:', error);
 *   }
 * };
 * 
 * return (
 *   <MoveMaterialModal
 *     visible={isModalVisible}
 *     onClose={() => setModalVisible(false)}
 *     item={selectedMaterial}
 *     onReturn={handleReturnMaterial}
 *     onTransfer={handleTransferMaterial}
 *     projects={availableProjects}
 *     currentProjectId={currentProject.id}
 *     loading={isProcessing}
 *   />
 * );
 * 
 * @param {Object} props - Propiedades del componente
 * @param {boolean} props.visible - Controla la visibilidad del modal
 * @param {function} props.onClose - Callback al cerrar el modal
 * @param {Object|null} props.item - Material seleccionado para mover
 * @param {string} props.item.nombre - Nombre del material
 * @param {string} [props.item.codigo] - Código del material
 * @param {string} props.item.tipo_medida - Unidad de medida
 * @param {number} [props.item.cantidadActual] - Cantidad actual disponible
 * @param {number} [props.item.cantidad_disponible] - Cantidad disponible (formato alternativo)
 * @param {number} [props.item.cantidad] - Cantidad total (fallback)
 * @param {function} props.onReturn - Callback al devolver material al inventario general
 * @param {function} props.onTransfer - Callback al transferir material a otro proyecto
 * @param {Array<Object>} props.projects - Lista de proyectos disponibles para transferencia
 * @param {string} props.projects[].id - ID único del proyecto
 * @param {string} props.projects[].title - Título/nombre del proyecto
 * @param {string} props.currentProjectId - ID del proyecto actual (para excluirlo de destinos)
 * @param {boolean} [props.loading=false] - Indica si está procesando el movimiento
 * 
 * @returns {React.ReactElement|null} Modal de movimiento de materiales o null si no hay item
 * 
 * @see ModalBase Componente base de modal reutilizable
 * @see normalize Función de normalización de texto para búsquedas
 * @see getCantidadDisponible Función helper para calcular disponibilidad
 * @see MaterialItem Componente que dispara la apertura de este modal
 */
export default function MoveMaterialModal({
  visible,
  onClose,
  item,
  onReturn,
  onTransfer,
  projects,
  currentProjectId,
  loading,
}) {
  // Estados del formulario
  const [cantidad, setCantidad] = useState("");
  const [mode, setMode] = useState(null); // 'return' o 'transfer'

  // Estados para búsqueda y selección de proyecto
  const [search, setSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState(null);

  /**
   * Limpia el formulario cuando el modal se cierra.
   * 
   * @effect
   * @listens visible
   */
  useEffect(() => {
    if (!visible) {
      setCantidad("");
      setMode(null);
      setSearch("");
      setSelectedProject(null);
    }
  }, [visible]);

  // Validación: no renderizar si no hay item seleccionado
  if (!item) return null;

  // Calcular cantidad disponible del material
  const disponible = getCantidadDisponible(item);

  // Filtrar proyectos excluyendo el actual
  const list = projects.filter((p) => p.id !== currentProjectId);

  /**
   * Filtra proyectos según término de búsqueda normalizado.
   * 
   * @constant
   * @type {Array<Object>}
   */
  const filteredProjects = list.filter((p) => {
    const q = normalize(search);
    if (!q) return true; // Sin búsqueda → mostrar todos
    return normalize(p.title).includes(q);
  });

  /**
   * Valida y ejecuta la acción confirmada (devolución o transferencia).
   * 
   * @function
   * @returns {void}
   * 
   * @fires onReturn Para devoluciones al inventario general
   * @fires onTransfer Para transferencias a otros proyectos
   */
  const confirm = () => {
    // Validación: cantidad válida
    const qty = Number(cantidad);
    if (!qty || qty <= 0) {
      alert("Ingrese una cantidad válida mayor a 0.");
      return;
    }

    // Validación: stock suficiente
    if (qty > disponible) {
      alert(`No puede mover más de lo disponible (${disponible}).`);
      return;
    }

    // Modo: Devolución al inventario general
    if (mode === "return") {
      onReturn({ cantidad: qty });
      return;
    }

    // Modo: Transferencia a otro proyecto
    if (mode === "transfer") {
      // Validación: proyecto destino seleccionado
      if (!selectedProject) {
        alert("Seleccione un proyecto destino.");
        return;
      }
      
      onTransfer({
        cantidad: qty,
        proyectoDestino: selectedProject.id,
      });
    }
  };

  return (
    <ModalBase
      visible={visible}
      onClose={onClose}
      title="Mover material"
      footer={
        // Solo mostrar botón de confirmar cuando hay un modo seleccionado
        mode && (
          <TouchableOpacity
            style={[styles.btn, loading && { opacity: 0.6 }]}
            disabled={loading}
            onPress={confirm}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.btnText}>Confirmar</Text>
            )}
          </TouchableOpacity>
        )
      }
    >
      {/* Información del material seleccionado */}
      <Text style={styles.name}>{item.nombre}</Text>
      <Text style={styles.meta}>
        Código: {item.codigo || "—"} · {item.tipo_medida}
      </Text>

      {/* Selección de modo (si aún no se ha seleccionado) */}
      {!mode && (
        <View style={{ marginTop: 12 }}>
          {/* Opción: Devolver al inventario general */}
          <TouchableOpacity
            style={styles.option}
            onPress={() => setMode("return")}
            accessibilityLabel="Devolver al inventario general"
            accessibilityHint="Devuelve el material al inventario central de la empresa"
          >
            <Text style={styles.optionText}>Devolver al inventario general</Text>
          </TouchableOpacity>

          {/* Opción: Mover a otro proyecto */}
          <TouchableOpacity
            style={styles.option}
            onPress={() => setMode("transfer")}
            accessibilityLabel="Mover a otro proyecto"
            accessibilityHint="Transfiere el material a otro proyecto de la empresa"
          >
            <Text style={styles.optionText}>Mover a otro proyecto</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Campos del formulario (cuando hay modo seleccionado) */}
      {mode && (
        <>
          <Text style={styles.label}>Cantidad</Text>
          <TextInput
            style={styles.input}
            placeholder="Cantidad"
            placeholderTextColor="#636A7B"
            value={cantidad}
            onChangeText={setCantidad}
            keyboardType="numeric"
            editable={!loading}
          />
        </>
      )}

      {/* Sección específica para transferencias */}
      {mode === "transfer" && (
        <>
          <Text style={[styles.label, { marginTop: 10 }]}>
            Seleccionar proyecto destino
          </Text>

          {/* Búsqueda de proyectos */}
          <TextInput
            style={styles.input}
            placeholder="Buscar proyecto..."
            placeholderTextColor="#636A7B"
            value={search}
            onChangeText={setSearch}
            editable={!loading}
          />

          {/* Lista de proyectos filtrados */}
          <FlatList
            data={filteredProjects}
            keyExtractor={(p) => p.id}
            style={{ maxHeight: 180 }} // Altura máxima con scroll interno
            renderItem={({ item: proj }) => {
              const isSelected = selectedProject?.id === proj.id;
              return (
                <TouchableOpacity
                  style={[
                    styles.projectRow,
                    isSelected && styles.projectSelected,
                  ]}
                  onPress={() => setSelectedProject(proj)}
                  disabled={loading}
                >
                  <Text style={styles.projectText}>{proj.title}</Text>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                No se encontraron proyectos disponibles
              </Text>
            }
          />
        </>
      )}
    </ModalBase>
  );
}

const styles = StyleSheet.create({
  name: {
    color: "#F8FAFC", // Blanco azulado muy claro
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 4,
  },
  meta: {
    color: "#94A3B8", // Gris azulado claro
    fontSize: 12,
    marginBottom: 10,
  },
  option: {
    padding: 12,
    backgroundColor: "#0B1120", // Azul muy oscuro
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1E293B", // Borde azul oscuro
    marginBottom: 8,
  },
  optionText: {
    color: "#F8FAFC", // Blanco
    fontSize: 14,
    fontWeight: "600",
  },
  label: {
    color: "#E5E7EB", // Gris claro
    fontSize: 13,
    marginBottom: 4,
    marginTop: 6,
  },
  input: {
    backgroundColor: "#111827", // Gris azulado muy oscuro
    color: "#FFF", // Blanco
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1F2937", // Borde gris azulado
    marginBottom: 10,
  },
  btn: {
    backgroundColor: "#0EA5E9", // Azul cielo
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  btnText: {
    color: "#FFF", // Blanco
    fontWeight: "700",
    fontSize: 14,
  },
  projectRow: {
    padding: 10,
    backgroundColor: "#0F172A", // Azul oscuro
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1E293B", // Borde azul oscuro
    marginBottom: 6,
  },
  projectSelected: {
    borderColor: "#0EA5E9", // Azul cielo para selección
  },
  projectText: {
    color: "#F8FAFC", // Blanco
    fontSize: 13,
    fontWeight: "600",
  },
  emptyText: {
    color: "#94A3B8", // Gris azulado claro
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 12,
    fontStyle: "italic",
  },
});