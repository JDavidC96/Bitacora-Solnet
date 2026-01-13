// components/charts/FaseKpiCard.js
import { StyleSheet, Text, View } from "react-native";
import ProgressBar from "./ProgressBar";

/**
 * Tarjeta de KPI para mostrar métricas financieras de una fase específica del proyecto.
 * Presenta presupuesto, gasto real, diferencia y porcentaje de ejecución en un formato
 * visual claro con colores que indican el estado de la ejecución presupuestal.
 * 
 * @component
 * @example
 * return (
 *   <FaseKpiCard
 *     title="Fase 1: Diseño"
 *     presupuesto={25000000}
 *     real={23000000}
 *   />
 * );
 * 
 * @example
 * // Ejemplo con sobrecosto
 * return (
 *   <FaseKpiCard
 *     title="Fase 2: Desarrollo"
 *     presupuesto={50000000}
 *     real={55000000}
 *   />
 * );
 * 
 * @param {Object} props - Propiedades del componente
 * @param {string} props.title - Título de la fase (ej: "Fase 1: Diseño")
 * @param {number} props.presupuesto - Monto presupuestado para la fase
 * @param {number} props.real - Monto real gastado en la fase
 * 
 * @returns {React.ReactElement} Tarjeta de KPI con métricas de la fase
 * 
 * @see ProgressBar Componente de barra de progreso utilizado para mostrar el porcentaje de ejecución
 */
export default function FaseKpiCard({ title, presupuesto, real }) {
  // Calcular diferencia entre presupuesto y gasto real
  const diferencia = presupuesto - real;
  
  // Calcular porcentaje de ejecución (evita división por cero)
  const ejecucion = presupuesto > 0 ? (real / presupuesto) * 100 : 0;

  return (
    <View style={styles.card}>
      {/* Título de la fase */}
      <Text style={styles.title}>{title}</Text>

      {/* Fila: Presupuesto asignado */}
      <View style={styles.row}>
        <Text style={styles.label}>Presupuesto:</Text>
        <Text style={styles.value}>${presupuesto.toLocaleString("es-CO")}</Text>
      </View>

      {/* Fila: Gasto real acumulado */}
      <View style={styles.row}>
        <Text style={styles.label}>Gasto real:</Text>
        <Text style={styles.value}>${real.toLocaleString("es-CO")}</Text>
      </View>

      {/* Fila: Diferencia (ahorro o sobrecosto) */}
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

      {/* Barra de progreso que muestra el porcentaje de ejecución */}
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
  label: { 
    color: "#CBD5E0" 
  },
  value: { 
    color: "#E2E8F0", 
    fontWeight: "600" 
  },
  positive: { 
    color: "#68D391" // Verde para diferencia positiva (ahorro)
  },
  negative: { 
    color: "#F56565"  // Rojo para diferencia negativa (sobrecosto)
  },
});