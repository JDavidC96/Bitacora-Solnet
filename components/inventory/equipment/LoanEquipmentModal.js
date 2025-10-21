// components/inventory/equipment/LoanEquipmentModal.js
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from "react-native";
import DropdownSelect from "../../DropdownSelect";
import ModalBase from "../../ModalBase";

export default function LoanEquipmentModal({
  visible,
  equipment = [],
  personnel = [],
  onLoan,
  onClose,
  loading = false
}) {
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [selectedPerson, setSelectedPerson] = useState(null);

  const handleLoan = () => {
    if (!selectedEquipment || !selectedPerson) {
      alert("Selecciona herramienta y persona");
      return;
    }
    onLoan(selectedEquipment, selectedPerson);
  };

  const handleClose = () => {
    setSelectedEquipment(null);
    setSelectedPerson(null);
    onClose();
  };

  return (
    <ModalBase
      visible={visible}
      title="Prestar Herramienta"
      onClose={handleClose}
      footer={
        <TouchableOpacity
          style={[
            styles.loanButton,
            (!selectedEquipment || !selectedPerson || loading) && styles.disabledButton
          ]}
          onPress={handleLoan}
          disabled={!selectedEquipment || !selectedPerson || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.loanButtonText}>Prestar</Text>
          )}
        </TouchableOpacity>
      }
    >
      <DropdownSelect
        data={equipment.map((h) => ({ label: h.nombre, value: h.id }))}
        value={selectedEquipment?.id}
        placeholder="Selecciona herramienta"
        onChange={(val) => {
          const herramienta = equipment.find((h) => h.id === val);
          setSelectedEquipment(herramienta);
        }}
      />

      <DropdownSelect
        data={personnel.map((p) => ({ label: `${p.nombre} (${p.estado})`, value: p.id }))}
        value={selectedPerson?.id}
        placeholder="Selecciona persona"
        onChange={(val) => {
          const persona = personnel.find((p) => p.id === val);
          setSelectedPerson(persona);
        }}
      />
    </ModalBase>
  );
}

const styles = StyleSheet.create({
  loanButton: {
    backgroundColor: "#805AD5",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#718096",
    opacity: 0.7,
  },
  loanButtonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
  },
});