// components/personal/PersonalForm.js
import { useState } from 'react';
import { Alert, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

export default function PersonalForm({ 
  visible, 
  onSave, 
  onCancel 
}) {
  const [form, setForm] = useState({
    nombre: "",
    cargo: ""
  });

  const handleSave = () => {
    if (!form.nombre.trim() || !form.cargo.trim()) {
      Alert.alert("Error", "Debes ingresar nombre y cargo");
      return;
    }
    onSave(form);
    setForm({ nombre: "", cargo: "" });
  };

  const handleCancel = () => {
    setForm({ nombre: "", cargo: "" });
    onCancel();
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Nombre"
        placeholderTextColor="#AAA"
        value={form.nombre}
        onChangeText={(text) => setForm(prev => ({ ...prev, nombre: text }))}
      />
      <TextInput
        style={styles.input}
        placeholder="Cargo"
        placeholderTextColor="#AAA"
        value={form.cargo}
        onChangeText={(text) => setForm(prev => ({ ...prev, cargo: text }))}
      />
      <TouchableOpacity style={styles.button} onPress={handleSave}>
        <Text style={styles.buttonText}>✅ Guardar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#2C2C3A",
    padding: 16,
    borderRadius: 10,
    marginBottom: 20,
  },
  input: {
    backgroundColor: "#1E1E2F",
    color: "#FFF",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#38B2AC",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: { 
    color: "#FFF", 
    fontSize: 16, 
    fontWeight: "bold" 
  },
});