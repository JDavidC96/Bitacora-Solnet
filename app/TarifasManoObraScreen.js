/**
 * PANTALLA DE GESTIÓN DE TARIFAS DE MANO DE OBRA
 * 
 * Descripción:
 * Pantalla para configurar y visualizar las tarifas por hora del personal.
 * Permite asignar, modificar y eliminar tarifas individuales por persona,
 * con control de permisos y búsqueda avanzada.
 * 
 * Características principales:
 * 1. Selección de persona desde lista completa con búsqueda
 * 2. Asignación de tarifa por hora con validación numérica
 * 3. Eliminación de tarifa (establecer en 0)
 * 4. Vista rápida de todas las tarifas del personal
 * 5. Control de permisos por rol (solo Admin y Administrativo)
 * 6. Interfaz con modal para selección de persona
 * 7. Actualización en tiempo real en Firestore
 * 
 * Estructura de datos en Firestore:
 * - Colección: "personal"
 * - Campo: "tarifaHora" (número, puede ser 0 o positivo)
 * - Campo: "updatedAt" (timestamp de última actualización)
 * 
 * Permisos por rol:
 * - Administrador: Acceso completo (ver, crear, modificar, eliminar)
 * - Administrativo: Acceso completo (ver, crear, modificar, eliminar)
 * - Otros roles: Sin acceso a esta pantalla
 * 
 * Flujo de trabajo:
 * 1. Cargar lista completa de personal desde Firestore
 * 2. Seleccionar persona del picker o lista
 * 3. Ingresar/editar tarifa en campo numérico
 * 4. Guardar cambios en Firestore
 * 5. Actualizar vista local y lista de tarifas
 * 
 * @component
 * @returns {JSX.Element} Pantalla de gestión de tarifas de mano de obra
 * 
 * @example
 * <TarifasManoObraScreen />
 */

// Importaciones de React Native y librerías
import { useRouter } from "expo-router";
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// Contextos y configuraciones
import { useUser } from "../context/UserContext";
import { db } from "../firebase/firebaseConfig";

/**
 * Formatea un número como moneda colombiana sin decimales
 * 
 * @function formatMoney
 * @param {number|string} n - Valor numérico a formatear
 * @returns {string} Valor formateado como moneda COP
 * 
 * @example
 * formatMoney(18000) // "$ 18.000"
 */
const formatMoney = (n) =>
  `$ ${Number(n || 0).toLocaleString("es-CO", { maximumFractionDigits: 0 })}`;

/**
 * Componente principal de gestión de tarifas de mano de obra
 * 
 * @function TarifasManoObraScreen
 * @returns {JSX.Element} Pantalla de tarifas renderizada
 */
