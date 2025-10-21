// components/inventory/HistoryItem.js
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { StyleSheet, Text, View } from 'react-native';

export default function HistoryItem({ movement }) {
  // Función para obtener el icono según el tipo
  const getTypeIcon = (type) => {
    switch (type) {
      case 'entrada': return '📥';
      case 'salida': return '📤';
      case 'movimiento': return '🔄';
      case 'edición': return '✏️';
      default: return '📋';
    }
  };

  // Función para obtener el color según el tipo
  const getTypeColor = (type) => {
    switch (type) {
      case 'entrada': return '#38A169';
      case 'salida': return '#E53E3E';
      case 'movimiento': return '#3182CE';
      case 'edición': return '#D69E2E';
      default: return '#718096';
    }
  };

  // Formatear fecha
  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: es });
    } catch {
      return 'Fecha inválida';
    }
  };

  // Renderizar información específica según el tipo
  const renderSpecificInfo = () => {
    switch (movement.tipo) {
      case 'edición':
        return (
          <View style={styles.specificInfo}>
            <Text style={styles.specificText}>
              <Text style={styles.label}>Cambio: </Text>
              {movement.cantidadAnterior || 'N/A'} → {movement.cantidad}
            </Text>
            {movement.campoEditado && (
              <Text style={styles.specificText}>
                <Text style={styles.label}>Campo: </Text>
                {movement.campoEditado}
              </Text>
            )}
          </View>
        );
      
      case 'entrada':
        return (
          <View style={styles.specificInfo}>
            <Text style={styles.specificText}>
              <Text style={styles.label}>Procedencia: </Text>
              {movement.procedencia || movement.origen || 'N/A'}
            </Text>
          </View>
        );
      
      case 'movimiento':
        return (
          <View style={styles.specificInfo}>
            <Text style={styles.specificText}>
              <Text style={styles.label}>De: </Text>
              {movement.origen}
            </Text>
            <Text style={styles.specificText}>
              <Text style={styles.label}>A: </Text>
              {movement.destino}
            </Text>
          </View>
        );
      
      default:
        return (
          <View style={styles.specificInfo}>
            <Text style={styles.specificText}>
              <Text style={styles.label}>Ubicación: </Text>
              {movement.origen}
            </Text>
          </View>
        );
    }
  };

  return (
    <View style={[styles.container, { borderLeftColor: getTypeColor(movement.tipo) }]}>
      {/* Header con tipo y fecha */}
      <View style={styles.header}>
        <View style={styles.typeContainer}>
          <Text style={styles.typeIcon}>{getTypeIcon(movement.tipo)}</Text>
          <Text style={[styles.typeText, { color: getTypeColor(movement.tipo) }]}>
            {movement.tipo?.toUpperCase()}
          </Text>
        </View>
        <Text style={styles.date}>{formatDate(movement.fecha)}</Text>
      </View>

      {/* Información principal */}
      <View style={styles.mainInfo}>
        <Text style={styles.material}>{movement.material}</Text>
        <Text style={styles.quantity}>
          Cantidad: <Text style={styles.quantityValue}>{movement.cantidad}</Text>
        </Text>
      </View>

      {/* Información específica según tipo */}
      {renderSpecificInfo()}

      {/* Información adicional */}
      <View style={styles.additionalInfo}>
        <Text style={styles.user}>
          👤 {movement.usuario}
        </Text>
        {movement.notas && (
          <Text style={styles.notes}>
            📝 {movement.notas}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#718096',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  typeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  date: {
    fontSize: 12,
    color: '#666',
  },
  mainInfo: {
    marginBottom: 8,
  },
  material: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 4,
  },
  quantity: {
    fontSize: 14,
    color: '#4A5568',
  },
  quantityValue: {
    fontWeight: 'bold',
    color: '#2D3748',
  },
  specificInfo: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  specificText: {
    fontSize: 12,
    color: '#4A5568',
    marginBottom: 2,
  },
  label: {
    fontWeight: 'bold',
    color: '#2D3748',
  },
  additionalInfo: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
  },
  user: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 4,
  },
  notes: {
    fontSize: 12,
    color: '#718096',
    fontStyle: 'italic',
  },
});