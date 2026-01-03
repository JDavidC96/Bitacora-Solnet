import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Polyline } from "react-native-svg";

export default function BudgetComparisonChart({
  presupuestoPorFase = {},
  realPorFase = {},
}) {
  const fases = ["fase1", "fase2", "fase3", "fase4"];

  // Acumulados
  let accPres = 0;
  let accReal = 0;

  const presData = [];
  const realData = [];

  fases.forEach((f) => {
    accPres += Number(presupuestoPorFase[f] || 0);
    accReal += Number(realPorFase[f] || 0);
    presData.push(accPres);
    realData.push(accReal);
  });

  const maxValue = Math.max(...presData, ...realData, 1);

  const width = 320;
  const height = 160;
  const padding = 20;

  const getX = (i) =>
    padding + (i * (width - padding * 2)) / (fases.length - 1);

  const getY = (value) =>
    height - padding - (value / maxValue) * (height - padding * 2);

  const buildPoints = (data) =>
    data.map((v, i) => `${getX(i)},${getY(v)}`).join(" ");

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Presupuesto vs Gasto real (acumulado)</Text>

      <Svg width={width} height={height}>
        {/* Presupuesto */}
        <Polyline
          points={buildPoints(presData)}
          fill="none"
          stroke="#22c55e"
          strokeWidth="2.5"
        />

        {presData.map((v, i) => (
          <Circle
            key={`p-${i}`}
            cx={getX(i)}
            cy={getY(v)}
            r="3"
            fill="#22c55e"
          />
        ))}

        {/* Gasto real */}
        <Polyline
          points={buildPoints(realData)}
          fill="none"
          stroke="#ef4444"
          strokeWidth="2.5"
        />

        {realData.map((v, i) => (
          <Circle
            key={`r-${i}`}
            cx={getX(i)}
            cy={getY(v)}
            r="3"
            fill="#ef4444"
          />
        ))}
      </Svg>

      {/* Leyenda */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: "#22c55e" }]} />
          <Text style={styles.legendText}>Presupuesto</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: "#ef4444" }]} />
          <Text style={styles.legendText}>Gasto real</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(15,23,42,0.9)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.4)",
  },
  title: {
    color: "#F7FAFC",
    fontWeight: "700",
    marginBottom: 12,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 8,
    gap: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendText: {
    color: "#CBD5E0",
    fontSize: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
