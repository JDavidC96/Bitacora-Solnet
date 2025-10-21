import { useLocalSearchParams, useRouter } from "expo-router";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import ImageViewer from "react-native-image-zoom-viewer";

export default function ImageViewerScreen() {
  const { urls } = useLocalSearchParams();
  const router = useRouter();

  // separar las urls por coma
  const images = urls ? urls.split(",").map(url => ({ url })) : [];

  return (
    <View style={styles.container}>
      <Modal visible={true} transparent={true}>
        <ImageViewer
          imageUrls={images}
          enableSwipeDown
          onSwipeDown={() => router.back()}
          saveToLocalByLongPress={false}
        />

        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <Text style={styles.closeText}>✖</Text>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  closeButton: {
    position: "absolute",
    top: 40,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 20,
    padding: 8,
    zIndex: 10,
  },
  closeText: { color: "#fff", fontSize: 18 },
});
