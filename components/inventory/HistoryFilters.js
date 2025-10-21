// components/inventory/HistoryFilters.js
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const FILTER_OPTIONS = [
  { key: 'all', label: 'Todos' },
  { key: 'entrada', label: 'Entradas' },
  { key: 'salida', label: 'Salidas' },
  { key: 'movimiento', label: 'Movimientos' },
  { key: 'edición', label: 'Ediciones' }
];

export default function HistoryFilters({ selectedFilter, onFilterChange }) {
  return (
    <View style={styles.container}>
      {FILTER_OPTIONS.map((filter) => (
        <TouchableOpacity
          key={filter.key}
          style={[
            styles.filterButton,
            selectedFilter === filter.key && styles.filterButtonActive
          ]}
          onPress={() => onFilterChange(filter.key)}
        >
          <Text style={[
            styles.filterText,
            selectedFilter === filter.key && styles.filterTextActive
          ]}>
            {filter.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    backgroundColor: 'rgba(44,44,58,0.7)',
    padding: 8,
    borderRadius: 12,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  filterButtonActive: {
    backgroundColor: '#3182CE',
  },
  filterText: {
    color: '#CCC',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  filterTextActive: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});