import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { DEFINICION_TAREAS, HOLIDAYS_CO, buildSchedule } from '../../helper';
import ModalBase from '../ModalBase';
import LoadingOverlay from '../shared/LoadingOverlay';
import styles from './styles';

export const EditScheduleModal = ({
  visible,
  tasks,
  projectStartISO,
  onClose,
  onSave,
}) => {
  const [local, setLocal] = useState({}); // { [idTarea]: "numeroEnTexto" }
  const [saving, setSaving] = useState(false);

  const tareasOrdenadas = useMemo(() => DEFINICION_TAREAS, []);

  // precargar con lo actual de Firestore
  useEffect(() => {
    if (!visible) return;

    const map = {};
    (tasks || []).forEach((t) => {
      if (t?.idTarea) map[t.idTarea] = String(t.diasDuracion ?? 0);
    });
    setLocal(map);
  }, [visible, tasks]);

  const setVal = (idTarea, value) => {
    if (saving) return;
    const cleaned = (value ?? '').replace(/[^\d]/g, '');
    setLocal((prev) => ({ ...prev, [idTarea]: cleaned }));
  };

  const buildPreviewEndDate = () => {
    if (!projectStartISO) return null;

    const extraDurations = {};
    const baseDurations = {};

    (tasks || []).forEach((t) => {
      if (!t?.idTarea) return;
      extraDurations[t.idTarea] = t.prorrogas || 0;

      const raw = local[t.idTarea];
      const val = Number.isFinite(Number(raw)) ? Number(raw) : Number(t.diasDuracion ?? 0);
      baseDurations[t.idTarea] = val;
    });

    try {
      const sched = buildSchedule(projectStartISO, extraDurations, HOLIDAYS_CO, baseDurations);

      let maxFin = null;
      DEFINICION_TAREAS.forEach((def) => {
        const s = sched.get(def.id);
        if (!s?.fechaFin) return;
        if (!maxFin || s.fechaFin > maxFin) maxFin = s.fechaFin;
      });

      return maxFin;
    } catch (e) {
      return null;
    }
  };

  const previewEnd = buildPreviewEndDate();

  const handleResetToStandard = () => {
    if (saving) return;
    const map = {};
    DEFINICION_TAREAS.forEach((def) => {
      map[def.id] = String(def.dias ?? 0);
    });
    setLocal(map);
  };

  const handleApply = () => {
    if (saving) return;

    const payload = {};
    for (const def of tareasOrdenadas) {
      const raw = local[def.id];
      if (raw == null || raw === '') continue;

      const n = parseInt(raw, 10);
      if (Number.isNaN(n) || n < 0) {
        Alert.alert('Error', `Duración inválida en "${def.titulo}".`);
        return;
      }
      payload[def.id] = n;
    }

    Alert.alert(
      'Aplicar cronograma',
      'Esto recalculará fechas de todas las etapas (respetando prórrogas y dependencias). ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aplicar',
          onPress: async () => {
            try {
              setSaving(true);
              await onSave(payload); //  ProjectStepScreen hace el update real
              // Nota: onSave normalmente cierra el modal; pero por si no:
              // onClose();
            } catch (e) {
              console.error(e);
              Alert.alert('Error', 'No fue posible aplicar el cronograma.');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ModalBase
      visible={visible}
      title="Editar cronograma"
      onClose={saving ? undefined : onClose} // si está guardando, bloquea cierre por backdrop/close
      footer={
        <>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#ECC94B', opacity: saving ? 0.6 : 1 }]}
            onPress={handleResetToStandard}
            disabled={saving}
          >
            <Text style={styles.buttonText}>🔁 Estándar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#48BB78', opacity: saving ? 0.6 : 1 }]}
            onPress={handleApply}
            disabled={saving}
          >
            <Text style={styles.buttonText}>Aplicar</Text>
          </TouchableOpacity>
        </>
      }
    >
      <Text style={styles.modalText}>
        Edita días hábiles por tarea. El sistema encadena todo según dependencias.
      </Text>

      {previewEnd && (
        <View style={{ marginBottom: 12 }}>
          <Text style={{ color: '#FFF', fontWeight: '700' }}>
            📌 Fin estimado del proyecto: {previewEnd}
          </Text>
          <Text style={{ color: '#CFCFCF', fontSize: 12 }}>
            (Preview local, no guarda hasta que pulses “Aplicar”)
          </Text>
        </View>
      )}

      <ScrollView style={{ maxHeight: 420 }}>
        {tareasOrdenadas.map((def) => {
          const etapa = (tasks || []).find((t) => t.idTarea === def.id);
          const disabled = saving || etapa?.esMantenimiento || etapa?.noAplica;

          return (
            <View key={def.id} style={{ marginBottom: 10 }}>
              <Text style={{ color: '#FFF', fontWeight: '700' }}>
                {def.titulo} {etapa?.esMantenimiento || etapa?.noAplica ? '(No editable)' : ''}
              </Text>

              <Text style={{ color: '#AAA', fontSize: 12, marginBottom: 6 }}>
                {def.fase} · Estándar: {def.dias} · Actual: {etapa?.diasDuracion ?? def.dias} · Prórrogas: {etapa?.prorrogas ?? 0}
              </Text>

              <TextInput
                style={[styles.input, disabled && { opacity: 0.5 }]}
                editable={!disabled}
                keyboardType="number-pad"
                placeholder="Días"
                placeholderTextColor="#aaa"
                value={local[def.id] ?? ''}
                onChangeText={(v) => setVal(def.id, v)}
              />
            </View>
          );
        })}
      </ScrollView>

      {saving && <LoadingOverlay message="Aplicando cronograma..." />}
    </ModalBase>
  );
};
