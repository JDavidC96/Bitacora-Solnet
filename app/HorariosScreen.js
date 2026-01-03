// screens/HorariosScreen.js
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useUser } from "../context/UserContext";
import { db } from "../firebase/firebaseConfig";

export default function HorariosScreen() {
  const { user, role } = useUser();

  const canUpload = useMemo(() => role === "Ingeniero" || role === "Administrador", [role]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [current, setCurrent] = useState(null); // { imageBase64, mimeType, updatedAt, updatedBy }
  const [previewUri, setPreviewUri] = useState(null);

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

  useEffect(() => {
    loadCurrent();
  }, []);

  const pickImage = async () => {
    if (!canUpload) {
      Alert.alert("Sin permiso", "Solo Ingenieros (o Administrador) pueden subir el horario.");
      return;
    }

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permiso requerido", "Necesitas permitir acceso a tus fotos para subir el horario.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (result.canceled) return;

    const uri = result.assets?.[0]?.uri;
    if (!uri) return;

    setPreviewUri(uri);
  };

  const upload = async () => {
    if (!canUpload) return;
    if (!previewUri) {
      Alert.alert("Falta imagen", "Selecciona una imagen primero.");
      return;
    }

    try {
      setSaving(true);

      // 1) Reducir tamaño para que quepa en Firestore
      // Ajusta width/quality si se te pasa del límite
      const manipulated = await ImageManipulator.manipulateAsync(
        previewUri,
        [{ resize: { width: 1080 } }],
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
      );

      // 2) Leer base64
      const base64 = await FileSystem.readAsStringAsync(manipulated.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // 3) Guardar en Firestore (reemplazo)
      const ref = doc(db, "horarios", "actual");
      await setDoc(ref, {
        imageBase64: base64,
        mimeType: "image/jpeg",
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid || null,
      });

      setPreviewUri(null);
      await loadCurrent();
      Alert.alert("Listo", "Horario actualizado. Se reemplazó el anterior.");
    } catch (e) {
      console.error("Error subiendo horario:", e);

      // Si el doc supera el límite, Firestore suele fallar.
      Alert.alert(
        "Error al subir",
        "No se pudo guardar la imagen. Si la foto es muy pesada, hay que bajarle más la calidad/tamaño (o pasarlo a Storage)."
      );
    } finally {
      setSaving(false);
    }
  };

  const currentUri = useMemo(() => {
    if (!current?.imageBase64) return null;
    return `data:${current.mimeType || "image/jpeg"};base64,${current.imageBase64}`;
  }, [current]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Horario semanal</Text>

      {loading ? (
        <ActivityIndicator />
      ) : (
        <>
          {currentUri ? (
            <Image source={{ uri: currentUri }} style={styles.image} resizeMode="contain" />
          ) : (
            <Text style={styles.empty}>Aún no hay un horario publicado.</Text>
          )}
        </>
      )}

      {canUpload && (
        <View style={styles.box}>
          <Text style={styles.subtitle}>Subir nuevo horario (reemplaza el anterior)</Text>

          {previewUri ? (
            <Image source={{ uri: previewUri }} style={styles.preview} resizeMode="contain" />
          ) : (
            <Text style={styles.hint}>Selecciona una imagen para previsualizarla.</Text>
          )}

          <View style={styles.row}>
            <TouchableOpacity style={styles.btn} onPress={pickImage} disabled={saving}>
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

      {!canUpload && (
        <Text style={styles.note}>
          Solo Ingenieros (y/o Administrador) pueden subir el horario. Tú solo lo puedes visualizar.
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  title: { fontSize: 20, fontWeight: "700" },
  subtitle: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  empty: { opacity: 0.7, marginTop: 10 },
  image: { width: "100%", height: 420, backgroundColor: "#00000010", borderRadius: 10 },
  box: { marginTop: 16, padding: 12, borderRadius: 12, backgroundColor: "#00000008" },
  hint: { opacity: 0.7, marginBottom: 8 },
  preview: { width: "100%", height: 220, backgroundColor: "#00000010", borderRadius: 10, marginBottom: 10 },
  row: { flexDirection: "row", gap: 10 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: "#111827", alignItems: "center" },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: "white", fontWeight: "700" },
  note: { marginTop: 14, opacity: 0.7 },
});
