/**
 * COMPONENTE DE INPUT DE CONTRASEÑA CON VISUALIZACIÓN TOGGLE
 * 
 * Descripción:
 * Componente reutilizable para campos de entrada de contraseña con funcionalidad
 * de mostrar/ocultar el texto ingresado. Incluye ícono de ojo interactivo y
 * estilos personalizados para formularios de autenticación.
 * 
 * Características principales:
 * 1. Campo de texto seguro por defecto (secureTextEntry)
 * 2. Botón toggle para mostrar/ocultar contraseña
 * 3. Ícono visual que cambia según el estado (ojo/cerrado)
 * 4. Estilos predefinidos para formularios de login/registro
 * 5. Propiedades personalizables (placeholder, estilos, etc.)
 * 6. Deshabilitado de autocorrección y autocapitalización
 * 
 * Uso típico:
 * - Pantallas de LoginScreen
 * - Pantallas de RegisterScreen
 * - Formularios de cambio de contraseña
 * - Cualquier formulario que requiera entrada segura de contraseña
 * 
 * @component
 * @param {Object} props - Propiedades del componente
 * @param {string} props.value - Valor actual del input (controlado)
 * @param {Function} props.onChangeText - Función para manejar cambios de texto
 * @param {boolean} props.showPassword - Estado de visibilidad de contraseña
 * @param {Function} props.onToggleShowPassword - Función para alternar visibilidad
 * @param {string} [props.placeholder="Contraseña"] - Texto de placeholder
 * @param {Object} [props.style={}] - Estilos adicionales para el contenedor
 * @returns {JSX.Element} Componente de input de contraseña renderizado
 * 
 * @example
 * <PasswordInput
 *   value={password}
 *   onChangeText={setPassword}
 *   showPassword={showPassword}
 *   onToggleShowPassword={() => setShowPassword(!showPassword)}
 *   placeholder="Ingresa tu contraseña"
 *   style={{ marginBottom: 20 }}
 * />
 */

// Importaciones de React Native y librerías
import { Ionicons } from '@expo/vector-icons'; // Íconos de Expo
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

/**
 * Componente de input de contraseña con toggle de visibilidad
 * 
 * @function PasswordInput
 * @param {Object} props - Propiedades del componente
 * @param {string} props.value - Valor actual del campo
 * @param {Function} props.onChangeText - Manejador de cambios
 * @param {boolean} props.showPassword - Si la contraseña es visible
 * @param {Function} props.onToggleShowPassword - Alternar visibilidad
 * @param {string} props.placeholder - Texto de placeholder (opcional)
 * @param {Object} props.style - Estilos adicionales (opcional)
 * @returns {JSX.Element} Componente renderizado
 */
export default function PasswordInput({
  value,
  onChangeText,
  showPassword,
  onToggleShowPassword,
  placeholder = "Contraseña", // Valor por defecto
  style = {}                  // Objeto vacío por defecto
}) {
  return (
    /**
     * Contenedor principal que agrupa el input y el botón
     * Acepta estilos adicionales a través de la prop style
     */
    <View style={[styles.passwordContainer, style]}>
      {/* Campo de texto para entrada de contraseña */}
      <TextInput
        placeholder={placeholder}
        value={value}
        placeholderTextColor="#AAA" // Gris claro para placeholder
        style={styles.passwordInput}
        onChangeText={onChangeText}
        
        // Propiedad clave: alterna entre texto seguro y visible
        secureTextEntry={!showPassword}
        
        // Configuración de comportamiento del teclado
        autoCapitalize="none"     // No capitalizar automáticamente
        autoCorrect={false}       // Deshabilitar autocorrección
      />
      
      {/* Botón para alternar visibilidad de la contraseña */}
      <TouchableOpacity 
        onPress={onToggleShowPassword}
        style={styles.eyeButton}
        accessible={true}
        accessibilityLabel={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
        accessibilityRole="button"
      >
        {/* Ícono que cambia según el estado de visibilidad */}
        <Ionicons
          name={showPassword ? 'eye-off' : 'eye'}
          size={24}
          color="#AAA"
        />
      </TouchableOpacity>
    </View>
  );
}

// ==================== ESTILOS DEL COMPONENTE ====================

/**
 * Estilos del componente
 * Utiliza una paleta de colores oscura para formularios de autenticación
 * 
 * @constant {Object} styles
 */
const styles = StyleSheet.create({
  /**
   * Contenedor principal del input de contraseña
   * Utiliza flexbox para alinear input y botón horizontalmente
   */
  passwordContainer: {
    flexDirection: 'row',           // Alineación horizontal
    alignItems: 'center',           // Centrado vertical
    backgroundColor: '#2C2C3A',     // Fondo oscuro
    borderRadius: 12,               // Bordes redondeados
    marginBottom: 16,               // Espaciado inferior
    borderWidth: 1,                 // Borde sutil
    borderColor: '#3A3A4A',         // Color del borde (gris oscuro)
  },
  
  /**
   * Estilo del campo de texto de entrada
   * Ocupa todo el espacio disponible excepto el del botón
   */
  passwordInput: {
    flex: 1,                        // Ocupa espacio disponible
    color: '#FFF',                  // Texto blanco para contraste
    paddingVertical: 16,            // Padding vertical generoso
    paddingHorizontal: 16,          // Padding horizontal
    fontSize: 16,                   // Tamaño de fuente legible
  },
  
  /**
   * Botón del ícono de ojo
   * Espaciado generoso para mejor usabilidad táctil
   */
  eyeButton: {
    padding: 16,                    // Área táctil amplia
  },
});