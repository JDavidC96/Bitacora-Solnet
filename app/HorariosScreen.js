// screens/HorariosScreen.js
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useUser } from "../context/UserContext";
import { db } from "../firebase/firebaseConfig";

/**
 * Pantalla de gestión de horarios semanales para el equipo.
 * 
 * Esta pantalla permite:
 * - Visualizar el horario semanal actual del equipo
 * - Subir y reemplazar el horario (solo para Ingenieros y Administradores)
 * - Previsualizar imágenes antes de publicarlas
 * - Optimizar automáticamente el tamaño de las imágenes para Firestore
 * 
 * El horario se almacena en Firestore como una imagen en base64 dentro del documento "horarios/actual".
 * 
 * @component
 * @example
 * // Navegación desde otras pantallas:
 * // router.push('/HorariosScreen')
 * 
 * @returns {JSX.Element} Componente de la pantalla de horarios
 */
export default function HorariosScreen() {
  // Contexto del usuario
  const { user, role } = useUser();

  // Permisos: Solo ingenieros y administradores pueden subir horarios
  const canUpload = useMemo(() => role === "Ingeniero" || role === "Administrador", [role]);

  // Estados
  const [loading, setLoading] = useState(true); // Carga del horario actual
  const [saving, setSaving] = useState(false); // Estado de guardado

  const [current, setCurrent] = useState(null); // Horario actual: { imageBase64, mimeType, updatedAt, updatedBy }
  const [previewUri, setPreviewUri] = useState(null); // URI de la imagen seleccionada para previsualizar

  /**
   * Carga el horario actual desde Firestore
   * Consulta el documento "horarios/actual" para obtener la imagen en base64
   * @async
   */
  const loadCurrent = async () => {
    try {
      setLoading(true);
      const ref = doc(db, "horarios", "actual");
      const snap = await getDoc(ref);
      if (snap.exists()) setCurrent(snap.data());
      else setCurrent(null);
    } catch (e) {
      console.error("Error cargando horario:", e);
      Alert.alert("Error", "No se pudo cargar el horario actual.");
    } finally {
      setLoading(false);
    }
  };

  // Efecto para cargar el horario al montar el componente
  useEffect(() => {
    loadCurrent();
  }, []);

  /**
   * Abre el selector de imágenes para elegir un nuevo horario
   * Verifica permisos antes de permitir la selección
   * @async
   */
  const pickImage = async () => {
    if (!canUpload) {
      Alert.alert("Sin permiso", "Solo Ingenieros (o Administrador) pueden subir el horario.");
      return;
    }

    // Solicitar permisos para acceder a la galería
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permiso requerido", "Necesitas permitir acceso a tus fotos para subir el horario.");
      return;
    }

    // Abrir selector de imágenes
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1, // Calidad máxima inicial (se optimizará después)
    });

    if (result.canceled) return;

    const uri = result.assets?.[0]?.uri;
    if (!uri) return;

    setPreviewUri(uri); // Establecer imagen para previsualización
  };

  /**
   * Sube y publica el nuevo horario
   * Optimiza la imagen y la guarda en Firestore como base64
   * @async
   */
  const upload = async () => {
    if (!canUpload) return;
    if (!previewUri) {
      Alert.alert("Falta imagen", "Selecciona una imagen primero.");
      return;
    }

    try {
      setSaving(true);

      // 1) Optimizar imagen para reducir tamaño (evitar límites de Firestore)
      const manipulated = await ImageManipulator.manipulateAsync(
        previewUri,
        [{ resize: { width: 1080 } }], // Redimensionar a 1080px de ancho
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG } // Comprimir al 60%
      );

      // 2) Convertir imagen a base64 para almacenar en Firestore
      const base64 = await FileSystem.readAsStringAsync(manipulated.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // 3) Guardar en Firestore (reemplaza el horario anterior)
      const ref = doc(db, "horarios", "actual");
      await setDoc(ref, {
        imageBase64: base64,
        mimeType: "image/jpeg",
        updatedAt: serverTimestamp(), // Marca temporal de actualización
        updatedBy: user?.uid || null, // ID del usuario que subió el horario
      });

      // Limpiar previsualización y recargar horario actual
      setPreviewUri(null);
      await loadCurrent();
      Alert.alert("Listo", "Horario actualizado. Se reemplazó el anterior.");
    } catch (e) {
      console.error("Error subiendo horario:", e);

      // Manejo de errores específicos para imágenes muy grandes
      Alert.alert(
        "Error al subir",
        "No se pudo guardar la imagen. Si la foto es muy pesada, hay que bajarle más la calidad/tamaño (o pasarlo a Storage)."
      );
    } finally {
      setSaving(false);
    }
  };

  /**
   * Convierte la imagen base64 almacenada en Firestore a una URI válida para mostrar
   * @type {string|null}
   */
  const currentUri = useMemo(() => {
    if (!current?.imageBase64) return null;
    return `data:${current.mimeType || "image/jpeg"};base64,${current.imageBase64}`;
  }, [current]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Título de la pantalla */}
      <Text style={styles.title}>Horario semanal</Text>

      {/* Mostrar horario actual o indicador de carga */}
      {loading ? (
        <ActivityIndicator />
      ) : (
        <>
          {currentUri ? (
            <Image 
              source={{ uri: currentUri }} 
              style={styles.image} 
              resizeMode="contain" 
            />
          ) : (
            <Text style={styles.empty}>Aún no hay un horario publicado.</Text>
          )}
        </>
      )}

      {/* Sección de subida (solo para usuarios con permisos) */}
      {canUpload && (
        <View style={styles.box}>
          <Text style={styles.subtitle}>Subir nuevo horario (reemplaza el anterior)</Text>

          {/* Previsualización de la imagen seleccionada */}
          {previewUri ? (
            <Image 
              source={{ uri: previewUri }} 
              style={styles.preview} 
              resizeMode="contain" 
            />
          ) : (
            <Text style={styles.hint}>Selecciona una imagen para previsualizarla.</Text>
          )}

          {/* Botones de acción */}
          <View style={styles.row}>
            <TouchableOpacity 
              style={styles.btn} 
              onPress={pickImage} 
              disabled={saving}
            >
              <Text style={styles.btnText}>Elegir imagen</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, !previewUri && styles.btnDisabled]}
              onPress={upload}
              disabled={saving || !previewUri}
            >
              <Text style={styles.btnText}>{saving ? "Subiendo..." : "Publicar"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Mensaje informativo para usuarios sin permisos */}
      {!canUpload && (
        <Text style={styles.note}>
          Solo Ingenieros (y/o Administrador) pueden subir el horario. Tú solo lo puedes visualizar.
        </Text>
      )}
    </ScrollView>
  );
}

