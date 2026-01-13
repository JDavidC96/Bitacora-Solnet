// components/inventory/project/UpdateUsageModal.js
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import ModalBase from "../../ModalBase";

import inventoryService from "../../../services/inventoryService";
import { matchInventoryItem } from "../../../utils/classifyMaterial"; // ⬅ PIEZA A

/**
 * Obtiene la cantidad disponible de un ítem del inventario
 * Busca en diferentes propiedades del objeto para encontrar el valor
 * 
 * @param {Object} item - Objeto que representa el material
 * @returns {number} Cantidad disponible del material
 */
function getCantidadDisponible(item) {
  if (!item) return 0;
  if (typeof item.cantidadActual === "number") return item.cantidadActual;
  if (typeof item.cantidad_disponible === "number") return item.cantidad_disponible;
  if (typeof item.cantidad === "number") return item.cantidad;
  return 0;
}

/**
 * Obtiene la cantidad original asignada a un ítem del inventario
 * Busca en diferentes propiedades del objeto para encontrar el valor
 * 
 * @param {Object} item - Objeto que representa el material
 * @returns {number} Cantidad original asignada del material
 */
function getCantidadOriginal(item) {
  if (!item) return 0;
  if (typeof item.cantidadOriginal === "number") return item.cantidadOriginal;
  if (typeof item.cantidad_original === "number") return item.cantidad_original;
  if (typeof item.cantidad === "number") return item.cantidad;
  return 0;
}

/**
 * Modal para actualizar el uso de materiales en un proyecto
 * Permite registrar el consumo de materiales y sincronizar con el inventario general
 * 
 * @component
 * @param {Object} props - Propiedades del componente
 * @param {boolean} props.visible - Controla la visibilidad del modal
 * @param {Function} props.onClose - Función que se ejecuta al cerrar el modal
 * @param {Object} props.item - Objeto que representa el material a usar
 * @param {string} props.item.id - ID del material
 * @param {string} props.item.codigo - Código del material
 * @param {string} props.item.nombre - Nombre del material
 * @param {number} props.item.precio - Precio unitario del material
 * @param {string} props.item.tipo_medida - Tipo de medida (Unidad, Kg, Litro, etc.)
 * @param {string} props.item.categoria - Categoría del material
 * @param {Function} props.onUpdate - Función que se ejecuta al confirmar el uso
 * @param {boolean} props.loading - Indica si está en proceso de envío de datos
 * @param {string} props.projectId - ID del proyecto
 * @param {string} props.usuario - Usuario que realiza la operación
 * @param {string} props.proyectoTitle - Título del proyecto
 * @returns {JSX.Element|null} Modal para registrar uso de materiales o null si no hay item
 * 
 * @example
 * <UpdateUsageModal
 *   visible={isModalVisible}
 *   onClose={() => setIsModalVisible(false)}
 *   item={selectedItem}
 *   onUpdate={(data) => handleUsageUpdate(data)}
 *   loading={isLoading}
 *   projectId="123"
 *   usuario="admin"
 *   proyectoTitle="Proyecto XYZ"
 * />
 */
