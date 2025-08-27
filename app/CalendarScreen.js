import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useUser } from '../context/UserContext';

// Firebase
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

export default function CalendarScreen() {
  const { id, title } = useLocalSearchParams();
  const { role } = useUser();

  const [selected, setSelected] = useState(null);
  const [entries, setEntries] = useState([]);
  const [etapas, setEtapas] = useState([]);

  // === Escuchar notas (solo lectura) ===
  useEffect(() => {
    const q = collection(db, 'proyectos', id, 'notas');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ idDoc: d.id, ...d.data() }));
      setEntries(data);
    });
    return () => unsubscribe();
  }, [id]);

  // === Escuchar etapas ===
  useEffect(() => {
    const q = collection(db, 'proyectos', id, 'etapas');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ idDoc: d.id, ...d.data() }));
      setEtapas(data);
    });
    return () => unsubscribe();
  }, [id]);

  // === Fechas marcadas ===
  const markedDates = {};

  etapas.forEach(etapa => {
    if (etapa.fechaInicio && etapa.fechaFin) {
      if (etapa.fechaInicio === etapa.fechaFin) {
        // Inicio y fin el mismo día => morado
        markedDates[etapa.fechaInicio] = { color: "purple", tipo: "inicio-fin", etapa };
      } else {
        markedDates[etapa.fechaInicio] = { color: "green", tipo: "inicio", etapa };
        // Solo marcar fechaFin si NO está cumplida
        if (!etapa.cumplida) {
          markedDates[etapa.fechaFin] = { color: "red", tipo: "fin", etapa };
        }
      }
    }
    if (etapa.fechaFinOriginal && etapa.fechaFin && etapa.fechaFinOriginal !== etapa.fechaFin) {
      markedDates[etapa.fechaFinOriginal] = { color: "yellow", tipo: "prorroga", etapa };
    }
    if (etapa.fechaCumplida) {
      markedDates[etapa.fechaCumplida] = { color: "green", tipo: "cumplida", etapa };
    }
  });

  entries.forEach(entry => {
    markedDates[entry.fechaISO] = { color: "blue", tipo: "nota" };
  });

  // === Filtrar data del día seleccionado ===
  const notesOfSelectedDay = entries.filter(e => e.fechaISO === selected);
  const etapasDelDia = etapas.filter(
    e =>
      e.fechaInicio === selected ||
      e.fechaFin === selected ||
      e.fechaFinOriginal === selected ||
      e.fechaCumplida === selected
  );

  // === Función para calcular emoji por etapa ===
  const getEmojiForDate = (dateString) => {
    // Cumplida
    const etapaCumplida = etapas.find(e => e.fechaCumplida === dateString);
    if (etapaCumplida) return " 🙂";

    // Retraso
    const etapa = etapas.find(e => e.fechaFin === dateString && !e.cumplida);
    if (etapa) {
      const hoyISO = new Date().toISOString().split("T")[0];
      const retraso = new Date(hoyISO) > new Date(etapa.fechaFin);
      return retraso ? " 😟" : "";
    }

    return "";
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Calendario de {title}</Text>

        <Calendar
          onDayPress={(day) => setSelected(day.dateString)}
          markingType="custom"
          theme={{
            calendarBackground: '#1E1E2F',
            dayTextColor: '#FFF',
            monthTextColor: '#FFF',
            selectedDayTextColor: '#FFF',
          }}
          dayComponent={({ date, state }) => {
            const mark = markedDates[date.dateString];
            const emoji = getEmojiForDate(date.dateString);

            return (
              <TouchableOpacity
                style={[
                  {
                    width: 40,
                    height: 40,
                    borderRadius: 6,
                    justifyContent: 'center',
                    alignItems: 'center',
                  },
                  mark?.color ? { backgroundColor: mark.color } : {},
                  selected === date.dateString ? { borderWidth: 2, borderColor: '#5A67D8' } : {}
                ]}
                onPress={() => setSelected(date.dateString)}
              >
                <Text
                  style={{
                    color: state === 'disabled' ? '#555' : '#FFF',
                    fontWeight: 'bold',
                    fontSize: 12
                  }}
                >
                  {date.day}{emoji}
                </Text>
              </TouchableOpacity>
            );
          }}
        />

        {selected && (
          <ScrollView style={styles.notesBox}>
            <Text style={styles.notesTitle}>Notas del {selected}:</Text>
            {notesOfSelectedDay.length === 0 ? (
              <Text style={{ color: '#888' }}>No hay notas aún.</Text>
            ) : (
              notesOfSelectedDay.map((entry) => (
                <Text key={entry.idDoc} style={styles.noteItem}>
                  • {entry.texto ? entry.texto : "(Vacía)"} — ✍️ {entry.autor || "Anónimo"}
                </Text>
              ))
            )}

            <Text style={styles.notesTitle}>Etapas en esta fecha:</Text>
            {etapasDelDia.length === 0 ? (
              <Text style={{ color: '#888' }}>No hay etapas.</Text>
            ) : (
              etapasDelDia.map(e => {
                let color = '#FFF';
                let label = '';

                if (e.fechaInicio === selected && e.fechaFin === selected) {
                  color = 'purple';
                } else if (e.fechaInicio === selected) {
                  color = 'green';
                  label = `Inicio ${e.titulo}`;
                } else if (e.fechaFinOriginal === selected) {
                  color = 'yellow'; 
                  label = `Prórroga ${e.titulo}`;
                } else if (e.fechaFin === selected && !e.cumplida) {
                  color = 'red'; 
                  label = `Fin ${e.titulo}`;
                } else if (e.fechaCumplida === selected) {
                  color = 'green';
                  label = `Cumplida ${e.titulo}`;
                }

                const emoji = e.fechaCumplida === selected ? " 🙂" : "";

                return (
                  <Text key={e.idDoc} style={{ color }}>
                    • {label}{emoji}
                  </Text>
                );
              })
            )}
          </ScrollView>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1E1E2F', padding: 16 },
  title: { fontSize: 22, color: '#FFF', marginBottom: 12, fontWeight: 'bold' },
  notesBox: { marginTop: 20 },
  notesTitle: { fontSize: 18, color: '#FFF', marginBottom: 8 },
  noteItem: { fontSize: 14, color: '#FFF', marginBottom: 4 },
});
