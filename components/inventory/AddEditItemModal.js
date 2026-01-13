// components/inventory/AddEditItemModal.js
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

import DropdownSelect from "../DropdownSelect";
import ModalBase from "../ModalBase";

import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";

import { inventoryService } from "../../services/inventoryService";
import { generateMaterialCode } from "../../utils/codeGenerator";

/**
 * Modal para agregar o editar materiales en el inventario general.
 * 
 * Este componente permite:
 * - Agregar nuevos materiales al inventario general
 * - Editar materiales existentes
 * - Generar códigos automáticos únicos para cada material
 * - Gestionar stock mínimo para alertas de inventario bajo
 * - Manejar lógica especial para categoría "Cableado" (códigos compartidos)
 * 
 * @component
 * @param {Object} props - Propiedades del componente
 * @param {boolean} props.visible - Controla la visibilidad del modal
 * @param {Function} props.onClose - Función para cerrar el modal
 * @param {Object|null} props.item - Ítem a editar (null para agregar nuevo)
 * @param {Function} props.onSaved - Callback ejecutado después de guardar exitosamente
 * 
 * @returns {JSX.Element} Componente modal de agregar/editar items
 */
export default function AddEditItemModal({
  visible,
  onClose,
  item,
  onSaved,
}) {
  const isEditing = !!item;

  // ===============================
  // ESTADOS DEL FORMULARIO
  // ===============================
  const [nombre, setNombre] = useState(""); // Nombre del material
  const [categoria, setCategoria] = useState(""); // Categoría del material
  const [unidad, setUnidad] = useState("Unidad"); // Unidad de medida (Unidad/Metro)
  const [precio, setPrecio] = useState(""); // Precio unitario
  const [cantidad, setCantidad] = useState(""); // Cantidad actual en stock
  const [minimo, setMinimo] = useState(""); // Stock mínimo para alertas
  const [notas, setNotas] = useState(""); // Notas adicionales
  const [codigo, setCodigo] = useState(""); // Código único del material
  const [saving, setSaving] = useState(false); // Estado de guardado

  // ===============================
  // FUNCIONES AUXILIARES
  // ===============================
  
  /**
   * Normaliza texto para comparación (minúsculas, sin espacios extras)
   * @param {string} v - Texto a normalizar
   * @returns {string} Texto normalizado
   */
  const normalize = (v = "") =>
    String(v).toLowerCase().trim().replace(/\s+/g, " ");

  /**
   * Determina si dos materiales de cableado son el mismo basado en nombre normalizado
   * @param {Object} a - Primer ítem de cableado
   * @param {Object} b - Segundo ítem de cableado
   * @returns {boolean} True si son el mismo cable
   */
  const isSameCable = (a, b) => {
    const n1 = normalize(a?.nombre);
    const n2 = normalize(b?.nombre);
    if (!n1 || !n2) return false;
    return n1 === n2;
  };

  // ===============================
  // EFECTO DE CARGA INICIAL
  // ===============================
  useEffect(() => {
    if (!visible) return;

    if (isEditing) {
      // Cargar datos del ítem existente para edición
      setNombre(item.nombre || "");
      setCategoria(item.categoria || "");
      setUnidad(item.tipo_medida || "Unidad");
      setPrecio(item.precio?.toString() || "");
      setCantidad(item.cantidad?.toString() || "");
      setMinimo(item.minimo?.toString() || ""); // Cargar stock mínimo si existe
      setNotas(item.notas || "");
      setCodigo(item.codigo || "");
    } else {
      // Restablecer campos para nuevo ítem
      resetFields();
    }
  }, [visible]);

  /**
   * Restablece todos los campos del formulario a valores vacíos
   */
  const resetFields = () => {
    setNombre("");
    setCategoria("");
    setUnidad("Unidad");
    setPrecio("");
    setCantidad("");
    setMinimo(""); // Restablecer stock mínimo
    setNotas("");
    setCodigo("");
  };

  // ===============================
  // FUNCIÓN DE GUARDADO
  // ===============================
  const handleSave = async () => {
    // Validaciones de campos obligatorios
    if (!nombre.trim()) {
      Alert.alert("Error", "Debe ingresar un nombre.");
      return;
    }

    if (!categoria.trim()) {
      Alert.alert("Error", "Debe seleccionar una categoría.");
      return;
    }

    if (!unidad.trim()) {
      Alert.alert("Error", "Debe seleccionar unidad.");
      return;
    }

    if (!precio || Number(precio) <= 0) {
      Alert.alert("Error", "Debe ingresar un precio válido.");
      return;
    }

    if (cantidad === "" || Number(cantidad) < 0) {
      Alert.alert("Error", "Debe ingresar una cantidad válida (0 o más).");
      return;
    }

    // Validación opcional para stock mínimo
    if (minimo && Number(minimo) < 0) {
      Alert.alert("Error", "El stock mínimo debe ser 0 o mayor.");
      return;
    }

    setSaving(true);

    try {
      // Obtener todos los ítems existentes para validaciones
      const snap = await getDocs(collection(db, "inventario_general"));
      const existingItems = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      let codigoFinal = codigo;

      /* =========================================================
       * LÓGICA ESPECIAL PARA CATEGORÍA "CABLEADO"
       * Los cables con el mismo nombre comparten código
       * ========================================================= */
      if (categoria === "Cableado") {
        // Si no hay código, intentar reutilizar uno existente del mismo cable
        if (!codigoFinal) {
          const match = existingItems.find(
            (i) =>
              i.categoria === "Cableado" &&
              isSameCable(i, { nombre })
          );

          if (match?.codigo) {
            codigoFinal = match.codigo;
          }
        }

        // Si sigue vacío, generar un código nuevo (solo la primera vez para este cable)
        if (!codigoFinal) {
          codigoFinal = generateMaterialCode(
            nombre,
            categoria,
            existingItems
          );
        }
      } else {
        /* =========================================================
         * COMPORTAMIENTO NORMAL PARA OTRAS CATEGORÍAS
         * Código único por ítem
         * ========================================================= */
        if (!isEditing) {
          // Nuevo ítem: generar código
          codigoFinal = generateMaterialCode(
            nombre,
            categoria,
            existingItems
          );
        }

        if (
          isEditing &&
          (item.nombre !== nombre || item.categoria !== categoria)
        ) {
          // Si se cambia nombre o categoría al editar, regenerar código
          codigoFinal = generateMaterialCode(
            nombre,
            categoria,
            existingItems
          );
        }

        // Validar duplicado de código SOLO para categorías no-cableado
        const duplicate = existingItems.find(
          (i) => i.codigo === codigoFinal && i.id !== item?.id
        );

        if (duplicate) {
          Alert.alert(
            "Conflicto de código",
            "El código generado ya existe. Intente guardar nuevamente."
          );
          setSaving(false);
          return;
        }
      }

      // ===============================
      // CREAR NUEVO ÍTEM
      // ===============================
      if (!isEditing) {
        await inventoryService.agregarItemGeneralConHistorial({
          nombre: nombre.trim(),
          categoria,
          tipo_medida: unidad,
          precio: Number(precio),
          cantidad: Number(cantidad),
          minimo: minimo ? Number(minimo) : null, // Incluir stock mínimo
          codigo: codigoFinal,
          notas: notas || "",
        });
      }
      // ===============================
      // EDITAR ÍTEM EXISTENTE
      // ===============================
      else {
        await inventoryService.actualizarItemInventarioGeneral(item.id, {
          nombre: nombre.trim(),
          categoria,
          tipo_medida: unidad,
          precio: Number(precio),
          cantidad: Number(cantidad),
          minimo: minimo ? Number(minimo) : null, // Incluir stock mínimo
          codigo: codigoFinal,
          notas: notas || "",
        });

        // Registrar movimiento de edición en el historial
        await inventoryService.registrarMovimiento({
          tipo: "edicion",
          material: nombre.trim(),
          cantidad: Number(cantidad),
          origen: "Inventario General",
          destino: "Inventario General",
          unidad,
          notas: "Edición de material",
        });
      }

      // Notificar éxito y cerrar
      onSaved?.();
      onClose();
      resetFields();
    } catch (error) {
      console.error("Error guardando item:", error);
      Alert.alert("Error", "No se pudo guardar el material.");
    } finally {
      setSaving(false);
    }
  };

  // ===============================
  // INTERFAZ DE USUARIO
  // ===============================
  return (
    <ModalBase
      visible={visible}
      onClose={() => {
        if (!saving) {
          resetFields();
          onClose();
        }
      }}
      title={isEditing ? "Editar material" : "Agregar material"}
      footer={
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveText}>
              {isEditing ? "Guardar cambios" : "Agregar"}
            </Text>
          )}
        </TouchableOpacity>
      }
    >
      {/* Campo: Nombre del material */}
      <TextInput
        style={styles.input}
        placeholder="Nombre del material"
        placeholderTextColor="#777"
        value={nombre}
        onChangeText={setNombre}
      />

      {/* Campo: Categoría (dropdown) */}
      <DropdownSelect
        data={[
          { label: "Accesorios", value: "Accesorios" },
          { label: "Estructura", value: "Estructura" },
          { label: "Paneles", value: "Paneles" },
          { label: "Inversores", value: "Inversores" },
          { label: "Modulos", value: "Modulos" },
          { label: "Tuberia", value: "Tuberia" },
          { label: "Cableado", value: "Cableado" },
          { label: "Electrico", value: "Electrico" },
          { label: "Comunicaciones", value: "Comunicaciones" },
        ]}
        value={categoria}
        onChange={setCategoria}
      />

      {/* Campo: Unidad de medida (dropdown) */}
      <DropdownSelect
        data={[
          { label: "Unidad", value: "Unidad" },
          { label: "Metro", value: "Metro" },
        ]}
        value={unidad}
        onChange={setUnidad}
      />

      {/* Campo: Precio unitario */}
      <TextInput
        style={styles.input}
        placeholder="Precio unitario"
        placeholderTextColor="#777"
        keyboardType="numeric"
        value={precio}
        onChangeText={setPrecio}
      />

      {/* Campo: Cantidad actual en inventario */}
      <TextInput
        style={styles.input}
        placeholder="Cantidad en inventario"
        placeholderTextColor="#777"
        keyboardType="numeric"
        value={cantidad}
        onChangeText={setCantidad}
      />

      {/* Campo: Stock mínimo para alertas (NUEVO) */}
      <TextInput
        style={styles.input}
        placeholder="Stock mínimo (opcional)"
        placeholderTextColor="#777"
        keyboardType="numeric"
        value={minimo}
        onChangeText={setMinimo}
      />

      {/* Mostrar código generado (si existe) */}
      {codigo ? (
        <>
          <Text style={styles.codeLabel}>Código:</Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeText}>{codigo}</Text>
          </View>
        </>
      ) : null}

      {/* Campo: Notas adicionales */}
      <TextInput
        style={[styles.input, { height: 70 }]}
        placeholder="Notas (opcional)"
        placeholderTextColor="#777"
        multiline
        value={notas}
        onChangeText={setNotas}
      />
    </ModalBase>
  );
}

// ===============================
// ESTILOS
// ===============================
const styles = StyleSheet.create({
  input: {
    backgroundColor: "#1E1E2F",
    color: "#FFF",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  codeLabel: {
    color: "#A5B4FC",
    fontSize: 12,
    marginBottom: 4,
  },
  codeBox: {
    padding: 10,
    backgroundColor: "#0F172A",
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  codeText: {
    color: "#FACC15",
    fontWeight: "700",
    fontSize: 14,
    textAlign: "center",
  },
  saveBtn: {
    backgroundColor: "#0EA5E9",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  saveText: {
    color: "#FFF",
    fontWeight: "700",
  },
});
