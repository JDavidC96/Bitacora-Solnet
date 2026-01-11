// components/home/ProjectCard.js
import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import formatPowerKw from "../../utils/formatPower";

export default function ProjectCard({
  item,
  personal,
  viewerRole,
  viewerPersonalId,
  canManage,
  onPress,
  onLongPress,
  onLiberarPersona,
}) {
  const isTechOrSup = ["Tecnico", "Supervisor"].includes(viewerRole);
  const isAdminOrEng = ["Administrador", "Ingeniero"].includes(viewerRole);

  const asignadosAll = (personal || []).filter((p) => p.proyectoAsignado === item.title);

  // Si es técnico/supervisor, solo mostrar "yo"
  const asignados = isTechOrSup
    ? asignadosAll.filter((p) => p.id === viewerPersonalId)
    : asignadosAll;

  const progressPercent = Math.round((item.progress || 0) * 100);
  const isDone = progressPercent >= 100;

  const canViewUtility = ["Administrador", "Administrativo"].includes(viewerRole);
  const utility = item.utility || 0;

  const potenciaAcKw = Number(
    item?.potenciaAcKw ??
      item?.potenciaACKw ??
      item?.potenciaAC ??
      item?.potenciaAc ??
      0
  );

  const potenciaDcKw = Number(
    item?.potenciaDcKw ??
      item?.potenciaDCKw ??
      item?.potenciaDC ??
      item?.potenciaDc ??
      item?.potenciaDcTotalKw ??
      0
  );

  const paneles = Number(
    item?.panelesInstalados ??
      item?.paneles ??
      item?.cantidadPaneles ??
      0
  );

  const handleLocationPress = () => {
    if (!item.ubicacion) return;

    const url = item.ubicacion.startsWith("http")
      ? item.ubicacion
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          item.ubicacion
        )}`;

    Linking.openURL(url).catch((err) => console.error("Error abriendo ubicación:", err));
  };

  const statusColor = item.retrasada ? "#F97373" : isDone ? "#34D399" : "#FACC15";
  const statusLabel = isDone ? "Finalizado" : item.retrasada ? "Con retrasos" : "Al día";

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(item)}
      onLongPress={() => onLongPress(item)}
      delayLongPress={300}
    >
      <View style={styles.headerRow}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={styles.projectTitle}>{item.title ? item.title : "(Sin nombre)"}</Text>

          {item.startDate ? (
            <Text style={styles.projectDate}>📅 {new Date(item.startDate).toLocaleDateString()}</Text>
          ) : (
            <Text style={styles.projectDate}>📅 (Sin fecha)</Text>
          )}

          {potenciaAcKw > 0 && (
            <Text style={styles.projectKw}>
              ⚡ {formatPowerKw(potenciaAcKw, { suffix: "AC" })}
            </Text>
          )}

          {potenciaDcKw > 0 && (
            <Text style={styles.projectKw2}>
              🔋 {formatPowerKw(potenciaDcKw, { suffix: "DC" })}
            </Text>
          )}

          {paneles > 0 && (
            <Text style={styles.projectPanels}>
              🧩 {paneles.toLocaleString("es-CO")} panel{paneles !== 1 ? "es" : ""}
            </Text>
          )}
        </View>

        <View
          style={[
            styles.statusBadge,
            { backgroundColor: `${statusColor}33`, borderColor: statusColor },
          ]}
        >
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      <View style={styles.rowBetween}>
        {item.ubicacion ? (
          <Text style={styles.locationText} onPress={handleLocationPress} numberOfLines={1}>
            📍 {item.ubicacion}
          </Text>
        ) : (
          <Text style={styles.locationPlaceholder}>📍 (Sin ubicación)</Text>
        )}

        {canViewUtility && utility > 0 && (
          <View style={styles.utilityBadge}>
            <Text style={styles.utilityLabel}>Utilidad</Text>
            <Text style={styles.utilityValue}>${utility.toLocaleString()}</Text>
          </View>
        )}
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${progressPercent}%`,
                backgroundColor: isDone ? "#22C55E" : "#3B82F6",
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>{progressPercent}% completado</Text>
      </View>

      {(item.totalTareas || item.totalMantenimientos || item.tareasNoAplica) && (
        <View style={styles.tasksRow}>
          {typeof item.totalTareas === "number" && (
            <Text style={styles.tasksPill}>
              Tareas: {item.tareasCumplidas || 0}/{item.totalTareas}
            </Text>
          )}
          {typeof item.totalMantenimientos === "number" && (
            <Text style={styles.tasksPillSecondary}>
              Mantenimiento: {item.mantenimientosCumplidos || 0}/{item.totalMantenimientos}
            </Text>
          )}
          {typeof item.tareasNoAplica === "number" && item.tareasNoAplica > 0 && (
            <Text style={styles.tasksPillMuted}>No aplica: {item.tareasNoAplica}</Text>
          )}
        </View>
      )}

      <View style={styles.personalContainer}>
        <View style={styles.personalHeaderRow}>
          <Text style={styles.personalTitle}>👥 Personal asignado</Text>

          {isAdminOrEng && asignadosAll.length > 0 && (
            <Text style={styles.personalCount}>
              {asignadosAll.length} persona{asignadosAll.length !== 1 ? "s" : ""}
            </Text>
          )}
        </View>

        {asignados.length > 0 ? (
          asignados.map((p) => (
            <View key={p.id} style={styles.personaItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.personaText}>{p.nombre}</Text>
                <Text style={styles.personaCargo}>{p.rol || p.cargo || "—"}</Text>
              </View>

              {/* Solo Admin/Ing liberan a otros desde aquí */}
              {canManage && (
                <TouchableOpacity onPress={() => onLiberarPersona(p)} style={styles.liberarButton}>
                  <Text style={styles.liberarText}>Liberar</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        ) : (
          <Text style={styles.sinPersonal}>
            {isTechOrSup ? "No estás asignado a este proyecto" : "Sin personal asignado"}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#111827ee",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.35)",
  },
  headerRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
  projectTitle: { color: "#F9FAFB", fontSize: 18, fontWeight: "700", marginBottom: 4 },
  projectDate: { color: "#9CA3AF", fontSize: 13 },
  projectKw: { marginTop: 3, color: "#A7F3D0", fontSize: 12, fontWeight: "600" },
  projectKw2: { marginTop: 3, color: "#93C5FD", fontSize: 12, fontWeight: "600" },
  projectPanels: { marginTop: 3, color: "#FDE68A", fontSize: 12, fontWeight: "600" },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusDot: { width: 7, height: 7, borderRadius: 999, marginRight: 6 },
  statusText: { fontSize: 12, fontWeight: "600" },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  locationText: {
    color: "#93C5FD",
    fontSize: 13,
    flex: 1,
    marginRight: 8,
    textDecorationLine: "underline",
  },
  locationPlaceholder: { color: "#6B7280", fontSize: 13, flex: 1, marginRight: 8 },
  utilityBadge: {
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#22C55E",
    alignItems: "flex-end",
  },
  utilityLabel: { color: "#BBF7D0", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.6 },
  utilityValue: { color: "#4ADE80", fontSize: 13, fontWeight: "700" },
  progressContainer: { marginBottom: 10 },
  progressBar: { height: 8, backgroundColor: "#1F2933", borderRadius: 999, overflow: "hidden", marginBottom: 4 },
  progressFill: { height: "100%", borderRadius: 999 },
  progressText: { color: "#E5E7EB", fontSize: 12 },
  tasksRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  tasksPill: { backgroundColor: "rgba(59, 130, 246, 0.15)", color: "#BFDBFE", fontSize: 11, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  tasksPillSecondary: { backgroundColor: "rgba(34, 197, 94, 0.12)", color: "#BBF7D0", fontSize: 11, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  tasksPillMuted: { backgroundColor: "rgba(148, 163, 184, 0.12)", color: "#E5E7EB", fontSize: 11, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  personalContainer: { marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: "rgba(55, 65, 81, 0.9)" },
  personalHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  personalTitle: { color: "#F9FAFB", fontSize: 14, fontWeight: "600" },
  personalCount: { color: "#9CA3AF", fontSize: 12 },
  personaItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginVertical: 4, paddingVertical: 4 },
  personaText: { color: "#E5E7EB", fontSize: 13, fontWeight: "500" },
  personaCargo: { color: "#9CA3AF", fontSize: 11 },
  liberarButton: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "rgba(248, 113, 113, 0.12)", borderWidth: 1, borderColor: "#F87171", marginLeft: 12 },
  liberarText: { color: "#FCA5A5", fontSize: 11, fontWeight: "600" },
  sinPersonal: { color: "#9CA3AF", fontSize: 12, fontStyle: "italic" },
});
