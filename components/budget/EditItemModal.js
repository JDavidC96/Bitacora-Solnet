// components/budget/EditItemModal.js
import { useEffect, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import budgetService from "../../services/budgetService";

const formatMoney = (n) =>
  `$ ${Number(n || 0).toLocaleString("es-CO", {
    maximumFractionDigits: 0,
  })}`;

export default function EditItemModal({ visible, item, onClose, onSave }) {
  const [nombre, setNombre] = useState("");
  const [unidades, setUnidades] = useState("");
  const [costoUnitario, setCostoUnitario] = useState("");
  const [unidad, setUnidad] = useState("un");
  const [categoria, setCategoria] = useState("");
  const [notas, setNotas] = useState("");
  const [aplicaIva, setAplicaIva] = useState(true);
  const [aplicaUtilidadGlobal, setAplicaUtilidadGlobal] = useState(true);

  // valores calculados
  const [costoTotal, setCostoTotal] = useState(0);
  const [precioIndividual, setPrecioIndividual] = useState(0);
  const [valorTotal, setValorTotal] = useState(0);
  const [utilidad, setUtilidad] = useState(0);

  const [utilidadGlobal, setUtilidadGlobalState] = useState(0);

  const resetForm = () => {
  setNombre("");
  setUnidades("");
  setCostoUnitario("");
  setUnidad("un");
  setCategoria("");
  setNotas("");
  setAplicaIva(true);
  setCostoTotal(0);
  setPrecioIndividual(0);
  setValorTotal(0);
  setUtilidad(0);
};


  // Cargar utilidad global
  useEffect(() => {
    if (!visible) return;
    if (!item?.projectId) return;

    const loadUtilidadGlobal = async () => {
      const conf = await budgetService.getBudgetByProject(item.projectId);
      setUtilidadGlobalState(conf.utilidadGlobal || 0);
    };

    loadUtilidadGlobal();
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      resetForm();
      }
    }, [visible]);

  // Cargar datos del ítem
  useEffect(() => {
    if (item) {
      setNombre(item.nombre || "");
      setUnidades(String(item.unidades || ""));
      setCostoUnitario(String(item.costoUnitario || ""));
      setAplicaIva(item.aplicaIva ?? true);
      setAplicaUtilidadGlobal(item.aplicaUtilidadGlobal ?? true);
      setUnidad(item.unidad || "un");
      setCategoria(item.categoria || "");
      setNotas(item.notas || "");

      calcularValores(
        item.unidades,
        item.costoUnitario,
        item.aplicaIva ?? true,
        utilidadGlobal
      );
    }
  }, [item, utilidadGlobal]);

  // Recalcular cuando cambian unidades/costo
  useEffect(() => {
    calcularValores(
      unidades,
      costoUnitario,
      aplicaIva,
      utilidadGlobal
    );
  }, [unidades, costoUnitario, aplicaIva, utilidadGlobal]);

  const calcularValores = (u, cu, iva, utilidadG, aplicaUG) => {
  const unidadesN = Number(u) || 0;
  const costoUnit = Number(cu) || 0;

  const costoT = unidadesN * costoUnit;

  let pIndividual = costoUnit;
  if (aplicaUG && utilidadG > 0 && utilidadG < 100) {
    const margen = 1 - utilidadG / 100;
    if (margen !== 0) {
      pIndividual = costoUnit / margen;
    }
  }

  const vTotal = pIndividual * unidadesN;
  const util = vTotal - costoT;
  setCostoTotal(costoT);
  setPrecioIndividual(pIndividual);
  setValorTotal(vTotal);
  setUtilidad(util);
};


  const handleSave = () => {
    if (!nombre.trim()) {
      alert("El ítem debe tener nombre.");
      return;
    }

    const data = {
      id: item.id,
      faseKey: item.faseKey,
      nombre,
      unidades: Number(unidades) || 0,
      costoUnitario: Number(costoUnitario) || 0,
      aplicaIva,
      aplicaUtilidadGlobal,
      unidad,
      categoria,
      notas,
    };

    onSave(data);
    resetForm();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>
              {item?.id ? "Editar ítem" : "Nuevo ítem"}
            </Text>

            {/* Nombre */}
            <Text style={styles.label}>Nombre del ítem</Text>
            <TextInput
              style={styles.input}
              value={nombre}
              onChangeText={setNombre}
              placeholder="Ej: Paneles Trina"
              placeholderTextColor="#6B7280"
            />

            {/* Unidades */}
            <Text style={styles.label}>Unidades</Text>
            <TextInput
              style={styles.input}
              value={unidades}
              onChangeText={setUnidades}
              keyboardType="numeric"
              placeholder="Ej: 32"
              placeholderTextColor="#6B7280"
            />

            {/* Costo unitario */}
            <Text style={styles.label}>Costo unitario</Text>
            <TextInput
              style={styles.input}
              value={costoUnitario}
              onChangeText={setCostoUnitario}
              keyboardType="numeric"
              placeholder="Ej: 585612"
              placeholderTextColor="#6B7280"
            />

            {/* Unidad */}
            <Text style={styles.label}>Unidad</Text>
            <TextInput
              style={styles.input}
              value={unidad}
              onChangeText={setUnidad}
              placeholder="Ej: un, m, m2..."
              placeholderTextColor="#6B7280"
            />

            {/* Categoría */}
            <Text style={styles.label}>Categoría</Text>
            <TextInput
              style={styles.input}
              value={categoria}
              onChangeText={setCategoria}
              placeholder="Opcional"
              placeholderTextColor="#6B7280"
            />

            {/* Notas */}
            <Text style={styles.label}>Notas</Text>
            <TextInput
              style={[styles.input, { height: 70 }]}
              multiline
              value={notas}
              onChangeText={setNotas}
              placeholder="Notas adicionales..."
              placeholderTextColor="#6B7280"
            />

            {/* Switch IVA */}
            <View style={styles.switchRow}>
              <Text style={styles.label}>¿Aplica IVA?</Text>
              <Switch
                value={aplicaIva}
                onValueChange={setAplicaIva}
                trackColor={{ true: "#10B981", false: "#475569" }}
                thumbColor="#F8FAFC"
              />
            </View>

            {/* Switch UTILIDAD GLOBAL */}
            <View style={styles.switchRow}>
              <Text style={styles.label}>¿Aplica utilidad global?</Text>
                <Switch
                  value={aplicaUtilidadGlobal}
                  onValueChange={setAplicaUtilidadGlobal}
                  trackColor={{ true: "#10B981", false: "#475569" }}
                  thumbColor="#F8FAFC"
                />
            </View>

            {/* CÁLCULOS (solo lectura) */}
            <View style={styles.calcBox}>
              <Text style={styles.calcTitle}>Cálculos</Text>

              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>Costo total:</Text>
                <Text style={styles.calcValue}>
                  {formatMoney(costoTotal)}
                </Text>
              </View>

              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>Precio individual:</Text>
                <Text style={styles.calcValue}>
                  {formatMoney(precioIndividual)}
                </Text>
              </View>

              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>Valor total:</Text>
                <Text style={styles.calcValue}>
                  {formatMoney(valorTotal)}
                </Text>
              </View>

              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>Utilidad:</Text>
                <Text style={styles.calcValue}>{formatMoney(utilidad)}</Text>
              </View>
            </View>

            {/* Botones */}
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveText}>Guardar</Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ------------------------------------------------------------
// ESTILOS
// ------------------------------------------------------------

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 16,
  },
  modal: {
    backgroundColor: "#0F172A",
    borderRadius: 14,
    padding: 16,
    maxHeight: "90%",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.25)",
  },
  title: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  label: {
    color: "#E2E8F0",
    fontSize: 14,
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#1E293B",
    color: "#F8FAFC",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#334155",
    marginBottom: 12,
  },

  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  calcBox: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  calcTitle: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
  },
  calcRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  calcLabel: {
    color: "#CBD5E1",
    fontSize: 13,
  },
  calcValue: {
    color: "#F8FAFC",
    fontSize: 13,
    fontVariant: ["tabular-nums"],
  },

  btnRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 6,
    gap: 10,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: "#475569",
  },
  cancelText: {
    color: "#E2E8F0",
    fontSize: 14,
  },
  saveBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: "#10B981",
  },
  saveText: {
    color: "#064E3B",
    fontSize: 14,
    fontWeight: "700",
  },
});
