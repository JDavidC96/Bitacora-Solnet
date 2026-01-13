// screens/NoteScreen.js
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Hooks
import { useUser } from "../context/UserContext";
import { useNotes } from "../hooks/useNotes";
import { useNotifications } from "../hooks/useNotifications";

// Components
import EditNoteModal from "../components/notes/EditNoteModal";
import ImageUploader from "../components/notes/ImageUploader";
import NoteEditor from "../components/notes/NoteEditor";
import NotesHistory from "../components/notes/NotesHistory";

// Services
import { noteService } from "../services/noteService";

/**
 * Pantalla principal de notas/bitácora para proyectos.
 * 
 * Esta pantalla sirve como centro de control para un proyecto específico, proporcionando:
 * - Sistema de bitácora para registrar notas y actualizaciones del proyecto
 * - Acceso rápido a funcionalidades clave del proyecto (cronograma, presupuesto, inventario, etc.)
 * - Gestión de imágenes adjuntas a las notas
 * - Historial completo de notas con capacidad de edición limitada
 * - Control de permisos basado en roles de usuario
 * 
 * La pantalla incluye:
 * 1. Dashboard de acciones rápidas (acceso a otras pantallas del proyecto)
 * 2. Editor de nuevas notas con soporte para imágenes
 * 3. Historial de notas con capacidad de edición (5 minutos límite)
 * 4. Sistema de permisos por rol
 * 
 * @component
 * @example
 * // Navegación desde HomeScreen:
 * // router.push({ pathname: '/NoteScreen', params: { id: projectId, title: projectTitle } })
 * 
 * @returns {JSX.Element} Componente de pantalla de notas de proyecto
 */

/* ======================================================
 * COMPONENTE: Tarjeta de acción rápida (DashboardCard)
 * ====================================================== */
/**
 * Tarjeta interactiva para acciones rápidas en el dashboard
 * @component
 * @param {Object} props - Propiedades del componente
 * @param {string} props.icon - Emoji o icono para la tarjeta
 * @param {string} props.title - Título de la acción
 * @param {string} props.subtitle - Descripción de la acción
 * @param {string[]} props.colors - Array de colores para el gradiente de fondo
 * @param {Function} props.onPress - Callback al presionar la tarjeta
 * @returns {JSX.Element} Tarjeta de acción del dashboard
 */