export default function UpdateUsageModal({
  visible,
  onClose,
  item,
  onUpdate,
  loading,
  projectId,
  usuario,
  proyectoTitle,
}) {
  const [cantidad, setCantidad] = useState("");

  // Resetear el campo de cantidad cuando el modal se cierra
  useEffect(() => {
    if (!visible) setCantidad("");
  }, [visible]);

  if (!item) return null;

  const disponible = getCantidadDisponible(item);
  const original = getCantidadOriginal(item);
  const usado = original - disponible;

  /**
   * Maneja la confirmación del uso del material
   * Realiza validaciones, busca el ítem en inventario general y crea uno si no existe
   * 
   * @async
   * @function handleConfirm
   * @returns {Promise<void>}
   */
  const handleConfirm = async () => {
    const qty = Number(cantidad);

    // Validaciones básicas de cantidad
    if (!qty || qty <= 0) {
      alert("Ingrese una cantidad válida mayor a 0.");
      return;
    }
    if (qty > disponible) {
      alert(`No puede usar más de lo disponible (${disponible}).`);
      return;
    }

    try {
      // 1) Obtener inventario general
      const inventarioGeneral = await inventoryService.getAllGeneral();

      // 2) Buscar ítem según código en el inventario general
      const { exists, item: matchedItem } = matchInventoryItem(
        item.codigo,
        inventarioGeneral
      );

      // 3) Si no existe → ofrecer crearlo automáticamente
      if (!exists) {
        await new Promise((resolve, reject) => {
          Alert.alert(
            "Ítem no encontrado en inventario general",
            `El código ${item.codigo} no existe.\n\n¿Deseas crearlo automáticamente?`,
            [
              { text: "No", style: "cancel", onPress: resolve },
              {
                text: "Crear",
                onPress: async () => {
                  try {
                    await inventoryService.createGeneralItem(matchedItem);
                    resolve();
                  } catch (e) {
                    reject(e);
                  }
                },
              },
            ]
          );
        });
      }

      // 4) Crear un objeto unificado con la información combinada
      const unifiedItem = {
        ...matchedItem,
        id: item.id,
        precio: matchedItem.precio ?? item.precio ?? 0,
        tipo_medida: matchedItem.tipo_medida ?? item.tipo_medida ?? "Unidad",
        categoria: matchedItem.categoria ?? item.categoria ?? "",
        codigo: matchedItem.codigo ?? item.codigo ?? "",
        nombre: matchedItem.nombre ?? item.nombre ?? "",
      };

      // 5) Delegar a onUpdate (ProjectStockScreen lo enviará a inventoryService)
      onUpdate &&
        onUpdate({
          cantidad: qty,
          unifiedItem,
        });
    } catch (err) {
      console.log("Error en match de item:", err);
      Alert.alert("Error", "Ocurrió un problema al registrar el uso.");
    }
  };

  return (
    <ModalBase
      visible={visible}
      onClose={onClose}
      title="Registrar uso de material"
      footer={
        <TouchableOpacity
          style={[styles.btn, loading && { opacity: 0.7 }]}
          disabled={loading}
          onPress={handleConfirm}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.btnText}>Registrar uso</Text>
          )}
        </TouchableOpacity>
      }
    >
      <Text style={styles.name}>{item.nombre}</Text>
      <Text style={styles.meta}>
        Código: {item.codigo || "—"} · {item.tipo_medida || "Unidad"}
      </Text>

      <View style={styles.row}>
        <View style={styles.badge}>
          <Text style={styles.badgeLabel}>Asignado</Text>
          <Text style={styles.badgeValue}>{original}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeLabel}>Disponible</Text>
          <Text style={styles.badgeValue}>{disponible}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeLabel}>Usado</Text>
          <Text style={styles.badgeValue}>{usado}</Text>
        </View>
      </View>

      <Text style={styles.label}>Cantidad a usar</Text>
      <TextInput
        style={styles.input}
        placeholder="Cantidad"
        placeholderTextColor="#6B7280"
        keyboardType="numeric"
        value={cantidad}
        onChangeText={setCantidad}
      />
    </ModalBase>
  );
}

const styles = StyleSheet.create({
  name: { color: "#F9FAFB", fontSize: 16, fontWeight: "700", marginBottom: 4 },
  meta: { color: "#9CA3AF", fontSize: 12, marginBottom: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  badge: {
    flex: 1,
    backgroundColor: "#020617",
    borderRadius: 8,
    padding: 8,
    marginHorizontal: 2,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  badgeLabel: { color: "#9CA3AF", fontSize: 11 },
  badgeValue: { color: "#F9FAFB", fontSize: 14, fontWeight: "700" },
  label: { color: "#E5E7EB", fontSize: 13, marginBottom: 4, marginTop: 4 },
  input: {
    backgroundColor: "#111827",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: "#F9FAFB",
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  btn: {
    backgroundColor: "#22C55E",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  btnText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
});