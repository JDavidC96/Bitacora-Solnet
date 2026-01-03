// app/ReporteGeneralScreen.js
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View, } from "react-native";
import { useUser } from "../context/UserContext";
import { horasLaboralesService } from "../services/horasLaboralesService";
import { exportReporteGeneralExcel } from "../utils/exportReporteGeneralExcel";
import { formatDateLocal } from "../utils/formatDateLocal";

export default function ReporteGeneralScreen() {
  const { role } = useUser();

  const [todosRegistros, setTodosRegistros] = useState([]);
  const [registrosFiltrados, setRegistrosFiltrados] = useState([]);
  const [resumenPersonas, setResumenPersonas] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filtros
  const [quincena, setQuincena] = useState(null); // "q1", "q2" o null
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const isAdmin = role === "Administrador";
  const isAdministrativo = role === "Administrativo";

  useEffect(() => {
    if (isAdmin || isAdministrativo) {
      cargarRegistros();
    }
  }, [role]);

  const cargarRegistros = async () => {
    try {
      setLoading(true);
      const data = await horasLaboralesService.getRegistros();
      setTodosRegistros(data);
      aplicarFiltros(data, { quincena: null, from: "", to: "" }); // sin filtro inicial
    } catch (error) {
      console.error("Error cargando registros:", error);
      Alert.alert("Error", "No se pudo cargar el reporte general.");
    } finally {
      setLoading(false);
    }
  };

  const calcularRangoQuincena = (q) => {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = hoy.getMonth(); // 0-11

    if (q === "q1") {
      // 1 al 15
      return {
        start: new Date(year, month, 1, 0, 0, 0),
        end: new Date(year, month, 15, 23, 59, 59),
      };
    }

    // q2: 16 al último día del mes
    const lastDay = new Date(year, month + 1, 0).getDate();
    return {
      start: new Date(year, month, 16, 0, 0, 0),
      end: new Date(year, month, lastDay, 23, 59, 59),
    };
  };

  const aplicarFiltros = (baseRegistros = todosRegistros, opts) => {
    const { quincena: q, from, to } = opts;

    let filtered = [...baseRegistros];

    // 1) Si hay rango manual de fechas, tiene prioridad
    if (from && to) {
      const start = new Date(from);
      const end = new Date(to);
      if (!isNaN(start) && !isNaN(end)) {
        filtered = filtered.filter((r) => {
          const fi = new Date(r.fechaInicio);
          return fi >= start && fi <= end;
        });
      }
    } else if (q === "q1" || q === "q2") {
      // 2) Si no hay rango manual, usar quincena si está seleccionada
      const { start, end } = calcularRangoQuincena(q);
      filtered = filtered.filter((r) => {
        const fi = new Date(r.fechaInicio);
        return fi >= start && fi <= end;
      });
    }

    setRegistrosFiltrados(filtered);

    // Resumen por persona
    const resumen = horasLaboralesService.agruparPorPersona(filtered);
    setResumenPersonas(resumen);
  };

  const handleAplicarFiltros = () => {
    aplicarFiltros(todosRegistros, {
      quincena,
      from: fromDate,
      to: toDate,
    });
  };

  const handleLimpiarFiltros = () => {
    setQuincena(null);
    setFromDate("");
    setToDate("");
    aplicarFiltros(todosRegistros, {
      quincena: null,
      from: "",
      to: "",
    });
  };

  const handleExport = async () => {
    const { ok, message } = await exportReporteGeneralExcel(registrosFiltrados);
    if (!ok) {
      Alert.alert("Exportación", message || "No se pudo exportar el Excel.");
    }
  };

  if (!isAdmin && !isAdministrativo) {
    return (
      <LinearGradient colors={["#1f2933", "#111827"]} style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.title}>Reporte general de horas</Text>
          <Text style={styles.noAccess}>
            Solo Administradores y Administrativos pueden ver esta pantalla.
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
          {item.destino || "-"} ({item.tipoAsignacion || "n/a"})
        </Text>
        <Text style={styles.rowDates}>
          {formatDateLocal(item.fechaInicio)} →{" "}
          {item.fechaFin ? formatDateLocal(item.fechaFin) : "En curso"}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={styles.rowHours}>{item.horasNormales || 0}h</Text>
        <Text style={styles.rowExtras}>+{item.horasExtras || 0} extra</Text>
      </View>
    </View>
  );

  return (
    <LinearGradient colors={["#111827", "#1f2933"]} style={styles.container}>
      <Text style={styles.title}>Reporte general de horas</Text>

      {/* FILTROS */}
      <View style={styles.filtersBox}>
        <Text style={styles.filtersTitle}>Filtros</Text>

        <View style={styles.quincenaRow}>
          <TouchableOpacity
            style={[
              styles.quincenaButton,
              quincena === "q1" && styles.quincenaButtonActive,
            ]}
            onPress={() => setQuincena(quincena === "q1" ? null : "q1")}
          >
            <Text
              style={[
                styles.quincenaText,
                quincena === "q1" && styles.quincenaTextActive,
              ]}
            >
              1ª quincena (1–15)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.quincenaButton,
              quincena === "q2" && styles.quincenaButtonActive,
            ]}
            onPress={() => setQuincena(quincena === "q2" ? null : "q2")}
          >
            <Text
              style={[
                styles.quincenaText,
                quincena === "q2" && styles.quincenaTextActive,
              ]}
            >
              2ª quincena (16–fin)
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.filtersHint}>
          Si llenas fechas manuales, se ignora la quincena.
        </Text>

        <View style={styles.dateRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Desde (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              placeholder="2025-02-01"
              placeholderTextColor="#6B7280"
              value={fromDate}
              onChangeText={setFromDate}
            />
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Hasta (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              placeholder="2025-02-15"
              placeholderTextColor="#6B7280"
              value={toDate}
              onChangeText={setToDate}
            />
          </View>
        </View>

        <View style={styles.filtersButtonsRow}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={handleAplicarFiltros}
          >
            <Text style={styles.filterButtonText}>Aplicar filtros</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.filterButtonSecondary}
            onPress={handleLimpiarFiltros}
          >
            <Text style={styles.filterButtonSecondaryText}>Limpiar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* BOTÓN EXPORTAR */}
      <TouchableOpacity
        style={styles.exportButton}
        onPress={handleExport}
        disabled={registrosFiltrados.length === 0}
      >
        <Text style={styles.exportText}>Exportar Excel</Text>
      </TouchableOpacity>

      {/* RESUMEN */}
      <Text style={styles.section}>
        Resumen por persona ({resumenPersonas.length})
      </Text>
      {loading && todosRegistros.length === 0 ? (
        <ActivityIndicator color="#fff" style={{ marginVertical: 16 }} />
      ) : resumenPersonas.length === 0 ? (
        <Text style={styles.emptyText}>No hay datos en este rango.</Text>
      ) : (
        <FlatList
          data={resumenPersonas}
          keyExtractor={(i) =>
            i.personalId || i.nombre || Math.random().toString()
          }
          horizontal
          renderItem={renderResumen}
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* DETALLE */}
      <Text style={styles.section}>
        Detalle de jornadas ({registrosFiltrados.length})
      </Text>

      {loading && todosRegistros.length === 0 ? (
        <ActivityIndicator color="#fff" style={{ marginTop: 16 }} />
      ) : registrosFiltrados.length === 0 ? (
        <Text style={styles.emptyText}>No hay registros para mostrar.</Text>
      ) : (
        <FlatList
          data={registrosFiltrados}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          style={{ marginTop: 8 }}
        />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 12,
  },
  noAccess: {
    color: "#D1D5DB",
    fontSize: 15,
    textAlign: "center",
    marginTop: 8,
  },
  filtersBox: {
    backgroundColor: "#111827",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  filtersTitle: {
    color: "#E5E7EB",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  quincenaRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  quincenaButton: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#4B5563",
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginRight: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  quincenaButtonActive: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  quincenaText: {
    color: "#D1D5DB",
    fontSize: 13,
  },
  quincenaTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  filtersHint: {
    color: "#9CA3AF",
    fontSize: 12,
    marginBottom: 6,
  },
  dateRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  label: {
    color: "#D1D5DB",
    fontSize: 12,
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#1F2937",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: "#F9FAFB",
    fontSize: 13,
  },
  filtersButtonsRow: {
    flexDirection: "row",
    marginTop: 8,
    justifyContent: "flex-end",
  },
  filterButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    marginLeft: 8,
  },
  filterButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  filterButtonSecondary: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#6B7280",
  },
  filterButtonSecondaryText: {
    color: "#E5E7EB",
    fontSize: 13,
    fontWeight: "500",
  },
  exportButton: {
    backgroundColor: "#10B981",
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 999,
    alignSelf: "center",
    marginBottom: 12,
  },
  exportText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  section: {
    color: "#E5E7EB",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 6,
  },
  emptyText: {
    color: "#9CA3AF",
    fontSize: 13,
    marginBottom: 10,
  },
  card: {
    backgroundColor: "#1F2937",
    padding: 10,
    borderRadius: 10,
    marginRight: 8,
    minWidth: 150,
  },
  cardName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  cardText: {
    color: "#D1D5DB",
    fontSize: 13,
  },
  row: {
    backgroundColor: "#111827",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    flexDirection: "row",
  },
  rowName: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  rowDetail: { color: "#D1D5DB", fontSize: 13, marginTop: 2 },
  rowDates: { color: "#9CA3AF", fontSize: 12, marginTop: 2 },
  rowHours: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  rowExtras: { color: "#FBBF24", fontSize: 13, marginTop: 2 },
});
