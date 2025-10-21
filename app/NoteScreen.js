// screens/NoteScreen.js
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  View
} from 'react-native';

// Hooks personalizados
import { useUser } from '../context/UserContext';
import { useNotes } from '../hooks/useNotes';
import { useNotifications } from '../hooks/useNotifications';

// Componentes
import EditNoteModal from '../components/notes/EditNoteModal';
import ImageUploader from '../components/notes/ImageUploader';
import NavigationButtons from '../components/notes/NavigationButtons';
import NoteEditor from '../components/notes/NoteEditor';
import NotesHistory from '../components/notes/NotesHistory';

// Servicios
import { noteService } from '../services/noteService';

export default function NoteScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { role, user } = useUser();

  // Procesar parámetros una sola vez con useMemo
  const processedParams = useMemo(() => {
    // Procesar parámetros (pueden venir como arrays)
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    const title = Array.isArray(params.title) ? params.title[0] : params.title;
    
    return {
      id: id && id !== 'undefined' ? id : null,
      title: title || 'Proyecto sin nombre'
    };
  }, [params.id, params.title]); // Solo dependemos de estos valores específicos

  // Estados
  const [noteText, setNoteText] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [editModal, setEditModal] = useState(false);
  const [editText, setEditText] = useState('');
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);

  // Hooks personalizados - usar processedParams.id directamente
  const { notes, loading: notesLoading } = useNotes(processedParams.id);
  useNotifications();

  // Permisos
  const canWrite = ["Administrador", "Ingeniero", "Supervisor", "Tecnico"].includes(role);

  // Handlers
  const handleSaveNote = async () => {
    if (!noteText.trim()) {
      Alert.alert('Error', 'Debes escribir un texto antes de guardar.');
      return;
    }

    if (!processedParams.id) {
      Alert.alert('Error', 'No se pudo identificar el proyecto.');
      return;
    }

    setLoading(true);
    try {
      await noteService.createNote(processedParams.id, {
        text: noteText.trim(),
        author: user?.displayName || user?.email || "Usuario desconocido",
        images: selectedImages
      });

      Alert.alert('✅ Éxito', 'Entrada guardada correctamente');
      
      // Limpiar formulario
      setNoteText('');
      setSelectedImages([]);
    } catch (error) {
      console.error('Error guardando nota:', error);
      Alert.alert('❌ Error', 'No se pudo guardar la nota');
    } finally {
      setLoading(false);
    }
  };

  const handleEditNote = async (entry, index) => {
    // Solo permitir editar la última nota dentro de los primeros 5 minutos
    if (index !== 0) return;

    const now = Date.now();
    const limite = 5 * 60 * 1000; // 5 minutos
    if (!entry.timestamp || now - entry.timestamp > limite) {
      Alert.alert("Info", "Solo puedes editar la última nota dentro de los primeros 5 minutos.");
      return;
    }

    setEditText(entry.texto);
    setEditId(entry.id);
    setEditModal(true);
  };

  const handleUpdateNote = async () => {
    if (!editId || !processedParams.id) return;
    
    try {
      await noteService.updateNote(processedParams.id, editId, editText);
      setEditModal(false);
      setEditId(null);
      Alert.alert('✅ Éxito', 'Nota actualizada correctamente');
    } catch (error) {
      console.error("Error actualizando nota:", error);
      Alert.alert('❌ Error', 'No se pudo actualizar la nota');
    }
  };

  const handleAddImages = (newImages) => {
    setSelectedImages(prev => [...prev, ...newImages]);
  };

  // Mostrar loading si no hay ID válido
  if (!processedParams.id) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFF" />
        <Text style={styles.loadingText}>Cargando proyecto...</Text>
        <Text style={styles.errorText}>Error: No se pudo cargar el proyecto</Text>
        <Text style={styles.debugText}>Parámetros recibidos: {JSON.stringify(params)}</Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={["#232526", "#414345"]} style={styles.container}>
      <Text style={styles.title}>Bitácora para {processedParams.title}</Text>

      {canWrite ? (
        <NoteEditor
          noteText={noteText}
          onNoteChange={setNoteText}
          selectedImages={selectedImages}
          onSave={handleSaveNote}
          loading={loading}
        />
      ) : (
        <View style={styles.readOnlyMessage}>
          <Text style={styles.readOnlyText}>
            ⚠️ Solo lectura: No tienes permisos para escribir en esta bitácora
          </Text>
        </View>
      )}

      {canWrite && (
        <ImageUploader
          onImagesSelected={handleAddImages}
          selectedImages={selectedImages}
          onClearImages={() => setSelectedImages([])}
        />
      )}

      <NavigationButtons
        projectId={processedParams.id}
        projectTitle={processedParams.title}
      />

      <NotesHistory
        notes={notes}
        loading={notesLoading}
        onEditNote={handleEditNote}
        projectId={processedParams.id}
      />

      <EditNoteModal
        visible={editModal}
        editText={editText}
        onTextChange={setEditText}
        onSave={handleUpdateNote}
        onClose={() => setEditModal(false)}
      />

      {loading && (
        <LoadingOverlay message="Subiendo imágenes..." />
      )}
    </LinearGradient>
  );
}

// Componente de carga overlay
function LoadingOverlay({ message }) {
  return (
    <Modal transparent animationType="fade">
      <View style={styles.loadingOverlay}>
        <ActivityIndicator size="large" color="#FFF" />
        <Text style={styles.loadingText}>{message}</Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E2F',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E1E2F',
    padding: 20,
  },
  loadingText: {
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 16,
  },
  errorText: {
    color: '#F56565',
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 14,
  },
  debugText: {
    color: '#CCC',
    textAlign: 'center',
    fontSize: 12,
    marginTop: 10,
  },
  title: {
    fontSize: 22,
    color: '#FFF',
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  readOnlyMessage: {
    backgroundColor: '#2C2C3A',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  readOnlyText: {
    color: '#ECC94B',
    fontSize: 14,
    textAlign: 'center',
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
});