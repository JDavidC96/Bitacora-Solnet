// components/inventory/ReserveItemModal.js
import { useEffect, useState } from 'react';
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
} from 'react-native';
import DropdownSelect from '../DropdownSelect';

/**
 * Modal de gestión de reservas con dos pestañas:
 *
 * ── "Nueva reserva"  → formulario para reservar cantidad para un proyecto.
 *                       El stock se descuenta inmediatamente al confirmar.
 *
 * ── "Reservas activas" → lista de reservas existentes del ítem.
 *                         Cada fila tiene dos acciones:
 *                         · "Transferir" → mueve la cantidad al inventario del proyecto
 *                         · "Cancelar"   → devuelve el stock al inventario general
 *
 * @component
 * @param {Object}   props
 * @param {boolean}  props.visible
 * @param {Object|null} props.selectedItem       - Ítem del inventario general
 * @param {Array}    props.projects               - Proyectos activos
 * @param {Array}    props.reservasActivas         - Reservas activas del ítem (del hook)
 * @param {Function} props.onReserve              - ({ cantidad, proyectoId, proyectoTitle })
 * @param {Function} props.onTransferir           - ({ reservaId, reserva })
 * @param {Function} props.onCancelar             - ({ reservaId, reserva })
 * @param {Function} props.onClose
 * @param {boolean}  [props.loading]
 */
