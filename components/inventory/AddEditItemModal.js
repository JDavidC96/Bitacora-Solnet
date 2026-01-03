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

/* ===============================
 * HELPERS (solo para Cableado)
 * =============================== */
const normalize = (v = "") =>
  String(v).toLowerCase().trim().replace(/\s+/g, " ");

const isSameCable = (a, b) => {
  const n1 = normalize(a?.nombre);
  const n2 = normalize(b?.nombre);
  if (!n1 || !n2) return false;
  return n1 === n2;
};

export default function AddEditItemModal({
  visible,
  onClose,
  item,
  onSaved,
}) {
  const isEditing = !!item;

  // ===============================
  // ESTADOS
  // ===============================
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState("");
  const [unidad, setUnidad] = useState("Unidad");
  const [precio, setPrecio] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [notas, setNotas] = useState("");
  const [codigo, setCodigo] = useState("");
  const [saving, setSaving] = useState(false);

  // ===============================
  // EFECTO DE CARGA
  // ===============================
  useEffect(() => {
    if (!visible) return;

    if (isEditing) {
      setNombre(item.nombre || "");
      setCategoria(item.categoria || "");
      setUnidad(item.tipo_medida || "Unidad");
      setPrecio(item.precio?.toString() || "");
      setCantidad(item.cantidad?.toString() || "");
      setNotas(item.notas || "");
      setCodigo(item.codigo || "");
    } else {
      resetFields();
    }
  }, [visible]);

  const resetFields = () => {
    setNombre("");
    setCategoria("");
    setUnidad("Unidad");
    setPrecio("");
    setCantidad("");
    setNotas("");
    setCodigo("");
  };

  // ===============================
  // GUARDAR
  // ===============================
  const handleSave = async () => {
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

    setSaving(true);

    try {
      // ===============================
      // OBTENER EXISTENTES
      // ===============================
      const snap = await getDocs(collection(db, "inventario_general"));
      const existingItems = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      let codigoFinal = codigo;

      /* =========================================================
       * REGLA ESPECIAL PARA CABLEADO
       * ========================================================= */
      if (categoria === "Cableado") {
        // Si no hay código, intentar reutilizar uno existente
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

        // Si sigue vacío, generar uno nuevo (solo la primera vez)
        if (!codigoFinal) {
          codigoFinal = generateMaterialCode(
            nombre,
            categoria,
            existingItems
          );
        }
      } else {
        /* =========================================================
         * COMPORTAMIENTO NORMAL (NO CABLEADO)
         * ========================================================= */
        if (!isEditing) {
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
          codigoFinal = generateMaterialCode(
            nombre,
            categoria,
            existingItems
          );
        }

        // Validar duplicado SOLO para no-cableado
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
      // CREAR
      // ===============================
      if (!isEditing) {
        await inventoryService.agregarItemGeneralConHistorial({
          nombre: nombre.trim(),
          categoria,
          tipo_medida: unidad,
          precio: Number(precio),
          cantidad: Number(cantidad),
          codigo: codigoFinal,
          notas: notas || "",
        });
      }

      // ===============================
      // EDITAR
      // ===============================
      else {
        await inventoryService.actualizarItemInventarioGeneral(item.id, {
          nombre: nombre.trim(),
          categoria,
          tipo_medida: unidad,
          precio: Number(precio),
          cantidad: Number(cantidad),
          codigo: codigoFinal,
          notas: notas || "",
        });

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
  // UI
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
      <TextInput
        style={styles.input}
        placeholder="Nombre del material"
        placeholderTextColor="#777"
        value={nombre}
        onChangeText={setNombre}
      />

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

      <DropdownSelect
        data={[
          { label: "Unidad", value: "Unidad" },
          { label: "Metro", value: "Metro" },
        ]}
        value={unidad}
        onChange={setUnidad}
      />

      <TextInput
        style={styles.input}
        placeholder="Precio unitario"
        placeholderTextColor="#777"
        keyboardType="numeric"
        value={precio}
        onChangeText={setPrecio}
      />

      <TextInput
        style={styles.input}
        placeholder="Cantidad en inventario"
        placeholderTextColor="#777"
        keyboardType="numeric"
        value={cantidad}
        onChangeText={setCantidad}
      />

      {codigo ? (
  <>
    <Text style={styles.codeLabel}>Código:</Text>
    <View style={styles.codeBox}>
      <Text style={styles.codeText}>{codigo}</Text>
    </View>
  </>
) : null}


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
