/**
 * Formulario "registrar ticket" de una reserva (modal de facturación) —
 * espejo de TicketUpload.jsx web con selector de archivo nativo.
 */
import { useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { dashboardApi } from '../../services/api.js';
import { OpBtnPrimary } from './DashboardUi';
import { useOpStyles, euro, MONO } from './OpTokens';
import { FUENTES } from '../../theme/tokens';

const TIPOS = ['.pdf', '.csv', '.xml', 'image/*'];

export default function TicketUpload({ reserva, onUploaded, t, comisionPct = 8 }) {
  const tt = (k, d) => {
    try {
      const v = t ? t(k) : null;
      return v && v !== k ? v : d;
    } catch {
      return d;
    }
  };
  const { op } = useOpStyles();
  const [precio, setPrecio] = useState(String(reserva.totalPagado || reserva.precioBase || ''));
  const [file, setFile] = useState(null);
  const [asistio, setAsistio] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const pct = Number(comisionPct) || 8;
  const total = Number(precio) || 0;
  const comision = Math.round(total * (pct / 100) * 100) / 100;
  const neto = Math.round((total - comision) * 100) / 100;

  async function elegirArchivo() {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: TIPOS, multiple: false, copyToCacheDirectory: true });
      if (!res.canceled && res.assets && res.assets.length) {
        setFile({ name: res.assets[0].name, size: res.assets[0].size || 0 });
      }
    } catch {
      /* ignore */
    }
  }

  async function handleSubmit() {
    // 1 ticket por reserva (no importa comensales)
    if (reserva.ticketId) {
      setError('Esta reserva ya tiene un ticket registrado (máx. 1 por reserva)');
      return;
    }
    if (!precio || Number(precio) <= 0) {
      setError(tt('dashboard.precioRequerido', 'Introduce un importe válido (>0)'));
      return;
    }
    setUploading(true);
    setError('');
    try {
      await dashboardApi.subirTicket(reserva.id, {
        totalPagado: Number(precio),
        asistio,
        fileName: file?.name || '',
      });
      setSuccess(true);
      setTimeout(() => onUploaded?.(reserva.id, asistio ? 'completada' : 'no_show'), 400);
    } catch (err) {
      setError(err?.message || 'Error al subir ticket');
    } finally {
      setUploading(false);
    }
  }

  if (success || reserva.ticketId) {
    return (
      <View style={estilos.exito}>
        <Text style={estilos.exitoTxt}>
          {success
            ? `${tt('dashboard.ticketSubido', 'Ticket registrado')} · ${euro(neto)} neto · ${euro(comision)} comisión ${pct}%`
            : 'Ticket ya registrado (máx. 1 por reserva)'}
        </Text>
      </View>
    );
  }

  return (
    <View style={[estilos.form, { backgroundColor: op.surfaceLow, borderColor: op.border }]}>
      <View style={estilos.head}>
        <Text style={[estilos.headTxt, { color: op.onSurface }]}>
          {reserva.nombreRestaurante || reserva.restaurantName || tt('dashboard.reserva', 'Reserva')}
        </Text>
        <Text style={[estilos.chip, { backgroundColor: op.surfaceLowest, color: op.onSurface }]}>
          {reserva.codigo || String(reserva.id || '').slice(0, 6)}
        </Text>
      </View>
      <Text style={[estilos.meta, { color: op.onVariant }]}>
        {reserva.fecha} {reserva.hora} · {reserva.comensales} pax ·{' '}
        {reserva.usuarioNombre || reserva.usuarioEmail || 'Cliente'}
      </Text>

      <Text style={estilos.label}>{tt('dashboard.precioTotal', 'Importe total')}</Text>
      <View style={estilos.precioFila}>
        <TextInput
          value={String(precio)}
          onChangeText={setPrecio}
          placeholder={tt('dashboard.precioPlaceholder', '45.50')}
          keyboardType="decimal-pad"
          style={[estilos.input, { borderColor: op.outlineVariant, color: op.onSurface }]}
        />
        <Text style={[estilos.eur, { color: op.onSurface }]}>EUR</Text>
      </View>
      {total > 0 ? (
        <View style={[estilos.preview, { backgroundColor: op.surfaceLowest }]}>
          <Text style={[estilos.previewTxt, { color: op.onSurface }]}>
            Comisión MIRA {pct}%: <Text style={estilos.previewFuerte}>{euro(comision)}</Text>
          </Text>
          <Text style={[estilos.previewTxt, { color: op.onSurface }]}>
            Neto restaurante:{' '}
            <Text style={[estilos.previewFuerte, { color: op.primary }]}>{euro(neto)}</Text>
          </Text>
        </View>
      ) : null}

      <Pressable
        onPress={() => setAsistio((v) => !v)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: asistio }}
        style={estilos.checkFila}
      >
        <View
          style={[
            estilos.checkCaja,
            { borderColor: asistio ? op.primary : op.outlineVariant, backgroundColor: asistio ? op.primary : op.surfaceLowest },
          ]}
        >
          {asistio ? <Text style={estilos.checkTick}>✓</Text> : null}
        </View>
        <Text style={[estilos.checkTxt, { color: op.onSurface }]}>{asistio ? 'Cliente asistió' : 'No-show / No asistió'}</Text>
        <Text style={[estilos.checkSub, { color: op.onVariant }]}>
          {asistio ? '(se marcará completada)' : '(se marcará no-show protegido)'}
        </Text>
      </Pressable>

      <Text style={estilos.label}>Ticket / factura (opcional)</Text>
      <Pressable
        onPress={elegirArchivo}
        accessibilityRole="button"
        style={({ pressed }) => [
          estilos.fileBtn,
          { borderColor: op.outlineVariant, backgroundColor: op.surfaceLowest, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <Text style={[estilos.fileBtnTxt, { color: op.onSurface }]}>
          {file ? 'Cambiar archivo…' : 'Seleccionar archivo…'}
        </Text>
      </Pressable>
      {file ? (
        <Text style={[estilos.fileNombre, { color: op.onVariant }]}>
          {file.name} · {(file.size / 1024).toFixed(1)} KB
        </Text>
      ) : null}

      {error ? <Text style={estilos.error}>{error}</Text> : null}

      <OpBtnPrimary disabled={uploading} onPress={handleSubmit} style={{ justifyContent: 'center' }}>
        {uploading
          ? tt('otros.cargando', 'Cargando…')
          : `Registrar ticket y ${asistio ? 'confirmar asistencia' : 'marcar no-show'}`}
      </OpBtnPrimary>
    </View>
  );
}

const estilos = StyleSheet.create({
  form: {
    flexDirection: 'column',
    gap: 8,
    padding: 11.2,
    borderRadius: 8,
    borderWidth: 1,
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  headTxt: { fontSize: 12.5, fontWeight: '700', fontFamily: FUENTES.textoBold },
  chip: {
    fontSize: 9.9,
    paddingVertical: 1.6,
    paddingHorizontal: 5.6,
    borderRadius: 4.8,
    overflow: 'hidden',
    fontFamily: MONO,
  },
  meta: { fontSize: 11.5, fontFamily: FUENTES.texto },
  label: {
    fontSize: 10.9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontFamily: FUENTES.textoBold,
    marginTop: 2,
  },
  precioFila: { flexDirection: 'row', gap: 6.4, alignItems: 'center' },
  input: {
    flex: 1,
    height: 35.2,
    paddingHorizontal: 9.6,
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 13.1,
    fontFamily: FUENTES.texto,
    paddingVertical: 0,
  },
  eur: { fontSize: 11.5, fontFamily: FUENTES.texto },
  preview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 10.9,
    paddingVertical: 5.6,
    paddingHorizontal: 8,
    borderRadius: 6.4,
    marginTop: 3.2,
    gap: 8,
  },
  previewTxt: { fontSize: 10.9, fontFamily: FUENTES.texto },
  previewFuerte: { fontWeight: '700', fontFamily: FUENTES.textoBold },
  checkFila: { flexDirection: 'row', alignItems: 'center', gap: 6.4, flexWrap: 'wrap', paddingVertical: 2 },
  checkCaja: {
    width: 17,
    height: 17,
    borderWidth: 2,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkTick: { color: '#ffffff', fontSize: 11, fontWeight: '800', lineHeight: 13 },
  checkTxt: { fontSize: 12.5, fontWeight: '600', fontFamily: FUENTES.textoSemi },
  checkSub: { fontSize: 9.9, fontFamily: FUENTES.texto, width: '100%', paddingLeft: 23 },
  fileBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 9.6,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  fileBtnTxt: { fontSize: 12.5, fontFamily: FUENTES.texto },
  fileNombre: { fontSize: 10.9, fontFamily: FUENTES.texto },
  error: {
    color: '#b44d3e',
    fontSize: 12.5,
    backgroundColor: '#ffdad6',
    paddingVertical: 5.6,
    paddingHorizontal: 8,
    borderRadius: 6.4,
    fontFamily: FUENTES.texto,
  },
  exito: {
    backgroundColor: '#d1fae5',
    padding: 11.2,
    borderRadius: 8,
    alignItems: 'center',
  },
  exitoTxt: { color: '#065f46', fontWeight: '700', fontSize: 13.1, textAlign: 'center', fontFamily: FUENTES.textoBold },
});
