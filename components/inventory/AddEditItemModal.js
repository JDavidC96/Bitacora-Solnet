// components/inventory/AddEditItemModal.js
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import DropdownSelect from '../DropdownSelect';
import ModalBase from '../ModalBase';

export default function AddEditItemModal({
  visible,
  editingItem,
  onSave,
  onClose,
  loading = false
}) {
  const [form, setForm] = useState({
    nombre: '',
    cantidad: '',
    tipo_medida: 'Unidad',
    notas: ''
  });

  useEffect(() => {
    if (editingItem) {
      setForm({
        nombre: editingItem.nombre || '',
        cantidad: editingItem.cantidad?.toString() || '',
        tipo_medida: editingItem.tipo_medida || 'Unidad',
        notas: editingItem.notas || ''
      });
    } else {
      setForm({
        nombre: '',
        cantidad: '',
        tipo_medida: 'Unidad',
        notas: ''
      });
    }
  }, [editingItem, visible]);

  const handleSave = () => {
    if (!form.nombre.trim() || !form.cantidad) {
      alert('Por favor completa nombre y cantidad');
      return;
    }

    if (isNaN(form.cantidad)) {
      alert('La cantidad debe ser un número');
      return;
    }

    onSave({
      nombre: form.nombre.trim(),
      cantidad: parseInt(form.cantidad),
      tipo_medida: form.tipo_medida,
      notas: form.notas.trim()
    });
  };

  const handleClose = () => {
    setForm({
      nombre: '',
      cantidad: '',
      tipo_medida: 'Unidad',
      notas: ''
    });
    onClose();
  };

  return (
    <ModalBase
      visible={visible}
      title={editingItem ? "Editar Ítem" : "Nuevo Ítem"}
      onClose={handleClose}
      footer={
        <TouchableOpacity
          style={[
            styles.saveButton,
            loading && styles.disabledButton
          ]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveButtonText}>Guardar</Text>
          )}
        </TouchableOpacity>
      }
    >
      <TextInput
        style={styles.input}
        placeholder="Nombre del ítem"
        placeholderTextColor="#AAA"
        value={form.nombre}
        onChangeText={(text) => setForm(prev => ({ ...prev, nombre: text }))}
      />

      <TextInput
        style={styles.input}
        placeholder="Cantidad"
        placeholderTextColor="#AAA"
        keyboardType="numeric"
        value={form.cantidad}
        onChangeText={(text) => {
          if (/^\d*$/.test(text)) {
            setForm(prev => ({ ...prev, cantidad: text }));
          }
        }}
      />

      <DropdownSelect
        data={[
          { label: "Unidad", value: "Unidad" },
          { label: "Metros", value: "Metros" },
          { label: "Litros", value: "Litros" },
          { label: "Kilogramos", value: "Kilogramos" },
        ]}
        value={form.tipo_medida}
        placeholder="Selecciona unidad"
        onChange={(val) => setForm(prev => ({ ...prev, tipo_medida: val }))}
      />

      <TextInput
        style={[styles.input, { height: 80 }]}
        placeholder="Notas (opcional)"
        placeholderTextColor="#AAA"
        multiline
        value={form.notas}
        onChangeText={(text) => setForm(prev => ({ ...prev, notas: text }))}
      />
    </ModalBase>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    color: '#000',
  },
  saveButton: {
    backgroundColor: '#5A67D8',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#718096',
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});