// app/PersonalScreen.js
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, StyleSheet } from "react-native";
import { useUser } from "../context/UserContext";

// Componentes modulares
import SearchHeader from "../components/inventory/SearchHeader";
import PersonalActionsModal from "../components/personal/PersonalActionsModal";
import PersonalForm from "../components/personal/PersonalForm";
import PersonalHeader from "../components/personal/PersonalHeader";
import PersonalList from "../components/personal/PersonalList";

// Servicio existente
import { personalService } from "../services/personalService";

export default function PersonalScreen() {
  const router = useRouter();
  const { role } = useUser();

  // Estados
  const [personnel, setPersonnel] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [loading, setLoading] = useState(false);

  // Cargar personal
  useEffect(() => {
    loadPersonnel();
  }, []);

  const loadPersonnel = async () => {
    try {
      const personalData = await personalService.getAll();
      setPersonnel(personalData);
    } catch (error) {
      console.error("Error cargando personal:", error);
      Alert.alert("Error", "No se pudo cargar el personal");
    }
  };

  // Handlers actualizados para usar tu personalService
  const handleAddPersonnel = async (personData) => {
    setLoading(true);
    try {
      await personalService.create(personData);
      setShowForm(false);
      await loadPersonnel(); // Recargar la lista
      Alert.alert("Éxito", "Persona creada correctamente");
    } catch (error) {
      console.error("Error agregando personal:", error);
      Alert.alert("Error", error.message || "No se pudo crear la persona");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePersonnel = async (person) => {
    Alert.alert("Confirmar", `¿Eliminar a ${person.nombre}?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            await personalService.delete(person.id, person.nombre);
            await loadPersonnel(); // Recargar la lista
            Alert.alert("Éxito", "Persona eliminada correctamente");
          } catch (error) {
            console.error("Error eliminando personal:", error);
            Alert.alert("Error", error.message || "No se pudo eliminar la persona");
          }
        },
      },
    ]);
  };

  const handleAssignToWarehouse = async (person) => {
    setLoading(true);
    try {
      await personalService.assignToProject(person.id, "Bodega");
      setSelectedPerson(null);
      await loadPersonnel(); // Recargar la lista
      Alert.alert("Éxito", `${person.nombre} asignado a Bodega`);
    } catch (error) {
      console.error("Error asignando personal:", error);
      Alert.alert("Error", error.message || "No se pudo asignar la persona");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignToRetie = async (person) => {
    setLoading(true);
    try {
      await personalService.assignToProject(person.id, "Visita RETIE");
      setSelectedPerson(null);
      await loadPersonnel(); // Recargar la lista
      Alert.alert("Éxito", `${person.nombre} asignado a Visita RETIE`);
    } catch (error) {
      console.error("Error asignando personal:", error);
      Alert.alert("Error", error.message || "No se pudo asignar la persona");
    } finally {
      setLoading(false);
    }
  };

  const handleReleasePersonnel = async (person) => {
    setLoading(true);
    try {
      await personalService.liberar(person.id);
      setSelectedPerson(null);
      await loadPersonnel(); // Recargar la lista
      Alert.alert("Éxito", `${person.nombre} liberado correctamente`);
    } catch (error) {
      console.error("Error liberando personal:", error);
      Alert.alert("Error", error.message || "No se pudo liberar la persona");
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToHistory = (person) => {
    router.push({
      pathname: "/PersonalHistoryScreen",
      params: { id: person.id, nombre: person.nombre },
    });
  };

  // Filtrar personal
  const filteredPersonnel = personnel.filter((p) =>
    p.nombre?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <LinearGradient colors={['#11998e', '#38ef7d']} style={styles.container}>
      
      <PersonalHeader
        role={role}
        showForm={showForm}
        onToggleForm={() => setShowForm(!showForm)}
      />

      <SearchHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder="Buscar personal..."
      />

      <PersonalForm
        visible={showForm}
        onSave={handleAddPersonnel}
        onCancel={() => setShowForm(false)}
      />

      <PersonalList
        personnel={filteredPersonnel}
        onItemPress={handleNavigateToHistory}
        onItemLongPress={setSelectedPerson}
        onDelete={handleDeletePersonnel}
        role={role}
        loading={loading}
        emptyMessage="No hay personal registrado"
      />

      <PersonalActionsModal
        visible={!!selectedPerson}
        selectedPerson={selectedPerson}
        onAssignToWarehouse={handleAssignToWarehouse}
        onAssignToRetie={handleAssignToRetie}
        onRelease={handleReleasePersonnel}
        onClose={() => setSelectedPerson(null)}
      />

    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 16 
  },
});