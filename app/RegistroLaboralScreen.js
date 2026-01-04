// app/RegistroLaboralScreen.js
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, personaId]);

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

  const getBreakdown = (obj) => {
    const hn = Number(obj?.horasNormales || 0);
    const he = Number(obj?.horasExtras || 0);

    const hnn = Number(obj?.horasNocturnas || 0);
    const hen = Number(obj?.horasExtrasNocturnas || 0);

    const hd = Number(obj?.horasDominicales || 0);
    const hdn = Number(obj?.horasDominicalesNocturnas || 0);

    const hde = Number(obj?.horasExtrasDominicales || 0);
    const hden = Number(obj?.horasExtrasDominicalesNocturnas || 0);

    const total =
      Number(obj?.totalHoras || 0) ||
      hn + he + hnn + hen + hd + hdn + hde + hden;

    return {
      hn,
      he,
      hnn,
      hen,
      hd,
      hdn,
      hde,
      hden,
      total,
      extrasTotal: he + hen + hde + hden + hd + hdn, // todo lo no-normal-diurno (para resumen rápido)
    };
  };

  // Resumen "bonito": si tu service no agrupa estas nuevas columnas,
  // igual calculamos totals usando los registros cargados.
  const resumenFallback = useMemo(() => {
    if (personaId) return [];

    // si el service ya devuelve resumen con breakdown, lo dejamos.
    const hasAnyNew =
      (resumenPersonas || []).some(
        (r) =>
          r?.horasNocturnas ||
          r?.horasExtrasNocturnas ||
          r?.horasDominicales ||
          r?.horasDominicalesNocturnas ||
          r?.horasExtrasDominicales ||
          r?.horasExtrasDominicalesNocturnas
      );

    if (hasAnyNew) return resumenPersonas;

    // fallback: agrupar nosotros desde registros
    const map = new Map();
    (registros || []).forEach((r) => {
      const pid = r.personalId || r?.idPersonal || null;
      const name = r.nombre || "Sin nombre";
      const key = pid || name;

      if (!map.has(key)) {
        map.set(key, {
          personalId: pid || null,
          nombre: name,
          horasNormales: 0,
          horasExtras: 0,
          horasNocturnas: 0,
          horasExtrasNocturnas: 0,
          horasDominicales: 0,
          horasDominicalesNocturnas: 0,
          horasExtrasDominicales: 0,
          horasExtrasDominicalesNocturnas: 0,
          totalHoras: 0,
        });
      }

      const acc = map.get(key);
      const b = getBreakdown(r);

      acc.horasNormales += b.hn;
      acc.horasExtras += b.he;

      acc.horasNocturnas += b.hnn;
      acc.horasExtrasNocturnas += b.hen;

      acc.horasDominicales += b.hd;
      acc.horasDominicalesNocturnas += b.hdn;

      acc.horasExtrasDominicales += b.hde;
      acc.horasExtrasDominicalesNocturnas += b.hden;

      acc.totalHoras += b.total;
    });

    return Array.from(map.values());
  }, [personaId, resumenPersonas, registros]);

  const renderResumen = ({ item }) => {
    const b = getBreakdown(item);

    return (
      <View style={styles.card}>
        <Text style={styles.cardName}>{item.nombre}</Text>

        <Text style={styles.cardText}>Normales: {b.hn}</Text>
        <Text style={styles.cardText}>Extra diurnas: {b.he}</Text>

        <Text style={styles.cardText}>Nocturnas: {b.hnn}</Text>
        <Text style={styles.cardText}>Extra nocturnas: {b.hen}</Text>

        <Text style={styles.cardText}>Dom/Fest diurnas: {b.hd}</Text>
        <Text style={styles.cardText}>Dom/Fest nocturnas: {b.hdn}</Text>

        <Text style={styles.cardText}>Extra Dom/Fest diurnas: {b.hde}</Text>
        <Text style={styles.cardText}>Extra Dom/Fest nocturnas: {b.hden}</Text>

        <View style={styles.cardDivider} />
        <Text style={styles.cardTotal}>Total: {b.total}</Text>
      </View>
    );
  };

  const renderItem = ({ item }) => {
    const b = getBreakdown(item);

    return (
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

          <View style={styles.breakdownWrap}>
            <Text style={styles.breakdownText}>N: {b.hn}</Text>
            <Text style={styles.breakdownText}>ED: {b.he}</Text>
            <Text style={styles.breakdownText}>Noc: {b.hnn}</Text>
            <Text style={styles.breakdownText}>EN: {b.hen}</Text>
            <Text style={styles.breakdownText}>D/F: {b.hd}</Text>
            <Text style={styles.breakdownText}>D/F N: {b.hdn}</Text>
            <Text style={styles.breakdownText}>ED/F: {b.hde}</Text>
            <Text style={styles.breakdownText}>ED/F N: {b.hden}</Text>
          </View>
        </View>

        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.rowHours}>{b.total}h</Text>
          <Text style={styles.rowExtras}>Extras: {b.extrasTotal}</Text>
        </View>
      </View>
    );
  };

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
            data={resumenFallback}
            horizontal
            keyExtractor={(item, index) =>
              item.personalId || `${item.nombre}-${index}`
            }
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
          keyExtractor={(item, index) =>
            item.id ||
            item.idDoc ||
            `${item.personalId || "na"}-${item.fechaInicio || "na"}-${index}`
          }
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
    minWidth: 190,
  },
  cardName: { color: "#fff", fontSize: 15, fontWeight: "700", marginBottom: 4 },
  cardText: { color: "#D1D5DB", fontSize: 13 },
  cardDivider: { height: 1, backgroundColor: "#374151", marginVertical: 6 },
  cardTotal: { color: "#fff", fontWeight: "800" },

  row: {
    backgroundColor: "#1F2937",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: "row",
    gap: 10,
  },
  rowName: { color: "#fff", fontSize: 15, fontWeight: "700" },
  rowDetail: { color: "#D1D5DB", fontSize: 13 },
  rowDates: { color: "#9CA3AF", fontSize: 12, marginTop: 2 },

  breakdownWrap: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  breakdownText: { color: "#E5E7EB", fontSize: 12 },

  rowHours: { color: "#fff", fontSize: 16, fontWeight: "800" },
  rowExtras: { color: "#FBBF24", fontSize: 13 },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  noAccess: { color: "#ccc", marginTop: 8 },
});
