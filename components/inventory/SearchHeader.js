// components/inventory/SearchHeader.js
import { StyleSheet, TextInput, View } from 'react-native';

export default function SearchHeader({
  searchQuery,
  onSearchChange,
  placeholder = "Buscar..."
}) {
  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder={placeholder}
        placeholderTextColor="#AAA"
        value={searchQuery}
        onChangeText={onSearchChange}
      />
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
  },
});