export default function ReserveItemModal({
  visible,
  selectedItem,
  projects = [],
  reservasActivas = [],
  onReserve,
  onTransferir,
  onCancelar,
  onClose,
  loading = false,
}) {
  const [tab, setTab] = useState('nueva');       // 'nueva' | 'activas'
  const [cantidad, setCantidad] = useState('');
  const [proyectoId, setProyectoId] = useState(null);

  useEffect(() => {
    if (visible) {
      setCantidad('');
      setProyectoId(null);
      // Si ya tiene reservas activas, abrir en esa pestaña por defecto
      setTab(reservasActivas.length > 0 ? 'activas' : 'nueva');
    }
  }, [visible, selectedItem]);

  const proyectosActivos = projects.filter((p) => (p.progress || 0) < 1);
  const proyectoSeleccionado = proyectosActivos.find((p) => p.id === proyectoId);

  const handleConfirmReserva = () => {
    if (!cantidad || isNaN(parseInt(cantidad)) || parseInt(cantidad) <= 0) {
      Alert.alert('Error', 'Ingresa una cantidad válida.');
      return;
    }
    if (!proyectoId) {
      Alert.alert('Error', 'Selecciona un proyecto para la reserva.');
      return;
    }
    onReserve({
      cantidad: parseInt(cantidad),
      proyectoId,
      proyectoTitle: proyectoSeleccionado?.title || proyectoId,
    });
  };

  const handleTransferir = (reserva) => {
    Alert.alert(
      'Transferir al proyecto',
      `¿Mover ${reserva.cantidad} ${reserva.tipo_medida || 'Unidad'} de "${reserva.itemNombre}" al proyecto "${reserva.proyectoTitle}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Transferir',
          onPress: () => onTransferir({ reservaId: reserva.id, reserva }),
        },
      ]
    );
  };

  const handleCancelar = (reserva) => {
    Alert.alert(
      'Cancelar reserva',
      `¿Cancelar la reserva de ${reserva.cantidad} ${reserva.tipo_medida || 'Unidad'} para "${reserva.proyectoTitle}"?\nEl stock volverá al inventario general.`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: () => onCancelar({ reservaId: reserva.id, reserva }),
        },
      ]
    );
  };

  const handleClose = () => {
    setCantidad('');
    setProyectoId(null);
    onClose();
  };

  if (!selectedItem) return null;

  const cantInt = parseInt(cantidad) || 0;
  const totalReservado = reservasActivas.reduce((s, r) => s + Number(r.cantidad || 0), 0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>

          {/* ── Header ── */}
          <View style={styles.header}>
            <Text style={styles.headerIcon}>🔖</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Reservas</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {selectedItem.nombre}
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* ── Chips de stock ── */}
          <View style={styles.stockBar}>
            <View style={styles.stockChip}>
              <Text style={styles.stockChipLabel}>Stock disponible</Text>
              <Text style={styles.stockChipValue}>
                {selectedItem.cantidad} {selectedItem.tipo_medida || 'Unidad'}
              </Text>
            </View>
            {totalReservado > 0 && (
              <View style={[styles.stockChip, styles.reservadoChip]}>
                <Text style={styles.stockChipLabel}>Reservado</Text>
                <Text style={[styles.stockChipValue, styles.reservadoValue]}>
                  {totalReservado} {selectedItem.tipo_medida || 'Unidad'}
                </Text>
              </View>
            )}
            {selectedItem.codigo ? (
              <View style={[styles.stockChip, styles.codeChip]}>
                <Text style={styles.stockChipLabel}>Código</Text>
                <Text style={[styles.stockChipValue, styles.codeValue]}>
                  {selectedItem.codigo}
                </Text>
              </View>
            ) : null}
          </View>

          {/* ── Tabs ── */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, tab === 'nueva' && styles.tabActive]}
              onPress={() => setTab('nueva')}
            >
              <Text style={[styles.tabText, tab === 'nueva' && styles.tabTextActive]}>
                + Nueva
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, tab === 'activas' && styles.tabActive]}
              onPress={() => setTab('activas')}
            >
              <Text style={[styles.tabText, tab === 'activas' && styles.tabTextActive]}>
                Activas {reservasActivas.length > 0 ? `(${reservasActivas.length})` : ''}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ════════════════════════════════════
              TAB: NUEVA RESERVA
          ════════════════════════════════════ */}
          {tab === 'nueva' && (
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* Cantidad */}
              <Text style={styles.label}>Cantidad a reservar *</Text>
              <TextInput
                style={styles.input}
                placeholder={`Disponible: ${selectedItem.cantidad}`}
                placeholderTextColor="#666"
                keyboardType="numeric"
                value={cantidad}
                onChangeText={(t) => { if (/^\d*$/.test(t)) setCantidad(t); }}
                editable={!loading}
              />
              {cantInt > 0 && (
                <Text style={styles.hint}>
                  Stock tras reservar:{' '}
                  <Text style={styles.hintAccent}>
                    {selectedItem.cantidad - cantInt} {selectedItem.tipo_medida || 'Unidad'}
                  </Text>
                </Text>
              )}

              {/* Proyecto */}
              <Text style={[styles.label, { marginTop: 20 }]}>Proyecto destino *</Text>
              {proyectosActivos.length === 0 ? (
                <View style={styles.noProjects}>
                  <Text style={styles.noProjectsText}>No hay proyectos activos</Text>
                </View>
              ) : (
                <>
                  <DropdownSelect
                    data={proyectosActivos.map((p) => ({ label: p.title, value: p.id }))}
                    value={proyectoId}
                    placeholder="Selecciona un proyecto..."
                    onChange={setProyectoId}
                  />
                  {proyectoSeleccionado && (
                    <View style={styles.proyectoCard}>
                      <Text style={styles.proyectoTitle}>
                        📋 {proyectoSeleccionado.title}
                      </Text>
                      {proyectoSeleccionado.description ? (
                        <Text style={styles.proyectoDesc}>
                          {proyectoSeleccionado.description}
                        </Text>
                      ) : null}
                    </View>
                  )}
                </>
              )}

              <View style={styles.infoNote}>
                <Text style={styles.infoNoteText}>
                  ⚠️ Al reservar, el stock se descuenta inmediatamente del inventario general.
                  Si cancelas la reserva, el stock regresa.
                </Text>
              </View>

              {/* Validación */}
              <View style={styles.validationBox}>
                <Text style={styles.validationText}>
                  {!cantidad && '⚠️ Ingresa una cantidad'}
                  {cantidad && !proyectoId && '⚠️ Selecciona un proyecto'}
                  {cantidad && proyectoId && '✅ Listo para reservar'}
                </Text>
              </View>

              {/* Botón confirmar */}
              <TouchableOpacity
                style={[
                  styles.btnPrimary,
                  (!cantidad || !proyectoId || loading) && styles.btnDisabled,
                ]}
                onPress={handleConfirmReserva}
                disabled={!cantidad || !proyectoId || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.btnPrimaryText}>🔖 Confirmar reserva</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* ════════════════════════════════════
              TAB: RESERVAS ACTIVAS
          ════════════════════════════════════ */}
          {tab === 'activas' && (
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {reservasActivas.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyIcon}>🔖</Text>
                  <Text style={styles.emptyText}>No hay reservas activas</Text>
                  <TouchableOpacity
                    style={styles.emptyAction}
                    onPress={() => setTab('nueva')}
                  >
                    <Text style={styles.emptyActionText}>Crear primera reserva →</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                reservasActivas.map((reserva) => (
                  <View key={reserva.id} style={styles.reservaCard}>
                    {/* Info de la reserva */}
                    <View style={styles.reservaHeader}>
                      <View style={styles.reservaQtyBadge}>
                        <Text style={styles.reservaQty}>{reserva.cantidad}</Text>
                        <Text style={styles.reservaUnidad}>
                          {reserva.tipo_medida || 'Unidad'}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.reservaProyecto}>
                          📋 {reserva.proyectoTitle}
                        </Text>
                        <Text style={styles.reservaFecha}>
                          {reserva.fecha
                            ? new Date(
                                reserva.fecha?.toDate?.() || reserva.fecha
                              ).toLocaleDateString('es-CO', {
                                day: '2-digit', month: 'short', year: 'numeric',
                              })
                            : '—'}
                        </Text>
                        <Text style={styles.reservaUsuario}>
                          Por: {reserva.usuario || '—'}
                        </Text>
                      </View>
                    </View>

                    {/* Acciones */}
                    <View style={styles.reservaAcciones}>
                      <TouchableOpacity
                        style={[styles.reservaBtn, styles.reservaBtnTransferir]}
                        onPress={() => handleTransferir(reserva)}
                        disabled={loading}
                      >
                        <Text style={styles.reservaBtnText}>📦 Transferir</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.reservaBtn, styles.reservaBtnCancelar]}
                        onPress={() => handleCancelar(reserva)}
                        disabled={loading}
                      >
                        <Text style={styles.reservaBtnText}>✕ Cancelar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          )}

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
    backgroundColor: '#1E1B2E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    width: '100%',
    height: '92%',
    overflow: 'hidden',
    borderTopWidth: 2,
    borderColor: '#7C3AED',
    elevation: 20,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },

  // ── Header ──
  header: {
    backgroundColor: '#4C1D95',
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#7C3AED',
  },
  headerIcon: { fontSize: 26 },
  title: {
    color: '#EDE9FE',
    fontSize: 22,
    fontWeight: 'bold',
    lineHeight: 26,
  },
  subtitle: {
    color: '#C4B5FD',
    fontSize: 14,
    marginTop: 1,
  },
  closeBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#E2E8F0',
    fontSize: 16,
    fontWeight: '700',
  },

  // ── Stock bar ──
  stockBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(124, 58, 237, 0.2)',
    flexWrap: 'wrap',
  },
  stockChip: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
  },
  reservadoChip: {
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    borderWidth: 1,
    borderColor: '#7C3AED',
  },
  codeChip: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  stockChipLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 3,
  },
  stockChipValue: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },
  reservadoValue: { color: '#C4B5FD' },
  codeValue: { color: '#A5B4FC', fontSize: 14 },

  // ── Tabs ──
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.2)',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 4,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 9,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#7C3AED',
  },
  tabText: {
    color: '#94A3B8',
    fontSize: 15,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFF',
  },

  // ── Contenido ──
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  label: {
    color: '#E2E8F0',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 20,
    color: '#000',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    minHeight: 58,
  },
  hint: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 8,
  },
  hintAccent: {
    color: '#C4B5FD',
    fontWeight: '700',
  },
  noProjects: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 10,
    padding: 18,
  },
  noProjectsText: {
    color: '#FCA5A5',
    textAlign: 'center',
    fontSize: 16,
  },
  proyectoCard: {
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    borderRadius: 10,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#7C3AED',
  },
  proyectoTitle: {
    color: '#DDD6FE',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
  },
  proyectoDesc: {
    color: '#94A3B8',
    fontSize: 13,
    fontStyle: 'italic',
  },
  infoNote: {
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    borderRadius: 10,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  infoNoteText: {
    color: '#FDE68A',
    fontSize: 13,
    lineHeight: 19,
  },
  validationBox: {
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#6D28D9',
    marginTop: 14,
    marginBottom: 16,
  },
  validationText: {
    color: '#DDD6FE',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  btnPrimary: {
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 32,
    elevation: 3,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnPrimaryText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 18,
  },

  // ── Reservas activas (tab) ──
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 50,
    gap: 12,
  },
  emptyIcon: { fontSize: 48 },
  emptyText: {
    color: '#94A3B8',
    fontSize: 17,
  },
  emptyAction: {
    marginTop: 8,
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#7C3AED',
  },
  emptyActionText: {
    color: '#C4B5FD',
    fontSize: 15,
    fontWeight: '600',
  },
  reservaCard: {
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.35)',
  },
  reservaHeader: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 14,
    alignItems: 'flex-start',
  },
  reservaQtyBadge: {
    backgroundColor: '#4C1D95',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    minWidth: 64,
    borderWidth: 1,
    borderColor: '#7C3AED',
  },
  reservaQty: {
    color: '#EDE9FE',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 26,
  },
  reservaUnidad: {
    color: '#A78BFA',
    fontSize: 11,
    fontWeight: '500',
  },
  reservaProyecto: {
    color: '#DDD6FE',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  reservaFecha: {
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 2,
  },
  reservaUsuario: {
    color: '#6D6D8A',
    fontSize: 12,
  },
  reservaAcciones: {
    flexDirection: 'row',
    gap: 10,
  },
  reservaBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 1,
  },
  reservaBtnTransferir: {
    backgroundColor: '#059669', // Verde
  },
  reservaBtnCancelar: {
    backgroundColor: '#DC2626', // Rojo
  },
  reservaBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
});