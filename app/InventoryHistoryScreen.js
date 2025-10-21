// app/inventory-history.js
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Hooks
import { useInventoryHistory } from '../hooks/useInventoryHistory';

// Componentes
import HistoryFilters from '../components/inventory/HistoryFilters';
import HistoryItem from '../components/inventory/HistoryItem';
import SearchHeader from '../components/inventory/SearchHeader';

export default function InventoryHistoryScreen() {
  const router = useRouter();
  const { movements, loading, error, refreshHistory } = useInventoryHistory();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  // Filtrar y ORDENAR movimientos por fecha (más reciente primero)
  const filteredMovements = movements
    .filter(movement => {
      const matchesSearch = 
        movement.material?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        movement.usuario?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        movement.tipo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        movement.origen?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        movement.destino?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        movement.notas?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        movement.procedencia?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter = selectedFilter === 'all' || movement.tipo === selectedFilter;

      return matchesSearch && matchesFilter;
    })
    // ORDENAR por fecha más reciente primero
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshHistory();
    setRefreshing(false);
  };

  const getMovementStats = () => {
    const total = movements.length;
    const entradas = movements.filter(m => m.tipo === 'entrada').length;
    const salidas = movements.filter(m => m.tipo === 'salida').length;
    const movimientos = movements.filter(m => m.tipo === 'movimiento').length;
    const ediciones = movements.filter(m => m.tipo === 'edición').length;

    return { total, entradas, salidas, movimientos, ediciones };
  };

  const stats = getMovementStats();

  // Función para obtener el color según el tipo de movimiento
  const getStatColor = (type) => {
    switch (type) {
      case 'entrada': return '#38A169';
      case 'salida': return '#E53E3E';
      case 'movimiento': return '#3182CE';
      case 'edición': return '#D69E2E';
      default: return '#718096';
    }
  };

  if (error) {
    return (
      <LinearGradient colors={["#38A169", "#48BB78", "#81E6D9"]} style={{ flex: 1 }}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error cargando historial</Text>
          <Text style={styles.errorSubtext}>{error.message}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refreshHistory}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#38A169", "#48BB78", "#81E6D9"]} style={{ flex: 1 }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>← Volver</Text>
          </TouchableOpacity>
          <Text style={styles.title}>📋 Historial de Movimientos</Text>
        </View>
        
        {/* Barra de búsqueda */}
        <SearchHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          placeholder="Buscar en historial..."
        />

        {/* Filtros - Agregar filtro para ediciones */}
        <HistoryFilters
          selectedFilter={selectedFilter}
          onFilterChange={setSelectedFilter}
          showEditFilter={true}
        />

        {/* Estadísticas - Agregar estadística para ediciones */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={[styles.statItem, { borderLeftColor: getStatColor('entrada') }]}>
            <Text style={styles.statNumber}>{stats.entradas}</Text>
            <Text style={styles.statLabel}>Entradas</Text>
          </View>
          <View style={[styles.statItem, { borderLeftColor: getStatColor('salida') }]}>
            <Text style={styles.statNumber}>{stats.salidas}</Text>
            <Text style={styles.statLabel}>Salidas</Text>
          </View>
          <View style={[styles.statItem, { borderLeftColor: getStatColor('movimiento') }]}>
            <Text style={styles.statNumber}>{stats.movimientos}</Text>
            <Text style={styles.statLabel}>Movimientos</Text>
          </View>
          <View style={[styles.statItem, { borderLeftColor: getStatColor('edición') }]}>
            <Text style={styles.statNumber}>{stats.ediciones}</Text>
            <Text style={styles.statLabel}>Ediciones</Text>
          </View>
        </View>

        {/* Información adicional */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            💡 Ahora se registran: Procedencia del material y cambios de cantidad
          </Text>
        </View>

        {/* Lista de movimientos */}
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Cargando historial...</Text>
          </View>
        ) : filteredMovements.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery || selectedFilter !== 'all' 
                ? 'No se encontraron movimientos' 
                : 'No hay movimientos registrados'
              }
            </Text>
            {(searchQuery || selectedFilter !== 'all') && (
              <Text style={styles.emptySubtext}>
                Intenta con otros términos de búsqueda o filtros
              </Text>
            )}
          </View>
        ) : (
          <FlatList
            data={filteredMovements}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <HistoryItem movement={item} />}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={["#38A169"]}
                tintColor="#38A169"
              />
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(44,44,58,0.7)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    borderLeftWidth: 2,
    borderLeftColor: '#718096',
    paddingHorizontal: 4,
  },
  statNumber: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statLabel: {
    color: '#CCC',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  infoContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#D69E2E',
  },
  infoText: {
    color: '#FFF',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  listContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFF',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    color: '#FFF',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
  },
  emptySubtext: {
    color: '#CCC',
    fontSize: 14,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#F56565',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    color: '#CCC',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#5A67D8',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});