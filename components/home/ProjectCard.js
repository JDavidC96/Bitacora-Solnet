// components/home/ProjectCard.js (versión sin alarma de retraso)
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ProjectCard({ 
  item, 
  personal, 
  canManage, 
  onPress, 
  onLongPress,
  onLiberarPersona 
}) {
  const asignados = personal.filter(p => p.proyectoAsignado === item.title);
  const progressPercent = Math.round((item.progress || 0) * 100);
  const isDone = progressPercent >= 100;

  const handleLocationPress = () => {
    if (!item.ubicacion) return;
    
    const url = item.ubicacion.startsWith("http")
      ? item.ubicacion
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.ubicacion)}`;
    
    Linking.openURL(url).catch(err => 
      console.error('Error abriendo ubicación:', err)
    );
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(item)}
      onLongPress={() => onLongPress(item)}
      delayLongPress={300}
    >
      {/* Nombre del proyecto */}
      <Text style={styles.cardText}>
        {item.title ? item.title : "(Sin nombre)"}
      </Text>

      {/* Estado del proyecto */}
      <View style={styles.statusContainer}>
        <View
          style={[
            styles.statusIndicator,
            { backgroundColor: item.retrasada ? "#E53E3E" : "#22c55e" }
          ]}
        />
        <Text style={styles.statusText}>
          {item.retrasada ? "Con retrasos" : "Al día"}
        </Text>
      </View>

      {/* Badge de finalizado */}
      {isDone && (
        <Text style={styles.doneBadge}>✅ Finalizado</Text>
      )}

      {/* Fecha de inicio */}
      {item.startDate ? (
        <Text style={styles.dateText}>
          📅 {new Date(item.startDate).toLocaleDateString()}
        </Text>
      ) : (
        <Text style={styles.dateText}>📅 (Sin fecha)</Text>
      )}

      {/* Ubicación */}
      {item.ubicacion ? (
        <Text
          style={styles.locationText}
          onPress={handleLocationPress}
        >
          📍 {item.ubicacion}
        </Text>
      ) : (
        <Text style={styles.dateText}>📍 (Sin ubicación)</Text>
      )}

      {/* Barra de progreso */}
      <View style={styles.progressBar}>
        <View 
          style={[
            styles.progressFill, 
            { width: `${(item.progress || 0) * 100}%` }
          ]} 
        />
      </View>
      <Text style={styles.progressText}>
        {progressPercent}% completado
      </Text>

      {/* Personal asignado */}
      <View style={styles.personalContainer}>
        <Text style={styles.personalTitle}>
          👥 Personal asignado:
        </Text>
        {asignados.length > 0 ? (
          asignados.map(p => (
            <View key={p.id} style={styles.personaItem}>
              <Text style={styles.personaText}>
                • {p.nombre} ({p.cargo})
              </Text>
              {canManage && (
                <TouchableOpacity
                  onPress={() => onLiberarPersona(p)}
                  style={styles.liberarButton}
                >
                  <Text style={styles.liberarText}>✖</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        ) : (
          <Text style={styles.sinPersonal}>Sin personal asignado</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#2C2C3Aaa',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
  },
  cardText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  statusText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },
  doneBadge: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  dateText: {
    color: '#DDD',
    fontSize: 14,
    marginBottom: 4,
  },
  locationText: {
    color: '#4DA6FF',
    fontSize: 14,
    marginBottom: 8,
    textDecorationLine: 'underline',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#444',
    borderRadius: 5,
    marginBottom: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#48BB78',
    borderRadius: 5,
  },
  progressText: {
    color: '#FFF',
    fontSize: 12,
    marginBottom: 8,
  },
  personalContainer: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#444',
    paddingTop: 8,
  },
  personalTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  personaItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 4,
  },
  personaText: {
    color: '#DDD',
    fontSize: 14,
    flex: 1,
  },
  liberarButton: {
    padding: 4,
    borderRadius: 4,
  },
  liberarText: {
    color: "#E53E3E",
    fontSize: 16,
    fontWeight: "bold",
  },
  sinPersonal: {
    color: '#AAA',
    fontSize: 14,
    fontStyle: 'italic',
  },
});