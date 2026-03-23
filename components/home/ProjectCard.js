// components/home/ProjectCard.js
import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { formatPowerDc, formatPowerKw } from "../../utils/formatPower";


/**
 * Componente de tarjeta para visualizar información detallada de un proyecto.
 * Muestra datos técnicos, estado, progreso, personal asignado y permite
 * interacciones según el rol del usuario (Administrador, Ingeniero, Técnico, etc.).
 * 
 * @component
 * @example
 * const handlePress = (project) => {
 *   navigation.navigate('ProjectDetails', { projectId: project.id });
 * };
 * 
 * const handleLongPress = (project) => {
 *   setSelectedProject(project);
 *   setShowActionsModal(true);
 * };
 * 
 * return (
 *   <ProjectCard
 *     item={projectData}
 *     personal={staffList}
 *     viewerRole="Administrador"
 *     viewerPersonalId="user123"
 *     canManage={true}
 *     onPress={handlePress}
 *     onLongPress={handleLongPress}
 *     onLiberarPersona={(person) => handleReleasePerson(person)}
 *   />
 * );
 * 
 * @param {Object} props - Propiedades del componente
 * @param {Object} props.item - Datos del proyecto a mostrar
 * @param {string} props.item.title - Título del proyecto
 * @param {string} [props.item.ubicacion] - Ubicación del proyecto
 * @param {string|Date} [props.item.startDate] - Fecha de inicio del proyecto
 * @param {number} [props.item.progress] - Progreso del proyecto (0-1)
 * @param {boolean} [props.item.retrasada] - Indica si el proyecto tiene retrasos
 * @param {number} [props.item.utility] - Utilidad/ganancia del proyecto
 * @param {number} [props.item.totalTareas] - Total de tareas del proyecto
 * @param {number} [props.item.tareasCumplidas] - Tareas cumplidas
 * @param {number} [props.item.totalMantenimientos] - Total de mantenimientos
 * @param {number} [props.item.mantenimientosCumplidos] - Mantenimientos cumplidos
 * @param {number} [props.item.tareasNoAplica] - Tareas no aplicables
 * @param {Object} [props.personal] - Lista de personal disponible
 * @param {string} props.viewerRole - Rol del usuario que visualiza (Administrador, Ingeniero, Técnico, Supervisor, Administrativo)
 * @param {string} [props.viewerPersonalId] - ID del usuario actual (para técnicos/supervisores)
 * @param {boolean} [props.canManage=false] - Permisos para gestionar personal
 * @param {function} props.onPress - Callback al hacer tap en la tarjeta
 * @param {function} props.onLongPress - Callback al mantener presionada la tarjeta
 * @param {function} props.onLiberarPersona - Callback para liberar personal del proyecto
 * 
 * @returns {React.ReactElement} Tarjeta visual del proyecto
 * 
 * @see formatPowerKw Utilidad para formatear valores de potencia en kW
 */
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
  // Determinar tipo de usuario para lógica condicional
  const isTechOrSup = ["Tecnico", "Supervisor"].includes(viewerRole);
  const isAdminOrEng = ["Administrador", "Ingeniero"].includes(viewerRole);
  const canViewUtility = ["Administrador", "Administrativo"].includes(viewerRole);

  /**
   * Filtra el personal asignado al proyecto según el rol del usuario.
   * Técnicos/Supervisores solo ven su propia asignación.
   * Administradores/Ingenieros ven todo el personal asignado.
   * 
   * @constant
   * @type {Array<Object>}
   */
  const asignadosAll = (personal || []).filter((p) => p.proyectoAsignado === item.title);
  const asignados = isTechOrSup
    ? asignadosAll.filter((p) => p.id === viewerPersonalId)
    : asignadosAll;

  // Cálculos del estado del proyecto
  const progressPercent = Math.round((item.progress || 0) * 100);
  const isDone = progressPercent >= 100;
  
  // Colores y etiquetas según el estado
  const statusColor = item.retrasada ? "#F97373" : isDone ? "#34D399" : "#FACC15";
  const statusLabel = isDone ? "Finalizado" : item.retrasada ? "Con retrasos" : "Al día";

  // Extraer datos técnicos con compatibilidad para múltiples formatos de propiedades
  /**
   * Potencia AC en kW, con soporte para múltiples nombres de propiedades.
   * Compatible con datos históricos de diferentes versiones de la aplicación.
   * 
   * @constant
   * @type {number}
   */
  const potenciaAcKw = Number(
    item?.potenciaAcKw ??
      item?.potenciaACKw ??
      item?.potenciaAC ??
      item?.potenciaAc ??
      0
  );

  /**
   * Potencia DC en kW, con soporte para múltiples nombres de propiedades.
   * Compatible con datos históricos de diferentes versiones de la aplicación.
   * 
   * @constant
   * @type {number}
   */
  const potenciaDcKw = Number(
    item?.potenciaDcKw ??
      item?.potenciaDCKw ??
      item?.potenciaDC ??
      item?.potenciaDc ??
      item?.potenciaDcTotalKw ??
      0
  );

  /**
   * Cantidad de paneles instalados, con soporte para múltiples nombres de propiedades.
   * Compatible con datos históricos de diferentes versiones de la aplicación.
   * 
   * @constant
   * @type {number}
   */
  const paneles = Number(
    item?.panelesInstalados ??
      item?.paneles ??
      item?.cantidadPaneles ??
      0
  );

  /**
   * Abre la ubicación del proyecto en Google Maps o navegador.
   * Convierte direcciones textuales a URLs de Google Maps automáticamente.
   * 
   * @function
   * @returns {void}
   */
  const handleLocationPress = () => {
    if (!item.ubicacion) return;

    // Determinar si es un enlace directo o una dirección textual
    const url = item.ubicacion.startsWith("http")
      ? item.ubicacion
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          item.ubicacion
        )}`;

    Linking.openURL(url).catch((err) => 
      console.error("Error abriendo ubicación:", err)
    );
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(item)}
      onLongPress={() => onLongPress(item)}
      delayLongPress={300} // Retardo para diferenciar de tap normal
    >
      {/* Encabezado: Título, fecha y estado */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={styles.projectTitle}>
            {item.title ? item.title : "(Sin nombre)"}
          </Text>

          {item.startDate ? (
            <Text style={styles.projectDate}>
              📅 {new Date(item.startDate).toLocaleDateString()}
            </Text>
          ) : (
            <Text style={styles.projectDate}>📅 (Sin fecha)</Text>
          )}

          {/* Información técnica */}
          {potenciaAcKw > 0 && (
            <Text style={styles.projectKw}>
              ⚡ {formatPowerKw(potenciaAcKw, { suffix: "AC" })}
            </Text>
          )}

          {potenciaDcKw > 0 && (
            <Text style={styles.projectKw2}>
              🔋 {formatPowerDc(potenciaDcKw, { suffix: "DC" })}
            </Text>
          )}

          {paneles > 0 && (
            <Text style={styles.projectPanels}>
              🧩 {paneles.toLocaleString("es-CO")} panel{paneles !== 1 ? "es" : ""}
            </Text>
          )}
        </View>

        {/* Badge de estado */}
        <View
          style={[
            styles.statusBadge,
            { 
              backgroundColor: `${statusColor}33`, // 20% opacidad
              borderColor: statusColor 
            },
          ]}
        >
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {statusLabel}
          </Text>
        </View>
      </View>

      {/* Ubicación y utilidad */}
      <View style={styles.rowBetween}>
        {item.ubicacion ? (
          <Text 
            style={styles.locationText} 
            onPress={handleLocationPress} 
            numberOfLines={1}
          >
            📍 {item.ubicacion}
          </Text>
        ) : (
          <Text style={styles.locationPlaceholder}>📍 (Sin ubicación)</Text>
        )}

        {/* Badge de utilidad (solo para roles específicos) */}
        {canViewUtility && item.utility > 0 && (
          <View style={styles.utilityBadge}>
            <Text style={styles.utilityLabel}>Utilidad</Text>
            <Text style={styles.utilityValue}>
              ${item.utility.toLocaleString()}
            </Text>
          </View>
        )}
      </View>

      {/* Barra de progreso */}
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

      {/* Métricas de tareas y mantenimientos */}
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
            <Text style={styles.tasksPillMuted}>
              No aplica: {item.tareasNoAplica}
            </Text>
          )}
        </View>
      )}

      {/* Sección de personal asignado */}
      <View style={styles.personalContainer}>
        <View style={styles.personalHeaderRow}>
          <Text style={styles.personalTitle}>👥 Personal asignado</Text>

          {/* Contador solo para Admin/Ing */}
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

              {/* Botón para liberar personal (solo con permisos) */}
              {canManage && (
                <TouchableOpacity 
                  onPress={() => onLiberarPersona(p)} 
                  style={styles.liberarButton}
                >
                  <Text style={styles.liberarText}>Liberar</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        ) : (
          <Text style={styles.sinPersonal}>
            {isTechOrSup 
              ? "No estás asignado a este proyecto" 
              : "Sin personal asignado"}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#111827ee", // Gris oscuro con opacidad
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.35)",
  },
  headerRow: { 
    flexDirection: "row", 
    alignItems: "flex-start", 
    marginBottom: 10 
  },
  projectTitle: { 
    color: "#F9FAFB", 
    fontSize: 18, 
    fontWeight: "700", 
    marginBottom: 4 
  },
  projectDate: { 
    color: "#9CA3AF", 
    fontSize: 13 
  },
  projectKw: { 
    marginTop: 3, 
    color: "#A7F3D0", 
    fontSize: 12, 
    fontWeight: "600" 
  },
  projectKw2: { 
    marginTop: 3, 
    color: "#93C5FD", 
    fontSize: 12, 
    fontWeight: "600" 
  },
  projectPanels: { 
    marginTop: 3, 
    color: "#FDE68A", 
    fontSize: 12, 
    fontWeight: "600" 
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusDot: { 
    width: 7, 
    height: 7, 
    borderRadius: 999, 
    marginRight: 6 
  },
  statusText: { 
    fontSize: 12, 
    fontWeight: "600" 
  },
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
  locationPlaceholder: { 
    color: "#6B7280", 
    fontSize: 13, 
    flex: 1, 
    marginRight: 8 
  },
  utilityBadge: {
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#22C55E",
    alignItems: "flex-end",
  },
  utilityLabel: { 
    color: "#BBF7D0", 
    fontSize: 10, 
    textTransform: "uppercase", 
    letterSpacing: 0.6 
  },
  utilityValue: { 
    color: "#4ADE80", 
    fontSize: 13, 
    fontWeight: "700" 
  },
  progressContainer: { 
    marginBottom: 10 
  },
  progressBar: { 
    height: 8, 
    backgroundColor: "#1F2933", 
    borderRadius: 999, 
    overflow: "hidden", 
    marginBottom: 4 
  },
  progressFill: { 
    height: "100%", 
    borderRadius: 999 
  },
  progressText: { 
    color: "#E5E7EB", 
    fontSize: 12 
  },
  tasksRow: { 
    flexDirection: "row", 
    flexWrap: "wrap", 
    gap: 6, 
    marginBottom: 10 
  },
  tasksPill: { 
    backgroundColor: "rgba(59, 130, 246, 0.15)", 
    color: "#BFDBFE", 
    fontSize: 11, 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 999 
  },
  tasksPillSecondary: { 
    backgroundColor: "rgba(34, 197, 94, 0.12)", 
    color: "#BBF7D0", 
    fontSize: 11, 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 999 
  },
  tasksPillMuted: { 
    backgroundColor: "rgba(148, 163, 184, 0.12)", 
    color: "#E5E7EB", 
    fontSize: 11, 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 999 
  },
  personalContainer: { 
    marginTop: 4, 
    paddingTop: 8, 
    borderTopWidth: 1, 
    borderTopColor: "rgba(55, 65, 81, 0.9)" 
  },
  personalHeaderRow: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginBottom: 6 
  },
  personalTitle: { 
    color: "#F9FAFB", 
    fontSize: 14, 
    fontWeight: "600" 
  },
  personalCount: { 
    color: "#9CA3AF", 
    fontSize: 12 
  },
  personaItem: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginVertical: 4, 
    paddingVertical: 4 
  },
  personaText: { 
    color: "#E5E7EB", 
    fontSize: 13, 
    fontWeight: "500" 
  },
  personaCargo: { 
    color: "#9CA3AF", 
    fontSize: 11 
  },
  liberarButton: { 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderRadius: 999, 
    backgroundColor: "rgba(248, 113, 113, 0.12)", 
    borderWidth: 1, 
    borderColor: "#F87171", 
    marginLeft: 12 
  },
  liberarText: { 
    color: "#FCA5A5", 
    fontSize: 11, 
    fontWeight: "600" 
  },
  sinPersonal: { 
    color: "#9CA3AF", 
    fontSize: 12, 
    fontStyle: "italic" 
  },
});