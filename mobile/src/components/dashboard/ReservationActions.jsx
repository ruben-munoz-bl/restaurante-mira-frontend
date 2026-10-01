/**
 * Acciones rápidas sobre una reserva (confirmar / no-show / cancelar) —
 * espejo de ReservationActions.jsx web.
 */
import { useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet } from 'react-native';
import { dashboardApi } from '../../services/api.js';
import { OpBtnPrimary, OpBtnGhost, OpStatus } from './DashboardUi';
import { useOpStyles } from './OpTokens';
import { FUENTES } from '../../theme/tokens';

export default function ReservationActions({ reserva, onStatusChange, t, comisionPct = 8 }) {
  const tt = (k, d) => {
    try {
      const v = t ? t(k) : null;
      return v && v !== k ? v : d;
    } catch {
      return d;
    }
  };
  const { op } = useOpStyles();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [precio, setPrecio] = useState(String(reserva.totalPagado || reserva.precioBase || ''));
  const [showPrice, setShowPrice] = useState(false);

  async function handleAction(action) {
    setLoading(true);
    setError('');
    try {
      const yaTieneTicket = Boolean(reserva.ticketId);
      if (action === 'confirmar') {
        const total = Number(precio);
        // 1 ticket por reserva: si ya tiene, solo confirmar asistencia sin crear otro ticket
        if (total > 0 && !yaTieneTicket) {
          await dashboardApi.subirTicket(reserva.id, { totalPagado: total, asistio: true, fileName: '' });
        } else {
          await dashboardApi.confirmAttendance(reserva.id, { precioBase: yaTieneTicket ? 0 : 0 });
        }
      } else if (action === 'no_show') {
        const total = Number(precio);
        if (total > 0 && !yaTieneTicket) {
          await dashboardApi.subirTicket(reserva.id, { totalPagado: total, asistio: false, fileName: '' });
        } else {
          await dashboardApi.markNoShow(reserva.id);
        }
      } else if (action === 'cancelar') {
        await dashboardApi.updateReservationStatus(reserva.id, 'cancelada');
      } else if (action === 'completar') {
        await dashboardApi.updateReservationStatus(reserva.id, 'completada');
      }
      onStatusChange?.(reserva.id, action);
    } catch (e) {
      setError(e?.message || 'Error');
    } finally {
      setLoading(false);
    }
  }

  const estado = String(reserva.estado || '').toLowerCase();
  const activa = ['pendiente', 'confirmada', 'activa', 'en_mesa', 'en mesa'].includes(estado);
  const yaTieneTicket = Boolean(reserva.ticketId);
  const totalNum = Number(precio) || 0;
  const pct = Number(comisionPct) || 8;
  const comisionPreview = totalNum > 0 ? (Math.round(totalNum * (pct / 100) * 100) / 100).toFixed(2) : '0.00';
  const netoPreview = totalNum > 0 ? (Math.round((totalNum - Number(comisionPreview)) * 100) / 100).toFixed(2) : '0.00';
  const badgeCls = estado === 'completada' || estado === 'pagado' ? 'pagado' : estado === 'no_show' ? 'no_show' : estado === 'cancelada' ? 'cancelada' : estado;

  return (
    <View style={estilos.raiz}>
      {error ? (
        <Text style={estilos.error}>{error}</Text>
      ) : null}
      {activa && !yaTieneTicket ? (
        <View style={[estilos.cajaBaja, { backgroundColor: op.surfaceLow }]}>
          <View style={estilos.labelFila}>
            <Text style={[estilos.label, { color: op.onSurface }]}>{tt('dashboard.precioBase', 'Importe ticket')}</Text>
            <Pressable onPress={() => setShowPrice((v) => !v)} accessibilityRole="button">
              <Text style={[estilos.toggleTxt, { color: op.primary }]}>{showPrice ? 'Ocultar' : 'Con ticket'}</Text>
            </Pressable>
          </View>
          {showPrice ? (
            <>
              <View style={estilos.precioFila}>
                <TextInput
                  value={String(precio)}
                  onChangeText={setPrecio}
                  placeholder={tt('dashboard.precioPlaceholder', '45.50')}
                  keyboardType="decimal-pad"
                  style={[estilos.precioInput, { borderColor: op.outlineVariant }]}
                />
                <Text style={estilos.eur}>EUR</Text>
              </View>
              {totalNum > 0 ? (
                <View style={estilos.preview}>
                  <Text style={estilos.previewTxt}>
                    Comisión {pct}%: {comisionPreview}€
                  </Text>
                  <Text style={estilos.previewTxt}>Neto: {netoPreview}€</Text>
                </View>
              ) : null}
            </>
          ) : (
            <Text style={[estilos.ayuda, { color: op.onVariant }]}>
              Se confirmará sin ticket (0€). Activa &quot;Con ticket&quot; para registrar importe.
            </Text>
          )}
        </View>
      ) : null}
      {activa && yaTieneTicket ? (
        <View style={[estilos.cajaBaja, { backgroundColor: op.surfaceLow }]}>
          <Text style={[estilos.ayuda, { color: op.onVariant }]}>Ticket ya registrado para esta reserva (máx. 1 por reserva).</Text>
        </View>
      ) : null}
      <View style={estilos.botones}>
        {activa ? (
          <>
            <OpBtnPrimary small disabled={loading} onPress={() => handleAction('confirmar')}>
              {loading ? tt('otros.cargando', '...') : `${tt('dashboard.confirmarAsistencia', 'Confirmar asistencia')}`}
            </OpBtnPrimary>
            <OpBtnGhost small disabled={loading} onPress={() => handleAction('no_show')}>
              {tt('dashboard.marcarNoShow', 'No-show')}
            </OpBtnGhost>
            <OpBtnGhost small disabled={loading} onPress={() => handleAction('cancelar')} txtStyle={{ color: '#b44d3e' }}>
              {tt('dashboard.cancelarReserva', 'Cancelar')}
            </OpBtnGhost>
          </>
        ) : null}
        {estado === 'completada' || estado === 'no_show' || estado === 'cancelada' || estado === 'pagado' ? (
          <OpStatus cls={badgeCls}>
            {estado === 'completada' || estado === 'pagado'
              ? tt('dashboard.completada', 'Pagado')
              : estado === 'no_show'
                ? tt('dashboard.noShow', 'No-show')
                : tt('dashboard.cancelada', 'Cancelada')}
            {reserva.totalPagado ? ` · ${Number(reserva.totalPagado).toFixed(2)}€` : ''}
          </OpStatus>
        ) : null}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { flexDirection: 'column', gap: 6.4, minWidth: 180, maxWidth: 260 },
  error: {
    color: '#b44d3e',
    fontSize: 12.5,
    backgroundColor: '#ffdad6',
    paddingVertical: 4.8,
    paddingHorizontal: 8,
    borderRadius: 6.4,
    fontFamily: FUENTES.texto,
  },
  cajaBaja: { flexDirection: 'column', gap: 4, padding: 8, borderRadius: 8 },
  labelFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 10.9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontFamily: FUENTES.textoBold,
  },
  toggleTxt: { fontSize: 9.9, color: '#005134', fontWeight: '700', fontFamily: FUENTES.textoBold },
  precioFila: { flexDirection: 'row', gap: 5.6, alignItems: 'center' },
  precioInput: {
    flex: 1,
    height: 32,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: 6.4,
    fontSize: 13.1,
    fontFamily: FUENTES.texto,
    paddingVertical: 0,
  },
  eur: { fontSize: 11.5, fontFamily: FUENTES.texto },
  preview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingVertical: 4,
    paddingHorizontal: 6.4,
    borderRadius: 4.8,
    gap: 6,
  },
  previewTxt: { fontSize: 9.9, fontFamily: FUENTES.texto },
  ayuda: { fontSize: 9.9, color: '#3f4942', fontFamily: FUENTES.texto },
  botones: { flexDirection: 'row', flexWrap: 'wrap', gap: 5.6, alignItems: 'center' },
});
