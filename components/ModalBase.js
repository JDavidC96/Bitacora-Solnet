// components/ModalBase.js
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function ModalBase({ 
  visible, 
  title, 
  children, 
  onClose, 
  footer,
  hideCancelButton = false 
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {title && <Text style={styles.title}>{title}</Text>}

          <View style={{ marginBottom: 16 }}>{children}</View>

          <View style={styles.footer}>
  {typeof footer === "string" ? (
    <Text style={styles.footerText}>{footer}</Text>
  ) : (
    footer
  )}

  {!hideCancelButton && (
    <TouchableOpacity style={[styles.btn, styles.cancel]} onPress={onClose}>
      <Text style={styles.btnText}>Cancelar</Text>
    </TouchableOpacity>
  )}
</View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: "85%",
    backgroundColor: "#2C2C3A",
    padding: 20,
    borderRadius: 12,
  },
  title: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  footer: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    minHeight: 44,
  },
  cancel: { backgroundColor: "#E53E3E" },
  btnText: { color: "#FFF", fontWeight: "bold" },
});