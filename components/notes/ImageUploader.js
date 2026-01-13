// components/notes/ImageUploader.js
import * as ImagePicker from "expo-image-picker";
import { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

/**
 * Componente para subir imágenes desde la cámara o galería
 * Permite seleccionar múltiples imágenes y muestra miniaturas de las seleccionadas
 * 
 * @component
 * @param {Object} props - Propiedades del componente
 * @param {Function} props.onImagesSelected - Función que se ejecuta al seleccionar imágenes
 * @param {Array<string>} [props.selectedImages=[]] - Array de URIs de imágenes ya seleccionadas
 * @param {Function} props.onClearImages - Función que se ejecuta al limpiar todas las imágenes
 * @returns {JSX.Element} Componente de carga de imágenes con vista previa
 * 
 * @example
 * // Uso básico
 * <ImageUploader
 *   onImagesSelected={(uris) => setImages([...images, ...uris])}
 *   selectedImages={images}
 *   onClearImages={() => setImages([])}
 * />
 */
export default function ImageUploader({
  onImagesSelected,
  selectedImages = [],
  onClearImages
}) {
  const [uploading, setUploading] = useState(false);

  /**
   * Maneja el proceso de carga de imágenes
   * Muestra un alert para elegir entre cámara o galería
   * Solicita permisos y procesa la selección de imágenes
   * 
   * @async
   * @function handleUploadImage
   * @returns {Promise<void>}
   */
  const handleUploadImage = async () => {
    // Mostrar opciones de selección (cámara o galería)
    const opcion = await new Promise((resolve) => {
      Alert.alert(
        "Añadir imagen",
        "¿Deseas tomar una foto o elegir desde la galería?",
        [
          { text: "📸 Tomar foto", onPress: () => resolve("camera") },
          { text: "🖼️ Galería", onPress: () => resolve("gallery") },
          { text: "Cancelar", style: "cancel", onPress: () => resolve(null) },
        ],
        { cancelable: true }
      );
    });

    if (!opcion) return;

    setUploading(true);
    try {
      let result;
      
      // Proceso para tomar foto con cámara
      if (opcion === "camera") {
        const camPerm = await ImagePicker.requestCameraPermissionsAsync();
        if (camPerm.status !== "granted") {
          Alert.alert("Permiso requerido", "Necesitas permitir acceso a la cámara.");
          return;
        }

        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.7,
          allowsEditing: true,
        });
      } else {
        // Proceso para seleccionar de galería
        const libPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (libPerm.status !== "granted") {
          Alert.alert("Permiso requerido", "Necesitas permitir acceso a la galería.");
          return;
        }

        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: true,
          quality: 0.7,
        });
      }

      if (result.canceled) return;

      // Extraer URIs de las imágenes seleccionadas
      const newUris = result.assets
        ? result.assets.map((a) => a.uri)
        : result.uri
        ? [result.uri]
        : [];

      if (newUris.length > 0) {
        onImagesSelected(newUris);
        Alert.alert('✅ Éxito', `Se añadieron ${newUris.length} imagen(es)`);
      }
    } catch (error) {
      console.error("Error en picker:", error);
      Alert.alert('❌ Error', "Ocurrió un error al seleccionar la imagen.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Botón para iniciar la carga de imágenes */}
      <TouchableOpacity
        style={[styles.uploadButton, uploading && styles.disabledButton]}
        onPress={handleUploadImage}
        disabled={uploading}
      >
        <Text style={styles.uploadButtonText}>
          {uploading ? '⏳ Procesando...' : '📷 Añadir Imágenes o Tomar Foto'}
        </Text>
      </TouchableOpacity>

      {/* Vista previa de imágenes seleccionadas */}
      {selectedImages.length > 0 && (
        <View style={styles.imagesContainer}>
          <View style={styles.imagesHeader}>
            <Text style={styles.imagesTitle}>Imágenes seleccionadas:</Text>
            <TouchableOpacity onPress={onClearImages}>
              <Text style={styles.clearText}>Limpiar</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView horizontal style={styles.imagesScroll}>
            {selectedImages.map((uri, idx) => (
              <Image
                key={idx}
                source={{ uri }}
                style={styles.imageThumbnail}
              />
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  uploadButton: {
    backgroundColor: '#DD6B20',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  disabledButton: {
    opacity: 0.6,
  },
  uploadButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  imagesContainer: {
    backgroundColor: '#2C2C3A',
    padding: 12,
    borderRadius: 8,
  },
  imagesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  imagesTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  clearText: {
    color: '#E53E3E',
    fontSize: 14,
    fontWeight: '600',
  },
  imagesScroll: {
    marginHorizontal: -4,
  },
  imageThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 6,
    marginRight: 8,
  },
});