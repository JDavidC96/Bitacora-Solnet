/**
 * MODAL DE EDICIÓN DE ÍTEMES DE PRESUPUESTO
 * 
 * Descripción:
 * Modal para crear o editar ítems de presupuesto con cálculo automático de costos,
 * precios y utilidades. Incluye validación y visualización en tiempo real.
 * 
 * Características principales:
 * 1. Formulario completo para crear/editar ítems de presupuesto
 * 2. Cálculo automático en tiempo real de:
 *    - Costo total
 *    - Precio individual (con utilidad global)
 *    - Valor total
 *    - Utilidad neta
 * 3. Switch para aplicar/desaplicar IVA y utilidad global
 * 4. Integración con servicio de presupuesto para obtener configuración
 * 5. Validación de campos requeridos
 * 
 * Cálculos implementados:
 * - Costo total = unidades × costo unitario
 * - Precio individual = costo unitario / (1 - utilidad%) [si aplica utilidad]
 * - Valor total = precio individual × unidades
 * - Utilidad = valor total - costo total
 * 
 * Estados del componente:
 * - Campos del formulario (nombre, unidades, costo, etc.)
 * - Configuración de cálculo (IVA, utilidad global)
 * - Valores calculados en tiempo real
 * - Utilidad global del proyecto
 * 
 * @component
 * @param {Object} props - Propiedades del componente
 * @param {boolean} props.visible - Control de visibilidad del modal
 * @param {Object|null} props.item - Ítem a editar (null para nuevo)
 * @param {Function} props.onClose - Función para cerrar el modal
 * @param {Function} props.onSave - Función para guardar el ítem
 * @returns {JSX.Element} Modal de edición renderizado
 * 
 * @example
 * <EditItemModal
 *   visible={showModal}
 *   item={selectedItem}
 *   onClose={() => setShowModal(false)}
 *   onSave={handleSaveItem}
 * />
 */

