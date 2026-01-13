// components/inventory/duplicates/MergeDuplicateModal.js

import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ModalBase from "../../ModalBase";

/**
 * Modal para fusionar un grupo de ítems duplicados del inventario.
 * Permite seleccionar un ítem principal al que se transferirán las cantidades
 * de los demás ítems del grupo, los cuales serán eliminados posteriormente.
 * 
 * @component
 * @example
 * const handleMergeConfirm = async (masterItem) => {
 *   // Lógica para fusionar duplicados
 *   await mergeDuplicateItems(group.items, masterItem);
 * };
 * 
 * return (
 *   <MergeDuplicateModal
 *     visible={isModalVisible}
 *     onClose={() => setModalVisible(false)}
 *     group={selectedDuplicateGroup}
 *     onConfirm={handleMergeConfirm}
 *     merging={isMerging}
 *   />
 * );
 * 
 * @param {Object} props - Propiedades del componente
 * @param {boolean} props.visible - Controla la visibilidad del modal
 * @param {function} props.onClose - Callback cuando se cierra el modal
 * @param {Object|null} props.group - Grupo de ítems duplicados a fusionar
 * @param {string} props.group.categoria - Categoría de los ítems
 * @param {string} props.group.normalizedName - Nombre normalizado del grupo
 * @param {Array<Object>} props.group.items - Lista de ítems duplicados
 * @param {string} props.group.items[].id - ID único del ítem
 * @param {string} props.group.items[].nombre - Nombre del ítem
 * @param {string} [props.group.items[].codigo] - Código del ítem
 * @param {string} [props.group.items[].tipo_medida] - Unidad de medida
 * @param {number} [props.group.items[].cantidad] - Cantidad en stock
 * @param {function} props.onConfirm - Callback al confirmar la fusión
 * @param {boolean} [props.merging=false] - Indica si está en proceso de fusión
 * 
 * @returns {React.ReactElement|null} Modal de fusión o null si no hay grupo
 * 
 * @see ModalBase Componente base de modal reutilizable
 * @see DuplicateGroupCard Componente que muestra grupos de duplicados
 */
export default function MergeDuplicateModal({
  visible,
  onClose,
  group,
  onConfirm,
  merging,
}) {
  // Estado para el ítem principal seleccionado
  const [selected, setSelected] = useState(null);

  /**
   * Inicializa la selección con el primer ítem del grupo al abrir el modal.
   * 
   * @effect
   * @listens visible, group
   */
  useEffect(() => {
    if (visible && group?.items?.length) {
      setSelected(group.items[0]);
    }
  }, [visible, group]);

  // Validación: no renderizar si no hay grupo
  if (!group) return null;

  /**
   * Confirma la fusión utilizando el ítem seleccionado como principal.
   * 
   * @function
   * @returns {void}
   * 
   * @fires onConfirm Con el ítem principal seleccionado
   */
  const handleConfirm = () => {
    if (!selected) return;
    onConfirm && onConfirm(selected);
  };

  return (
    <ModalBase
      visible={visible}
      onClose={onClose}
      title="Fusionar grupo de duplicados"
      footer={
        <TouchableOpacity
          style={[styles.btn, (!selected || merging) && { opacity: 0.6 }]}
          disabled={!selected || merging}
          onPress={handleConfirm}
        >
          {merging ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.btnText}>Fusionar en este ítem</Text>
          )}
        </TouchableOpacity>
      }
    >
      {/* Información sobre el proceso de fusión */}
      <Text style={styles.info}>
        Elige el ítem principal. Los demás se sumarán a su cantidad y serán
        eliminados del inventario general.
      </Text>

      {/* Título del grupo */}
      <Text style={styles.groupTitle}>
        {group.categoria} · {group.normalizedName}
      </Text>

      {/* Lista de ítems para seleccionar el principal */}
      <FlatList
        data={group.items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isSelected = selected?.id === item.id;
          return (
            <TouchableOpacity
              style={[styles.itemRow, isSelected && styles.itemSelected]}
              onPress={() => setSelected(item)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.nombre}</Text>
                <Text style={styles.meta}>
                  Código: {item.codigo || "—"} · Unidad: {item.tipo_medida || "—"}
                </Text>
              </View>
              <View style={styles.rightBox}>
                <Text style={styles.qty}>{item.cantidad ?? 0}</Text>
                <Text style={styles.qtyLabel}>Stock</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </ModalBase>
  );
}

const styles = StyleSheet.create({
  info: {
    color: "#CBD5F5", // Azul claro/plateado
    fontSize: 12,
    marginBottom: 8,
  },
  groupTitle: {
    color: "#E5E7EB", // Gris claro
    fontWeight: "700",
    marginBottom: 6,
  },
  itemRow: {
    flexDirection: "row",
    paddingVertical: 8,
    borderRadius: 8,
    paddingHorizontal: 8,
    marginBottom: 4,
    backgroundColor: "#020617", // Azul oscuro
    borderWidth: 1,
    borderColor: "#1E293B", // Borde azul oscuro
  },
  itemSelected: {
    borderColor: "#0EA5E9", // Azul cielo (seleccionado)
    backgroundColor: "#0B1220", // Fondo más claro para selección
  },
  name: {
    color: "#F9FAFB", // Blanco
    fontSize: 13,
    fontWeight: "600",
  },
  meta: {
    color: "#9CA3AF", // Gris medio
    fontSize: 11,
    marginTop: 2,
  },
  rightBox: {
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  qty: {
    color: "#FBBF24", // Amarillo para cantidad
    fontWeight: "700",
  },
  qtyLabel: {
    color: "#9CA3AF", // Gris medio
    fontSize: 10,
  },
  btn: {
    backgroundColor: "#0EA5E9", // Azul cielo
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  btnText: {
    color: "#FFF", // Blanco
    fontWeight: "700",
  },
});