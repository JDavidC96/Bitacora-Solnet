// components/notes/NotesHistory.js
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function NotesHistory({ 
  notes = [], 
  loading = false, 
  onEditNote,
  projectId 
}) {
  const router = useRouter();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando notas...</Text>
      </View>
    );
  }

  if (notes.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No hay entradas aún.</Text>
        <Text style={styles.emptySubtext}>
          Sé el primero en escribir en esta bitácora
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.historyTitle}>Historial de entradas:</Text>
      
      {notes.map((entry, idx) => (
        <TouchableOpacity
          key={entry.id}
          style={styles.entryItem}
          onLongPress={() => onEditNote(entry, idx)}
          delayLongPress={500}
        >
          <Text style={styles.entryDate}>{entry.fecha}</Text>
          <Text style={styles.entryText}>
            {entry.texto ? entry.texto : "(Vacía)"} 
            {" — "}✍️ {entry.autor || "Anónimo"}
          </Text>

          {entry.imagenes && entry.imagenes.length > 0 && (
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/ImageViewerScreen",
                  params: { urls: entry.imagenes.join(",") },
                })
              }
            >
              <Text style={styles.imagesLink}>
                📎 Ver {entry.imagenes.length} imagen(es)
              </Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 18,
    color: '#FFF',
    marginBottom: 12,
    fontWeight: '600',
  },
  entryItem: {
    backgroundColor: '#2C2C3A',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  entryDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 6,
  },
  entryText: {
    fontSize: 14,
    color: '#FFF',
    lineHeight: 20,
  },
  imagesLink: {
    color: "#63B3ED",
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
});