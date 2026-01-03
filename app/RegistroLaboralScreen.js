// app/RegistroLaboralScreen.js
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useUser } from "../context/UserContext";
import { horasLaboralesService } from "../services/horasLaboralesService";
import { exportRegistroLaboralExcel } from "../utils/exportExcelRegistroLaboral";
import { formatDateLocal } from "../utils/formatDateLocal";

export default function RegistroLaboralScreen() {
  const params = useLocalSearchParams();
  const personaId = params.personaId || null;
  const personaNombre = params.nombre || null;

  const { role } = useUser();

  const [registros, setRegistros] = useState([]);
  const [resumenPersonas, setResumenPersonas] = useState([]);
  const [loading, setLoading] = useState(false);

  const isAdmin = role === "Administrador";
  const isAdministrativo = role === "Administrativo";

  useEffect(() => {
    if (!isAdmin && !isAdministrativo) return;

    if (personaId) cargarRegistrosPersona(personaId);
    else cargarRegistros();
  }, [role]);

  const cargarRegistros = async () => {
    try {
      setLoading(true);
      const data = await horasLaboralesService.getRegistros();
      setRegistros(data);

      const resumen = horasLaboralesService.agruparPorPersona(data);
      setResumenPersonas(resumen);
    } catch (error) {
      Alert.alert("Error", "No se pudo cargar el registro laboral");
    } finally {
      setLoading(false);
    }
  };

  const cargarRegistrosPersona = async (id) => {
    try {
      setLoading(true);
      const data = await horasLaboralesService.getRegistrosPorPersona(id);
      setRegistros(data);

      const resumen = horasLaboralesService.agruparPorPersona(data);
      setResumenPersonas(resumen);
    } catch (error) {
      Alert.alert("Error", "No se pudo cargar el registro individual");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    const { ok, message } = await exportRegistroLaboralExcel(registros);
    if (!ok) Alert.alert("Error", message || "No se pudo exportar el excel");
  };

  if (!isAdmin && !isAdministrativo) {
    return (
      <LinearGradient colors={["#1f2933", "#111827"]} style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.title}>Registro laboral</Text>
          <Text style={styles.noAccess}>
            No tienes permisos para ver esta información.
          </Text>
        </View>
      </LinearGradient>
    );
  }

  const renderResumen = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.cardName}>{item.nombre}</Text>
      <Text style={styles.cardText}>Normales: {item.horasNormales}</Text>
      <Text style={styles.cardText}>Extras: {item.horasExtras}</Text>
      <Text style={styles.cardText}>Total: {item.totalHoras}</Text>
    </View>
  );

  const renderItem = ({ item }) => (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowName}>{item.nombre}</Text>
        <Text style={styles.rowDetail}>
          {item.destino || "-"} ({item.tipoAsignacion})
        </Text>
        <Text style={styles.rowDates}>
          {formatDateLocal(item.fechaInicio)} →{" "}
          {item.fechaFin ? formatDateLocal(item.fechaFin) : "En curso"}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={styles.rowHours}>{item.horasNormales}h</Text>
        <Text style={styles.rowExtras}>+{item.horasExtras} extra</Text>
      </View>
    </View>
  );

  return (
    <LinearGradient colors={["#111827", "#1f2933"]} style={styles.container}>
      <Text style={styles.title}>
        {personaId ? `Registro laboral — ${personaNombre}` : "Registro laboral"}
      </Text>

      <TouchableOpacity
        style={styles.exportButton}
        onPress={handleExport}
        disabled={registros.length === 0}
      >
        <Text style={styles.exportText}>Exportar Excel</Text>
      </TouchableOpacity>

      {!personaId && (
        <>
          <Text style={styles.section}>Resumen por persona</Text>
          <FlatList
            data={resumenPersonas}
            horizontal
            keyExtractor={(i) => i.personalId}
            renderItem={renderResumen}
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 16 }}
          />
        </>
      )}

      <Text style={styles.section}>
        {personaId ? "Jornadas" : "Detalle de jornadas"}
      </Text>

      {loading ? (
        <ActivityIndicator color="#fff" style={{ marginTop: 16 }} />
      ) : (
        <FlatList
          data={registros}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
        />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    marginBottom: 16,
  },
  exportButton: {
    backgroundColor: "#10B981",
    padding: 10,
    borderRadius: 8,
    alignSelf: "center",
    marginBottom: 10,
  },
  exportText: {
    color: "#fff",
    fontWeight: "600",
  },
  section: {
    color: "#E5E7EB",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 10,
  },
  card: {
    backgroundColor: "#1F2937",
    padding: 10,
    borderRadius: 10,
    marginRight: 8,
    minWidth: 150,
  },
  cardName: { color: "#fff", fontSize: 15, fontWeight: "700" },
  cardText: { color: "#D1D5DB", fontSize: 13 },
  row: {
    backgroundColor: "#1F2937",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: "row",
  },
  rowName: { color: "#fff", fontSize: 15, fontWeight: "700" },
  rowDetail: { color: "#D1D5DB", fontSize: 13 },
  rowDates: { color: "#9CA3AF", fontSize: 12 },
  rowHours: { color: "#fff", fontSize: 16, fontWeight: "700" },
  rowExtras: { color: "#FBBF24", fontSize: 13 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  noAccess: { color: "#ccc", marginTop: 8 },
});
