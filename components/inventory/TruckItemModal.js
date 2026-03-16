// components/inventory/TruckItemModal.js
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

/**
 * Modal para gestionar el material de la camioneta.
 *
 * Soporta dos contextos de uso:
 *
 * contexto="general"  (desde GeneralStockScreen)
 *   · Cargar  → descuenta del inventario general
 *   · Descargar → elige: inventario general | proyecto
 *
 * contexto="proyecto"  (desde ProjectStockScreen)
 *   · Cargar  → descuenta del inventario del proyecto
 *   · Descargar → elige: inventario general | proyecto
 *
 * @component
 * @param {Object}   props
 * @param {boolean}  props.visible
 * @param {Object|null} props.selectedItem          - Ítem a gestionar
 * @param {number}   props.cantidadEnCamioneta        - Cantidad actual en camioneta
 * @param {Array}    props.projects                   - Proyectos activos
 * @param {'general'|'proyecto'} [props.contexto]     - Origen del cargar (default 'general')
 * @param {Function} props.onCargar                   - ({ cantidad }) — desde general
 * @param {Function} [props.onCargarDesdeProyecto]    - ({ cantidad }) — desde proyecto
 * @param {Function} props.onDescargarGeneral         - ({ cantidad })
 * @param {Function} props.onDescargarProyecto        - ({ cantidad, proyectoId, proyectoTitle })
 * @param {Function} props.onClose
 * @param {boolean}  [props.loading]
 */
