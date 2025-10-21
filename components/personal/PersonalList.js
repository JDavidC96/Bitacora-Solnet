// components/personal/PersonalList.js
import { FlatList, StyleSheet, Text, View } from 'react-native';
import PersonalItem from './PersonalItem';

export default function PersonalList({
  personnel = [],
  onItemPress,
  onItemLongPress,
  onDelete,
  role = "",
  loading = false,
  emptyMessage = "No hay personal registrado"
}) {
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando personal...</Text>
      </View>
    );
  }

  if (personnel.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={personnel}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <PersonalItem
          item={item}
          onPress={() => onItemPress(item)}
          onLongPress={() => onItemLongPress(item)}
          onDelete={() => onDelete(item)}
          role={role}
        />
      )}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    color: '#FFF',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    color: '#FFF',
    fontSize: 16,
    textAlign: 'center',
  },
});