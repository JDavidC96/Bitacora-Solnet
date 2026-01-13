//app/EquipmentHistoryScreen.js
import { LinearGradient } from "expo-linear-gradient";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, View } from "react-native";
import { db } from "../firebase/firebaseConfig";

/**
 * Pantalla que muestra el historial completo de acciones realizadas sobre herramientas/equipos.
 * 
 * Esta pantalla:
 * - Muestra un registro cronológico de todas las operaciones realizadas en el módulo de herramientas
 * - Permite filtrar registros por acción, herramienta o usuario
 * - Utiliza códigos de colores para diferenciar tipos de acciones (agregar, asignar, prestar, etc.)
 * - Se actualiza en tiempo real cuando ocurren nuevas acciones en el sistema
 * 
 * @component
 * @example
 * // Navegación desde otras pantallas:
 * // router.push('/EquipmentHistoryScreen')
 * 
 * @returns {JSX.Element} Componente de la pantalla de historial de equipos
 */
export default function EquipmentHistoryScreen() {
  // Estados para gestión de datos
  const [historial, setHistorial] = useState([]); // Historial completo desde Firestore
  const [filteredData, setFilteredData] = useState([]); // Datos filtrados según búsqueda
  const [search, setSearch] = useState(""); // Texto de búsqueda

  /**
   * Suscripción en tiempo real a la colección 'historial_herramientas' de Firestore
   * Los datos se ordenan por fecha descendente (más reciente primero)
   */
  useEffect(() => {
    const q = query(
      collection(db, "historial_herramientas"),
      orderBy("fecha", "desc") // Ordena por fecha descendente
    );
    
    // Suscripción en tiempo real que actualiza el estado cuando hay cambios
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setHistorial(data);
      setFilteredData(data); // Inicialmente muestra todos los datos
    });
    
    // Limpieza de suscripción al desmontar el componente
    return () => unsub();
  }, []);

  /**
   * Filtra los registros del historial según el texto de búsqueda
   * @param {string} text - Texto a buscar en acción, herramienta o usuario
   */
  const handleSearch = (text) => {
    setSearch(text);
    
    if (text.trim() === "") {
      // Si la búsqueda está vacía, muestra todos los registros
      setFilteredData(historial);
    } else {
      // Filtra por coincidencias en acción, herramienta o usuario (insensible a mayúsculas)
      const filtered = historial.filter(
        (item) =>
          (item.accion &&
            item.accion.toLowerCase().includes(text.toLowerCase())) ||
          (item.herramienta &&
            item.herramienta.toLowerCase().includes(text.toLowerCase())) ||
          (item.usuario &&
            item.usuario.toLowerCase().includes(text.toLowerCase()))
      );
      setFilteredData(filtered);
    }
  };

  /**
   * Determina el estilo de la tarjeta según el tipo de acción
   * Utiliza colores en el borde izquierdo para identificar rápidamente el tipo de acción
   * @param {string} accion - Descripción de la acción realizada
   * @returns {Object} Objeto de estilos para la tarjeta
   */
  const getCardStyle = (accion) => {
    if (!accion) return { backgroundColor: "#2C2C3A" }; // Color por defecto
    
    // Asigna colores según palabras clave en la descripción de la acción
    if (accion.includes("agregó")) return { borderLeftColor: "#A0AEC0" }; // gris - agregar
    if (accion.includes("asignado")) return { borderLeftColor: "#3182CE" }; // azul - asignar
    if (accion.includes("prestado")) return { borderLeftColor: "#ECC94B" }; // amarillo - prestar
    if (accion.includes("devuelto")) return { borderLeftColor: "#48BB78" }; // verde - devolver
    if (accion.includes("transferido")) return { borderLeftColor: "#9F7AEA" }; // morado - transferir
    if (accion.includes("eliminó")) return { borderLeftColor: "#E53E3E" }; // rojo - eliminar
    
    return { borderLeftColor: "#2C2C3A" }; // Color por defecto si no coincide
  };

  /**
   * Renderiza un ítem individual del historial
   * @param {Object} param0 - Objeto con el ítem a renderizar
   * @param {Object} param0.item - Elemento del historial
   * @returns {JSX.Element} Componente de tarjeta de historial
   */
  const renderItem = ({ item }) => (
    <View style={[styles.card, getCardStyle(item.accion)]}>
      {/* Fecha y hora de la acción */}
      <Text style={styles.date}>
        {new Date(item.fecha).toLocaleString()}
      </Text>
      
      {/* Descripción principal de la acción */}
      <Text style={styles.detail}>{item.accion}</Text>
      
      {/* Nombre de la herramienta involucrada */}
      <Text style={styles.subDetail}>🔧 {item.herramienta}</Text>
      
      {/* Usuario que realizó la acción (si está disponible) */}
      {item.usuario && <Text style={styles.subDetail}>👤 {item.usuario}</Text>}
    </View>
  );

  return (
    // Fondo con gradiente de azules
    <LinearGradient colors={["#141E30", "#243B55"]} style={styles.container}>
      {/* Título de la pantalla */}
      <Text style={styles.title}>📜 Historial de Herramientas</Text>

      {/* Barra de búsqueda */}
      <TextInput
        style={styles.searchBar}
        placeholder="Buscar por acción, herramienta o usuario..."
        placeholderTextColor="#AAA"
        value={search}
        onChangeText={handleSearch}
      />

      {/* Lista del historial (vacía si no hay datos) */}
      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id} // Usa el ID de Firestore como clave única
        renderItem={renderItem}
        ListEmptyComponent={
          <Text style={{ color: "#FFF", textAlign: "center", marginTop: 20 }}>
            No se encontraron registros.
          </Text>
        }
      />
    </LinearGradient>
  );
}

// Estilos de la pantalla
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 16 
  },
  title: {
    fontSize: 22,
    color: "#fff",
    marginBottom: 16,
    marginTop: 30, // Espacio para status bar
    fontWeight: "bold",
    textAlign: "center",
  },
  searchBar: {
    backgroundColor: "#FFF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    fontSize: 16,
    color: "#000", // Texto negro para contraste con fondo blanco
  },
  card: {
    backgroundColor: "#2C2C3A", // Fondo oscuro para tarjetas
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 6, // Borde izquierdo grueso para código de color
  },
  date: { 
    color: "#aaa", // Gris claro para fecha
    fontSize: 12, 
    marginBottom: 6 
  },
  detail: { 
    color: "#fff", // Blanco para texto principal
    fontSize: 16, 
    fontWeight: "bold" 
  },
  subDetail: { 
    color: "#ddd", // Gris muy claro para detalles secundarios
    marginTop: 2 
  },
});