export default function TruckItemModal({
  visible,
  selectedItem,
  cantidadEnCamioneta = 0,
  projects = [],
  contexto = 'general',        // 'general' | 'proyecto'
  onCargar,
  onCargarDesdeProyecto,
  onDescargarGeneral,
  onDescargarProyecto,
  onClose,
  loading = false,
}) {
  const [modo, setModo] = useState('cargar');
  const [destino, setDestino] = useState('general');
  const [cantidad, setCantidad] = useState('');
  const [searchProyecto, setSearchProyecto] = useState('');
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState(null);

  useEffect(() => {
    if (visible) {
      setCantidad('');
      // Si hay material en camioneta, abrir directo en descargar
      setModo(cantidadEnCamioneta > 0 ? 'descargar' : 'cargar');
      setDestino('general');
      setSearchProyecto('');
      setProyectoSeleccionado(null);
    }
  }, [visible, selectedItem]);

  const proyectosActivos = projects.filter((p) => (p.progress || 0) < 1);
  const proyectosFiltrados = proyectosActivos.filter((p) =>
    searchProyecto
      ? p.title?.toLowerCase().includes(searchProyecto.toLowerCase())
      : true
  );

  const handleConfirm = () => {
    const cantInt = parseInt(cantidad);
    if (!cantidad || isNaN(cantInt) || cantInt <= 0) {
      Alert.alert('Error', 'Ingresa una cantidad válida.');
      return;
    }

    if (modo === 'cargar') {
      if (contexto === 'proyecto') {
        onCargarDesdeProyecto?.({ cantidad: cantInt });
      } else {
        onCargar?.({ cantidad: cantInt });
      }
      return;
    }

    // Descargar
    if (cantInt > cantidadEnCamioneta) {
      Alert.alert('Error', `Solo hay ${cantidadEnCamioneta} ${selectedItem?.tipo_medida || 'Unidad'} en la camioneta.`);
      return;
    }

    if (destino === 'general') {
      onDescargarGeneral?.({ cantidad: cantInt });
    } else {
      if (!proyectoSeleccionado) {
        Alert.alert('Error', 'Selecciona un proyecto destino.');
        return;
      }
      onDescargarProyecto?.({
        cantidad: cantInt,
        proyectoId: proyectoSeleccionado.id,
        proyectoTitle: proyectoSeleccionado.title,
      });
    }
  };

  const handleClose = () => {
    setCantidad('');
    setModo('cargar');
    setDestino('general');
    setSearchProyecto('');
    setProyectoSeleccionado(null);
    onClose();
  };

  if (!selectedItem) return null;

  const cantInt = parseInt(cantidad) || 0;
  const resultadoCargar = cantidadEnCamioneta + cantInt;
  const resultadoDescargar = Math.max(0, cantidadEnCamioneta - cantInt);

  // Etiqueta del botón de cargar según contexto
  const labelCargar = contexto === 'proyecto' ? '⬆ Cargar desde proyecto' : '⬆ Cargar';
  const stockDisponibleLabel = contexto === 'proyecto'
    ? `Disp. en proyecto: ${selectedItem.cantidadActual ?? selectedItem.cantidad ?? 0}`
    : `Disponible: ${selectedItem.cantidad ?? 0}`;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>

          {/* ── Header ── */}
          <View style={styles.header}>
            <Text style={styles.headerIcon}>🚐</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Camioneta</Text>
              <Text style={styles.subtitle} numberOfLines={1}>{selectedItem.nombre}</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* ── Chips de stock ── */}
          <View style={styles.stockBar}>
            {contexto === 'general' ? (
              <View style={styles.chip}>
                <Text style={styles.chipLabel}>Stock general</Text>
                <Text style={styles.chipValue}>
                  {selectedItem.cantidad ?? 0} {selectedItem.tipo_medida || 'Unidad'}
                </Text>
              </View>
            ) : (
              <View style={styles.chip}>
                <Text style={styles.chipLabel}>Disponible en proyecto</Text>
                <Text style={styles.chipValue}>
                  {selectedItem.cantidadActual ?? selectedItem.cantidad ?? 0} {selectedItem.tipo_medida || 'Unidad'}
                </Text>
              </View>
            )}
            <View style={[styles.chip, styles.chipCamioneta]}>
              <Text style={styles.chipLabel}>En camioneta</Text>
              <Text style={[styles.chipValue, styles.chipCamiValue]}>
                {cantidadEnCamioneta} {selectedItem.tipo_medida || 'Unidad'}
              </Text>
            </View>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

            {/* ── Toggle Cargar / Descargar ── */}
            <View style={styles.toggle}>
              <TouchableOpacity
                style={[styles.toggleBtn, modo === 'cargar' && styles.toggleCargarActive]}
                onPress={() => { setModo('cargar'); setCantidad(''); }}
              >
                <Text style={[styles.toggleText, modo === 'cargar' && styles.toggleTextActive]}>
                  ⬆ Cargar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  modo === 'descargar' && styles.toggleDescargarActive,
                  cantidadEnCamioneta === 0 && styles.toggleDisabled,
                ]}
                onPress={() => {
                  if (cantidadEnCamioneta === 0) {
                    Alert.alert('Sin material', 'No hay material de este tipo en la camioneta.');
                    return;
                  }
                  setModo('descargar');
                  setCantidad('');
                }}
              >
                <Text style={[
                  styles.toggleText,
                  modo === 'descargar' && styles.toggleTextActive,
                  cantidadEnCamioneta === 0 && styles.toggleTextDisabled,
                ]}>
                  ⬇ Descargar
                </Text>
              </TouchableOpacity>
            </View>

            {/* ── Cantidad ── */}
            <Text style={styles.label}>
              Cantidad a {modo === 'cargar' ? 'cargar' : 'descargar'} *
            </Text>
            <TextInput
              style={styles.input}
              placeholder={modo === 'cargar' ? stockDisponibleLabel : `En camioneta: ${cantidadEnCamioneta}`}
              placeholderTextColor="#666"
              keyboardType="numeric"
              value={cantidad}
              onChangeText={(t) => { if (/^\d*$/.test(t)) setCantidad(t); }}
              editable={!loading}
            />

            {/* ── Preview resultado ── */}
            {cantInt > 0 && (
              <View style={[
                styles.previewBox,
                modo === 'cargar' ? styles.previewCargar : styles.previewDescargar,
              ]}>
                <Text style={styles.previewLabel}>Camioneta quedaría con:</Text>
                <Text style={[
                  styles.previewValue,
                  modo === 'cargar' ? styles.previewValCargar : styles.previewValDescargar,
                ]}>
                  {modo === 'cargar' ? resultadoCargar : resultadoDescargar}{' '}
                  {selectedItem.tipo_medida || 'Unidad'}
                </Text>
              </View>
            )}

            {/* ── Selector de destino (solo al descargar) ── */}
            {modo === 'descargar' && (
              <>
                <Text style={[styles.label, { marginTop: 16 }]}>Destino *</Text>
                <View style={styles.destinoToggle}>
                  <TouchableOpacity
                    style={[styles.destinoBtn, destino === 'general' && styles.destinoBtnActive]}
                    onPress={() => { setDestino('general'); setProyectoSeleccionado(null); }}
                  >
                    <Text style={[styles.destinoBtnText, destino === 'general' && styles.destinoBtnTextActive]}>
                      🏠 General
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.destinoBtn, destino === 'proyecto' && styles.destinoBtnActive]}
                    onPress={() => setDestino('proyecto')}
                  >
                    <Text style={[styles.destinoBtnText, destino === 'proyecto' && styles.destinoBtnTextActive]}>
                      📋 Proyecto
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.notaDestino}>
                  {destino === 'general'
                    ? 'ℹ️ El stock vuelve al inventario general.'
                    : 'ℹ️ Va directo al inventario del proyecto y se registra como gasto.'}
                </Text>

                {destino === 'proyecto' && (
                  <View style={styles.proyectoBox}>
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Buscar proyecto..."
                      placeholderTextColor="#64748B"
                      value={searchProyecto}
                      onChangeText={setSearchProyecto}
                      editable={!loading}
                    />
                    <FlatList
                      data={proyectosFiltrados}
                      keyExtractor={(p) => p.id}
                      style={{ maxHeight: 180 }}
                      keyboardShouldPersistTaps="handled"
                      scrollEnabled={false}
                      renderItem={({ item: proj }) => {
                        const isSelected = proyectoSeleccionado?.id === proj.id;
                        return (
                          <TouchableOpacity
                            style={[styles.proyectoRow, isSelected && styles.proyectoRowSelected]}
                            onPress={() => setProyectoSeleccionado(proj)}
                            disabled={loading}
                          >
                            <Text style={[styles.proyectoText, isSelected && styles.proyectoTextSelected]}>
                              {proj.title}
                            </Text>
                            {isSelected && <Text style={styles.checkmark}>✓</Text>}
                          </TouchableOpacity>
                        );
                      }}
                      ListEmptyComponent={
                        <Text style={styles.emptyText}>No hay proyectos activos</Text>
                      }
                    />
                  </View>
                )}
              </>
            )}

            {/* ── Nota informativa al cargar ── */}
            {modo === 'cargar' && (
              <Text style={styles.notaCarga}>
                {contexto === 'proyecto'
                  ? 'ℹ️ El material se descuenta del inventario de este proyecto.'
                  : 'ℹ️ El material se descuenta del stock general al cargar.'}
              </Text>
            )}

          </ScrollView>

          {/* ── Footer ── */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.btn, styles.btnCancel]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.btnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.btn,
                modo === 'cargar' ? styles.btnCargar : styles.btnDescargar,
                (!cantidad || loading) && styles.btnDisabled,
              ]}
              onPress={handleConfirm}
              disabled={!cantidad || loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.btnText}>
                  {modo === 'cargar' ? labelCargar : '⬇ Descargar'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

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
    overflow: 'hidden',
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
  },
  headerIcon: { fontSize: 26 },
  title: { color: '#FED7AA', fontSize: 22, fontWeight: 'bold', lineHeight: 26 },
  subtitle: { color: '#FDBA74', fontSize: 14, marginTop: 1 },
  closeBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { color: '#E2E8F0', fontSize: 16, fontWeight: '700' },
  stockBar: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: 'rgba(234,88,12,0.08)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(234,88,12,0.2)',
  },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8,
    alignItems: 'center', flex: 1,
  },
  chipCamioneta: {
    backgroundColor: 'rgba(234,88,12,0.2)',
    borderWidth: 1, borderColor: '#EA580C',
  },
  chipLabel: { color: '#94A3B8', fontSize: 11, fontWeight: '500', marginBottom: 3 },
  chipValue: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  chipCamiValue: { color: '#FDBA74' },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  toggle: {
    flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12, padding: 4, marginBottom: 20, gap: 4,
  },
  toggleBtn: { flex: 1, paddingVertical: 11, borderRadius: 9, alignItems: 'center' },
  toggleCargarActive: { backgroundColor: '#EA580C' },
  toggleDescargarActive: { backgroundColor: '#1D4ED8' },
  toggleDisabled: { opacity: 0.35 },
  toggleText: { color: '#94A3B8', fontWeight: '600', fontSize: 15 },
  toggleTextActive: { color: '#FFF' },
  toggleTextDisabled: { color: '#555' },
  label: { color: '#E2E8F0', fontSize: 15, fontWeight: '600', marginBottom: 10 },
  input: {
    backgroundColor: '#FFF', borderRadius: 12, padding: 16,
    fontSize: 20, color: '#000', borderWidth: 2, borderColor: '#E2E8F0',
    minHeight: 58, marginBottom: 12,
  },
  previewBox: {
    borderRadius: 10, padding: 14, marginBottom: 4,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  previewCargar: { backgroundColor: 'rgba(234,88,12,0.15)', borderWidth: 1, borderColor: '#EA580C' },
  previewDescargar: { backgroundColor: 'rgba(59,130,246,0.15)', borderWidth: 1, borderColor: '#3B82F6' },
  previewLabel: { color: '#CBD5E1', fontSize: 14 },
  previewValue: { fontSize: 18, fontWeight: '700' },
  previewValCargar: { color: '#FDBA74' },
  previewValDescargar: { color: '#93C5FD' },
  destinoToggle: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  destinoBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  destinoBtnActive: { backgroundColor: 'rgba(234,88,12,0.2)', borderColor: '#EA580C' },
  destinoBtnText: { color: '#64748B', fontWeight: '600', fontSize: 14 },
  destinoBtnTextActive: { color: '#FDBA74' },
  notaDestino: { color: '#64748B', fontSize: 13, fontStyle: 'italic', marginBottom: 14 },
  notaCarga: { color: '#64748B', fontSize: 13, fontStyle: 'italic', marginTop: 8, textAlign: 'center' },
  proyectoBox: {
    backgroundColor: 'rgba(234,88,12,0.06)',
    borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: 'rgba(234,88,12,0.25)', marginBottom: 8,
  },
  searchInput: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: 10,
    color: '#FFF', fontSize: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 8,
  },
  proyectoRow: {
    padding: 12, backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  proyectoRowSelected: { borderColor: '#EA580C', backgroundColor: 'rgba(234,88,12,0.15)' },
  proyectoText: { color: '#CBD5E1', fontSize: 14, fontWeight: '500', flex: 1 },
  proyectoTextSelected: { color: '#FDBA74', fontWeight: '700' },
  checkmark: { color: '#EA580C', fontSize: 16, fontWeight: '700' },
  emptyText: { color: '#64748B', fontSize: 13, textAlign: 'center', padding: 12 },
  footer: {
    flexDirection: 'row', gap: 14, padding: 20, paddingBottom: 28,
    backgroundColor: '#431407',
    borderTopWidth: 1, borderTopColor: '#7C2D12',
  },
  btn: { flex: 1, paddingVertical: 18, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnCancel: { backgroundColor: '#4B5563' },
  btnCargar: { backgroundColor: '#EA580C' },
  btnDescargar: { backgroundColor: '#1D4ED8' },
  btnDisabled: { opacity: 0.45 },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 17 },
});