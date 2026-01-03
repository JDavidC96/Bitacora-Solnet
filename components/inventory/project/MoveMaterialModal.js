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

function normalize(t) {
  return t
    ?.toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function getCantidadDisponible(item) {
  if (typeof item.cantidadActual === "number") return item.cantidadActual;
  if (typeof item.cantidad_disponible === "number")
    return item.cantidad_disponible;
  if (typeof item.cantidad === "number") return item.cantidad;
  return 0;
}

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
  const [cantidad, setCantidad] = useState("");
  const [mode, setMode] = useState(null);

  const [search, setSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState(null);

  useEffect(() => {
    if (!visible) {
      setCantidad("");
      setMode(null);
      setSearch("");
      setSelectedProject(null);
    }
  }, [visible]);

  if (!item) return null;

  const disponible = getCantidadDisponible(item);

  const list = projects.filter((p) => p.id !== currentProjectId);

  const filteredProjects = list.filter((p) => {
    const q = normalize(search);
    if (!q) return true;
    return normalize(p.title).includes(q);
  });

  const confirm = () => {
    const qty = Number(cantidad);
    if (!qty || qty <= 0) {
      alert("Ingrese una cantidad válida mayor a 0.");
      return;
    }
    if (qty > disponible) {
      alert(`No puede mover más de lo disponible (${disponible}).`);
      return;
    }

    if (mode === "return") {
      onReturn({ cantidad: qty });
      return;
    }

    if (mode === "transfer") {
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
      <Text style={styles.name}>{item.nombre}</Text>
      <Text style={styles.meta}>
        Código: {item.codigo || "—"} · {item.tipo_medida}
      </Text>

      {!mode && (
        <View style={{ marginTop: 12 }}>
          <TouchableOpacity
            style={styles.option}
            onPress={() => setMode("return")}
          >
            <Text style={styles.optionText}>Devolver al inventario general</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.option}
            onPress={() => setMode("transfer")}
          >
            <Text style={styles.optionText}>Mover a otro proyecto</Text>
          </TouchableOpacity>
        </View>
      )}

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
          />
        </>
      )}

      {mode === "transfer" && (
        <>
          <Text style={[styles.label, { marginTop: 10 }]}>
            Seleccionar proyecto destino
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Buscar proyecto..."
            placeholderTextColor="#636A7B"
            value={search}
            onChangeText={setSearch}
          />

          <FlatList
            data={filteredProjects}
            keyExtractor={(p) => p.id}
            style={{ maxHeight: 180 }}
            renderItem={({ item: proj }) => {
              const isSelected = selectedProject?.id === proj.id;
              return (
                <TouchableOpacity
                  style={[
                    styles.projectRow,
                    isSelected && styles.projectSelected,
                  ]}
                  onPress={() => setSelectedProject(proj)}
                >
                  <Text style={styles.projectText}>{proj.title}</Text>
                </TouchableOpacity>
              );
            }}
          />
        </>
      )}
    </ModalBase>
  );
}

const styles = StyleSheet.create({
  name: {
    color: "#F8FAFC",
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 4,
  },
  meta: {
    color: "#94A3B8",
    fontSize: 12,
    marginBottom: 10,
  },
  option: {
    padding: 12,
    backgroundColor: "#0B1120",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1E293B",
    marginBottom: 8,
  },
  optionText: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "600",
  },
  label: {
    color: "#E5E7EB",
    fontSize: 13,
    marginBottom: 4,
    marginTop: 6,
  },
  input: {
    backgroundColor: "#111827",
    color: "#FFF",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1F2937",
    marginBottom: 10,
  },
  btn: {
    backgroundColor: "#0EA5E9",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  btnText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 14,
  },
  projectRow: {
    padding: 10,
    backgroundColor: "#0F172A",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1E293B",
    marginBottom: 6,
  },
  projectSelected: {
    borderColor: "#0EA5E9",
  },
  projectText: {
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "600",
  },
});
