// components/inventory/TruckInventoryModal.js
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

/**
 * Modal que muestra TODO el inventario actual de la camioneta.
 *
 * Útil cuando quieres descargar material que NO aparece en la lista
 * del proyecto o del inventario general que estás viendo.
 *
 * Para cada ítem en camioneta puedes:
 *   · Descargar al inventario general
 *   · Descargar al proyecto seleccionado (si se pasa `proyectoId`)
 *
 * @component
 * @param {Object}   props
 * @param {boolean}  props.visible
 * @param {Array}    props.itemsCamioneta        - Lista completa de docs de inventario_camioneta
 * @param {Function} props.onDescargarGeneral    - ({ itemId, cantidad, item })
 * @param {Function} props.onDescargarProyecto   - ({ itemId, cantidad, proyectoId, proyectoTitle, item })
 * @param {Array}    [props.projects]            - Proyectos activos (para selector de destino)
 * @param {string}   [props.proyectoId]          - Si viene de ProjectStockScreen, preselecciona este proyecto
 * @param {string}   [props.proyectoTitle]
 * @param {Function} props.onClose
 * @param {boolean}  [props.loading]
 */
export default function TruckInventoryModal({
  visible,
  itemsCamioneta = [],
  onDescargarGeneral,
  onDescargarProyecto,
  projects = [],
  proyectoId: proyectoIdProp,
  proyectoTitle: proyectoTitleProp,
  onClose,
  loading = false,
}) {
  // Por ítem: gestiona su cantidad y destino expandido
  const [expanded, setExpanded] = useState(null);        // itemId expandido
  const [cantidades, setCantidades] = useState({});       // { itemId: '5' }
  const [destinos, setDestinos] = useState({});           // { itemId: 'general' | 'proyecto' }
  const [proyectosSeleccionados, setProyectosSeleccionados] = useState({});
  const [searchProyecto, setSearchProyecto] = useState('');

  const proyectosActivos = projects.filter((p) => (p.progress || 0) < 1);
  const proyectosFiltrados = proyectosActivos.filter((p) =>
    searchProyecto ? p.title?.toLowerCase().includes(searchProyecto.toLowerCase()) : true
  );

  const handleExpand = (itemId) => {
    setExpanded(expanded === itemId ? null : itemId);
    // Si hay proyecto preseleccionado, usarlo por defecto
    if (proyectoIdProp) {
      setDestinos((prev) => ({ ...prev, [itemId]: 'proyecto' }));
      setProyectosSeleccionados((prev) => ({
        ...prev,
        [itemId]: { id: proyectoIdProp, title: proyectoTitleProp },
      }));
    }
  };

  const handleConfirmar = (item) => {
    const cantInt = parseInt(cantidades[item.id] || '');
    if (!cantInt || cantInt <= 0) {
      Alert.alert('Error', 'Ingresa una cantidad válida.');
      return;
    }
    if (cantInt > Number(item.cantidad || 0)) {
      Alert.alert('Error', `Solo hay ${item.cantidad} ${item.tipo_medida || 'Unidad'} en la camioneta.`);
      return;
    }

    const destino = destinos[item.id] || 'general';

    if (destino === 'general') {
      onDescargarGeneral({ itemId: item.itemId || item.id, cantidad: cantInt, item });
    } else {
      const proy = proyectosSeleccionados[item.id];
      if (!proy) {
        Alert.alert('Error', 'Selecciona un proyecto destino.');
        return;
      }
      onDescargarProyecto({
        itemId: item.itemId || item.id,
        cantidad: cantInt,
        proyectoId: proy.id,
        proyectoTitle: proy.title,
        item,
      });
    }
  };

  const handleClose = () => {
    setExpanded(null);
    setCantidades({});
    setDestinos({});
    setProyectosSeleccionados({});
    setSearchProyecto('');
    onClose();
  };

  const renderItem = ({ item }) => {
    const isExpanded = expanded === item.id;
    const destino = destinos[item.id] || 'general';
    const proyectoSel = proyectosSeleccionados[item.id];

    return (
      <View style={styles.card}>
        {/* ── Fila resumen del ítem ── */}
        <TouchableOpacity
          style={styles.cardHeader}
          onPress={() => handleExpand(item.id)}
          activeOpacity={0.75}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.cardName}>{item.nombre}</Text>
            {item.codigo ? (
              <Text style={styles.cardCode}>Código: {item.codigo}</Text>
            ) : null}
            <Text style={styles.cardMeta}>
              {item.categoria || 'Sin categoría'} · {item.tipo_medida || 'Unidad'}
            </Text>
          </View>
          <View style={styles.cardQtyBox}>
            <Text style={styles.cardQty}>{item.cantidad}</Text>
            <Text style={styles.cardQtyLabel}>{item.tipo_medida || 'Unidad'}</Text>
          </View>
          <Text style={styles.chevron}>{isExpanded ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {/* ── Panel expandido: descargar ── */}
        {isExpanded && (
          <View style={styles.cardBody}>
            {/* Cantidad */}
            <Text style={styles.fieldLabel}>Cantidad a descargar *</Text>
            <TextInput
              style={styles.input}
              placeholder={`Máx: ${item.cantidad}`}
              placeholderTextColor="#666"
              keyboardType="numeric"
              value={cantidades[item.id] || ''}
              onChangeText={(t) => {
                if (/^\d*$/.test(t))
                  setCantidades((prev) => ({ ...prev, [item.id]: t }));
              }}
              editable={!loading}
            />

            {/* Toggle destino */}
            <Text style={styles.fieldLabel}>Destino</Text>
            <View style={styles.destinoRow}>
              <TouchableOpacity
                style={[styles.destinoBtn, destino === 'general' && styles.destinoActive]}
                onPress={() => setDestinos((prev) => ({ ...prev, [item.id]: 'general' }))}
              >
                <Text style={[styles.destinoBtnText, destino === 'general' && styles.destinoActiveText]}>
                  🏠 General
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.destinoBtn, destino === 'proyecto' && styles.destinoActive]}
                onPress={() => setDestinos((prev) => ({ ...prev, [item.id]: 'proyecto' }))}
              >
                <Text style={[styles.destinoBtnText, destino === 'proyecto' && styles.destinoActiveText]}>
                  📋 Proyecto
                </Text>
              </TouchableOpacity>
            </View>

            {/* Selector de proyecto */}
            {destino === 'proyecto' && (
              <View style={styles.proyectoSelector}>
                {/* Si hay proyecto preseleccionado, mostrarlo primero */}
                {proyectoIdProp && (
                  <TouchableOpacity
                    style={[
                      styles.proyectoRow,
                      proyectoSel?.id === proyectoIdProp && styles.proyectoRowSelected,
                    ]}
                    onPress={() =>
                      setProyectosSeleccionados((prev) => ({
                        ...prev,
                        [item.id]: { id: proyectoIdProp, title: proyectoTitleProp },
                      }))
                    }
                  >
                    <View>
                      <Text style={styles.proyectoPinLabel}>Proyecto actual</Text>
                      <Text style={[
                        styles.proyectoRowText,
                        proyectoSel?.id === proyectoIdProp && styles.proyectoRowTextSelected,
                      ]}>
                        {proyectoTitleProp}
                      </Text>
                    </View>
                    {proyectoSel?.id === proyectoIdProp && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                )}

                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar otro proyecto..."
                  placeholderTextColor="#64748B"
                  value={searchProyecto}
                  onChangeText={setSearchProyecto}
                  editable={!loading}
                />
                <FlatList
                  data={proyectosFiltrados.filter((p) => p.id !== proyectoIdProp)}
                  keyExtractor={(p) => p.id}
                  style={{ maxHeight: 140 }}
                  keyboardShouldPersistTaps="handled"
                  scrollEnabled
                  renderItem={({ item: proj }) => {
                    const isSel = proyectoSel?.id === proj.id;
                    return (
                      <TouchableOpacity
                        style={[styles.proyectoRow, isSel && styles.proyectoRowSelected]}
                        onPress={() =>
                          setProyectosSeleccionados((prev) => ({
                            ...prev,
                            [item.id]: proj,
                          }))
                        }
                        disabled={loading}
                      >
                        <Text style={[styles.proyectoRowText, isSel && styles.proyectoRowTextSelected]}>
                          {proj.title}
                        </Text>
                        {isSel && <Text style={styles.checkmark}>✓</Text>}
                      </TouchableOpacity>
                    );
                  }}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>No hay otros proyectos activos</Text>
                  }
                />
              </View>
            )}

            {/* Botón confirmar */}
            <TouchableOpacity
              style={[styles.confirmBtn, loading && styles.confirmBtnDisabled]}
              onPress={() => handleConfirmar(item)}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.confirmBtnText}>⬇ Descargar</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>

          {/* ── Header ── */}
          <View style={styles.header}>
            <Text style={styles.headerIcon}>🚐</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Inventario camioneta</Text>
              <Text style={styles.subtitle}>
                {itemsCamioneta.length === 0
                  ? 'Sin material cargado'
                  : `${itemsCamioneta.length} tipo${itemsCamioneta.length > 1 ? 's' : ''} de material`}
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* ── Lista ── */}
          {itemsCamioneta.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>🚐</Text>
              <Text style={styles.emptyTitle}>La camioneta está vacía</Text>
              <Text style={styles.emptyHint}>
                Carga material desde el inventario general o desde un proyecto.
              </Text>
            </View>
          ) : (
            <FlatList
              data={itemsCamioneta}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
            />
          )}

          {/* ── Footer ── */}
          <TouchableOpacity style={styles.closeFooterBtn} onPress={handleClose}>
            <Text style={styles.closeFooterText}>Cerrar</Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.82)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#1A1200',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    width: '100%',
    height: '92%',
    borderTopWidth: 2,
    borderColor: '#EA580C',
    elevation: 20,
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  header: {
    backgroundColor: '#7C2D12',
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EA580C',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  headerIcon: { fontSize: 26 },
  title: { color: '#FED7AA', fontSize: 20, fontWeight: 'bold' },
  subtitle: { color: '#FDBA74', fontSize: 13, marginTop: 2 },
  closeBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { color: '#E2E8F0', fontSize: 16, fontWeight: '700' },

  list: { padding: 16, paddingBottom: 8 },

  // ── Tarjeta de ítem ──
  card: {
    backgroundColor: 'rgba(234,88,12,0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(234,88,12,0.25)',
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  cardName: { color: '#FFF7ED', fontSize: 15, fontWeight: '700' },
  cardCode: { color: '#FDBA74', fontSize: 12, marginTop: 2 },
  cardMeta: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  cardQtyBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(234,88,12,0.2)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#EA580C',
  },
  cardQty: { color: '#FDBA74', fontSize: 20, fontWeight: '800' },
  cardQtyLabel: { color: '#94A3B8', fontSize: 10 },
  chevron: { color: '#EA580C', fontSize: 14, fontWeight: '700', marginLeft: 4 },

  // ── Panel expandido ──
  cardBody: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(234,88,12,0.2)',
    padding: 14,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  fieldLabel: { color: '#E2E8F0', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 14,
    fontSize: 18,
    color: '#000',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    minHeight: 52,
  },

  // ── Toggle destino ──
  destinoRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  destinoBtn: {
    flex: 1, paddingVertical: 11, borderRadius: 10, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  destinoActive: {
    backgroundColor: 'rgba(234,88,12,0.2)',
    borderColor: '#EA580C',
  },
  destinoBtnText: { color: '#64748B', fontWeight: '600', fontSize: 14 },
  destinoActiveText: { color: '#FDBA74' },

  // ── Selector proyecto ──
  proyectoSelector: {
    backgroundColor: 'rgba(234,88,12,0.06)',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(234,88,12,0.2)',
    marginBottom: 12,
  },
  proyectoPinLabel: { color: '#EA580C', fontSize: 10, fontWeight: '700', marginBottom: 2 },
  searchInput: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: 10,
    color: '#FFF', fontSize: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 8,
  },
  proyectoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 10, backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 5,
  },
  proyectoRowSelected: { borderColor: '#EA580C', backgroundColor: 'rgba(234,88,12,0.15)' },
  proyectoRowText: { color: '#CBD5E1', fontSize: 13, fontWeight: '500' },
  proyectoRowTextSelected: { color: '#FDBA74', fontWeight: '700' },
  checkmark: { color: '#EA580C', fontSize: 15, fontWeight: '700' },
  emptyText: { color: '#64748B', fontSize: 12, textAlign: 'center', padding: 8 },

  // ── Botón confirmar por ítem ──
  confirmBtn: {
    backgroundColor: '#1D4ED8',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

  // ── Estado vacío ──
  emptyBox: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40,
  },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { color: '#FED7AA', fontSize: 18, fontWeight: '700' },
  emptyHint: { color: '#64748B', fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // ── Footer ──
  closeFooterBtn: {
    margin: 16,
    marginTop: 0,
    backgroundColor: '#431407',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#7C2D12',
  },
  closeFooterText: { color: '#FED7AA', fontWeight: '700', fontSize: 16 },
});