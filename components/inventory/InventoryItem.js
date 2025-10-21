// components/inventory/InventoryItem.js
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function InventoryItem({
  item,
  onEdit,
  onDelete,
  onMove,
  canEdit = false
}) {
  return (
    <View style={styles.container}>
      <View style={styles.info}>
        <Text style={styles.name}>{item.nombre}</Text>
        <Text style={styles.details}>
          Cantidad: {item.cantidad} {item.tipo_medida || 'Unidad'}
        </Text>
        {item.notas && (
          <Text style={styles.notes}>Notas: {item.notas}</Text>
        )}
        {item.ultimaModificacion && (
          <Text style={styles.timestamp}>
            Última modificación: {new Date(item.ultimaModificacion?.toDate?.() || item.ultimaModificacion).toLocaleDateString()}
          </Text>
        )}
      </View>

      {canEdit && (
        <View style={styles.actions}>
          {item.cantidad > 0 && (
            <TouchableOpacity style={styles.moveButton} onPress={onMove}>
              <Text style={styles.moveText}>Mover</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.editButton} onPress={onEdit}>
            <Text style={styles.editText}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
            <Text style={styles.deleteText}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 4,
  },
  details: {
    fontSize: 14,
    color: '#4A5568',
    marginBottom: 2,
  },
  notes: {
    fontSize: 14,
    color: '#718096',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#A0AEC0',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 12,
  },
  moveButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  moveText: {
    color: '#805AD5',
    fontWeight: '600',
    fontSize: 14,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editText: {
    color: '#D69E2E',
    fontWeight: '600',
    fontSize: 14,
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  deleteText: {
    color: '#E53E3E',
    fontWeight: '600',
    fontSize: 14,
  },
});