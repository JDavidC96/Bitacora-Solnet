// app/BudgetScreen.js
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";

import EditItemModal from "../components/budget/EditItemModal";
import LoadingOverlay from "../components/shared/LoadingOverlay";
import budgetService from "../services/budgetService";
import { parseBudgetFromExcelBase64 } from "../utils/excelBudgetImporter";

const FASE_COLORS = {
  fase1: "#1D4ED8",
  fase2: "#059669",
  fase3: "#B45309",
  fase4: "#6D28D9",
};

const formatMoney = (n) =>
  `$ ${Number(n || 0).toLocaleString("es-CO", {
    maximumFractionDigits: 0,
  })}`;

// ------------------------------------------------------------

export default function BudgetScreen() {
  const router = useRouter();
  const { projectId } = useLocalSearchParams();

  const [loading, setLoading] = useState(false);
  const [budget, setBudget] = useState(null);

  const [utilidadGlobal, setUtilidadGlobal] = useState("");
  const [aiu, setAiu] = useState({
    administracion: "",
    imprevistos: "",
    utilidad: "",
  });

  const [savingUtilidad, setSavingUtilidad] = useState(false);
  const [savingAIU, setSavingAIU] = useState(false);

  const [importing, setImporting] = useState(false);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editItem, setEditItem] = useState(null);

  // ------------------------------------------------------------
  // Cargar presupuesto
  // ------------------------------------------------------------

  const loadBudget = async () => {
    try {
      setLoading(true);
      const data = await budgetService.getBudgetByProject(projectId);

      setBudget(data);

      setUtilidadGlobal(
        data.utilidadGlobal !== undefined && data.utilidadGlobal !== null
          ? String(data.utilidadGlobal)
          : ""
      );

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
  }, [projectId]);

  // ------------------------------------------------------------
  // Importar desde Excel
  // ------------------------------------------------------------

  const handleImportExcel = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel",
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (res.canceled) return;
      const file = res.assets?.[0];
      if (!file?.uri) {
        Alert.alert("Error", "No se pudo leer el archivo seleccionado.");
        return;
      }

      Alert.alert(
        "Importar presupuesto",
        "Esto reemplazará los ítems actuales del presupuesto por los del Excel. ¿Continuar?",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Sí, importar",
            style: "destructive",
            onPress: async () => {
              try {
                setImporting(true);

                const base64 = await FileSystem.readAsStringAsync(file.uri, {
                  encoding: FileSystem.EncodingType.Base64,
                });

                const parsed = parseBudgetFromExcelBase64(base64);

                await budgetService.replaceBudgetFromImport(projectId, {
                  utilidadGlobal: parsed.utilidadGlobal,
                  aiu: parsed.aiu,
                  items: parsed.items,
                });

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

  // ------------------------------------------------------------
  // Guardar utilidad global
  // ------------------------------------------------------------

  const handleSaveUtilidadGlobal = async () => {
    try {
      setSavingUtilidad(true);
      const valor = parseFloat(utilidadGlobal.replace(",", ".")) || 0;
      await budgetService.updateUtilidadGlobal(projectId, valor);
      await loadBudget();
    } catch (error) {
      console.error("Error guardando utilidad global:", error);
      Alert.alert("Error", "No se pudo actualizar la utilidad global.");
    } finally {
      setSavingUtilidad(false);
    }
  };

  // ------------------------------------------------------------
  // Guardar AIU
  // ------------------------------------------------------------

  const handleSaveAIU = async () => {
    try {
      setSavingAIU(true);
      const adm = parseFloat(aiu.administracion.replace(",", ".")) || 0;
      const imp = parseFloat(aiu.imprevistos.replace(",", ".")) || 0;
      const uti = parseFloat(aiu.utilidad.replace(",", ".")) || 0;

      await budgetService.updateAIU(projectId, {
        administracion: adm,
        imprevistos: imp,
        utilidad: uti,
      });

      await loadBudget();
    } catch (error) {
      console.error("Error guardando AIU:", error);
      Alert.alert("Error", "No se pudo actualizar el AIU.");
    } finally {
      setSavingAIU(false);
    }
  };

  // ------------------------------------------------------------
  // CRUD Ítems
  // ------------------------------------------------------------

  const handleAddItem = (faseKey) => {
    setEditItem({
      id: undefined,
      faseKey,
      nombre: "",
      unidades: "",
      costoUnitario: "",
      aplicaIva: true,
      unidad: "un",
      categoria: "",
      notas: "",
    });
    setEditModalVisible(true);
  };

  const openEditItem = (item, faseKey) => {
    setEditItem({
      ...item,
      faseKey,
      unidades: String(item.unidades ?? ""),
      costoUnitario: String(item.costoUnitario ?? ""),
    });
    setEditModalVisible(true);
  };

  const handleCloseModal = () => {
    setEditModalVisible(false);
    setEditItem(null);
  };

  const handleSaveItem = async (itemGuardado) => {
    try {
      const faseKey = itemGuardado.faseKey;
      const itemsExistentes = budget?.fases?.[faseKey]?.items || [];
      const existe = !!itemsExistentes.find((i) => i.id === itemGuardado.id);

      if (existe) {
        await budgetService.updateItem(projectId, budget.id, faseKey, itemGuardado);
      } else {
        if (faseKey === "fase4") {
          await budgetService.addItemFase4(projectId, budget.id, itemGuardado);
        } else {
          await budgetService.addItem(projectId, budget.id, faseKey, itemGuardado);
        }
      }

      handleCloseModal();
      await loadBudget();
    } catch (err) {
      console.error("Error guardando ítem:", err);
      Alert.alert("Error", "No se pudo guardar el ítem.");
    }
  };

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

  // ------------------------------------------------------------
  // Loading
  // ------------------------------------------------------------

  if (loading || !budget) {
    return <LoadingOverlay message="Cargando presupuesto..." />;
  }

  const { fases, totalesGenerales, calculosGlobales, totalGeneral } = budget;

  return (
    <View style={styles.screenContainer}>
      <ScrollView style={styles.container}>
        {/* Header */}
        <Text style={styles.screenTitle}>Presupuesto del proyecto</Text>
        <Text style={styles.projectId}>ID proyecto: {projectId}</Text>

        {/* Importar Excel */}
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

        {/* UTILIDAD GLOBAL */}
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

        {/* FASES 1-4 */}
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

        {/* TOTALES GENERALES */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Totales generales del proyecto</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Costo total del proyecto</Text>
            <Text style={styles.summaryValue}>
              {formatMoney(totalesGenerales.costoTotalProyecto)}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Valor total del proyecto</Text>
            <Text style={styles.summaryValue}>
              {formatMoney(totalesGenerales.valorTotalProyecto)}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Utilidad total (solo por ítems)</Text>
            <Text style={styles.summaryValue}>
              {formatMoney(totalesGenerales.utilidadTotalProyecto)}
            </Text>
          </View>
        </View>

        {/* RESUMEN GENERAL (IVA + AIU) */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Resumen general (IVA + AIU)</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total antes de IVA</Text>
            <Text style={styles.summaryValue}>
              {formatMoney(calculosGlobales.totalAntesIVA)}
            </Text>
          </View>

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

          {/* AIU */}
          <View style={{ marginTop: 18 }}>
            <Text style={styles.sectionTitle}>Ajustar AIU</Text>
            <Text style={styles.sectionSubtitle}>
              El AIU se calcula sobre el valor total de las fases 3 y 4.
            </Text>

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

          {/* CONTINUACIÓN */}
          <View style={[styles.summaryRow, { marginTop: 16 }]}>
            <Text style={styles.summaryLabel}>Base AIU</Text>
            <Text style={styles.summaryValue}>{formatMoney(calculosGlobales.baseAIU)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Administración</Text>
            <Text style={styles.summaryValue}>{formatMoney(calculosGlobales.administracion)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Imprevistos</Text>
            <Text style={styles.summaryValue}>{formatMoney(calculosGlobales.imprevistos)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Utilidad AIU</Text>
            <Text style={styles.summaryValue}>{formatMoney(calculosGlobales.utilidadAIU)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>IVA utilidad AIU</Text>
            <Text style={styles.summaryValue}>{formatMoney(calculosGlobales.ivaUtilidadAIU)}</Text>
          </View>

          <View style={[styles.summaryRow, { marginTop: 10 }]}>
            <Text style={[styles.summaryLabel, { fontWeight: "700", color: "#FBBF24" }]}>
              TOTAL GENERAL DESPUÉS DE IVA
            </Text>
            <Text style={[styles.summaryValue, { fontWeight: "700", color: "#FBBF24" }]}>
              {formatMoney(totalGeneral)}
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <EditItemModal
        visible={editModalVisible}
        item={editItem}
        onClose={handleCloseModal}
        onSave={handleSaveItem}
      />
    </View>
  );
}

// ------------------------------------------------------------
// COMPONENTE PARA CADA FASE
// ------------------------------------------------------------

function BudgetPhaseCard({ title, faseKey, faseData, color, onAddItem, onEditItem, onDeleteItem }) {
  const items = faseData?.items || [];

  return (
    <View style={styles.phaseCard}>
      <View style={styles.phaseHeaderCol}>
  <View style={styles.phaseTitleRow}>
    <View style={[styles.phaseBadge, { backgroundColor: color }]} />
    <Text style={styles.phaseTitle} numberOfLines={2}>
      {title}
    </Text>
  </View>

  <Text style={styles.phaseTotalBelow}>{formatMoney(faseData.total)}</Text>
</View>


      <View style={styles.phaseItemsList}>
        {items.map((item) => (
          <View key={item.id} style={styles.phaseItem}>
            <View style={styles.itemHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.nombre}</Text>
                <Text style={styles.itemDetail}>
                  {item.unidades} u × {formatMoney(item.costoUnitario)}{" "}
                  {!item.aplicaUtilidadGlobal ? "(sin utilidad)" : ""}{" "}
                  {item.aplicaIva ? "(con IVA en resumen)" : "(sin IVA)"}
                </Text>
              </View>

              <View style={styles.itemActions}>
                <TouchableOpacity style={styles.iconButton} onPress={() => onEditItem(item, faseKey)}>
                  <Text style={styles.iconButtonText}>Editar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.iconButton, { backgroundColor: "#7F1D1D" }]}
                  onPress={() => onDeleteItem(item, faseKey)}
                >
                  <Text style={[styles.iconButtonText, { color: "#FCA5A5" }]}>Borrar</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.itemDetailGrid}>
              <View style={styles.itemRow}>
                <Text style={styles.itemLabel}>Costo total</Text>
                <Text style={styles.itemValue}>{formatMoney(item.costoTotal)}</Text>
              </View>

              <View style={styles.itemRow}>
                <Text style={styles.itemLabel}>Precio individual</Text>
                <Text style={styles.itemValue}>{formatMoney(item.precioIndividual)}</Text>
              </View>

              <View style={styles.itemRow}>
                <Text style={styles.itemLabel}>Valor total</Text>
                <Text style={styles.itemValue}>{formatMoney(item.valorTotal)}</Text>
              </View>

              <View style={styles.itemRow}>
                <Text style={styles.itemLabel}>Utilidad</Text>
                <Text style={styles.itemValue}>{formatMoney(item.utilidad)}</Text>
              </View>
            </View>

            {item.notas ? <Text style={styles.itemNotes}>Nota: {item.notas}</Text> : null}
          </View>
        ))}

        {items.length === 0 && (
          <Text style={styles.emptyItemsText}>Aún no hay ítems en esta fase.</Text>
        )}

        <View style={styles.newItemContainer}>
          <TouchableOpacity style={styles.addBtn} onPress={() => onAddItem(faseKey)}>
            <Text style={styles.addBtnText}>+ Agregar ítem</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ------------------------------------------------------------
// ESTILOS
// ------------------------------------------------------------

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: "#0B1120",
  },
  container: {
    flex: 1,
    padding: 16,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#F9FAFB",
    marginBottom: 4,
  },
  projectId: {
    color: "#9CA3AF",
    marginBottom: 16,
  },

  card: {
    backgroundColor: "#020617",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.25)",
  },
  sectionTitle: {
    color: "#E5E7EB",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: "#9CA3AF",
    fontSize: 13,
    marginBottom: 10,
  },
  label: {
    color: "#E5E7EB",
    fontSize: 13,
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#020617",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#374151",
    fontSize: 14,
  },

  importButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#334155",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.25)",
  },
  importButtonText: {
    color: "#E5E7EB",
    fontWeight: "600",
    fontSize: 13,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 6,
  },
  rowCenter: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 8,
  },
  aiuField: {
    flex: 1,
  },

  primaryButton: {
    backgroundColor: "#10B981",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#022C22",
    fontWeight: "600",
    fontSize: 14,
  },
  secondaryButton: {
    marginTop: 4,
    alignSelf: "flex-end",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#1D4ED8",
  },
  secondaryButtonText: {
    color: "#EFF6FF",
    fontWeight: "600",
    fontSize: 13,
  },

  phaseCard: {
    backgroundColor: "#020617",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.25)",
  },
  phaseHeaderCol: {
    marginBottom: 10,
  },
  phaseTitleRow: {
    flexDirection: "row",
    color: "#FBBF24",
    alignItems: "center",
    marginBottom: 4,
  },
  phaseTotalBelow: {
    color: "#FBBF24",
    fontSize: 16,
    fontWeight: "600",
  },

  phaseBadge: {
    width: 12,
    height: 12,
    borderRadius: 999,
    marginRight: 8,
  },
  phaseTitle: {
    color: "#E2E8F0",
    fontSize: 16,
    fontWeight: "600",
  },
  phaseTotal: {
    color: "#FBBF24",
    fontSize: 16,
    fontWeight: "600",
  },
  phaseItemsList: {
    marginTop: 4,
  },
  phaseItem: {
    backgroundColor: "#020617",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(31,41,55,0.9)",
  },
  itemHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  itemName: {
    color: "#F1F5F9",
    fontSize: 15,
    fontWeight: "600",
  },
  itemDetail: {
    color: "#CBD5E1",
    fontSize: 13,
  },
  itemActions: {
    flexDirection: "row",
    gap: 6,
  },
  iconButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#334155",
  },
  iconButtonText: {
    color: "#E5E7EB",
    fontSize: 12,
  },

  itemDetailGrid: {
    borderTopWidth: 1,
    borderTopColor: "rgba(51,65,85,0.9)",
    paddingTop: 6,
    marginTop: 6,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  itemLabel: {
    color: "#9CA3AF",
    fontSize: 12,
  },
  itemValue: {
    color: "#E5E7EB",
    fontSize: 12,
    fontVariant: ["tabular-nums"],
  },
  itemNotes: {
    marginTop: 4,
    color: "#9CA3AF",
    fontSize: 12,
    fontStyle: "italic",
  },

  newItemContainer: {
    marginTop: 6,
    alignItems: "flex-end",
  },
  addBtn: {
    backgroundColor: "#10B981",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  addBtnText: {
    color: "#064E3B",
    fontWeight: "600",
    fontSize: 13,
  },
  emptyItemsText: {
    color: "#9CA3AF",
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 4,
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  summaryLabel: {
    color: "#9CA3AF",
    fontSize: 14,
  },
  summaryValue: {
    color: "#F9FAFB",
    fontSize: 14,
    fontVariant: ["tabular-nums"],
  },
});