export default function TarifasManoObraScreen() {
  // ==================== NAVEGACIÓN Y CONTEXTO ====================
  
  const router = useRouter();                      // Navegación para botón de regreso
  const { role } = useUser();                      // Rol del usuario para permisos

  // ==================== PERMISOS ====================
  
  const canManage = ["Administrador", "Administrativo"].includes(role);

  // ==================== ESTADOS PRINCIPALES ====================
  
  const [loading, setLoading] = useState(false);           // Estado de carga general
  const [personal, setPersonal] = useState([]);            // Lista completa de personal
  const [showPicker, setShowPicker] = useState(false);     // Visibilidad del modal de selección
  const [searchPersonal, setSearchPersonal] = useState(""); // Término de búsqueda en modal
  const [selectedPersonalId, setSelectedPersonalId] = useState(null); // ID del personal seleccionado
  const [tarifaInput, setTarifaInput] = useState("");      // Valor del input de tarifa

  // ==================== CÁLCULOS Y DERIVADOS ====================
  
  /**
   * Persona actualmente seleccionada (objeto completo)
   * @type {Object|null}
   */
  const selectedPerson = useMemo(() => {
    return personal.find((p) => p.id === selectedPersonalId) || null;
  }, [personal, selectedPersonalId]);

  // ==================== CARGA DE DATOS ====================
  
  /**
   * Carga la lista completa de personal desde Firestore
   * Ordena por nombre ascendente y selecciona primero si no hay selección
   * 
   * @async
   */
  const loadPersonal = async () => {
    try {
      setLoading(true);

      // Consulta Firestore: todos los documentos de "personal" ordenados por nombre
      const snap = await getDocs(
        query(collection(db, "personal"), orderBy("nombre", "asc"))
      );
      
      // Transformar documentos a objetos planos
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      setPersonal(list);

      // Seleccionar primera persona por defecto si no hay selección
      if (!selectedPersonalId && list.length > 0) {
        setSelectedPersonalId(list[0].id);
      }
    } catch (e) {
      console.error("Error cargando personal:", e);
      Alert.alert("Error", "No se pudo cargar el personal.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Efecto para cargar datos iniciales al montar el componente
   */
  useEffect(() => {
    loadPersonal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Efecto para sincronizar el input con la tarifa de la persona seleccionada
   * Se ejecuta cuando cambia la persona seleccionada
   */
  useEffect(() => {
    if (!selectedPerson) return;
    
    // Establecer valor del input basado en la tarifa actual (o vacío si es null/undefined)
    setTarifaInput(
      selectedPerson.tarifaHora != null ? String(selectedPerson.tarifaHora) : ""
    );
  }, [selectedPerson]);

  // ==================== FILTRADO Y BÚSQUEDA ====================
  
  /**
   * Personal filtrado según término de búsqueda
   * Busca en nombre, rol e ID
   * 
   * @type {Array}
   */
  const filteredPersonal = useMemo(() => {
    const q = (searchPersonal || "").toLowerCase().trim();
    if (!q) return personal; // Sin filtro si no hay búsqueda

    return personal.filter((p) => {
      const nombre = String(p.nombre || "").toLowerCase();
      const rol = String(p.rol || "").toLowerCase();
      const id = String(p.id).toLowerCase();
      
      return nombre.includes(q) || rol.includes(q) || id.includes(q);
    });
  }, [personal, searchPersonal]);

  // ==================== MANEJO DE OPERACIONES ====================
  
  /**
   * Guarda la tarifa de la persona seleccionada en Firestore
   * Valida que el valor sea un número válido (>= 0)
   * 
   * @async
   */
  const handleSave = async () => {
    // Validar selección de persona
    if (!selectedPerson) {
      Alert.alert("Falta info", "Selecciona una persona.");
      return;
    }

    // Validar formato numérico
    const tarifaHora = Number(tarifaInput);
    if (!Number.isFinite(tarifaHora) || tarifaHora < 0) {
      Alert.alert("Tarifa inválida", "Ingresa un número válido (>= 0).");
      return;
    }

    try {
      setLoading(true);

      // Actualizar documento en Firestore
      await updateDoc(doc(db, "personal", selectedPerson.id), {
        tarifaHora,                     // Nueva tarifa
        updatedAt: new Date().toISOString(), // Timestamp de actualización
      });

      // Recargar datos y notificar éxito
      await loadPersonal();
      Alert.alert("Listo", "Tarifa guardada correctamente.");
    } catch (e) {
      console.error("Error guardando tarifa:", e);
      Alert.alert("Error", "No se pudo guardar la tarifa.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Establece la tarifa de la persona seleccionada a 0
   * Muestra confirmación antes de realizar la operación
   * 
   * @async
   */
  const handleClear = async () => {
    if (!selectedPerson) return;

    // Confirmación antes de eliminar tarifa
    Alert.alert(
      "Quitar tarifa",
      `¿Dejar la tarifa en 0 para ${selectedPerson.nombre || selectedPerson.id}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Quitar",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              
              // Actualizar tarifa a 0 en Firestore
              await updateDoc(doc(db, "personal", selectedPerson.id), {
                tarifaHora: 0,                     // Establecer en 0
                updatedAt: new Date().toISOString(), // Timestamp de actualización
              });
              
              // Recargar datos y actualizar input
              await loadPersonal();
              setTarifaInput("0");
            } catch (e) {
              console.error("Error quitando tarifa:", e);
              Alert.alert("Error", "No se pudo actualizar la tarifa.");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // ==================== VERIFICACIÓN DE PERMISOS ====================
  
  // Si el usuario no tiene permisos, mostrar pantalla de acceso restringido
  if (!canManage) {
    return (
      <View style={styles.container}>
        {/* Header con botón de regreso */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>◀</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Tarifa de Mano de Obra</Text>
        </View>

        {/* Mensaje de acceso restringido */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Acceso restringido</Text>
          <Text style={styles.helperText}>
            Solo <Text style={{ fontWeight: "700" }}>Administrador</Text> y{" "}
            <Text style={{ fontWeight: "700" }}>Administrativo</Text> pueden ver y
            editar las tarifas.
          </Text>
        </View>
      </View>
    );
  }

  // ==================== DATOS PARA RENDERIZADO ====================
  
  const currentTarifa = selectedPerson?.tarifaHora ?? 0;

  // ==================== RENDER PRINCIPAL ====================
  
  return (
    <View style={styles.container}>
      {/* Header con botón de regreso y título */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>◀</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Tarifa de Mano de Obra</Text>
      </View>

      {/* Contenido principal con scroll */}
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Card principal de gestión de tarifas */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tarifa por usuario</Text>
          <Text style={styles.helperText}>
            Esto guarda <Text style={{ fontWeight: "700" }}>tarifaHora</Text> dentro
            de cada documento en <Text style={{ fontWeight: "700" }}>personal</Text>.
          </Text>

          {/* Selector de persona */}
          <Text style={styles.label}>Usuario (personal)</Text>
          <TouchableOpacity 
            style={styles.select} 
            onPress={() => setShowPicker(true)}
          >
            <Text style={styles.selectText}>
              {selectedPerson
                ? `${selectedPerson.nombre || "Sin nombre"}${
                    selectedPerson.rol ? ` · ${selectedPerson.rol}` : ""
                  }`
                : "Seleccionar..."}
            </Text>
            <Text style={styles.selectArrow}>▼</Text>
          </TouchableOpacity>

          {/* Input de tarifa */}
          <Text style={styles.label}>Tarifa por hora</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: 18000"
            placeholderTextColor="#6B7280"
            keyboardType="numeric"
            value={tarifaInput}
            onChangeText={setTarifaInput}
          />

          {/* Botones de acción */}
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.primaryButton, loading && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#0B1220" />
              ) : (
                <Text style={styles.primaryButtonText}>Guardar</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dangerButton, loading && { opacity: 0.7 }]}
              onPress={handleClear}
              disabled={loading}
            >
              <Text style={styles.dangerButtonText}>Quitar</Text>
            </TouchableOpacity>
          </View>

          {/* Indicador de tarifa actual */}
          <Text style={styles.smallHint}>
            Tarifa actual:{" "}
            <Text style={{ fontWeight: "700" }}>{formatMoney(currentTarifa)}</Text>
          </Text>
        </View>

        {/* Card de vista rápida de todas las tarifas */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Vista rápida</Text>

          {personal.length === 0 ? (
            <Text style={styles.emptyText}>No hay personal registrado.</Text>
          ) : (
            // Lista ordenada de todas las tarifas
            personal
              .slice()
              .sort((a, b) =>
                String(a.nombre || "").localeCompare(String(b.nombre || ""), "es")
              )
              .map((p) => (
                <View key={p.id} style={styles.tarifaRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tarifaRol}>{p.nombre || p.id}</Text>
                    {!!p.rol && <Text style={styles.tarifaMeta}>{p.rol}</Text>}
                  </View>
                  <Text style={styles.tarifaValue}>{formatMoney(p.tarifaHora || 0)}</Text>
                </View>
              ))
          )}
        </View>
      </ScrollView>

      {/* ==================== MODAL DE SELECCIÓN DE PERSONAL ==================== */}
      <Modal visible={showPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Header del modal */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar usuario</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Text style={styles.modalClose}>Cerrar</Text>
              </TouchableOpacity>
            </View>

            {/* Campo de búsqueda */}
            <TextInput
              style={styles.modalSearch}
              placeholder="Buscar por nombre, rol o id..."
              placeholderTextColor="#6B7280"
              value={searchPersonal}
              onChangeText={setSearchPersonal}
            />

            {/* Lista de personal filtrado */}
            <ScrollView style={{ maxHeight: 420 }}>
              {filteredPersonal.length === 0 ? (
                <Text style={styles.emptyText}>Sin resultados.</Text>
              ) : (
                filteredPersonal.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.optionRow,
                      p.id === selectedPersonalId && styles.optionRowActive,
                    ]}
                    onPress={() => {
                      // Seleccionar persona y cerrar modal
                      setSelectedPersonalId(p.id);
                      setShowPicker(false);
                      setSearchPersonal(""); // Limpiar búsqueda
                    }}
                  >
                    <Text style={styles.optionText}>{p.nombre || "Sin nombre"}</Text>
                    {!!p.rol && <Text style={styles.optionMeta}>{p.rol}</Text>}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ==================== ESTILOS DEL COMPONENTE ====================

/**
 * Estilos del componente
 * 
 * @constant {Object} styles
 */
const styles = StyleSheet.create({
  // Contenedor principal con fondo oscuro
  container: { 
    flex: 1, 
    backgroundColor: "#0B1220", 
    paddingTop: 44, 
    paddingHorizontal: 14 
  },
  
  // Header con botón de regreso y título
  headerRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginBottom: 12 
  },
  backText: { 
    color: "#E5E7EB", 
    marginRight: 12, 
    fontSize: 16 
  },
  title: { 
    fontSize: 18, 
    fontWeight: "700", 
    color: "#F9FAFB" 
  },

  // Cards generales
  card: {
    backgroundColor: "rgba(2,6,23,0.9)",
    borderColor: "rgba(55,65,81,0.7)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  cardTitle: { 
    color: "#F9FAFB", 
    fontSize: 16, 
    fontWeight: "700" 
  },
  helperText: { 
    color: "#9CA3AF", 
    marginTop: 8, 
    lineHeight: 18 
  },

  // Etiquetas y inputs
  label: { 
    color: "#E5E7EB", 
    marginTop: 14, 
    marginBottom: 6, 
    fontWeight: "600" 
  },
  input: {
    backgroundColor: "#0B1220",
    borderColor: "rgba(55,65,81,0.9)",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#F9FAFB",
  },

  // Selector personalizado
  select: {
    backgroundColor: "#0B1220",
    borderColor: "rgba(55,65,81,0.9)",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectText: { 
    color: "#F9FAFB", 
    flex: 1, 
    paddingRight: 10 
  },
  selectArrow: { 
    color: "#9CA3AF" 
  },

  // Botones
  row: { 
    flexDirection: "row", 
    gap: 10, 
    marginTop: 14 
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#22C55E", // Verde
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonText: { 
    color: "#0B1220", 
    fontWeight: "800" 
  },
  dangerButton: {
    backgroundColor: "rgba(239,68,68,0.2)", // Rojo con transparencia
    borderColor: "rgba(239,68,68,0.7)",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  dangerButtonText: { 
    color: "#FCA5A5", 
    fontWeight: "700" 
  },

  // Textos informativos
  smallHint: { 
    color: "#9CA3AF", 
    marginTop: 10 
  },
  emptyText: { 
    color: "#9CA3AF", 
    marginTop: 10 
  },

  // Filas de tarifas en vista rápida
  tarifaRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomColor: "rgba(55,65,81,0.5)",
    borderBottomWidth: 1,
  },
  tarifaRol: { 
    color: "#F9FAFB", 
    fontWeight: "700" 
  },
  tarifaMeta: { 
    color: "#9CA3AF", 
    marginTop: 2, 
    fontSize: 12 
  },
  tarifaValue: { 
    color: "#22C55E", // Verde para valores
    fontWeight: "800" 
  },

  // Estilos del modal
  modalOverlay: { 
    flex: 1, 
    backgroundColor: "rgba(0,0,0,0.6)", 
    justifyContent: "flex-end" 
  },
  modalCard: {
    backgroundColor: "#0B1220",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 14,
    borderColor: "rgba(55,65,81,0.8)",
    borderWidth: 1,
  },
  modalHeader: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginBottom: 10 
  },
  modalTitle: { 
    color: "#F9FAFB", 
    fontSize: 16, 
    fontWeight: "800" 
  },
  modalClose: { 
    color: "#93C5FD", 
    fontWeight: "700" 
  },
  modalSearch: {
    backgroundColor: "#020617",
    borderColor: "rgba(55,65,81,0.9)",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#F9FAFB",
    marginBottom: 10,
  },
  
  // Opciones en el modal
  optionRow: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 6,
    borderColor: "rgba(55,65,81,0.6)",
    borderWidth: 1,
    backgroundColor: "rgba(2,6,23,0.7)",
  },
  optionRowActive: {
    borderColor: "rgba(34,197,94,0.9)", // Verde para selección activa
    backgroundColor: "rgba(34,197,94,0.12)",
  },
  optionText: { 
    color: "#F9FAFB", 
    fontWeight: "700" 
  },
  optionMeta: { 
    color: "#9CA3AF", 
    marginTop: 2, 
    fontSize: 12 
  },
});