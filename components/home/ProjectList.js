// components/home/ProjectList.js
import { FlatList, StyleSheet, Text, View } from "react-native";
import ProjectCard from "./ProjectCard";

export default function ProjectList({
  projects,
  personal,
  viewerRole,
  viewerPersonalId,
  canManage,
  onProjectPress,
  onProjectLongPress,
  onLiberarPersona,
  loading = false,
}) {
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando proyectos...</Text>
      </View>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No hay proyectos creados</Text>
        <Text style={styles.emptySubtext}>
          {canManage
            ? "Presiona el botón ＋ para crear tu primer proyecto"
            : "Contacta al administrador para crear nuevos proyectos"}
        </Text>
      </View>
    );
  }

  const renderItem = ({ item }) => (
    <ProjectCard
      item={item}
      personal={personal}
      viewerRole={viewerRole}
      viewerPersonalId={viewerPersonalId}
      canManage={canManage}
      onPress={onProjectPress}
      onLongPress={onProjectLongPress}
      onLiberarPersona={onLiberarPersona}
    />
  );

  const keyExtractor = (item, index) => {
    if (item.idDoc) return item.idDoc;
    if (item.id) return item.id;
    if (item.title) return `${item.title}-${index}`;
    return `project-${index}`;
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={projects}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingBottom: 120 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: { color: "#4B5563", fontSize: 15 },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
    paddingHorizontal: 24,
  },
  emptyText: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtext: { color: "#6B7280", fontSize: 14, textAlign: "center" },
});
