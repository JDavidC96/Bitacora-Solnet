// components/inventory/SearchHeader.js 
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

export default function SearchHeader({
  searchQuery,
  onSearchChange,
  placeholder = "Buscar ..."
}) {
  const [localQuery, setLocalQuery] = useState(searchQuery);

  const handleSearchChange = (text) => {
    setLocalQuery(text);
    onSearchChange(text);
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder={placeholder}
        placeholderTextColor="#888"
        value={localQuery}
        onChangeText={handleSearchChange}
        clearButtonMode="while-editing"
      />
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