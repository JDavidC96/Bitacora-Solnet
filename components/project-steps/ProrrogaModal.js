import { Text, TextInput, TouchableOpacity } from 'react-native';
import ModalBase from '../ModalBase';
import styles from './styles';

export const ProrrogaModal = ({ visible, target, dias, onClose, onDiasChange, onApply }) => (
  <ModalBase
    visible={visible}
    title="Agregar prórroga"
    onClose={onClose}
    footer={
      <TouchableOpacity style={[styles.button, { backgroundColor: "#48BB78" }]} onPress={onApply}>
        <Text style={styles.buttonText}>Aplicar</Text>
      </TouchableOpacity>
    }
  >
    <Text style={styles.modalText}>
      {target?.titulo} — ¿Cuántos días hábiles?
    </Text>
    <TextInput
      style={styles.input}
      keyboardType="number-pad"
      placeholder="Días"
      placeholderTextColor="#aaa"
      value={dias}
      onChangeText={onDiasChange}
    />
  </ModalBase>
);