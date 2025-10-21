// components/auth/PasswordInput.js
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

export default function PasswordInput({
  value,
  onChangeText,
  showPassword,
  onToggleShowPassword,
  placeholder = "Contraseña",
  style = {}
}) {
  return (
    <View style={[styles.passwordContainer, style]}>
      <TextInput
        placeholder={placeholder}
        value={value}
        placeholderTextColor="#AAA"
        style={styles.passwordInput}
        onChangeText={onChangeText}
        secureTextEntry={!showPassword}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TouchableOpacity 
        onPress={onToggleShowPassword}
        style={styles.eyeButton}
      >
        <Ionicons
          name={showPassword ? 'eye-off' : 'eye'}
          size={24}
          color="#AAA"
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C3A',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3A3A4A',
  },
  passwordInput: {
    flex: 1,
    color: '#FFF',
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  eyeButton: {
    padding: 16,
  },
});