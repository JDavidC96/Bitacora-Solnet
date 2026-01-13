// components/inventory/SearchHeader.js 
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

/**
 * Componente de cabecera de búsqueda para inventario
 * Proporciona un campo de búsqueda con sugerencia de uso y manejo de estado local
 * 
 * @component
 * @param {Object} props - Propiedades del componente
 * @param {string} props.searchQuery - Valor actual de la búsqueda (controlado externamente)
 * @param {Function} props.onSearchChange - Función que se ejecuta al cambiar el texto de búsqueda
 * @param {string} [props.placeholder="Buscar ..."] - Texto del placeholder del input
 * @returns {JSX.Element} Cabecera con campo de búsqueda y sugerencia de uso
 * 
 * @example
 * // Uso básico
 * <SearchHeader
 *   searchQuery={searchText}
 *   onSearchChange={setSearchText}
 * />
 * 
 * @example
 * // Con placeholder personalizado
 * <SearchHeader
 *   searchQuery={filter}
 *   onSearchChange={handleSearch}
 *   placeholder="Buscar material..."
 * />
 */
export default function SearchHeader({
  searchQuery,
  onSearchChange,
  placeholder = "Buscar ..."
}) {
  // Estado local para manejar el valor del input de forma controlada
  const [localQuery, setLocalQuery] = useState(searchQuery);

  /**
   * Maneja el cambio en el campo de búsqueda
   * Actualiza el estado local y notifica al componente padre
   * 
   * @function handleSearchChange
   * @param {string} text - Texto ingresado en el campo de búsqueda
   */
  const handleSearchChange = (text) => {
    setLocalQuery(text);
    onSearchChange(text);
  };

  return (
    <View style={styles.container}>
      {/* Campo de entrada de búsqueda */}
      <TextInput
        style={styles.searchInput}
        placeholder={placeholder}
        placeholderTextColor="#888"
        value={localQuery}
        onChangeText={handleSearchChange}
        clearButtonMode="while-editing"
      />
      {/* Sugerencia de uso para el usuario */}
      <Text style={styles.hintText}>
        💡 Puedes buscar por nombre del material o código/SKU
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    color: '#000',
    borderWidth: 1,
    borderColor: '#DDD',
  },
  hintText: {
    color: '#FFF',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
    opacity: 0.8,
  },
});