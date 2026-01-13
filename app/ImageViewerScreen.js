//app/ImageViewerScreen.js
import { useLocalSearchParams, useRouter } from "expo-router";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import ImageViewer from "react-native-image-zoom-viewer";

/**
 * Pantalla de visualización de imágenes con zoom y navegación.
 * 
 * Esta pantalla proporciona una experiencia completa de visualización de imágenes que permite:
 * - Ver imágenes individuales o galerías con zoom con gestos de pellizco (pinch)
 * - Navegar entre múltiples imágenes (si se proporciona más de una URL)
 * - Cerrar la visualización deslizando hacia abajo o presionando el botón de cerrar
 * - Fondo negro para mejor contraste y experiencia inmersiva
 * - Compatible con imágenes locales y remotas (URLs web)
 * 
 * Se utiliza comúnmente para:
 * - Ampliar imágenes de proyectos, materiales o documentos
 * - Ver galerías de fotos adjuntas a notas o proyectos
 * - Inspeccionar detalles en imágenes técnicas o planos
 * 
 * @component
 * @example
 * // Navegación con una sola imagen:
 * // router.push(`/ImageViewerScreen?urls=${encodeURIComponent(imageUrl)}`)
 * 
 * // Navegación con múltiples imágenes:
 * // router.push(`/ImageViewerScreen?urls=${encodeURIComponent(url1+','+url2)}`)
 * 
 * @returns {JSX.Element} Componente de visualización de imágenes
 */
export default function ImageViewerScreen() {
  const { urls } = useLocalSearchParams(); // Obtiene URLs de las imágenes como parámetro de navegación
  const router = useRouter();

  /**
   * Procesa las URLs de las imágenes desde el parámetro de búsqueda
   * - Divide las URLs separadas por comas
   * - Convierte cada URL en un objeto compatible con react-native-image-zoom-viewer
   * @type {Array<{url: string}>}
   */
  const images = urls ? urls.split(",").map(url => ({ url })) : [];

  // Si no hay imágenes para mostrar, podría manejarse aquí
  // (aunque la navegación debería asegurarse de pasar al menos una URL)

  return (
    <View style={styles.container}>
      {/* Modal que ocupa toda la pantalla para experiencia inmersiva */}
      <Modal 
        visible={true} 
        transparent={true} // Fondo transparente para efecto overlay
        animationType="fade" // Animación de aparición (por defecto)
      >
        {/* Componente principal de visualización de imágenes */}
        <ImageViewer
          imageUrls={images} // Array de imágenes a mostrar
          enableSwipeDown // Permite cerrar deslizando hacia abajo
          onSwipeDown={() => router.back()} // Acción al deslizar hacia abajo
          saveToLocalByLongPress={false} // Deshabilita guardado con presión larga
          enableSwipeUp // Habilita navegación por gestos (si hay múltiples imágenes)
          swipeDownThreshold={50} // Sensibilidad para cerrar con gesto
          backgroundColor="#000000" // Fondo negro para mejor contraste
          renderIndicator={(currentIndex, allSize) => 
            // Indicador de posición (ej: "1/3")
            allSize > 1 && (
              <View style={styles.indicator}>
                <Text style={styles.indicatorText}>
                  {currentIndex + 1} / {allSize}
                </Text>
              </View>
            )
          }
        />

        {/* Botón de cerrar flotante para acceso rápido */}
        <TouchableOpacity 
          style={styles.closeButton} 
          onPress={() => router.back()}
          activeOpacity={0.7} // Feedback visual al tocar
        >
          <Text style={styles.closeText}>✖</Text>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

/**
 * Estilos para la pantalla de visualización de imágenes
 * Utiliza fondo negro para experiencia de visualización óptima
 */
const styles = StyleSheet.create({
  /**
   * Contenedor principal
   * Fondo negro completo para pantalla de visualización inmersiva
   */
  container: { 
    flex: 1, 
    backgroundColor: "#000" // Negro puro para mejor contraste
  },

  /**
   * Botón de cerrar flotante
   * Posicionado en la esquina superior derecha para fácil acceso
   */
  closeButton: {
    position: "absolute",
    top: 40, // Debajo de la barra de estado
    right: 20, // Margen derecho
    backgroundColor: "rgba(0,0,0,0.6)", // Fondo semitransparente
    borderRadius: 20, // Forma circular
    padding: 8, // Espaciado interno
    zIndex: 10, // Asegura que esté sobre la imagen
    width: 40, // Tamaño consistente
    height: 40, // Tamaño consistente
    justifyContent: "center", // Centra el icono verticalmente
    alignItems: "center", // Centra el icono horizontalmente
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)", // Borde sutil para visibilidad
  },

  /**
   * Texto del botón de cerrar
   * Icono "X" grande y visible
   */
  closeText: { 
    color: "#fff", // Blanco puro
    fontSize: 18, // Tamaño legible
    fontWeight: "300", // Peso ligero para elegancia
  },

  /**
   * Indicador de posición para galerías
   * Muestra el índice actual y el total (ej: "2/5")
   */
  indicator: {
    position: "absolute",
    top: 40, // Misma posición que botón cerrar pero centrado
    alignSelf: "center", // Centrado horizontal
    backgroundColor: "rgba(0,0,0,0.6)", // Fondo semitransparente
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },

  /**
   * Texto del indicador
   */
  indicatorText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
});