function DashboardCard({ icon, title, subtitle, colors, onPress }) {
  return (
    <TouchableOpacity style={styles.cardWrapper} onPress={onPress} activeOpacity={0.8}>
      <LinearGradient colors={colors} style={styles.cardGradient}>
        {/* Icono circular */}
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>{icon}</Text>
        </View>

        {/* Contenido de texto */}
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSubtitle}>{subtitle}</Text>
        </View>

        {/* Indicador de navegación */}
        <Text style={styles.arrow}>›</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

export default function NoteScreen() {
  const params = useLocalSearchParams(); // Parámetros de navegación
  const router = useRouter(); // Router para navegación
  const { role, user } = useUser(); // Contexto de usuario

  // ======================================================
  // PROCESAMIENTO DE PARÁMETROS
  // ======================================================
  /**
   * Procesa y normaliza los parámetros de navegación
   * Maneja casos donde los parámetros pueden ser arrays o strings
   * @type {Object}
   */
  const { id, title } = useMemo(() => {
    return {
      id:
        Array.isArray(params.id) && params.id[0] !== "undefined"
          ? params.id[0]
          : params.id !== "undefined"
          ? params.id
          : null,
      title: Array.isArray(params.title) ? params.title[0] : params.title,
    };
  }, [params.id, params.title]);

  // ======================================================
  // ESTADOS
  // ======================================================
  const [noteText, setNoteText] = useState(""); // Texto de la nueva nota
  const [selectedImages, setSelectedImages] = useState([]); // Imágenes seleccionadas para adjuntar
  const [editModal, setEditModal] = useState(false); // Visibilidad del modal de edición
  const [editText, setEditText] = useState(""); // Texto en edición
  const [editId, setEditId] = useState(null); // ID de la nota en edición
  const [loading, setLoading] = useState(false); // Estado de carga durante guardado

  // ======================================================
  // HOOKS PERSONALIZADOS
  // ======================================================
  const { notes, loading: notesLoading } = useNotes(id); // Notas del proyecto
  useNotifications(); // Sistema de notificaciones

  // ======================================================
  // DEFINICIÓN DE PERMISOS POR ROL
  // ======================================================
  const canWrite = ["Administrador", "Ingeniero", "Supervisor", "Tecnico"].includes(role); // Puede escribir notas
  const canAccessBudget = ["Administrador", "Administrativo", "Ingeniero"].includes(role); // Puede acceder a presupuesto
  const canAddViaticos = ["Administrador", "Administrativo", "Ingeniero", "Supervisor"].includes(role); // Puede agregar viáticos

  // ────────────────────────────────────────────
  // MANEJADORES DE EVENTOS
  // ────────────────────────────────────────────

  /**
   * Guarda una nueva nota en el proyecto
   * @async
   */
  const handleSaveNote = async () => {
    if (!noteText.trim()) return Alert.alert("Error", "Escribe una nota.");

    setLoading(true);
    try {
      await noteService.createNote(id, {
        text: noteText.trim(),
        author: user?.displayName || user?.email,
        images: selectedImages,
      });

      // Limpiar formulario después de guardar
      setNoteText("");
      setSelectedImages([]);
    } catch (err) {
      console.error("Error guardando nota:", err);
      Alert.alert("Error", "No se pudo guardar la nota.");
    }
    setLoading(false);
  };

  /**
   * Inicia el proceso de edición de una nota existente
   * Solo permite editar la última nota dentro de los primeros 5 minutos
   * @param {Object} entry - Nota a editar
   * @param {number} index - Índice de la nota en el historial (0 = más reciente)
   */
  const handleEditNote = (entry, index) => {
    // Solo última nota (5 minutos)
    if (index !== 0) return;

    const limite = 5 * 60 * 1000; // 5 minutos en milisegundos
    if (!entry.timestamp || Date.now() - entry.timestamp > limite) {
      return Alert.alert(
        "Info",
        "Solo puedes editar la última nota y dentro de los 5 minutos."
      );
    }

    setEditText(entry.texto);
    setEditId(entry.id);
    setEditModal(true);
  };

  /**
   * Actualiza una nota existente
   * @async
   */
  const handleUpdateNote = async () => {
    if (!editId) return;

    try {
      await noteService.updateNote(id, editId, editText);
      setEditModal(false);
    } catch (err) {
      console.error("Error actualizando nota:", err);
      Alert.alert("Error", "No se pudo actualizar la nota.");
    }
  };

  /**
   * Agrega imágenes a la selección para adjuntar a la nota
   * @param {Array<string>} imgs - Array de URIs de imágenes
   */
  const handleAddImages = (imgs) => {
    setSelectedImages((prev) => [...prev, ...imgs]);
  };

  // ────────────────────────────────────────────
  // RENDERIZADO
  // ────────────────────────────────────────────

  // Estado de carga cuando no hay ID de proyecto
  if (!id) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FFF" />
        <Text style={styles.loadingText}>Cargando proyecto...</Text>
      </View>
    );
  }

  return (
    // Fondo con gradiente de azules
    <LinearGradient colors={["#1A365D", "#2C5282"]} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* HEADER: Información del proyecto */}
        <View style={styles.headerCard}>
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.headerSubtitle}>Bitácora del Proyecto</Text>
        </View>

        {/* SECCIÓN: Acciones rápidas */}
        <Text style={styles.sectionTitle}>Acciones Rápidas</Text>

        {/* Tarjeta: Cronograma (accesible para todos) */}
        <DashboardCard
          icon="⚙️"
          title="Cronograma"
          subtitle="Avances, pasos y actividades"
          colors={["#48BB78", "#38A169"]} // Verde
          onPress={() =>
            router.push({
              pathname: "/ProjectStepScreen",
              params: { id, title },
            })
          }
        />

        {/* Tarjeta: Comparativo Presupuesto vs Real (solo roles con acceso) */}
        {canAccessBudget && (
          <DashboardCard
            icon="📊"
            title="Comparativo Presupuesto vs Real"
            subtitle="Análisis financiero detallado"
            colors={["#805AD5", "#6B46C1"]} // Púrpura
            onPress={() =>
              router.push({
                pathname: "/BudgetVsRealScreen",
                params: { projectId: id, title },
              })
            }
          />
        )}

        {/* Tarjeta: Presupuesto (solo roles con acceso) */}
        {canAccessBudget && (
          <DashboardCard
            icon="💰"
            title="Presupuesto"
            subtitle="Fases, AIU, IVA y totales"
            colors={["#3182CE", "#4FD1C5"]} // Azul-verde
            onPress={() =>
              router.push({
                pathname: "/BudgetScreen",
                params: { projectId: id, title },
              })
            }
          />
        )}

        {/* Tarjeta: Inventario del proyecto (accesible para todos) */}
        <DashboardCard
          icon="🗃️"
          title="Inventario"
          subtitle="Inventario de materiales del proyecto"
          colors={["#ce31a7ff", "#61044dff"]} // Rosa-púrpura
          onPress={() =>
            router.push({
              pathname: "/ProjectStockScreen",
              params: { projectId: id, title },
            })
          }
        />

        {/* Tarjeta: Gastos Reales (solo roles con acceso) */}
        {canAddViaticos && (
          <DashboardCard
            icon="💸"
            title="Gastos Reales"
            subtitle="Materiales, viáticos y mano de obra"
            colors={["#F6AD55", "#DD6B20"]} // Naranja
            onPress={() =>
              router.push({
                pathname: "/RealExpensesScreen",
                params: { projectId: id, title },
              })
            }
          />
        )}

        {/* SECCIÓN: Nueva nota */}
        <Text style={styles.sectionTitle}>Nueva Nota</Text>

        {canWrite ? (
          <>
            {/* Editor de notas */}
            <NoteEditor
              noteText={noteText}
              onNoteChange={setNoteText}
              selectedImages={selectedImages}
              onSave={handleSaveNote}
              loading={loading}
            />

            {/* Subida de imágenes */}
            <ImageUploader
              onImagesSelected={handleAddImages}
              selectedImages={selectedImages}
              onClearImages={() => setSelectedImages([])}
            />
          </>
        ) : (
          // Mensaje para usuarios sin permisos de escritura
          <View style={styles.readOnlyBox}>
            <Text style={styles.readOnlyText}>
              No tienes permisos para agregar notas.
            </Text>
          </View>
        )}

        {/* SECCIÓN: Historial de notas */}
        <Text style={styles.sectionTitle}>Historial</Text>
        <NotesHistory
          notes={notes}
          loading={notesLoading}
          onEditNote={handleEditNote}
          projectId={id}
        />

        {/* MODAL: Editar nota */}
        <EditNoteModal
          visible={editModal}
          editText={editText}
          onTextChange={setEditText}
          onSave={handleUpdateNote}
          onClose={() => setEditModal(false)}
        />
      </ScrollView>
    </LinearGradient>
  );
}

