// app/AdminHistoryScreen.js
// ============================================================================
// PANTALLA DE HISTORIAL ADMINISTRATIVO
// Propósito: Panel de administración que muestra actividad completa del sistema
//            incluyendo inventario, herramientas, notas y usuarios.
// Acceso: Exclusivo para usuarios con rol 'canProrrogaRole'
// ============================================================================

// ----------------------------------------------------------------------------
// IMPORTACIONES
// ----------------------------------------------------------------------------

// Componentes de UI para gradientes
import { LinearGradient } from "expo-linear-gradient";

// Firebase Firestore queries y listeners
import {
  collection,
  collectionGroup,
  getDocs,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

// Hooks de React
import { useEffect, useMemo, useState } from "react";

// Componentes de React Native
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

// Configuración de Firebase
import { db } from "../firebase/firebaseConfig";

// Hook para verificación de permisos por rol
import { usePermissions } from "../hooks/usePermissions";

// Servicio para datos administrativos
import { adminHistoryService } from "../services/adminHistoryService";

/* ============================================================================
 * FUNCIONES AUXILIARES DE FECHA
 * ============================================================================ */

/**
 * Convierte cualquier valor a Date de forma segura
 * @param {any} value - Valor a convertir (Timestamp de Firebase, string, número, etc.)
 * @returns {Date|null} - Objeto Date o null si no se puede convertir
 */
const toDateSafe = (value) => {
  if (!value) return null; // Retorna null si el valor es falsy
  
  // Si es un Timestamp de Firebase, usar su método toDate()
  if (typeof value?.toDate === "function") return value.toDate();
  
  // Intentar crear Date desde otros formatos
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d; // Validar que sea una fecha válida
};

/**
 * Formatea una fecha a string legible
 * @param {any} value - Valor de fecha a formatear
 * @returns {string} - Fecha formateada o "—" si no es válida
 */
const formatDate = (value) => {
  const d = toDateSafe(value);
  return d ? d.toLocaleString() : "—"; // Usar formato local del dispositivo
};

/**
 * Resuelve la fecha de una nota desde diferentes campos posibles
 * @param {Object} item - Objeto de nota/registro
 * @returns {Date|null} - Fecha resuelta o null si no se encuentra
 */
const resolveNoteDate = (item) => {
  // Prioridad 1: timestamp numérico (Firestore)
  if (item.timestamp) return new Date(Number(item.timestamp));
  
  // Prioridad 2: createdAt (campo común)
  if (item.createdAt) return new Date(item.createdAt);
  
  // Prioridad 3: Combinación de fechaISO y hora
  if (item.fechaISO && item.hora)
    return new Date(`${item.fechaISO} ${item.hora}`);
  
  // Último recurso: solo fechaISO
  return item.fechaISO || null;
};

/* ============================================================================
 * COMPONENTE PRINCIPAL: AdminHistoryScreen
 * ============================================================================ */
export default function AdminHistoryScreen() {
  // ==========================================================================
  // HOOKS Y ESTADO
  // ==========================================================================
  
  // Verificar si el usuario tiene permiso de administrador
  const { canProrrogaRole } = usePermissions();

  // Estado para datos combinados de historial
  const [combinedHistory, setCombinedHistory] = useState([]);
  
  // Estado para últimos logins de usuarios
  const [lastLogins, setLastLogins] = useState([]);
  
  // Estado para estadísticas del sistema
  const [systemStats, setSystemStats] = useState({});
  
  // Estado para mapeo de IDs de proyecto a nombres
  const [projectNames, setProjectNames] = useState({});

  // Estado para búsqueda textual
  const [search, setSearch] = useState("");
  
  // Estado para pestaña activa (all, inventory, equipment, notes, users)
  const [activeTab, setActiveTab] = useState("all");
  
  // Estado para indicador de refresh (pull to refresh)
  const [refreshing, setRefreshing] = useState(false);

  /* ==========================================================================
   * VERIFICACIÓN DE PERMISOS
   * Si el usuario no tiene rol de administrador, mostrar mensaje de denegado
   * ========================================================================== */
  if (!canProrrogaRole) {
    return (
      // Fondo con gradiente azul oscuro
      <LinearGradient colors={["#141E30", "#243B55"]} style={styles.container}>
        <Text style={styles.errorText}>
          Acceso denegado. Solo administradores pueden ver esta pantalla.
        </Text>
      </LinearGradient>
    );
  }

  /* ==========================================================================
   * EFECTO: CARGA INICIAL DE DATOS
   * Se ejecuta solo al montar el componente (dependencias vacías [])
   * ========================================================================== */
  useEffect(() => {
    // Cargar datos iniciales
    loadInitialData();
    
    // Configurar listeners en tiempo real y guardar función de cleanup
    const cleanup = setupRealtimeListeners();
    
    // Retornar función de cleanup para desmontar listeners
    return cleanup;
  }, []); // Array de dependencias vacío = solo al montar

  /**
   * Carga los datos iniciales necesarios para la pantalla
   * @async
   */
  const loadInitialData = async () => {
    try {
      // Cargar en paralelo: logins, estadísticas y proyectos
      const [logins, stats, projectsSnap] = await Promise.all([
        adminHistoryService.getLastLogins(),      // Últimos logins de usuarios
        adminHistoryService.getSystemStats(),     // Estadísticas del sistema
        getDocs(collection(db, "proyectos")),     // Lista de proyectos
      ]);

      // Actualizar estados con los datos obtenidos
      setLastLogins(logins);
      setSystemStats(stats);

      // Crear mapa de ID de proyecto → Nombre para búsquedas eficientes
      const map = {};
      projectsSnap.docs.forEach((d) => {
        map[d.id] = d.data().title || d.data().nombre || "Proyecto";
      });
      setProjectNames(map);
      
    } catch (err) {
      // Log de error sin interrumpir experiencia de usuario
      console.error("Error cargando datos admin:", err);
    }
  };

  /* ==========================================================================
   * LISTENERS EN TIEMPO REAL
   * Configura listeners de Firestore para actualizaciones automáticas
   * ========================================================================== */
  const setupRealtimeListeners = () => {
    const unsubscribes = []; // Array para almacenar funciones de unsubscribe

    // ========================================================================
    // LISTENER 1: MOVIMIENTOS DE INVENTARIO
    // ========================================================================
    unsubscribes.push(
      onSnapshot(
        query(
          collection(db, "inventario_movimientos"), // Colección de movimientos
          orderBy("fecha", "desc")                  // Ordenar por fecha descendente
        ),
        (snap) => {
          // Transformar documentos a objetos con tipo identificador
          const data = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
            type: "inventario_movimientos", // Identificador de tipo
          }));
          
          // Actualizar estado manteniendo otros tipos de datos
          setCombinedHistory((prev) => [
            ...prev.filter((i) => i.type !== "inventario_movimientos"),
            ...data,
          ]);
        }
      )
    );

    // ========================================================================
    // LISTENER 2: HISTORIAL DE HERRAMIENTAS
    // ========================================================================
    unsubscribes.push(
      onSnapshot(
        query(
          collection(db, "historial_herramientas"), // Colección de herramientas
          orderBy("fecha", "desc")                  // Ordenar por fecha descendente
        ),
        (snap) => {
          const data = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
            type: "historial_herramientas", // Identificador de tipo
          }));
          
          setCombinedHistory((prev) => [
            ...prev.filter((i) => i.type !== "historial_herramientas"),
            ...data,
          ]);
        }
      )
    );

    // ========================================================================
    // LISTENER 3: NOTAS (COLECCIONES ANIDADAS - collectionGroup)
    // Las notas están anidadas dentro de proyectos: /proyectos/{id}/notas
    // ========================================================================
    unsubscribes.push(
      onSnapshot(
        query(
          collectionGroup(db, "notas"),          // Buscar en TODAS las subcolecciones 'notas'
          orderBy("fechaISO", "desc")            // Ordenar por fecha descendente
        ),
        (snap) => {
          const notes = snap.docs.map((d) => {
            // Extraer projectId desde la ruta del documento
            // Ejemplo: proyectos/ABC123/notas/DEF456
            const parts = d.ref.path.split("/");
            const projectId = parts[1]; // Índice 1 = ID del proyecto
            
            return {
              id: d.id,
              projectId, // Agregar ID del proyecto para referencia
              ...d.data(),
              type: "nota", // Identificador de tipo
            };
          });

          setCombinedHistory((prev) => [
            ...prev.filter((i) => i.type !== "nota"),
            ...notes,
          ]);
        }
      )
    );

    // Retornar función que ejecuta todos los unsubscribes
    return () => unsubscribes.forEach((u) => u());
  };

  /* ==========================================================================
   * FUNCIÓN DE REFRESH (PULL TO REFRESH)
   * ========================================================================== */
  const onRefresh = async () => {
    setRefreshing(true);    // Activar indicador de refreshing
    await loadInitialData(); // Recargar datos
    setRefreshing(false);   // Desactivar indicador
  };

  /* ==========================================================================
   * FILTROS Y BÚSQUEDA
   * useMemo optimiza el cálculo para evitar reprocesamiento innecesario
   * ========================================================================== */
  const filteredData = useMemo(() => {
    // Copia del historial combinado
    let data = [...combinedHistory];

    // ========================================================================
    // FILTRADO POR PESTAÑA
    // ========================================================================
    if (activeTab === "inventory")
      data = data.filter((i) => i.type === "inventario_movimientos");
    else if (activeTab === "equipment")
      data = data.filter((i) => i.type === "historial_herramientas");
    else if (activeTab === "notes")
      data = data.filter((i) => i.type === "nota");
    // "all" no filtra por tipo
    // "users" se maneja separadamente

    // ========================================================================
    // BÚSQUEDA TEXTUAL
    // ========================================================================
    if (search.trim()) {
      const s = search.toLowerCase(); // Búsqueda case-insensitive
      
      data = data.filter((i) =>
        // Array de campos a buscar en cada item
        [
          i.material,          // Material de inventario
          i.herramienta,       // Nombre de herramienta
          i.usuario,           // Usuario que realizó acción
          i.actorNombre,       // Nombre del actor alternativo
          i.autor,             // Autor de nota
          i.texto,             // Texto de nota
          i.nota,              // Nota alternativa
          i.descripcion,       // Descripción
          projectNames[i.projectId], // Nombre del proyecto (si aplica)
        ]
          .filter(Boolean) // Eliminar campos undefined/null
          .some((v) => v.toLowerCase().includes(s)) // Buscar en cada campo
      );
    }

    // ========================================================================
    // ORDENAMIENTO POR FECHA (más reciente primero)
    // ========================================================================
    return data.sort(
      (a, b) =>
        // Convertir fechas a timestamps y comparar
        toDateSafe(resolveNoteDate(b) || b.fecha)?.getTime?.() -
        toDateSafe(resolveNoteDate(a) || a.fecha)?.getTime?.()
    );
  }, [combinedHistory, activeTab, search, projectNames]); // Dependencias del useMemo

  /* ==========================================================================
   * RENDERIZADO DE ITEMS DEL HISTORIAL
   * ========================================================================== */
  const renderHistoryItem = ({ item }) => {
    // Extraer texto de nota desde diferentes campos posibles
    const noteText =
      item.contenido ||
      item.texto ||
      item.nota ||
      item.descripcion ||
      item.mensaje ||
      item.detalle;

    return (
      <View style={getCardStyle(item.type)}>
        {/* Fecha del evento */}
        <Text style={styles.date}>
          {formatDate(resolveNoteDate(item) || item.fecha)}
        </Text>

        {/* ====================================================================
         * TIPO: NOTA
         * ==================================================================== */}
        {item.type === "nota" && (
          <>
            <Text style={styles.detail}>
              📝 Nota – {projectNames[item.projectId] || "Proyecto"}
            </Text>
            {noteText && (
              <Text style={styles.noteContent}>{noteText}</Text>
            )}
            {item.autor && (
              <Text style={styles.subDetail}>👤 {item.autor}</Text>
            )}
          </>
        )}

        {/* ====================================================================
         * TIPO: MOVIMIENTO DE INVENTARIO
         * ==================================================================== */}
        {item.type === "inventario_movimientos" && (
          <>
            <Text style={styles.detail}>
              {item.tipo || item.accion || "Movimiento de inventario"}
            </Text>
            {item.material && (
              <Text style={styles.subDetail}>📦 {item.material}</Text>
            )}
            {(item.usuario || item.actorNombre) && (
              <Text style={styles.subDetail}>
                👤 {item.usuario || item.actorNombre}
              </Text>
            )}
          </>
        )}

        {/* ====================================================================
         * TIPO: HISTORIAL DE HERRAMIENTAS
         * ==================================================================== */}
        {item.type === "historial_herramientas" && (
          <>
            <Text style={styles.detail}>{item.accion}</Text>
            {item.herramienta && (
              <Text style={styles.subDetail}>🔧 {item.herramienta}</Text>
            )}
            {item.usuario && (
              <Text style={styles.subDetail}>👤 {item.usuario}</Text>
            )}
          </>
        )}
      </View>
    );
  };

  /* ==========================================================================
   * RENDERIZADO DE ITEMS DE USUARIO
   * ========================================================================== */
  const renderUserItem = ({ item }) => {
    // Determinar si el usuario está activo (ha hecho login)
    const isActive = !!item.lastLogin;

    return (
      <View
        style={[
          styles.userCard,
          // Borde izquierdo color verde si activo, rojo si inactivo
          { borderLeftColor: isActive ? "#48BB78" : "#E53E3E" },
        ]}
      >
        {/* Encabezado con email y rol */}
        <View style={styles.userHeader}>
          <Text style={styles.userEmail}>👤 {item.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{item.role}</Text>
          </View>
        </View>

        {/* Nombre del usuario (si existe) */}
        {item.nombre && (
          <Text style={styles.userName}>🧾 {item.nombre}</Text>
        )}

        {/* Último login */}
        <Text style={styles.userMeta}>
          🕒 Último login:{" "}
          {item.lastLogin ? formatDate(item.lastLogin) : "Nunca"}
        </Text>

        {/* Última actividad (si existe) */}
        {item.lastActivity && (
          <Text style={styles.userMeta}>
            ⚡ Última actividad: {formatDate(item.lastActivity)}
          </Text>
        )}
      </View>
    );
  };

  /* ==========================================================================
   * RENDERIZADO PRINCIPAL DE LA PANTALLA
   * ========================================================================== */
  return (
    // Fondo con gradiente azul oscuro
    <LinearGradient colors={["#141E30", "#243B55"]} style={styles.container}>
      
      {/* Título principal */}
      <Text style={styles.title}>📊 Panel de Administrador</Text>
      <Text style={styles.subtitle}>
        Historial completo de actividades del sistema
      </Text>

      {/* ======================================================================
       * BARRA DE BÚSQUEDA
       * ====================================================================== */}
      <TextInput
        style={styles.searchBar}
        placeholder="Buscar en todo el historial..."
        placeholderTextColor="#AAA"
        value={search}
        onChangeText={setSearch} // Actualizar estado de búsqueda
      />

      {/* ======================================================================
       * PESTAÑAS DE FILTRADO
       * ====================================================================== */}
      <View style={styles.tabsContainer}>
        {["all", "inventory", "equipment", "notes", "users"].map((tab) => (
          <Text
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            {/* Texto amigable para cada pestaña */}
            {tab === "all" && "Todos"}
            {tab === "inventory" && "📦 Inventario"}
            {tab === "equipment" && "🔧 Herramientas"}
            {tab === "notes" && "📝 Notas"}
            {tab === "users" && "👥 Usuarios"}
          </Text>
        ))}
      </View>

      {/* ======================================================================
       * PANEL DE ESTADÍSTICAS
       * ====================================================================== */}
      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          📈 Usuarios: {systemStats.usuarios || 0} | 
          Inventario: {systemStats.inventario_movimientos || 0} | 
          Herramientas: {systemStats.historial_herramientas || 0}
        </Text>
      </View>

      {/* ======================================================================
       * CONTENIDO PRINCIPAL (LISTA)
       * ====================================================================== */}
      {activeTab === "users" ? (
        // LISTA DE USUARIOS
        <FlatList
          data={lastLogins}
          keyExtractor={(item) => item.uid} // Usar UID como clave única
          renderItem={renderUserItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#48BB78"]} // Color del spinner
            />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No hay usuarios.</Text>
          }
        />
      ) : (
        // LISTA DE HISTORIAL (inventario/herramientas/notas)
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id} // Usar ID del documento como clave
          renderItem={renderHistoryItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#48BB78"]}
            />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No hay registros.</Text>
          }
        />
      )}
    </LinearGradient>
  );
}

