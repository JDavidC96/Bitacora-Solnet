// components/personal/PersonalHeader.js
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function PersonalHeader({ 
  role, 
  showForm, 
  onToggleForm, 
  onNavigateHistory 
}) {
  const isAdmin = role === "Administrador";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gestión de Personal</Text>

      {isAdmin && (
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: showForm ? "#E53E3E" : "#38B2AC" },
          ]}
          onPress={onToggleForm}
        >
          <Text style={styles.buttonText}>
            {showForm ? "❌ Cancelar" : "➕ Crear Persona"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    color: "#FFF",
    marginBottom: 12,
    fontWeight: "bold",
    textAlign: "center",
  },
  button: {
    backgroundColor: "#38B2AC",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
  },
  buttonText: { 
    color: "#FFF", 
    fontSize: 16, 
    fontWeight: "bold" 
  },
});