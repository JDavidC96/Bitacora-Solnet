// components/inventory/equipment/TransferEquipmentModal.js
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from "react-native";
import DropdownSelect from "../../DropdownSelect";
import ModalBase from "../../ModalBase";

export default function TransferEquipmentModal({
  visible,
  personnel = [],
  onTransfer,
  onClose,
  loading = false
}) {
  const [newOwner, setNewOwner] = useState(null);

  const handleTransfer = () => {
    if (!newOwner) {
      alert("Selecciona nueva persona a asignar");
      return;
    }
    onTransfer(newOwner);
  };

  const handleClose = () => {
    setNewOwner(null);
    onClose();
  };

  return (
    <ModalBase
      visible={visible}
      title="Transferir Herramienta"
      onClose={handleClose}
      footer={
        <TouchableOpacity
          style={[
            styles.transferButton,
            (!newOwner || loading) && styles.disabledButton
          ]}
          onPress={handleTransfer}
          disabled={!newOwner || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.transferButtonText}>Transferir</Text>
          )}
        </TouchableOpacity>
      }
    >
      <DropdownSelect
        data={personnel.map((p) => ({ label: `${p.nombre} (${p.estado})`, value: p.id }))}
        value={newOwner?.id}
        placeholder="Nueva persona"
        onChange={(val) => {
          const persona = personnel.find((p) => p.id === val);
          setNewOwner(persona);
        }}
      />
    </ModalBase>
  );
}

const styles = StyleSheet.create({
  transferButton: {
    backgroundColor: "#ECC94B",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#718096",
    opacity: 0.7,
  },
  transferButtonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
  },
});