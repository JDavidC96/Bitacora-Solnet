// app/TarifasManoObraScreen.js
import { useRouter } from "expo-router";
import { collection, doc, getDocs, orderBy, query, updateDoc } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useUser } from "../context/UserContext";
import { db } from "../firebase/firebaseConfig";

const formatMoney = (n) =>
  `$ ${Number(n || 0).toLocaleString("es-CO", { maximumFractionDigits: 0 })}`;

export default function TarifasManoObraScreen() {
  const router = useRouter();
  const { role } = useUser();

  const canManage = ["Administrador", "Administrativo"].includes(role);

  const [loading, setLoading] = useState(false);

  const [personal, setPersonal] = useState([]);
  const [showPicker, setShowPicker] = useState(false);
  const [searchPersonal, setSearchPersonal] = useState("");
  const [selectedPersonalId, setSelectedPersonalId] = useState(null);

  const [tarifaInput, setTarifaInput] = useState("");

  const selectedPerson = useMemo(() => {
    return personal.find((p) => p.id === selectedPersonalId) || null;
  }, [personal, selectedPersonalId]);

  const loadPersonal = async () => {
    try {
      setLoading(true);

      const snap = await getDocs(query(collection(db, "personal"), orderBy("nombre", "asc")));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      setPersonal(list);

      if (!selectedPersonalId && list.length > 0) {
        setSelectedPersonalId(list[0].id);
      }
    } catch (e) {
      console.error("Error cargando personal:", e);
      Alert.alert("Error", "No se pudo cargar el personal.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPersonal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedPerson) return;
    setTarifaInput(
      selectedPerson.tarifaHora != null ? String(selectedPerson.tarifaHora) : ""
    );
  }, [selectedPerson]);

  const filteredPersonal = useMemo(() => {
    const q = (searchPersonal || "").toLowerCase().trim();
    if (!q) return personal;

    return personal.filter((p) => {
      const nombre = String(p.nombre || "").toLowerCase();
      const rol = String(p.rol || "").toLowerCase();
      return nombre.includes(q) || rol.includes(q) || String(p.id).includes(q);
    });
  }, [personal, searchPersonal]);

  const handleSave = async () => {
    if (!selectedPerson) {
      Alert.alert("Falta info", "Selecciona una persona.");
      return;
    }

    const tarifaHora = Number(tarifaInput);
    if (!Number.isFinite(tarifaHora) || tarifaHora < 0) {
      Alert.alert("Tarifa inválida", "Ingresa un número válido (>= 0).");
      return;
    }

    try {
      setLoading(true);

      await updateDoc(doc(db, "personal", selectedPerson.id), {
        tarifaHora,
        updatedAt: new Date().toISOString(),
      });

      await loadPersonal();
      Alert.alert("Listo", "Tarifa guardada correctamente.");
    } catch (e) {
      console.error("Error guardando tarifa:", e);
      Alert.alert("Error", "No se pudo guardar la tarifa.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!selectedPerson) return;

    Alert.alert(
      "Quitar tarifa",
      `¿Dejar la tarifa en 0 para ${selectedPerson.nombre || selectedPerson.id}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Quitar",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await updateDoc(doc(db, "personal", selectedPerson.id), {
                tarifaHora: 0,
                updatedAt: new Date().toISOString(),
              });
              await loadPersonal();
              setTarifaInput("0");
            } catch (e) {
              console.error("Error quitando tarifa:", e);
              Alert.alert("Error", "No se pudo actualizar la tarifa.");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (!canManage) {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>◀</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Tarifa de Mano de Obra</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Acceso restringido</Text>
          <Text style={styles.helperText}>
            Solo <Text style={{ fontWeight: "700" }}>Administrador</Text> y{" "}
            <Text style={{ fontWeight: "700" }}>Administrativo</Text> pueden ver y
            editar las tarifas.
          </Text>
        </View>
      </View>
    );
  }

  const currentTarifa = selectedPerson?.tarifaHora ?? 0;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>◀</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Tarifa de Mano de Obra</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tarifa por usuario</Text>
          <Text style={styles.helperText}>
            Esto guarda <Text style={{ fontWeight: "700" }}>tarifaHora</Text> dentro
            de cada documento en <Text style={{ fontWeight: "700" }}>personal</Text>.
          </Text>

          <Text style={styles.label}>Usuario (personal)</Text>
          <TouchableOpacity style={styles.select} onPress={() => setShowPicker(true)}>
            <Text style={styles.selectText}>
              {selectedPerson
                ? `${selectedPerson.nombre || "Sin nombre"}${
                    selectedPerson.rol ? ` · ${selectedPerson.rol}` : ""
                  }`
                : "Seleccionar..."}
            </Text>
            <Text style={styles.selectArrow}>▼</Text>
          </TouchableOpacity>

          <Text style={styles.label}>Tarifa por hora</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: 18000"
            placeholderTextColor="#6B7280"
            keyboardType="numeric"
            value={tarifaInput}
            onChangeText={setTarifaInput}
          />

          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.primaryButton, loading && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#0B1220" />
              ) : (
                <Text style={styles.primaryButtonText}>Guardar</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dangerButton, loading && { opacity: 0.7 }]}
              onPress={handleClear}
              disabled={loading}
            >
              <Text style={styles.dangerButtonText}>Quitar</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.smallHint}>
            Tarifa actual:{" "}
            <Text style={{ fontWeight: "700" }}>{formatMoney(currentTarifa)}</Text>
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Vista rápida</Text>

          {personal.length === 0 ? (
            <Text style={styles.emptyText}>No hay personal registrado.</Text>
          ) : (
            personal
              .slice()
              .sort((a, b) =>
                String(a.nombre || "").localeCompare(String(b.nombre || ""), "es")
              )
              .map((p) => (
                <View key={p.id} style={styles.tarifaRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tarifaRol}>{p.nombre || p.id}</Text>
                    {!!p.rol && <Text style={styles.tarifaMeta}>{p.rol}</Text>}
                  </View>
                  <Text style={styles.tarifaValue}>{formatMoney(p.tarifaHora || 0)}</Text>
                </View>
              ))
          )}
        </View>
      </ScrollView>

      {/* Picker modal */}
      <Modal visible={showPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar usuario</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Text style={styles.modalClose}>Cerrar</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalSearch}
              placeholder="Buscar por nombre, rol o id..."
              placeholderTextColor="#6B7280"
              value={searchPersonal}
              onChangeText={setSearchPersonal}
            />

            <ScrollView style={{ maxHeight: 420 }}>
              {filteredPersonal.length === 0 ? (
                <Text style={styles.emptyText}>Sin resultados.</Text>
              ) : (
                filteredPersonal.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.optionRow,
                      p.id === selectedPersonalId && styles.optionRowActive,
                    ]}
                    onPress={() => {
                      setSelectedPersonalId(p.id);
                      setShowPicker(false);
                      setSearchPersonal("");
                    }}
                  >
                    <Text style={styles.optionText}>{p.nombre || "Sin nombre"}</Text>
                    {!!p.rol && <Text style={styles.optionMeta}>{p.rol}</Text>}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B1220", paddingTop: 44, paddingHorizontal: 14 },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  backText: { color: "#E5E7EB", marginRight: 12, fontSize: 16 },
  title: { fontSize: 18, fontWeight: "700", color: "#F9FAFB" },

  card: {
    backgroundColor: "rgba(2,6,23,0.9)",
    borderColor: "rgba(55,65,81,0.7)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  cardTitle: { color: "#F9FAFB", fontSize: 16, fontWeight: "700" },
  helperText: { color: "#9CA3AF", marginTop: 8, lineHeight: 18 },

  label: { color: "#E5E7EB", marginTop: 14, marginBottom: 6, fontWeight: "600" },
  input: {
    backgroundColor: "#0B1220",
    borderColor: "rgba(55,65,81,0.9)",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#F9FAFB",
  },

  select: {
    backgroundColor: "#0B1220",
    borderColor: "rgba(55,65,81,0.9)",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectText: { color: "#F9FAFB", flex: 1, paddingRight: 10 },
  selectArrow: { color: "#9CA3AF" },

  row: { flexDirection: "row", gap: 10, marginTop: 14 },
  primaryButton: {
    flex: 1,
    backgroundColor: "#22C55E",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonText: { color: "#0B1220", fontWeight: "800" },

  dangerButton: {
    backgroundColor: "rgba(239,68,68,0.2)",
    borderColor: "rgba(239,68,68,0.7)",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  dangerButtonText: { color: "#FCA5A5", fontWeight: "700" },

  smallHint: { color: "#9CA3AF", marginTop: 10 },
  emptyText: { color: "#9CA3AF", marginTop: 10 },

  tarifaRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomColor: "rgba(55,65,81,0.5)",
    borderBottomWidth: 1,
  },
  tarifaRol: { color: "#F9FAFB", fontWeight: "700" },
  tarifaMeta: { color: "#9CA3AF", marginTop: 2, fontSize: 12 },
  tarifaValue: { color: "#22C55E", fontWeight: "800" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: "#0B1220",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 14,
    borderColor: "rgba(55,65,81,0.8)",
    borderWidth: 1,
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  modalTitle: { color: "#F9FAFB", fontSize: 16, fontWeight: "800" },
  modalClose: { color: "#93C5FD", fontWeight: "700" },
  modalSearch: {
    backgroundColor: "#020617",
    borderColor: "rgba(55,65,81,0.9)",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#F9FAFB",
    marginBottom: 10,
  },
  optionRow: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 6,
    borderColor: "rgba(55,65,81,0.6)",
    borderWidth: 1,
    backgroundColor: "rgba(2,6,23,0.7)",
  },
  optionRowActive: {
    borderColor: "rgba(34,197,94,0.9)",
    backgroundColor: "rgba(34,197,94,0.12)",
  },
  optionText: { color: "#F9FAFB", fontWeight: "700" },
  optionMeta: { color: "#9CA3AF", marginTop: 2, fontSize: 12 },
});
