// components/charts/ProgressBar.js
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

export default function ProgressBar({ value = 0, height = 12 }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value,
      duration: 700,
      useNativeDriver: false,
    }).start();
  }, [value]);

  const widthInterpolated = anim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  const getColor = () => {
    if (value < 50) return "#63B3ED"; // azul suave
    if (value < 90) return "#ECC94B"; // amarillo
    return "#F56565"; // rojo (alerta)
  };

  return (
    <View style={[styles.container, { height }]}>
      <Animated.View
        style={[
          styles.bar,
          {
            width: widthInterpolated,
            backgroundColor: getColor(),
          },
        ]}
      />
      <Text style={styles.label}>{value.toFixed(1)}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
    overflow: "hidden",
    marginVertical: 6,
    position: "relative",
  },
  bar: {
    height: "100%",
    borderRadius: 10,
  },
  label: {
    position: "absolute",
    right: 8,
    top: -2,
    color: "#FFF",
    fontWeight: "600",
    fontSize: 12,
  },
});
