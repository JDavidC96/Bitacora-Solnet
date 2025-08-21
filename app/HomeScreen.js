import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { db } from '../firebase/firebaseConfig';

export default function HomeScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();

  const [projects, setProjects] = useState([]);
  const [personal, setPersonal] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);

  const [newProjectName, setNewProjectName] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  const [editedName, setEditedName] = useState('');
  const [targetProject, setTargetProject] = useState(null);

  // Estado para la fecha inicial
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  // Escuchar proyectos y personal con cleanup correcto
  useEffect(() => {
    const etapaUnsubs = [];

    const unsubProjects = onSnapshot(collection(db, 'proyectos'), (snapshot) => {
      const proyArray = snapshot.docs.map((d) => ({
        idDoc: d.id,
        ...d.data(),
        progress: 0,
      }));
      setProjects(proyArray);

      // limpiar listeners anteriores
      etapaUnsubs.forEach(unsub => unsub());
      etapaUnsubs.length = 0;

      // listeners por cada proyecto
      proyArray.forEach((proj) => {
        const unsubEtapas = onSnapshot(
          collection(db, 'proyectos', proj.idDoc, 'etapas'),
          (etapasSnap) => {
            const total = etapasSnap.size;
            const cumplidas = etapasSnap.docs.filter(
              (et) => et.data().cumplida
            ).length;
            const progress = total > 0 ? cumplidas / total : 0;
            setProjects((prev) =>
              prev.map((p) =>
                p.idDoc === proj.idDoc ? { ...p, progress } : p
              )
            );
          }
        );
        etapaUnsubs.push(unsubEtapas);
      });
    });

    const unsubPersonal = onSnapshot(collection(db, 'personal'), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setPersonal(data);
    });

    return () => {
      unsubProjects();
      unsubPersonal();
      etapaUnsubs.forEach(unsub => unsub());
    };
  }, []);

  // Notificación si se guardó nota
  useEffect(() => {
    if (params?.saved === 'true') {
      Notifications.scheduleNotificationAsync({
        content: {
          title: '✅ Entrada guardada',
          body: 'Tu nota fue registrada correctamente.',
        },
        trigger: null,
      });
    }
  }, [params]);

  // Crear proyecto
  const handleAddProject = async () => {
    if (newProjectName.trim() === '') return;
    try {
      await addDoc(collection(db, 'proyectos'), {
        title: newProjectName.trim(),
        startDate: selectedDate.toISOString(),
      });
      setNewProjectName('');
      setSelectedDate(new Date());
      setModalVisible(false);
    } catch (error) {
      console.error('Error agregando proyecto:', error);
    }
  };

  // Eliminar proyecto con sus subcolecciones
  const handleDelete = async () => {
    if (!selectedProject) return;
    try {
      const projectId = selectedProject.idDoc;
      const etapasRef = collection(db, 'proyectos', projectId, 'etapas');
      const notasRef = collection(db, 'proyectos', projectId, 'notas');
      const etapasSnap = await getDocs(etapasRef);
      etapasSnap.forEach(async (et) => await deleteDoc(doc(etapasRef, et.id)));
      const notasSnap = await getDocs(notasRef);
      notasSnap.forEach(async (nt) => await deleteDoc(doc(notasRef, nt.id)));
      await deleteDoc(doc(db, 'proyectos', projectId));
      setSelectedProject(null);
    } catch (error) {
      console.error('Error eliminando proyecto y sus datos relacionados:', error);
    }
  };

  // Editar nombre de proyecto
  const confirmEdit = async () => {
    try {
      await updateDoc(doc(db, 'proyectos', selectedProject.idDoc), {
        title: editedName,
      });
      setEditModalVisible(false);
      setSelectedProject(null);
    } catch (error) {
      console.error('Error editando proyecto:', error);
    }
  };

  // Render item lista
  const renderItem = ({ item }) => {
    const asignados = personal.filter(p => p.proyectoAsignado === item.title);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          router.push({
            pathname: '/NoteScreen',
            params: { id: item.idDoc, title: item.title || "Proyecto" },
          })
        }
        onLongPress={() => setSelectedProject(item)}
      >
        <Text style={styles.cardText}>
          {item.title ? item.title : "(Sin nombre)"}
        </Text>

        {item.startDate ? (
          <Text style={styles.dateText}>
            📅 {new Date(item.startDate).toLocaleDateString()}
          </Text>
        ) : (
          <Text style={styles.dateText}>📅 (Sin fecha)</Text>
        )}

        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(item.progress || 0) * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {Math.round((item.progress || 0) * 100)}% completado
        </Text>

        {/* Mostrar personal asignado */}
        {asignados.length > 0 ? (
          <View style={{ marginTop: 8 }}>
            <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '600' }}>👥 Personal asignado:</Text>
            {asignados.map(p => (
              <View key={p.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: '#DDD', fontSize: 13 }}>
                  • {p.nombre} ({p.cargo})
                </Text>
                <TouchableOpacity
                  onPress={async () => {
                    try {
                      await updateDoc(doc(db, "personal", p.id), {
                        estado: "libre",
                        proyectoAsignado: null,
                      });
                    } catch (err) {
                      console.error("Error desasignando personal:", err);
                    }
                  }}
                >
                  <Text style={{ color: "#E53E3E", fontSize: 13 }}>✖</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <Text style={{ color: '#AAA', marginTop: 8 }}>👥 Sin personal asignado</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient
      colors={['#edf2b1ff', '#ffc782ff', '#FF4500']}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Mis Proyectos</Text>

        <FlatList
          data={projects}
          keyExtractor={(item) => item.idDoc}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addButtonText}>+ Agregar Proyecto</Text>
        </TouchableOpacity>

        {/* Modal para crear proyecto */}
        {modalVisible && (
          <Modal animationType="slide" transparent visible={true}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <Text style={styles.modalTitle}>Nuevo Proyecto</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nombre del proyecto"
                  placeholderTextColor="#AAA"
                  value={newProjectName}
                  onChangeText={setNewProjectName}
                />

                {/* Selector de fecha inicial */}
                <Text style={styles.modalLabel}>📅 Fecha inicial</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowPicker(true)}
                >
                  <Text style={styles.dateButtonText}>
                    {selectedDate.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>

                {showPicker && (
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display="default"
                    onChange={(event, date) => {
                      setShowPicker(false);
                      if (date) setSelectedDate(date);
                    }}
                  />
                )}

                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={handleAddProject}
                >
                  <Text style={styles.confirmButtonText}>Agregar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Text style={styles.cancelText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}

        {/* Modal opciones */}
        {selectedProject && !editModalVisible && (
          <Modal animationType="fade" transparent visible={true}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <Text style={styles.modalTitle}>¿Qué deseas hacer?</Text>

                {/* Asignar personal */}
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={() => {
                    setTargetProject(selectedProject);
                    setAssignModalVisible(true);
                    setSelectedProject(null); // cerrar menú
                  }}
                >
                  <Text style={styles.confirmButtonText}>➕ Asignar personal</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={() => {
                    setEditedName(selectedProject.title);
                    setEditModalVisible(true);
                    setSelectedProject(null); // cerrar menú
                  }}
                >
                  <Text style={styles.confirmButtonText}>✏️ Editar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.confirmButton, { backgroundColor: '#E53E3E' }]}
                  onPress={() => {
                    handleDelete();
                    setSelectedProject(null); // cerrar menú
                  }}
                >
                  <Text style={styles.confirmButtonText}>🗑️ Eliminar</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setSelectedProject(null)}>
                  <Text style={styles.cancelText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}

        {/* Modal para editar nombre */}
        {editModalVisible && (
          <Modal animationType="slide" transparent visible={true}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <Text style={styles.modalTitle}>Editar Proyecto</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nuevo nombre"
                  placeholderTextColor="#AAA"
                  value={editedName}
                  onChangeText={setEditedName}
                />
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={confirmEdit}
                >
                  <Text style={styles.confirmButtonText}>Guardar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                  <Text style={styles.cancelText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}

        {/* Modal para asignar personal */}
        {assignModalVisible && targetProject && (
          <Modal animationType="slide" transparent visible={true}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <Text style={styles.modalTitle}>
                  Asignar personal a {targetProject.title}
                </Text>

                {personal.filter(p => p.estado === "libre").length === 0 ? (
                  <Text style={{ color: "#FFF" }}>No hay personal libre disponible.</Text>
                ) : (
                  personal
                    .filter(p => p.estado === "libre")
                    .map(p => (
                      <TouchableOpacity
                        key={p.id}
                        style={[styles.confirmButton, { marginBottom: 6 }]}
                        onPress={async () => {
                          try {
                            await updateDoc(doc(db, "personal", p.id), {
                              estado: "ocupado",
                              proyectoAsignado: targetProject.title,
                            });
                            setAssignModalVisible(false);
                          } catch (err) {
                            console.error("Error asignando personal:", err);
                          }
                        }}
                      >
                        <Text style={styles.confirmButtonText}>
                          {p.nombre} ({p.cargo})
                        </Text>
                      </TouchableOpacity>
                    ))
                )}

                <TouchableOpacity onPress={() => setAssignModalVisible(false)}>
                  <Text style={styles.cancelText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 50,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 26,
    color: '#FFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  list: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#2C2C3Aaa',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
  },
  cardText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  dateText: {
    color: '#DDD',
    fontSize: 14,
    marginTop: 4,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#444',
    borderRadius: 5,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#48BB78',
  },
  progressText: {
    color: '#FFF',
    fontSize: 12,
    marginTop: 4,
  },
  addButton: {
    backgroundColor: '#5A67D8',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#2C2C3A',
    padding: 20,
    borderRadius: 12,
    width: '80%',
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#3A3A4A',
    color: '#FFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  modalLabel: {
    color: '#FFF',
    fontSize: 16,
    marginBottom: 8,
  },
  dateButton: {
    backgroundColor: '#3A3A4A',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  dateButtonText: {
    color: '#FFF',
    fontSize: 16,
  },
  confirmButton: {
    backgroundColor: '#5A67D8',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelText: {
    color: '#CCC',
    textAlign: 'center',
    marginTop: 8,
  },
});
