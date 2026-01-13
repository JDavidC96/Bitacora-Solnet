import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Polyline } from "react-native-svg";

/**
 * Componente de gráfico de comparación entre presupuesto y gasto real acumulado por fases.
 * Muestra dos líneas (presupuesto vs real) con puntos en cada fase para visualizar
 * la progresión acumulada del presupuesto a lo largo del proyecto.
 * 
 * @component
 * @example
 * const presupuestoPorFase = {
 *   fase1: 10000,
 *   fase2: 15000,
 *   fase3: 20000,
 *   fase4: 5000
 * };
 * 
 * const realPorFase = {
 *   fase1: 12000,
 *   fase2: 14000,
 *   fase3: 22000,
 *   fase4: 6000
 * };
 * 
 * return (
 *   <BudgetComparisonChart
 *     presupuestoPorFase={presupuestoPorFase}
 *     realPorFase={realPorFase}
 *   />
 * );
 * 
 * @param {Object} props - Propiedades del componente
 * @param {Object} [props.presupuestoPorFase={}] - Presupuesto asignado por cada fase del proyecto
 * @param {number} [props.presupuestoPorFase.fase1=0] - Presupuesto para la fase 1
 * @param {number} [props.presupuestoPorFase.fase2=0] - Presupuesto para la fase 2
 * @param {number} [props.presupuestoPorFase.fase3=0] - Presupuesto para la fase 3
 * @param {number} [props.presupuestoPorFase.fase4=0] - Presupuesto para la fase 4
 * @param {Object} [props.realPorFase={}] - Gasto real acumulado por cada fase del proyecto
 * @param {number} [props.realPorFase.fase1=0] - Gasto real en la fase 1
 * @param {number} [props.realPorFase.fase2=0] - Gasto real en la fase 2
 * @param {number} [props.realPorFase.fase3=0] - Gasto real en la fase 3
 * @param {number} [props.realPorFase.fase4=0] - Gasto real en la fase 4
 * 
 * @returns {React.ReactElement} Gráfico SVG con comparación de presupuesto vs gasto real
 */
export default function BudgetComparisonChart({
  presupuestoPorFase = {},
  realPorFase = {},
}) {
  // Definición de las fases del proyecto
  const fases = ["fase1", "fase2", "fase3", "fase4"];

  // Variables para acumulación
  let accPres = 0;  // Acumulador de presupuesto
  let accReal = 0;  // Acumulador de gasto real

  // Arrays para almacenar datos acumulados
  const presData = [];  // Datos acumulados de presupuesto
  const realData = [];  // Datos acumulados de gasto real

  // Calcular valores acumulados para cada fase
  fases.forEach((f) => {
    accPres += Number(presupuestoPorFase[f] || 0);
    accReal += Number(realPorFase[f] || 0);
    presData.push(accPres);
    realData.push(accReal);
  });

  // Determinar el valor máximo para escalar el gráfico
  const maxValue = Math.max(...presData, ...realData, 1);

  // Dimensiones del gráfico SVG
  const width = 320;
  const height = 160;
  const padding = 20;

  /**
   * Calcula la posición horizontal (X) para un índice de fase.
   * 
   * @function
   * @param {number} i - Índice de la fase (0-3)
   * @returns {number} Coordenada X en el gráfico
   */
  const getX = (i) =>
    padding + (i * (width - padding * 2)) / (fases.length - 1);

  /**
   * Calcula la posición vertical (Y) para un valor.
   * 
   * @function
   * @param {number} value - Valor a representar
   * @returns {number} Coordenada Y en el gráfico
   */
  const getY = (value) =>
    height - padding - (value / maxValue) * (height - padding * 2);

  /**
   * Convierte un array de datos en una cadena de puntos SVG.
   * 
   * @function
   * @param {Array<number>} data - Array de valores acumulados
   * @returns {string} Cadena de puntos en formato "x1,y1 x2,y2 ..."
   */
  const buildPoints = (data) =>
    data.map((v, i) => `${getX(i)},${getY(v)}`).join(" ");

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Presupuesto vs Gasto real (acumulado)</Text>

      <Svg width={width} height={height}>
        {/* Línea de presupuesto (verde) */}
        <Polyline
          points={buildPoints(presData)}
          fill="none"
          stroke="#22c55e"
          strokeWidth="2.5"
        />

        {/* Puntos de presupuesto */}
        {presData.map((v, i) => (
          <Circle
            key={`p-${i}`}
            cx={getX(i)}
            cy={getY(v)}
            r="3"
            fill="#22c55e"
          />
        ))}

        {/* Línea de gasto real (rojo) */}
        <Polyline
          points={buildPoints(realData)}
          fill="none"
          stroke="#ef4444"
          strokeWidth="2.5"
        />

        {/* Puntos de gasto real */}
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

      {/* Leyenda del gráfico */}
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