// components/inventory/HistoryFilters.js
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

/**
 * Definición de opciones de filtro disponibles para el historial
 * @constant {Array<Object>}
 */
const FILTER_OPTIONS = [
  { key: 'all', label: 'Todos' },
  { key: 'entrada', label: 'Entradas' },
  { key: 'salida', label: 'Salidas' },
  { key: 'movimiento', label: 'Movimientos' },
  { key: 'edición', label: 'Ediciones' }
];

/**
 * Componente de filtros para el historial de movimientos de inventario
 * Permite filtrar por tipo de movimiento (entradas, salidas, movimientos, ediciones)
 * 
 * @component
 * @param {Object} props - Propiedades del componente
 * @param {string} props.selectedFilter - Filtro actualmente seleccionado
 * @param {Function} props.onFilterChange - Función que se ejecuta al cambiar el filtro
 * @returns {JSX.Element} Componente de filtros con botones seleccionables
 * 
 * @example
 * // Uso básico
 * <HistoryFilters
 *   selectedFilter={currentFilter}
 *   onFilterChange={(filterKey) => setCurrentFilter(filterKey)}
 * />
 * 
 * @example
 * // Integración con estado
 * const [filter, setFilter] = useState('all');
 * <HistoryFilters
 *   selectedFilter={filter}
 *   onFilterChange={setFilter}
 * />
 */
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