/* ============================================================================
 * ESTILOS Y FUNCIONES DE ESTILO
 * ============================================================================ */

/**
 * Devuelve los estilos para una tarjeta basada en su tipo
 * @param {string} type - Tipo de tarjeta (nota, inventario_movimientos, historial_herramientas)
 * @returns {Object} - Objeto de estilos para la tarjeta
 */
const getCardStyle = (type) => ({
  backgroundColor: "#2C2C3A", // Fondo oscuro
  padding: 12,
  borderRadius: 10,
  marginBottom: 12,
  borderLeftWidth: 6,
  // Color del borde izquierdo según tipo:
  borderLeftColor:
    type === "nota"
      ? "#9F7AEA"          // Púrpura para notas
      : type === "inventario_movimientos"
      ? "#3182CE"          // Azul para inventario
      : "#ECC94B",         // Amarillo para herramientas
});

const styles = StyleSheet.create({
  // Contenedor principal
  container: { 
    flex: 1,            // Ocupa toda la pantalla
    padding: 16         // Espaciado interno
  },
  
  // Título principal
  title: {
    fontSize: 24,
    color: "#fff",
    marginBottom: 8,
    marginTop: 40,      // Margen superior para status bar
    fontWeight: "bold",
    textAlign: "center",
  },
  
  // Subtítulo descriptivo
  subtitle: {
    fontSize: 14,
    color: "#ccc",
    marginBottom: 16,
    textAlign: "center",
  },
  
  // Barra de búsqueda
  searchBar: {
    backgroundColor: "#FFF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    fontSize: 16,
    color: "#000",
  },
  
  // Contenedor de pestañas
  tabsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",       // Permitir wrap en pantallas pequeñas
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 4,                 // Espacio entre pestañas
  },
  
  // Estilo base de pestaña
  tab: {
    color: "#FFF",
    padding: 8,
    borderRadius: 6,
    fontSize: 12,
    backgroundColor: "#2C2C3A",
    textAlign: "center",
    flex: 1,               // Distribuir espacio equitativamente
    minWidth: "19%",       // Ancho mínimo para 5 pestañas
  },
  
  // Pestaña activa
  activeTab: {
    backgroundColor: "#5A67D8", // Azul violeta
    fontWeight: "bold",
  },
  
  // Contenedor de estadísticas
  statsContainer: {
    backgroundColor: "rgba(44,44,58,0.7)", // Fondo semi-transparente
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  
  // Texto de estadísticas
  statsText: {
    color: "#FFF",
    textAlign: "center",
    fontSize: 12,
  },
  
  // Fecha en tarjetas
  date: {
    color: "#A0AEC0",      // Gris azulado claro
    fontSize: 12,
    marginBottom: 6,
  },
  
  // Detalle principal en tarjetas
  detail: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  
  // Detalle secundario en tarjetas
  subDetail: {
    color: "#ddd",
    marginTop: 2,
    fontSize: 14,
  },
  
  // Contenido de nota
  noteContent: {
    color: "#E2E8F0",      // Gris muy claro
    fontSize: 15,
    marginTop: 6,
    marginBottom: 6,
    lineHeight: 20,        // Mejor legibilidad
  },
  
  // Texto cuando no hay datos
  emptyText: {
    color: "#FFF",
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
  },

  /* ==========================================================================
   * ESTILOS PARA USUARIOS
   * ========================================================================== */
  
  // Tarjeta de usuario
  userCard: {
    backgroundColor: "#1F2933",      // Gris azulado muy oscuro
    padding: 14,
    borderRadius: 12,
    marginBottom: 14,
    borderLeftWidth: 6,              // Borde indicador de estado
    elevation: 3,                    // Sombra en Android
  },
  
  // Encabezado de tarjeta de usuario
  userHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  
  // Email del usuario
  userEmail: {
    color: "#F7FAFC",                // Blanco casi puro
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,                         // Ocupar espacio disponible
    marginRight: 8,
  },
  
  // Nombre del usuario
  userName: {
    color: "#CBD5E0",                // Gris azulado claro
    fontSize: 14,
    marginTop: 4,
  },
  
  // Metadatos del usuario (login, actividad)
  userMeta: {
    color: "#A0AEC0",                // Gris azulado medio
    fontSize: 13,
    marginTop: 4,
  },
  
  // Badge del rol
  roleBadge: {
    backgroundColor: "#4C51BF",      // Azul índigo
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,                // Bordes redondeados
  },
  
  // Texto del rol
  roleText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "bold",
  },

  /* ==========================================================================
   * ESTILOS DE ERROR (cuando no hay permisos)
   * ========================================================================== */
  errorText: {
    color: "#FFF",
    fontSize: 18,
    textAlign: "center",
    marginTop: 100,                  // Centrado vertical aproximado
    padding: 20,
  },
});

// ============================================================================
// FIN DEL ARCHIVO AdminHistoryScreen.js
// ============================================================================