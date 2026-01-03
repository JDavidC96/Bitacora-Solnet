// components/charts/PieChartSimple.js
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

export default function PieChartSimple({
  percentage = 0,
  size = 120,
  strokeWidth = 14,
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const progress = (percentage / 100) * circumference;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {/* Fondo */}
        <Circle
          stroke="rgba(255,255,255,0.15)"
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />

        {/* Progreso */}
        <Circle
          stroke={percentage < 50 ? "#63B3ED" : percentage < 90 ? "#ECC94B" : "#F56565"}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>

      {/* Texto central */}
      <View style={styles.center}>
        <Text style={styles.percent}>{percentage.toFixed(1)}%</Text>
      </View>
    </View>
  );
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
