// app/BudgetScreen.js
// ============================================================================
// PANTALLA DE PRESUPUESTO DE PROYECTO
// Propósito: Gestión completa del presupuesto de un proyecto, incluyendo:
//            - Importación desde Excel
//            - Configuración de utilidad global y AIU
//            - Gestión de ítems por fases (1-4)
//            - Cálculos automáticos de costos, valores, IVA y totales
// ============================================================================

// ----------------------------------------------------------------------------
// IMPORTACIONES
// ----------------------------------------------------------------------------

// Navegación de Expo Router
import { useLocalSearchParams, useRouter } from "expo-router";

// Hooks de React
import { useEffect, useState } from "react";

// Componentes de React Native
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// API para selección de documentos
import * as DocumentPicker from "expo-document-picker";

// API para manejo de archivos
import * as FileSystem from "expo-file-system/legacy";

// Componente modal para editar ítems
import EditItemModal from "../components/budget/EditItemModal";

// Componente de loading overlay
import LoadingOverlay from "../components/shared/LoadingOverlay";

// Servicio para operaciones de presupuesto
import budgetService from "../services/budgetService";

// Utilidad para parsear archivos Excel de presupuesto
import { parseBudgetFromExcelBase64 } from "../utils/excelBudgetImporter";

// ----------------------------------------------------------------------------
// CONSTANTES Y FUNCIONES UTILITARIAS
// ----------------------------------------------------------------------------

/**
 * Mapa de colores para identificar visualmente cada fase
 */
const FASE_COLORS = {
  fase1: "#1D4ED8", // Azul
  fase2: "#059669", // Verde
  fase3: "#B45309", // Ámbar
  fase4: "#6D28D9", // Púrpura
};

/**
 * Formatea un número como moneda en pesos colombianos
 * @param {number} n - Valor numérico a formatear
 * @returns {string} - Cadena formateada con símbolo de peso y separadores
 */
const formatMoney = (n) =>
  `$ ${Number(n || 0).toLocaleString("es-CO", {
    maximumFractionDigits: 0, // Sin decimales
  })}`;

/* ============================================================================
 * COMPONENTE PRINCIPAL: BudgetScreen
 * ============================================================================ */
