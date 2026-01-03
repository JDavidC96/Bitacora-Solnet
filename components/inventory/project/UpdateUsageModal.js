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

function getCantidadDisponible(item) {
  if (!item) return 0;
  if (typeof item.cantidadActual === "number") return item.cantidadActual;
  if (typeof item.cantidad_disponible === "number") return item.cantidad_disponible;
  if (typeof item.cantidad === "number") return item.cantidad;
  return 0;
}

function getCantidadOriginal(item) {
  if (!item) return 0;
  if (typeof item.cantidadOriginal === "number") return item.cantidadOriginal;
  if (typeof item.cantidad_original === "number") return item.cantidad_original;
  if (typeof item.cantidad === "number") return item.cantidad;
  return 0;
}

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

  useEffect(() => {
    if (!visible) setCantidad("");
  }, [visible]);

  if (!item) return null;

  const disponible = getCantidadDisponible(item);
  const original = getCantidadOriginal(item);
  const usado = original - disponible;

  // ======================================================
  //   ⚡ PIEZA B – MATCH ENGINE (Inventario ↔ Presupuesto)
  // ======================================================
  const handleConfirm = async () => {
    const qty = Number(cantidad);

    if (!qty || qty <= 0) {
      alert("Ingrese una cantidad válida mayor a 0.");
      return;
    }
    if (qty > disponible) {
      alert(`No puede usar más de lo disponible (${disponible}).`);
      return;
    }

    try {
      // 1) obtener inventario general
      const inventarioGeneral = await inventoryService.getAllGeneral();

      // 2) buscar item según código
      const { exists, item: matchedItem } = matchInventoryItem(
        item.codigo,
        inventarioGeneral
      );

      // 3) si no existe → ofrecer crearlo
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

      // 4) enviar matchedItem hacia el flujo de uso → gasto real
      const unifiedItem = {
        ...matchedItem,
        id: item.id,
        precio: matchedItem.precio ?? item.precio ?? 0,
        tipo_medida: matchedItem.tipo_medida ?? item.tipo_medida ?? "Unidad",
        categoria: matchedItem.categoria ?? item.categoria ?? "",
        codigo: matchedItem.codigo ?? item.codigo ?? "",
        nombre: matchedItem.nombre ?? item.nombre ?? "",
      };

      // 5) delegamos a onUpdate (ProjectStockScreen lo enviará a inventoryService)
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
