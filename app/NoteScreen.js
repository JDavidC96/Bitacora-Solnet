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

/* Tarjeta de acción rápida */
function DashboardCard({ icon, title, subtitle, colors, onPress }) {
  return (
    <TouchableOpacity style={styles.cardWrapper} onPress={onPress}>
      <LinearGradient colors={colors} style={styles.cardGradient}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>{icon}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSubtitle}>{subtitle}</Text>
        </View>

        <Text style={styles.arrow}>›</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

export default function NoteScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { role, user } = useUser();

  // Procesar parámetros
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

  // States
  const [noteText, setNoteText] = useState("");
  const [selectedImages, setSelectedImages] = useState([]);
  const [editModal, setEditModal] = useState(false);
  const [editText, setEditText] = useState("");
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);

  // Hooks
  const { notes, loading: notesLoading } = useNotes(id);
  useNotifications();

  // Permisos
  const canWrite = ["Administrador", "Ingeniero", "Supervisor", "Tecnico"].includes(role);
  const canAccessBudget = ["Administrador", "Administrativo", "Ingeniero"].includes(role);
  const canAddViaticos = ["Administrador", "Administrativo", "Ingeniero", "Supervisor"].includes(role);

  // ────────────────────────────────────────────
  // GUARDAR NOTA
  // ────────────────────────────────────────────
  const handleSaveNote = async () => {
    if (!noteText.trim()) return Alert.alert("Error", "Escribe una nota.");

    setLoading(true);
    try {
      await noteService.createNote(id, {
        text: noteText.trim(),
        author: user?.displayName || user?.email,
        images: selectedImages,
      });

      setNoteText("");
      setSelectedImages([]);
    } catch (err) {
      Alert.alert("Error", "No se pudo guardar la nota.");
    }
    setLoading(false);
  };

  // ────────────────────────────────────────────
  // EDITAR NOTA
  // ────────────────────────────────────────────
  const handleEditNote = (entry, index) => {
    // Solo última nota (5 minutos)
    if (index !== 0) return;

    const limite = 5 * 60 * 1000;
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

  const handleUpdateNote = async () => {
    if (!editId) return;

    try {
      await noteService.updateNote(id, editId, editText);
      setEditModal(false);
    } catch (err) {
      Alert.alert("Error", "No se pudo actualizar la nota.");
    }
  };

  // ────────────────────────────────────────────
  // CARGA DE IMÁGENES (Drive o lo que uses)
  // ────────────────────────────────────────────
  const handleAddImages = (imgs) => {
    setSelectedImages((prev) => [...prev, ...imgs]);
  };

  // ────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────
  if (!id) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FFF" />
        <Text style={styles.loadingText}>Cargando proyecto...</Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={["#1A365D", "#2C5282"]} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* HEADER */}
        <View style={styles.headerCard}>
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.headerSubtitle}>Bitácora del Proyecto</Text>
        </View>

        {/* ACCIONES RÁPIDAS */}
        <Text style={styles.sectionTitle}>Acciones Rápidas</Text>

        {/* Cronograma */}
        <DashboardCard
          icon="⚙️"
          title="Cronograma"
          subtitle="Avances, pasos y actividades"
          colors={["#48BB78", "#38A169"]}
          onPress={() =>
            router.push({
              pathname: "/ProjectStepScreen",
              params: { id, title },
            })
          }
        />
        {/* Presupuesto vs Real */}
        {canAccessBudget && (
        <DashboardCard
  icon="📊"
  title="Comparativo Presupuesto vs Real"
  subtitle="Análisis financiero detallado"
  colors={["#805AD5", "#6B46C1"]}
  onPress={() =>
    router.push({
      pathname: "/BudgetVsRealScreen",
      params: { projectId: id, title },
    })
  }
/>
        )}

        {/* Presupuesto → Solo admin/administativo */}
        {canAccessBudget && (
          <DashboardCard
            icon="💰"
            title="Presupuesto"
            subtitle="Fases, AIU, IVA y totales"
            colors={["#3182CE", "#4FD1C5"]}
            onPress={() =>
              router.push({
                pathname: "/BudgetScreen",
                params: { projectId: id, title },
              })
            }
          />
        )}

        <DashboardCard
            icon="🗃️"
            title="Inventario"
            subtitle="Inventario de materiales del proyecto"
            colors={["#ce31a7ff", "#61044dff"]}
            onPress={() =>
              router.push({
                pathname: "/ProjectStockScreen",
                params: { projectId: id, title },
              })
            }
          />

          {/* Gastos Reales (solo Admin / Administrativo) */}
{canAddViaticos && (
  <DashboardCard
    icon="💸"
    title="Gastos Reales"
    subtitle="Materiales, viáticos y mano de obra"
    colors={["#F6AD55", "#DD6B20"]}
    onPress={() =>
      router.push({
        pathname: "/RealExpensesScreen",
        params: { projectId: id, title },
      })
    }
  />
)}


        {/* NUEVA NOTA */}
        <Text style={styles.sectionTitle}>Nueva Nota</Text>

        {canWrite ? (
          <>
            <NoteEditor
              noteText={noteText}
              onNoteChange={setNoteText}
              selectedImages={selectedImages}
              onSave={handleSaveNote}
              loading={loading}
            />

            <ImageUploader
              onImagesSelected={handleAddImages}
              selectedImages={selectedImages}
              onClearImages={() => setSelectedImages([])}
            />
          </>
        ) : (
          <View style={styles.readOnlyBox}>
            <Text style={styles.readOnlyText}>
              No tienes permisos para agregar notas.
            </Text>
          </View>
        )}

        {/* HISTORIAL */}
        <Text style={styles.sectionTitle}>Historial</Text>
        <NotesHistory
          notes={notes}
          loading={notesLoading}
          onEditNote={handleEditNote}
          projectId={id}
        />

        {/* MODAL EDITAR */}
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

/* -------------------------------------------------------- */
/* ESTILOS */
/* -------------------------------------------------------- */

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16 },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1A365D",
  },
  loadingText: { color: "#FFF", marginTop: 10 },

  headerCard: {
    backgroundColor: "rgba(15,23,42,0.9)",
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.5)",
  },

  headerTitle: {
    fontSize: 22,
    color: "#FFF",
    fontWeight: "700",
  },

  headerSubtitle: {
    fontSize: 14,
    color: "#CBD5E0",
    marginTop: 6,
  },

  sectionTitle: {
    fontSize: 16,
    color: "#FFF",
    fontWeight: "700",
    marginBottom: 10,
    marginTop: 10,
  },

  /* Dashboard cards */
  cardWrapper: { marginBottom: 12 },
  cardGradient: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  iconText: { fontSize: 24 },
  cardTitle: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  cardSubtitle: { color: "#E2E8F0", fontSize: 13, marginTop: 2 },
  arrow: { fontSize: 32, color: "#FFF", marginLeft: 6 },

  readOnlyBox: {
    backgroundColor: "rgba(255,255,255,0.15)",
    padding: 14,
    borderRadius: 10,
  },
  readOnlyText: {
    color: "#ECC94B",
    textAlign: "center",
  },
});
