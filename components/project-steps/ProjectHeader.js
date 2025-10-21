import DateTimePicker from '@react-native-community/datetimepicker';
import { Text, TouchableOpacity, View } from 'react-native';
import styles from './styles';

export const ProjectHeader = ({ 
  title, 
  projectStartISO, 
  canChangeStartDateRole, 
  showDatePicker, 
  setShowDatePicker, 
  handleChangeStartDate 
}) => (
  <>
    <Text style={styles.title}>Etapas de {title}</Text>

    <View style={styles.row}>
      <Text style={styles.label}>Fecha de inicio del proyecto:</Text>
      {canChangeStartDateRole ? (
        <TouchableOpacity onPress={() => setShowDatePicker(true)}>
          <Text style={styles.link}>{projectStartISO}</Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.value}>{projectStartISO}</Text>
      )}
    </View>

    {showDatePicker && (
      <DateTimePicker
        value={new Date(projectStartISO)}
        mode="date"
        display="default"
        onChange={(e, date) => {
          setShowDatePicker(false);
          if (date) handleChangeStartDate(date);
        }}
      />
    )}
  </>
);