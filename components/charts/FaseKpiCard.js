// components/charts/FaseKpiCard.js
import { StyleSheet, Text, View } from "react-native";
import ProgressBar from "./ProgressBar";

export default function FaseKpiCard({ title, presupuesto, real }) {
  const diferencia = presupuesto - real;
  const ejecucion = presupuesto > 0 ? (real / presupuesto) * 100 : 0;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Presupuesto:</Text>
        <Text style={styles.value}>${presupuesto.toLocaleString("es-CO")}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Gasto real:</Text>
        <Text style={styles.value}>${real.toLocaleString("es-CO")}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Diferencia:</Text>
        <Text
          style={[
            styles.value,
            diferencia < 0 ? styles.negative : styles.positive,
          ]}
        >
          ${diferencia.toLocaleString("es-CO")}
        </Text>
      </View>

      <View style={{ marginTop: 10 }}>
        <ProgressBar value={ejecucion} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(15,23,42,0.9)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.4)",
  },
  title: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 3,
  },
  label: { color: "#CBD5E0" },
  value: { color: "#E2E8F0", fontWeight: "600" },
  positive: { color: "#68D391" },
  negative: { color: "#F56565" },
});