export default function BudgetScreen() {
  // ==========================================================================
  // HOOKS Y ESTADO
  // ==========================================================================
  
  // Navegación y parámetros de ruta
  const router = useRouter();
  const { projectId } = useLocalSearchParams(); // ID del proyecto desde la URL

  // Estado de carga y datos del presupuesto
  const [loading, setLoading] = useState(false);
  const [budget, setBudget] = useState(null);

  // Estados para utilidad global y AIU (Administración, Imprevistos, Utilidad)
  const [utilidadGlobal, setUtilidadGlobal] = useState("");
  const [aiu, setAiu] = useState({
    administracion: "",
    imprevistos: "",
    utilidad: "",
  });

  // Estados para indicadores de guardado
  const [savingUtilidad, setSavingUtilidad] = useState(false);
  const [savingAIU, setSavingAIU] = useState(false);

  // Estado para importación de Excel
  const [importing, setImporting] = useState(false);

  // Estado para modal de edición de ítems
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editItem, setEditItem] = useState(null);

  // ==========================================================================
  // EFECTO: CARGA INICIAL DEL PRESUPUESTO
  // Se ejecuta cuando se recibe el projectId
  // ==========================================================================
  const loadBudget = async () => {
    try {
      setLoading(true);
      
      // Obtener presupuesto del servicio
      const data = await budgetService.getBudgetByProject(projectId);

      // Actualizar estado con datos obtenidos
      setBudget(data);

      // Configurar utilidad global (con validación de valores nulos/undefined)
      setUtilidadGlobal(
        data.utilidadGlobal !== undefined && data.utilidadGlobal !== null
          ? String(data.utilidadGlobal) // Convertir a string para el TextInput
          : ""
      );

      // Configurar valores de AIU (con validación)
      setAiu({
        administracion:
          data.porcentajesAIU?.administracion !== undefined
            ? String(data.porcentajesAIU.administracion)
            : "",
        imprevistos:
          data.porcentajesAIU?.imprevistos !== undefined
            ? String(data.porcentajesAIU.imprevistos)
            : "",
        utilidad:
          data.porcentajesAIU?.utilidad !== undefined
            ? String(data.porcentajesAIU.utilidad)
            : "",
      });

      setLoading(false);
    } catch (err) {
      console.error("Error cargando presupuesto:", err);
      setLoading(false);
      Alert.alert("Error", "No se pudo cargar el presupuesto.");
    }
  };

  useEffect(() => {
    if (projectId) loadBudget();
  }, [projectId]); // Se ejecuta cuando cambia projectId

  // ==========================================================================
  // FUNCIÓN: IMPORTAR DESDE EXCEL
  // Permite importar un presupuesto completo desde archivo Excel
  // ==========================================================================
  const handleImportExcel = async () => {
    try {
      // 1. Abrir selector de documentos
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
          "application/vnd.ms-excel", // .xls
        ],
        copyToCacheDirectory: true, // Copiar a caché para acceso
        multiple: false, // Solo un archivo
      });

      // 2. Validar selección
      if (res.canceled) return; // Usuario canceló
      const file = res.assets?.[0];
      if (!file?.uri) {
        Alert.alert("Error", "No se pudo leer el archivo seleccionado.");
        return;
      }

      // 3. Confirmar importación (reemplazará datos existentes)
      Alert.alert(
        "Importar presupuesto",
        "Esto reemplazará los ítems actuales del presupuesto por los del Excel. ¿Continuar?",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Sí, importar",
            style: "destructive", // Destructive para acción irreversible
            onPress: async () => {
              try {
                setImporting(true);

                // 4. Leer archivo como Base64
                const base64 = await FileSystem.readAsStringAsync(file.uri, {
                  encoding: FileSystem.EncodingType.Base64,
                });

                // 5. Parsear Excel a estructura de presupuesto
                const parsed = parseBudgetFromExcelBase64(base64);

                // 6. Reemplazar presupuesto en Firestore
                await budgetService.replaceBudgetFromImport(projectId, {
                  utilidadGlobal: parsed.utilidadGlobal,
                  aiu: parsed.aiu,
                  items: parsed.items,
                });

                // 7. Recargar datos y mostrar confirmación
                await loadBudget();
                Alert.alert("Listo", "Presupuesto importado correctamente.");
              } catch (e) {
                console.error("Error importando presupuesto:", e);
                Alert.alert(
                  "Error",
                  e?.message ||
                    "No se pudo importar. Verifica que la hoja 'Presupuesto' tenga el formato correcto."
                );
              } finally {
                setImporting(false);
              }
            },
          },
        ]
      );
    } catch (e) {
      console.error("Error seleccionando Excel:", e);
      Alert.alert("Error", "No se pudo abrir el selector de archivos.");
    }
  };

  // ==========================================================================
  // FUNCIÓN: GUARDAR UTILIDAD GLOBAL
  // Aplica un porcentaje de utilidad a todos los ítems del presupuesto
  // ==========================================================================
  const handleSaveUtilidadGlobal = async () => {
    try {
      setSavingUtilidad(true);
      
      // Parsear valor (soportar decimales con coma o punto)
      const valor = parseFloat(utilidadGlobal.replace(",", ".")) || 0;
      
      // Actualizar en Firestore
      await budgetService.updateUtilidadGlobal(projectId, valor);
      
      // Recargar presupuesto con nuevos cálculos
      await loadBudget();
    } catch (error) {
      console.error("Error guardando utilidad global:", error);
      Alert.alert("Error", "No se pudo actualizar la utilidad global.");
    } finally {
      setSavingUtilidad(false);
    }
  };

  // ==========================================================================
  // FUNCIÓN: GUARDAR AIU
  // Actualiza porcentajes de Administración, Imprevistos y Utilidad
  // ==========================================================================
  const handleSaveAIU = async () => {
    try {
      setSavingAIU(true);
      
      // Parsear cada porcentaje
      const adm = parseFloat(aiu.administracion.replace(",", ".")) || 0;
      const imp = parseFloat(aiu.imprevistos.replace(",", ".")) || 0;
      const uti = parseFloat(aiu.utilidad.replace(",", ".")) || 0;

      // Actualizar en Firestore
      await budgetService.updateAIU(projectId, {
        administracion: adm,
        imprevistos: imp,
        utilidad: uti,
      });

      // Recargar presupuesto
      await loadBudget();
    } catch (error) {
      console.error("Error guardando AIU:", error);
      Alert.alert("Error", "No se pudo actualizar el AIU.");
    } finally {
      setSavingAIU(false);
    }
  };

  // ==========================================================================
  // FUNCIONES CRUD PARA ÍTEMS
  // ==========================================================================

  /**
   * Abre modal para agregar nuevo ítem en una fase específica
   * @param {string} faseKey - Clave de la fase (fase1, fase2, etc.)
   */
  const handleAddItem = (faseKey) => {
    setEditItem({
      id: undefined, // Nuevo ítem, sin ID
      faseKey,
      nombre: "",
      unidades: "",
      costoUnitario: "",
      aplicaIva: true, // Por defecto con IVA
      unidad: "un", // Unidad por defecto
      categoria: "",
      notas: "",
    });
    setEditModalVisible(true);
  };

  /**
   * Abre modal para editar ítem existente
   * @param {Object} item - Objeto del ítem a editar
   * @param {string} faseKey - Clave de la fase
   */
  const openEditItem = (item, faseKey) => {
    setEditItem({
      ...item,
      faseKey,
      unidades: String(item.unidades ?? ""), // Asegurar string
      costoUnitario: String(item.costoUnitario ?? ""),
    });
    setEditModalVisible(true);
  };

  /**
   * Cierra modal de edición
   */
  const handleCloseModal = () => {
    setEditModalVisible(false);
    setEditItem(null);
  };

  /**
   * Guarda (crea o actualiza) un ítem
   * @param {Object} itemGuardado - Ítem con datos a guardar
   */
  const handleSaveItem = async (itemGuardado) => {
    try {
      const faseKey = itemGuardado.faseKey;
      const itemsExistentes = budget?.fases?.[faseKey]?.items || [];
      
      // Verificar si es edición (existe ID) o creación
      const existe = !!itemsExistentes.find((i) => i.id === itemGuardado.id);

      if (existe) {
        // Actualizar ítem existente
        await budgetService.updateItem(projectId, budget.id, faseKey, itemGuardado);
      } else {
        // Crear nuevo ítem (fase4 tiene lógica especial)
        if (faseKey === "fase4") {
          await budgetService.addItemFase4(projectId, budget.id, itemGuardado);
        } else {
          await budgetService.addItem(projectId, budget.id, faseKey, itemGuardado);
        }
      }

      // Cerrar modal y recargar
      handleCloseModal();
      await loadBudget();
    } catch (err) {
      console.error("Error guardando ítem:", err);
      Alert.alert("Error", "No se pudo guardar el ítem.");
    }
  };

  /**
   * Elimina un ítem con confirmación
   * @param {Object} item - Ítem a eliminar
   * @param {string} faseKey - Clave de la fase
   */
  const handleDeleteItem = (item, faseKey) => {
    Alert.alert("Eliminar ítem", `¿Seguro que deseas eliminar "${item.nombre}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            await budgetService.deleteItem(projectId, budget.id, faseKey, item.id);
            await loadBudget();
          } catch (err) {
            console.error("Error eliminando ítem:", err);
            Alert.alert("Error", "No se pudo eliminar el ítem.");
          }
        },
      },
    ]);
  };

  // ==========================================================================
  // RENDERIZADO: ESTADO DE CARGA
  // ==========================================================================
  if (loading || !budget) {
    return <LoadingOverlay message="Cargando presupuesto..." />;
  }

  // Desestructurar datos del presupuesto para facilitar acceso
  const { fases, totalesGenerales, calculosGlobales, totalGeneral } = budget;

  // ==========================================================================
  // RENDERIZADO PRINCIPAL
  // ==========================================================================
  return (
    <View style={styles.screenContainer}>
      {/* Scroll principal para contenido extenso */}
      <ScrollView style={styles.container}>
        {/* Header informativo */}
        <Text style={styles.screenTitle}>Presupuesto del proyecto</Text>
        <Text style={styles.projectId}>ID proyecto: {projectId}</Text>

        {/* ====================================================================
         * SECCIÓN: IMPORTACIÓN DESDE EXCEL
         * ==================================================================== */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Importación</Text>
          <Text style={styles.sectionSubtitle}>
            Importa desde un Excel (hoja "Presupuesto") y reemplaza los ítems actuales.
          </Text>

          <TouchableOpacity
            style={[styles.importButton, importing && { opacity: 0.6 }]}
            onPress={handleImportExcel}
            disabled={importing}
          >
            <Text style={styles.importButtonText}>
              {importing ? "Importando..." : "Importar desde Excel"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ====================================================================
         * SECCIÓN: UTILIDAD GLOBAL
         * Aplica margen de utilidad a TODOS los ítems
         * ==================================================================== */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Utilidad global por ítem</Text>
          <Text style={styles.sectionSubtitle}>
            Se aplica como margen a TODOS los ítems (precio individual = costo / (1 - utilidad)).
          </Text>

          <View style={styles.rowCenter}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.label}>% Utilidad global</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={utilidadGlobal}
                onChangeText={setUtilidadGlobal}
                placeholder="Ej: 25"
                placeholderTextColor="#6B7280"
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, savingUtilidad && { opacity: 0.5 }]}
              onPress={handleSaveUtilidadGlobal}
              disabled={savingUtilidad}
            >
              <Text style={styles.primaryButtonText}>
                {savingUtilidad ? "Guardando..." : "Aplicar"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ====================================================================
         * SECCIÓN: FASES DEL PRESUPUESTO (1-4)
         * Cada fase se renderiza con su propio componente
         * ==================================================================== */}
        {["fase1", "fase2", "fase3", "fase4"].map((faseKey) => (
          <BudgetPhaseCard
            key={faseKey}
            title={fases[faseKey].nombre}
            faseKey={faseKey}
            faseData={fases[faseKey]}
            color={FASE_COLORS[faseKey]}
            onAddItem={handleAddItem}
            onEditItem={openEditItem}
            onDeleteItem={handleDeleteItem}
          />
        ))}

        {/* ====================================================================
         * SECCIÓN: TOTALES GENERALES DEL PROYECTO
         * ==================================================================== */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Totales generales del proyecto</Text>

          {/* Costo total (suma de costos de todos los ítems) */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Costo total del proyecto</Text>
            <Text style={styles.summaryValue}>
              {formatMoney(totalesGenerales.costoTotalProyecto)}
            </Text>
          </View>

          {/* Valor total (precio de venta) */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Valor total del proyecto</Text>
            <Text style={styles.summaryValue}>
              {formatMoney(totalesGenerales.valorTotalProyecto)}
            </Text>
          </View>

          {/* Utilidad total (diferencia entre valor y costo) */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Utilidad total (solo por ítems)</Text>
            <Text style={styles.summaryValue}>
              {formatMoney(totalesGenerales.utilidadTotalProyecto)}
            </Text>
          </View>
        </View>

        {/* ====================================================================
         * SECCIÓN: RESUMEN GENERAL (IVA + AIU)
         * Muestra cálculos detallados de impuestos y sobrecostos
         * ==================================================================== */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Resumen general (IVA + AIU)</Text>

          {/* Total antes de IVA */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total antes de IVA</Text>
            <Text style={styles.summaryValue}>
              {formatMoney(calculosGlobales.totalAntesIVA)}
            </Text>
          </View>

          {/* IVA por fases (cada fase puede tener tratamiento IVA diferente) */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>IVA fase 1</Text>
            <Text style={styles.summaryValue}>
              {formatMoney(calculosGlobales.ivaFase1)}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>IVA fase 2</Text>
            <Text style={styles.summaryValue}>
              {formatMoney(calculosGlobales.ivaFase2)}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>IVA fase 4</Text>
            <Text style={styles.summaryValue}>
              {formatMoney(calculosGlobales.ivaFase4)}
            </Text>
          </View>

          {/* ================================================================
           * SUBSECCIÓN: AJUSTE DE AIU
           * Administración, Imprevistos y Utilidad (sobre fases 3 y 4)
           * ================================================================ */}
          <View style={{ marginTop: 18 }}>
            <Text style={styles.sectionTitle}>Ajustar AIU</Text>
            <Text style={styles.sectionSubtitle}>
              El AIU se calcula sobre el valor total de las fases 3 y 4.
            </Text>

            {/* Campos para porcentajes de AIU */}
            <View style={styles.row}>
              <View style={styles.aiuField}>
                <Text style={styles.label}>Administración (%)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={aiu.administracion}
                  onChangeText={(t) => setAiu((prev) => ({ ...prev, administracion: t }))}
                />
              </View>

              <View style={styles.aiuField}>
                <Text style={styles.label}>Imprevistos (%)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={aiu.imprevistos}
                  onChangeText={(t) => setAiu((prev) => ({ ...prev, imprevistos: t }))}
                />
              </View>

              <View style={styles.aiuField}>
                <Text style={styles.label}>Utilidad AIU (%)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={aiu.utilidad}
                  onChangeText={(t) => setAiu((prev) => ({ ...prev, utilidad: t }))}
                />
              </View>
            </View>

            {/* Botón para guardar AIU */}
            <TouchableOpacity
              style={[styles.secondaryButton, savingAIU && { opacity: 0.6 }]}
              onPress={handleSaveAIU}
              disabled={savingAIU}
            >
              <Text style={styles.secondaryButtonText}>
                {savingAIU ? "Guardando AIU..." : "Actualizar AIU"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ================================================================
           * CONTINUACIÓN: DESGLOSE DEL AIU
           * ================================================================ */}
          
          {/* Base sobre la que se calcula AIU (fases 3 y 4) */}
          <View style={[styles.summaryRow, { marginTop: 16 }]}>
            <Text style={styles.summaryLabel}>Base AIU</Text>
            <Text style={styles.summaryValue}>{formatMoney(calculosGlobales.baseAIU)}</Text>
          </View>

          {/* Administración calculada */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Administración</Text>
            <Text style={styles.summaryValue}>{formatMoney(calculosGlobales.administracion)}</Text>
          </View>

          {/* Imprevistos calculados */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Imprevistos</Text>
            <Text style={styles.summaryValue}>{formatMoney(calculosGlobales.imprevistos)}</Text>
          </View>

          {/* Utilidad del AIU */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Utilidad AIU</Text>
            <Text style={styles.summaryValue}>{formatMoney(calculosGlobales.utilidadAIU)}</Text>
          </View>

          {/* IVA sobre la utilidad del AIU */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>IVA utilidad AIU</Text>
            <Text style={styles.summaryValue}>{formatMoney(calculosGlobales.ivaUtilidadAIU)}</Text>
          </View>

          {/* ================================================================
           * TOTAL GENERAL (DESTACADO)
           * ================================================================ */}
          <View style={[styles.summaryRow, { marginTop: 10 }]}>
            <Text style={[styles.summaryLabel, { fontWeight: "700", color: "#FBBF24" }]}>
              TOTAL GENERAL DESPUÉS DE IVA
            </Text>
            <Text style={[styles.summaryValue, { fontWeight: "700", color: "#FBBF24" }]}>
              {formatMoney(totalGeneral)}
            </Text>
          </View>
        </View>

        {/* Espacio final para scroll */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal para editar/crear ítems */}
      <EditItemModal
        visible={editModalVisible}
        item={editItem}
        onClose={handleCloseModal}
        onSave={handleSaveItem}
      />
    </View>
  );
}

/* ============================================================================
 * COMPONENTE: BudgetPhaseCard
 * Propósito: Renderiza una fase completa del presupuesto con sus ítems
 * ============================================================================ */
function BudgetPhaseCard({ title, faseKey, faseData, color, onAddItem, onEditItem, onDeleteItem }) {
  // Obtener ítems de la fase
  const items = faseData?.items || [];

  return (
    <View style={styles.phaseCard}>
      {/* Header de la fase con título y total */}
      <View style={styles.phaseHeaderCol}>
        <View style={styles.phaseTitleRow}>
          {/* Badge de color identificador */}
          <View style={[styles.phaseBadge, { backgroundColor: color }]} />
          {/* Título de la fase */}
          <Text style={styles.phaseTitle} numberOfLines={2}>
            {title}
          </Text>
        </View>
        {/* Total de la fase */}
        <Text style={styles.phaseTotalBelow}>{formatMoney(faseData.total)}</Text>
      </View>

      {/* Lista de ítems de la fase */}
      <View style={styles.phaseItemsList}>
        {/* Renderizar cada ítem */}
        {items.map((item) => (
          <View key={item.id} style={styles.phaseItem}>
            {/* Encabezado del ítem: nombre y acciones */}
            <View style={styles.itemHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.nombre}</Text>
                <Text style={styles.itemDetail}>
                  {/* Detalle: unidades × costo unitario */}
                  {item.unidades} u × {formatMoney(item.costoUnitario)}{" "}
                  {/* Indicadores especiales */}
                  {!item.aplicaUtilidadGlobal ? "(sin utilidad)" : ""}{" "}
                  {item.aplicaIva ? "(con IVA en resumen)" : "(sin IVA)"}
                </Text>
              </View>

              {/* Botones de acción */}
              <View style={styles.itemActions}>
                {/* Editar */}
                <TouchableOpacity style={styles.iconButton} onPress={() => onEditItem(item, faseKey)}>
                  <Text style={styles.iconButtonText}>Editar</Text>
                </TouchableOpacity>

                {/* Eliminar (destacado en rojo) */}
                <TouchableOpacity
                  style={[styles.iconButton, { backgroundColor: "#7F1D1D" }]}
                  onPress={() => onDeleteItem(item, faseKey)}
                >
                  <Text style={[styles.iconButtonText, { color: "#FCA5A5" }]}>Borrar</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Detalles financieros del ítem */}
            <View style={styles.itemDetailGrid}>
              {/* Costo total (unidades × costo unitario) */}
              <View style={styles.itemRow}>
                <Text style={styles.itemLabel}>Costo total</Text>
                <Text style={styles.itemValue}>{formatMoney(item.costoTotal)}</Text>
              </View>

              {/* Precio individual (con utilidad aplicada) */}
              <View style={styles.itemRow}>
                <Text style={styles.itemLabel}>Precio individual</Text>
                <Text style={styles.itemValue}>{formatMoney(item.precioIndividual)}</Text>
              </View>

              {/* Valor total (precio individual × unidades) */}
              <View style={styles.itemRow}>
                <Text style={styles.itemLabel}>Valor total</Text>
                <Text style={styles.itemValue}>{formatMoney(item.valorTotal)}</Text>
              </View>

              {/* Utilidad del ítem (valor total - costo total) */}
              <View style={styles.itemRow}>
                <Text style={styles.itemLabel}>Utilidad</Text>
                <Text style={styles.itemValue}>{formatMoney(item.utilidad)}</Text>
              </View>
            </View>

            {/* Notas adicionales (si existen) */}
            {item.notas ? <Text style={styles.itemNotes}>Nota: {item.notas}</Text> : null}
          </View>
        ))}

        {/* Mensaje cuando no hay ítems */}
        {items.length === 0 && (
          <Text style={styles.emptyItemsText}>Aún no hay ítems en esta fase.</Text>
        )}

        {/* Botón para agregar nuevo ítem */}
        <View style={styles.newItemContainer}>
          <TouchableOpacity style={styles.addBtn} onPress={() => onAddItem(faseKey)}>
            <Text style={styles.addBtnText}>+ Agregar ítem</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ============================================================================
 * ESTILOS
 * Diseño oscuro profesional con colores contrastantes
 * ============================================================================ */

const styles = StyleSheet.create({
  // Contenedor principal de la pantalla
  screenContainer: {
    flex: 1,
    backgroundColor: "#0B1120", // Azul muy oscuro
  },
  
  // Contenedor de scroll
  container: {
    flex: 1,
    padding: 16,
  },
  
  // Título principal de la pantalla
  screenTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#F9FAFB", // Blanco casi puro
    marginBottom: 4,
  },
  
  // ID del proyecto (información secundaria)
  projectId: {
    color: "#9CA3AF", // Gris azulado
    marginBottom: 16,
  },

  // Tarjetas para secciones
  card: {
    backgroundColor: "#020617", // Azul negro
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.25)", // Borde sutil
  },
  
  // Título de sección
  sectionTitle: {
    color: "#E5E7EB", // Gris claro
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  
  // Subtítulo descriptivo
  sectionSubtitle: {
    color: "#9CA3AF", // Gris medio
    fontSize: 13,
    marginBottom: 10,
  },
  
  // Etiquetas para inputs
  label: {
    color: "#E5E7EB",
    fontSize: 13,
    marginBottom: 4,
  },
  
  // Inputs de texto
  input: {
    backgroundColor: "#020617",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: "#F9FAFB", // Texto blanco
    borderWidth: 1,
    borderColor: "#374151", // Borde gris oscuro
    fontSize: 14,
  },

  // Botón de importación
  importButton: {
    alignSelf: "flex-start", // Alineado a la izquierda
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999, // Completamente redondeado
    backgroundColor: "#334155", // Gris azulado oscuro
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.25)",
  },
  
  // Texto del botón de importación
  importButtonText: {
    color: "#E5E7EB",
    fontWeight: "600",
    fontSize: 13,
  },

  // Layouts en fila
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8, // Espacio entre elementos
    marginTop: 6,
  },
  
  // Fila centrada verticalmente
  rowCenter: {
    flexDirection: "row",
    alignItems: "flex-end", // Alineado al fondo
    marginTop: 8,
  },
  
  // Campo individual de AIU
  aiuField: {
    flex: 1, // Distribuir espacio equitativamente
  },

  // Botón primario (verde)
  primaryButton: {
    backgroundColor: "#10B981", // Verde esmeralda
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  
  // Texto del botón primario
  primaryButtonText: {
    color: "#022C22", // Verde muy oscuro (contraste)
    fontWeight: "600",
    fontSize: 14,
  },
  
  // Botón secundario (azul)
  secondaryButton: {
    marginTop: 4,
    alignSelf: "flex-end", // Alineado a la derecha
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#1D4ED8", // Azul
  },
  
  // Texto del botón secundario
  secondaryButtonText: {
    color: "#EFF6FF", // Azul muy claro
    fontWeight: "600",
    fontSize: 13,
  },

  // Tarjeta de fase
  phaseCard: {
    backgroundColor: "#020617",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.25)",
  },
  
  // Header de fase (columna)
  phaseHeaderCol: {
    marginBottom: 10,
  },
  
  // Fila del título de fase
  phaseTitleRow: {
    flexDirection: "row",
    color: "#FBBF24", // Ámbar
    alignItems: "center",
    marginBottom: 4,
  },
  
  // Total de fase (debajo del título)
  phaseTotalBelow: {
    color: "#FBBF24",
    fontSize: 16,
    fontWeight: "600",
  },

  // Badge circular de color identificador
  phaseBadge: {
    width: 12,
    height: 12,
    borderRadius: 999, // Círculo perfecto
    marginRight: 8,
  },
  
  // Título de la fase
  phaseTitle: {
    color: "#E2E8F0", // Gris muy claro
    fontSize: 16,
    fontWeight: "600",
  },
  
  // Total de la fase (alternativo)
  phaseTotal: {
    color: "#FBBF24",
    fontSize: 16,
    fontWeight: "600",
  },
  
  // Contenedor de lista de ítems
  phaseItemsList: {
    marginTop: 4,
  },
  
  // Ítem individual dentro de fase
  phaseItem: {
    backgroundColor: "#020617",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(31,41,55,0.9)", // Borde más oscuro
  },
  
  // Fila del encabezado del ítem
  itemHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  
  // Nombre del ítem
  itemName: {
    color: "#F1F5F9", // Blanco azulado muy claro
    fontSize: 15,
    fontWeight: "600",
  },
  
  // Detalle del ítem (unidades × costo)
  itemDetail: {
    color: "#CBD5E1", // Gris azulado claro
    fontSize: 13,
  },
  
  // Contenedor de botones de acción
  itemActions: {
    flexDirection: "row",
    gap: 6, // Espacio entre botones
  },
  
  // Botón de icono (para editar/eliminar)
  iconButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#334155", // Gris azulado
  },
  
  // Texto del botón de icono
  iconButtonText: {
    color: "#E5E7EB",
    fontSize: 12,
  },

  // Grid de detalles financieros del ítem
  itemDetailGrid: {
    borderTopWidth: 1,
    borderTopColor: "rgba(51,65,85,0.9)", // Línea divisoria
    paddingTop: 6,
    marginTop: 6,
  },
  
  // Fila dentro del grid de detalles
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  
  // Etiqueta del detalle
  itemLabel: {
    color: "#9CA3AF", // Gris medio
    fontSize: 12,
  },
  
  // Valor del detalle
  itemValue: {
    color: "#E5E7EB",
    fontSize: 12,
    fontVariant: ["tabular-nums"], // Números con ancho fijo
  },
  
  // Notas del ítem
  itemNotes: {
    marginTop: 4,
    color: "#9CA3AF",
    fontSize: 12,
    fontStyle: "italic",
  },

  // Contenedor para botón de nuevo ítem
  newItemContainer: {
    marginTop: 6,
    alignItems: "flex-end", // Alineado a la derecha
  },
  
  // Botón para agregar ítem
  addBtn: {
    backgroundColor: "#10B981", // Verde esmeralda
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  
  // Texto del botón agregar
  addBtnText: {
    color: "#064E3B", // Verde muy oscuro
    fontWeight: "600",
    fontSize: 13,
  },
  
  // Texto cuando no hay ítems
  emptyItemsText: {
    color: "#9CA3AF",
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 4,
  },

  // Fila de resumen (para totales)
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  
  // Etiqueta del resumen
  summaryLabel: {
    color: "#9CA3AF",
    fontSize: 14,
  },
  
  // Valor del resumen
  summaryValue: {
    color: "#F9FAFB",
    fontSize: 14,
    fontVariant: ["tabular-nums"],
  },
});

// ============================================================================
// FIN DEL ARCHIVO BudgetScreen.js
// ============================================================================