/* ======================================================
 * ESTILOS
 * ====================================================== */

const styles = StyleSheet.create({
  /**
   * Contenedor principal
   */
  container: { 
    flex: 1 
  },

  /**
   * Contenedor del contenido desplazable
   */
  scroll: { 
    padding: 16 
  },

  /**
   * Vista centrada para estado de carga
   */
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1A365D",
  },

  /**
   * Texto de estado de carga
   */
  loadingText: { 
    color: "#FFF", 
    marginTop: 10 
  },

  /**
   * Tarjeta de encabezado del proyecto
   */
  headerCard: {
    backgroundColor: "rgba(15,23,42,0.9)", // Azul muy oscuro semitransparente
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.5)", // Borde gris azulado sutil
  },

  /**
   * Título principal del proyecto
   */
  headerTitle: {
    fontSize: 22,
    color: "#FFF",
    fontWeight: "700",
  },

  /**
   * Subtítulo descriptivo
   */
  headerSubtitle: {
    fontSize: 14,
    color: "#CBD5E0", // Gris azulado claro
    marginTop: 6,
  },

  /**
   * Título de sección
   */
  sectionTitle: {
    fontSize: 16,
    color: "#FFF",
    fontWeight: "700",
    marginBottom: 10,
    marginTop: 10,
  },

  /* ======================================================
   * ESTILOS PARA TARJETAS DEL DASHBOARD
   * ====================================================== */

  /**
   * Contenedor externo de tarjeta
   */
  cardWrapper: { 
    marginBottom: 12 
  },

  /**
   * Gradiente interno de tarjeta
   */
  cardGradient: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },

  /**
   * Círculo para icono
   */
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22, // Círculo perfecto
    backgroundColor: "rgba(0,0,0,0.2)", // Fondo negro semitransparente
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  /**
   * Texto del icono (emoji)
   */
  iconText: { 
    fontSize: 24 
  },

  /**
   * Título de la tarjeta
   */
  cardTitle: { 
    color: "#FFF", 
    fontSize: 16, 
    fontWeight: "700" 
  },

  /**
   * Subtítulo de la tarjeta
   */
  cardSubtitle: { 
    color: "#E2E8F0", // Gris muy claro
    fontSize: 13, 
    marginTop: 2 
  },

  /**
   * Flecha indicadora de navegación
   */
  arrow: { 
    fontSize: 32, 
    color: "#FFF", 
    marginLeft: 6 
  },

  /**
   * Caja para mensaje de solo lectura
   */
  readOnlyBox: {
    backgroundColor: "rgba(255,255,255,0.15)", // Blanco semitransparente
    padding: 14,
    borderRadius: 10,
  },

  /**
   * Texto de solo lectura
   */
  readOnlyText: {
    color: "#ECC94B", // Amarillo mostaza
    textAlign: "center",
  },
});