// ========== ESTILOS ==========
const styles = StyleSheet.create({
  /**
   * Contenedor principal
   * Padding y espaciado vertical entre elementos
   */
  container: { 
    padding: 16, 
    gap: 12 
  },

  /**
   * Título principal de la pantalla
   */
  title: { 
    fontSize: 20, 
    fontWeight: "700" 
  },

  /**
   * Subtítulo para sección de subida
   */
  subtitle: { 
    fontSize: 14, 
    fontWeight: "600", 
    marginBottom: 8 
  },

  /**
   * Mensaje cuando no hay horario publicado
   */
  empty: { 
    opacity: 0.7, 
    marginTop: 10 
  },

  /**
   * Estilo para la imagen del horario actual
   * Alto fijo con fondo semitransparente
   */
  image: { 
    width: "100%", 
    height: 420, 
    backgroundColor: "#00000010", // Negro al 6% de opacidad
    borderRadius: 10 
  },

  /**
   * Contenedor para la sección de subida
   * Fondo semitransparente con bordes redondeados
   */
  box: { 
    marginTop: 16, 
    padding: 12, 
    borderRadius: 12, 
    backgroundColor: "#00000008" // Negro al 3% de opacidad
  },

  /**
   * Texto de sugerencia para seleccionar imagen
   */
  hint: { 
    opacity: 0.7, 
    marginBottom: 8 
  },

  /**
   * Previsualización de la imagen seleccionada
   * Más pequeño que la imagen final
   */
  preview: { 
    width: "100%", 
    height: 220, 
    backgroundColor: "#00000010", 
    borderRadius: 10, 
    marginBottom: 10 
  },

  /**
   * Fila para botones (uno al lado del otro)
   */
  row: { 
    flexDirection: "row", 
    gap: 10 
  },

  /**
   * Botón estilo primario (oscuro)
   */
  btn: { 
    flex: 1, 
    paddingVertical: 12, 
    borderRadius: 10, 
    backgroundColor: "#111827", // Gris muy oscuro
    alignItems: "center" 
  },

  /**
   * Estado deshabilitado del botón
   */
  btnDisabled: { 
    opacity: 0.4 
  },

  /**
   * Texto del botón (blanco para contraste)
   */
  btnText: { 
    color: "white", 
    fontWeight: "700" 
  },

  /**
   * Nota informativa para usuarios sin permisos
   */
  note: { 
    marginTop: 14, 
    opacity: 0.7 
  },
});