// Importaciones de React y React Native
import { useCallback, useEffect, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// Servicio de presupuesto
import budgetService from "../../services/budgetService";

/**
 * Formatea un número como moneda colombiana sin decimales
 * 
 * @function formatMoney
 * @param {number|string} n - Valor a formatear
 * @returns {string} Valor formateado como moneda COP
 * 
 * @example
 * formatMoney(1000000) // "$ 1.000.000"
 */
const formatMoney = (n) =>
  `$ ${Number(n || 0).toLocaleString("es-CO", {
    maximumFractionDigits: 0,
  })}`;

/**
 * Modal de edición de ítemes de presupuesto
 * 
 * @function EditItemModal
 * @param {Object} props - Propiedades del componente
 * @returns {JSX.Element} Modal renderizado
 */
export default function EditItemModal({ visible, item, onClose, onSave }) {
  // ==================== ESTADOS DEL FORMULARIO ====================
  
  const [nombre, setNombre] = useState("");                    // Nombre del ítem
  const [unidades, setUnidades] = useState("");                // Cantidad de unidades
  const [costoUnitario, setCostoUnitario] = useState("");      // Costo por unidad
  const [unidad, setUnidad] = useState("un");                  // Unidad de medida
  const [categoria, setCategoria] = useState("");              // Categoría opcional
  const [notas, setNotas] = useState("");                      // Notas adicionales
  const [aplicaIva, setAplicaIva] = useState(true);           // Aplica IVA (19%)
  const [aplicaUtilidadGlobal, setAplicaUtilidadGlobal] = useState(true); // Aplica utilidad global

  // ==================== ESTADOS DE CÁLCULO ====================
  
  const [costoTotal, setCostoTotal] = useState(0);            // Costo total (unidades × costo unitario)
  const [precioIndividual, setPrecioIndividual] = useState(0); // Precio individual (con utilidad)
  const [valorTotal, setValorTotal] = useState(0);            // Valor total (precio individual × unidades)
  const [utilidad, setUtilidad] = useState(0);                // Utilidad neta (valor total - costo total)

  // ==================== ESTADOS DE CONFIGURACIÓN ====================
  
  const [utilidadGlobal, setUtilidadGlobalState] = useState(0); // Porcentaje de utilidad global del proyecto

  // ==================== FUNCIONES AUXILIARES ====================
  
  /**
   * Reinicia todos los campos del formulario a sus valores por defecto
   * Se ejecuta al cerrar el modal o después de guardar
   */
  const resetForm = useCallback(() => {
    setNombre("");
    setUnidades("");
    setCostoUnitario("");
    setUnidad("un");
    setCategoria("");
    setNotas("");
    setAplicaIva(true);
    setAplicaUtilidadGlobal(true);
    setCostoTotal(0);
    setPrecioIndividual(0);
    setValorTotal(0);
    setUtilidad(0);
  }, []);

  // ==================== EFECTOS DE CARGA DE DATOS ====================
  
  /**
   * Carga la utilidad global del proyecto cuando se abre el modal
   * Solo se ejecuta si hay un projectId en el ítem
   */
  useEffect(() => {
    if (!visible || !item?.projectId) return;

    const loadUtilidadGlobal = async () => {
      try {
        const conf = await budgetService.getBudgetByProject(item.projectId);
        setUtilidadGlobalState(conf.utilidadGlobal || 0);
      } catch (error) {
        console.error("Error cargando utilidad global:", error);
        // Mantener valor por defecto si hay error
      }
    };

    loadUtilidadGlobal();
  }, [visible, item?.projectId]);

  /**
   * Limpia el formulario cuando se cierra el modal
   */
  useEffect(() => {
    if (!visible) {
      resetForm();
    }
  }, [visible, resetForm]);

  /**
   * Carga los datos del ítem cuando se proporciona para edición
   * También recalcula los valores basados en los datos cargados
   */
  useEffect(() => {
    if (!item) return;

    setNombre(item.nombre || "");
    setUnidades(String(item.unidades || ""));
    setCostoUnitario(String(item.costoUnitario || ""));
    setAplicaIva(item.aplicaIva ?? true);
    setAplicaUtilidadGlobal(item.aplicaUtilidadGlobal ?? true);
    setUnidad(item.unidad || "un");
    setCategoria(item.categoria || "");
    setNotas(item.notas || "");

    // Calcular valores iniciales
    calcularValores(
      item.unidades,
      item.costoUnitario,
      item.aplicaIva ?? true,
      utilidadGlobal,
      item.aplicaUtilidadGlobal ?? true
    );
  }, [item, utilidadGlobal]);

  // ==================== CÁLCULO DE VALORES ====================
  
  /**
   * Función de cálculo optimizada con useCallback
   * Se recrea solo cuando cambian utilidadGlobal o resetForm
   */
  const calcularValores = useCallback((
    u,           // unidades
    cu,          // costo unitario
    iva,         // aplica IVA (actualmente no usado en cálculos)
    utilidadG,   // porcentaje de utilidad global
    aplicaUG     // si aplica utilidad global
  ) => {
    const unidadesN = Number(u) || 0;
    const costoUnit = Number(cu) || 0;

    // 1. Costo total = unidades × costo unitario
    const costoT = unidadesN * costoUnit;

    // 2. Precio individual
    let pIndividual = costoUnit;
    
    // Solo aplicar utilidad si está habilitado y el porcentaje es válido
    if (aplicaUG && utilidadG > 0 && utilidadG < 100) {
      const margen = 1 - utilidadG / 100;
      if (margen !== 0) {
        // Fórmula: precio = costo / (1 - utilidad%)
        pIndividual = costoUnit / margen;
      }
    }

    // 3. Valor total = precio individual × unidades
    const vTotal = pIndividual * unidadesN;
    
    // 4. Utilidad = valor total - costo total
    const util = vTotal - costoT;

    // Actualizar estados
    setCostoTotal(costoT);
    setPrecioIndividual(pIndividual);
    setValorTotal(vTotal);
    setUtilidad(util);
  }, []); // No hay dependencias, función estable

  /**
   * Efecto para recalcular valores cuando cambian los inputs
   * Usa la función memoizada calcularValores
   */
  useEffect(() => {
    calcularValores(
      unidades,
      costoUnitario,
      aplicaIva,
      utilidadGlobal,
      aplicaUtilidadGlobal
    );
  }, [unidades, costoUnitario, aplicaIva, utilidadGlobal, aplicaUtilidadGlobal, calcularValores]);

  // ==================== MANEJO DE EVENTOS ====================
  
  /**
   * Maneja el guardado del ítem
   * Valida campos requeridos y envía datos al componente padre
   */
  const handleSave = () => {
    // Validación básica
    if (!nombre.trim()) {
      alert("El ítem debe tener nombre.");
      return;
    }

    // Preparar datos para guardar
    const data = {
      id: item?.id || null,           // ID para updates, null para nuevos
      faseKey: item?.faseKey,         // Fase a la que pertenece
      nombre: nombre.trim(),
      unidades: Number(unidades) || 0,
      costoUnitario: Number(costoUnitario) || 0,
      aplicaIva,
      aplicaUtilidadGlobal,
      unidad: unidad.trim() || "un",
      categoria: categoria.trim(),
      notas: notas.trim(),
    };

    // Llamar función de guardado del padre
    onSave(data);
    
    // Limpiar formulario
    resetForm();
  };

  // ==================== RENDER CONDICIONAL ====================
  
  // No renderizar si no es visible
  if (!visible) return null;

  // ==================== RENDER PRINCIPAL ====================
  
  return (
    <Modal visible={visible} animationType="slide" transparent>
      {/* Overlay oscuro semi-transparente */}
      <View style={styles.overlay}>
        {/* Contenedor principal del modal */}
        <View style={styles.modal}>
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Título dinámico (editar o nuevo) */}
            <Text style={styles.title}>
              {item?.id ? "Editar ítem" : "Nuevo ítem"}
            </Text>

            {/* ==================== CAMPOS DEL FORMULARIO ==================== */}
            
            {/* Nombre del ítem */}
            <Text style={styles.label}>Nombre del ítem</Text>
            <TextInput
              style={styles.input}
              value={nombre}
              onChangeText={setNombre}
              placeholder="Ej: Paneles Trina"
              placeholderTextColor="#6B7280"
            />

            {/* Unidades */}
            <Text style={styles.label}>Unidades</Text>
            <TextInput
              style={styles.input}
              value={unidades}
              onChangeText={setUnidades}
              keyboardType="numeric"
              placeholder="Ej: 32"
              placeholderTextColor="#6B7280"
            />

            {/* Costo unitario */}
            <Text style={styles.label}>Costo unitario</Text>
            <TextInput
              style={styles.input}
              value={costoUnitario}
              onChangeText={setCostoUnitario}
              keyboardType="numeric"
              placeholder="Ej: 585612"
              placeholderTextColor="#6B7280"
            />

            {/* Unidad de medida */}
            <Text style={styles.label}>Unidad</Text>
            <TextInput
              style={styles.input}
              value={unidad}
              onChangeText={setUnidad}
              placeholder="Ej: un, m, m2..."
              placeholderTextColor="#6B7280"
            />

            {/* Categoría (opcional) */}
            <Text style={styles.label}>Categoría</Text>
            <TextInput
              style={styles.input}
              value={categoria}
              onChangeText={setCategoria}
              placeholder="Opcional"
              placeholderTextColor="#6B7280"
            />

            {/* Notas (opcional, multilínea) */}
            <Text style={styles.label}>Notas</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              multiline
              value={notas}
              onChangeText={setNotas}
              placeholder="Notas adicionales..."
              placeholderTextColor="#6B7280"
            />

            {/* ==================== CONFIGURACIÓN DE CÁLCULO ==================== */}
            
            {/* Switch para aplicar IVA */}
            <View style={styles.switchRow}>
              <Text style={styles.label}>¿Aplica IVA?</Text>
              <Switch
                value={aplicaIva}
                onValueChange={setAplicaIva}
                trackColor={{ true: "#10B981", false: "#475569" }}
                thumbColor="#F8FAFC"
              />
            </View>

            {/* Switch para aplicar utilidad global */}
            <View style={styles.switchRow}>
              <Text style={styles.label}>¿Aplica utilidad global?</Text>
                <Switch
                  value={aplicaUtilidadGlobal}
                  onValueChange={setAplicaUtilidadGlobal}
                  trackColor={{ true: "#10B981", false: "#475569" }}
                  thumbColor="#F8FAFC"
                />
            </View>

            {/* ==================== RESULTADOS DE CÁLCULO ==================== */}
            
            <View style={styles.calcBox}>
              <Text style={styles.calcTitle}>Cálculos</Text>

              {/* Costo total */}
              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>Costo total:</Text>
                <Text style={styles.calcValue}>
                  {formatMoney(costoTotal)}
                </Text>
              </View>

              {/* Precio individual */}
              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>Precio individual:</Text>
                <Text style={styles.calcValue}>
                  {formatMoney(precioIndividual)}
                </Text>
              </View>

              {/* Valor total */}
              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>Valor total:</Text>
                <Text style={styles.calcValue}>
                  {formatMoney(valorTotal)}
                </Text>
              </View>

              {/* Utilidad neta */}
              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>Utilidad:</Text>
                <Text style={styles.calcValue}>{formatMoney(utilidad)}</Text>
              </View>
            </View>

            {/* ==================== BOTONES DE ACCIÓN ==================== */}
            
            <View style={styles.btnRow}>
              {/* Botón Cancelar */}
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>

              {/* Botón Guardar */}
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveText}>Guardar</Text>
              </TouchableOpacity>
            </View>

            {/* Espacio adicional al final para scroll */}
            <View style={styles.bottomSpacer} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ==================== ESTILOS DEL COMPONENTE ====================

/**
 * Estilos del componente
 * Utiliza una paleta de colores oscura para formularios
 * 
 * @constant {Object} styles
 */
const styles = StyleSheet.create({
  // Overlay semi-transparente
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 16,
  },
  
  // Contenedor principal del modal
  modal: {
    backgroundColor: "#0F172A", // Azul oscuro
    borderRadius: 14,
    padding: 16,
    maxHeight: "90%",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.25)",
  },
  
  // Contenedor del scroll para mejor manejo de contenido
  scrollContent: {
    paddingBottom: 20,
  },
  
  // Título del modal
  title: {
    color: "#F8FAFC", // Blanco
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  
  // Etiquetas de campos
  label: {
    color: "#E2E8F0", // Gris claro
    fontSize: 14,
    marginBottom: 4,
  },
  
  // Inputs de texto
  input: {
    backgroundColor: "#1E293B", // Gris azulado oscuro
    color: "#F8FAFC",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#334155", // Borde sutil
    marginBottom: 12,
  },
  
  // Textarea para notas
  textArea: {
    height: 70,
    textAlignVertical: 'top', // Para Android
  },
  
  // Filas con switches
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  
  // Contenedor de cálculos
  calcBox: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  calcTitle: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
  },
  calcRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  calcLabel: {
    color: "#CBD5E1", // Gris medio
    fontSize: 13,
  },
  calcValue: {
    color: "#F8FAFC",
    fontSize: 13,
    fontVariant: ["tabular-nums"], // Números de ancho fijo
  },
  
  // Fila de botones
  btnRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 6,
    gap: 10,
  },
  
  // Botón Cancelar
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: "#475569", // Gris azulado
  },
  cancelText: {
    color: "#E2E8F0",
    fontSize: 14,
  },
  
  // Botón Guardar
  saveBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: "#10B981", // Verde esmeralda
  },
  saveText: {
    color: "#064E3B", // Verde oscuro para contraste
    fontSize: 14,
    fontWeight: "700",
  },
  
  // Espaciador inferior
  bottomSpacer: {
    height: 20,
  },
});