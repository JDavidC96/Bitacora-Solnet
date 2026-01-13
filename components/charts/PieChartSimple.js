// components/charts/PieChartSimple.js
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

/**
 * Componente de gráfico circular (pie chart) simple para mostrar porcentajes.
 * Utiliza un anillo circular con un sistema de colores que cambia según el valor:
 * - Azul (<50%): #63B3ED
 * - Amarillo (50-89%): #ECC94B  
 * - Rojo (≥90%): #F56565
 * 
 * @component
 * @example
 * // Gráfico al 75% (color amarillo)
 * return <PieChartSimple percentage={75} />;
 * 
 * @example
 * // Gráfico personalizado más grande
 * return <PieChartSimple percentage={42} size={160} strokeWidth={18} />;
 * 
 * @param {Object} props - Propiedades del componente
 * @param {number} [props.percentage=0] - Porcentaje a mostrar (0-100)
 * @param {number} [props.size=120] - Tamaño del gráfico en píxeles (ancho y alto)
 * @param {number} [props.strokeWidth=14] - Grosor del anillo circular en píxeles
 * 
 * @returns {React.ReactElement} Gráfico circular SVG con porcentaje central
 */
export default function PieChartSimple({
  percentage = 0,
  size = 120,
  strokeWidth = 14,
}) {
  // Calcular radio del círculo restando el grosor del borde
  const radius = (size - strokeWidth) / 2;
  
  // Calcular circunferencia total del círculo
  const circumference = 2 * Math.PI * radius;
  
  // Calcular la longitud del arco visible según el porcentaje
  const progress = (percentage / 100) * circumference;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {/* Círculo de fondo (gris semi-transparente) */}
        <Circle
          stroke="rgba(255,255,255,0.15)"
          fill="none"
          cx={size / 2}  // Centro X
          cy={size / 2}  // Centro Y
          r={radius}
          strokeWidth={strokeWidth}
        />

        {/* Círculo de progreso (coloreado según porcentaje) */}
        <Circle
          stroke={getProgressColor(percentage)}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}       // Patrón de línea punteada (circunferencia total)
          strokeDashoffset={circumference - progress}  // Desplazamiento para mostrar el progreso
          strokeLinecap="round"                 // Extremos redondeados
          rotation="-90"                        // Rotación para comenzar desde arriba
          origin={`${size / 2}, ${size / 2}`}   // Punto de origen para la rotación
        />
      </Svg>

      {/* Texto del porcentaje superpuesto en el centro */}
      <View style={styles.center}>
        <Text style={styles.percent}>{percentage.toFixed(1)}%</Text>
      </View>
    </View>
  );
}

/**
 * Determina el color del progreso según el porcentaje.
 * Sistema de semáforo: azul (bajo), amarillo (medio), rojo (alto).
 * 
 * @function
 * @param {number} percentage - Porcentaje a evaluar (0-100)
 * @returns {string} Color hexadecimal para el anillo de progreso
 * 
 * @private
 */
function getProgressColor(percentage) {
  if (percentage < 50) {
    return "#63B3ED";  // Azul: por debajo del 50%
  } else if (percentage < 90) {
    return "#ECC94B";  // Amarillo: entre 50% y 89%
  } else {
    return "#F56565";  // Rojo: 90% o más
  }
}

const styles = StyleSheet.create({
  center: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  percent: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "700",
  },
});