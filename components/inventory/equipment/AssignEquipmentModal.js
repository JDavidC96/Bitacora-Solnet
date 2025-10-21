// components/inventory/equipment/AssignEquipmentModal.js
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from "react-native";
import DropdownSelect from "../../DropdownSelect";
import ModalBase from "../../ModalBase";

export default function AssignEquipmentModal({
  visible,
  equipment = [],
  personnel = [],
  onAssign,
  onClose,
  loading = false
}) {
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [selectedPerson, setSelectedPerson] = useState(null);

  const handleAssign = () => {
    if (!selectedEquipment || !selectedPerson) {
      alert("Selecciona herramienta y persona");
      return;
    }
    onAssign(selectedEquipment, selectedPerson);
  };

  const handleClose = () => {
    setSelectedEquipment(null);
    setSelectedPerson(null);
    onClose();
  };

  return (
    <ModalBase
      visible={visible}
      title="Asignar Herramienta"
      onClose={handleClose}
      footer={
        <TouchableOpacity
          style={[
            styles.assignButton,
            (!selectedEquipment || !selectedPerson || loading) && styles.disabledButton
          ]}
          onPress={handleAssign}
          disabled={!selectedEquipment || !selectedPerson || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.assignButtonText}>Asignar</Text>
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
  assignButton: {
    backgroundColor: "#3182CE",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#718096",
    opacity: 0.7,
  },
  assignButtonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
  },
});