// app/PersonalHistoryScreen.js

/**
 * PANTALLA DE HISTORIAL PERSONAL
 * 
 * Descripción:
 * Esta pantalla muestra el historial general de personas con sus viajes/destinos.
 * Proporciona una vista cronológica de los registros con capacidad de búsqueda
 * y filtrado en tiempo real.
 * 
 * Características principales:
 * 1. Visualización de historial personal en orden cronológico descendente
 * 2. Búsqueda en tiempo real por nombre o destino
 * 3. Indicación visual de viajes en curso vs completados
 * 4. Diseño con gradiente y tarjetas oscuras para mejor legibilidad
 * 5. Sincronización en tiempo real con Firestore
 * 
 * Estructura de datos esperada (Firestore):
 * - nombre: Nombre de la persona
 * - destino: Lugar de destino
 * - fechaInicio: Fecha de inicio (Timestamp Firestore)
 * - fechaFin: Fecha de fin (Timestamp Firestore, opcional)
 * 
 * @component
 * @returns {JSX.Element} Componente de pantalla de historial
 * 
 * @example
 * <PersonalHistoryScreen />
 */

// Importaciones de React y librerías externas
import { LinearGradient } from "expo-linear-gradient";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, View } from "react-native";
import { db } from "../firebase/firebaseConfig";

/**
 * Componente principal de la pantalla de historial personal
 * 
 * @function PersonalHistoryScreen
 */
export default function PersonalHistoryScreen() {
  // Estado para almacenar el historial completo
  const [historial, setHistorial] = useState([]);
  
  // Estado para el texto de búsqueda
  const [search, setSearch] = useState("");

  /* =====================================================
   *                      LISTENER HISTORIAL
   * ===================================================== 
   * 
   * Configura un listener en tiempo real para la colección 'historial_personal'
   * Ordena los documentos por fecha de inicio descendente
   * Se ejecuta solo una vez al montar el componente
   */
  useEffect(() => {
    // Crear query para obtener todos los documentos ordenados por fecha descendente
    const q = query(
      collection(db, "historial_personal"),
      orderBy("fechaInicio", "desc")
    );

    // Configurar listener en tiempo real
    const unsub = onSnapshot(q, (snap) => {
      // Transformar documentos de Firestore a objetos planos
      const data = snap.docs.map((d) => ({
        id: d.id,           // ID del documento
        ...d.data(),        // Datos del documento
      }));
      setHistorial(data);   // Actualizar estado con nuevos datos
    });

    // Cleanup: remover listener al desmontar el componente
    return () => unsub();
  }, []); // Array de dependencias vacío = solo al montar

  /* =====================================================
   * FILTRO
   * ===================================================== 
   * 
   * Filtra el historial basado en el texto de búsqueda
   * Busca tanto en el nombre como en el destino
   * Usa useMemo para optimizar el rendimiento
   */
  const filteredData = useMemo(() => {
    // Si no hay texto de búsqueda, retornar todos los datos
    if (!search.trim()) return historial;

    // Normalizar búsqueda a minúsculas
    const q = search.toLowerCase();
    
    // Filtrar por nombre O destino que contengan el texto buscado
    return historial.filter(
      (item) =>
        item.nombre?.toLowerCase().includes(q) ||
        item.destino?.toLowerCase().includes(q)
    );
  }, [historial, search]); // Recalcular cuando cambie historial o búsqueda

  /* =====================================================
   *                      RENDER ITEM
   * ===================================================== 
   * 
   * Componente que renderiza cada item del historial
   * 
   * @param {Object} props - Propiedades del componente
   * @param {Object} props.item - Item del historial a renderizar
   * @param {string} props.item.id - ID único del documento
   * @param {string} props.item.nombre - Nombre de la persona
   * @param {string} props.item.destino - Destino del viaje
   * @param {Object} props.item.fechaInicio - Fecha de inicio (Timestamp)
   * @param {Object} [props.item.fechaFin] - Fecha de fin (Timestamp, opcional)
   * @returns {JSX.Element} Tarjeta de item renderizada
   */
  const renderItem = ({ item }) => (
    <View style={styles.card}>
      {/* Nombre de la persona */}
      <Text style={styles.title}>👤 {item.nombre}</Text>
      
      {/* Destino del viaje */}
      <Text style={styles.subtitle}>📍 {item.destino}</Text>

      {/* Fecha de inicio formateada */}
      <Text style={styles.date}>
        Inicio:{" "}
        {new Date(item.fechaInicio).toLocaleString("es-CO", {
          timeZone: "America/Bogota", // Zona horaria de Colombia
        })}
      </Text>

      {/* Fecha de fin o indicador de "en curso" */}
      {item.fechaFin ? (
        <Text style={styles.date}>
          Fin:{" "}
          {new Date(item.fechaFin).toLocaleString("es-CO", {
            timeZone: "America/Bogota",
          })}
        </Text>
      ) : (
        <Text style={[styles.date, styles.inProgress]}>
          ⏳ En curso
        </Text>
      )}
    </View>
  );

  // Renderizado principal del componente
  return (
    <LinearGradient 
      colors={["#4e54c8", "#8f94fb"]} // Gradiente azul/púrpura
      style={styles.container}
    >
      {/* Título de la pantalla */}
      <Text style={styles.header}>Historial General</Text>

      {/* Campo de búsqueda */}
      <TextInput
        style={styles.searchBar}
        placeholder="Buscar por nombre o destino..."
        placeholderTextColor="#AAA"
        value={search}
        onChangeText={setSearch}
      />

      {/* Lista de items filtrados */}
      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {search.trim() 
              ? "No se encontraron resultados para tu búsqueda." 
              : "No hay historial registrado."
            }
          </Text>
        }
      />
    </LinearGradient>
  );
}

/**
 * Estilos del componente
 * 
 * @constant {Object} styles
 * @property {Object} container - Estilo del contenedor principal
 * @property {Object} header - Estilo del título
 * @property {Object} searchBar - Estilo del campo de búsqueda
 * @property {Object} card - Estilo de las tarjetas de historial
 * @property {Object} title - Estilo del título de la tarjeta
 * @property {Object} subtitle - Estilo del subtítulo (destino)
 * @property {Object} date - Estilo de las fechas
 * @property {Object} inProgress - Estilo para indicador "en curso"
 * @property {Object} empty - Estilo del mensaje cuando no hay datos
 */
const styles = StyleSheet.create({
  // Contenedor principal con padding
  container: { 
    flex: 1, 
    padding: 16 
  },
  
  // Título de la pantalla
  header: {
    fontSize: 22,
    color: "#FFF",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
  },
  
  // Campo de búsqueda
  searchBar: {
    backgroundColor: "#FFF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    fontSize: 16,
    color: "#000",
  },
  
  // Tarjeta individual de historial
  card: {
    backgroundColor: "#2C2C3A", // Fondo oscuro para contraste
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  
  // Nombre de la persona
  title: { 
    color: "#FFF", 
    fontSize: 16, 
    fontWeight: "700" 
  },
  
  // Destino del viaje
  subtitle: { 
    color: "#D1D5DB", 
    marginTop: 2 
  },
  
  // Fechas
  date: { 
    color: "#E5E7EB", 
    marginTop: 6 
  },
  
  // Indicador de "en curso" (color amarillo)
  inProgress: { 
    color: "#FBBF24", 
    fontWeight: "600" 
  },
  
  // Mensaje cuando no hay datos
  empty: { 
    color: "#FFF", 
    textAlign: "center", 
    marginTop: 20 
  },
});