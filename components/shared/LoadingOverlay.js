// components/shared/LoadingOverlay.js

import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

export default function LoadingOverlay({ message = "Cargando..." }) {
  return (
    <View style={styles.overlay}>
      <View style={styles.box}>
        <ActivityIndicator size="large" color="#FBBF24" />
        <Text style={styles.text}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  box: {
    backgroundColor: "#0F172A",
    paddingVertical: 24,
    paddingHorizontal: 30,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  text: {
    marginTop: 12,
    color: "#F1F5F9",
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
  },
});
