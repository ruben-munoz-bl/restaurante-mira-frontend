import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { ticketsApi } from '../../services/api.js';
import { useTheme } from '../../theme/ThemeContext';
import { FUENTES, RADIO } from '../../theme/tokens';

const ESTADOS = {
  emitido: { bg: '#fff3e0', color: '#e65100' },
  pagado: { bg: '#e8f5e9', color: '#2e7d32' },
  anulado: { bg: '#fce4ec', color: '#c62828' },
};

export default function TicketDetail({ ticketId, onClose }) {
  const { colores } = useTheme();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ticketId) return;
    ticketsApi
      .get(ticketId)
      .then(setTicket)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [ticketId]);

  if (loading) {
    return (
      <View style={[styles.card, styles.centro, { backgroundColor: colores.glassBg, borderColor: colores.glassBorder }]}>
        <ActivityIndicator size="large" color={colores.primaryContainer} />
        <Text style={[styles.estado, { color: colores.gris }]}>Cargando ticket...</Text>
      </View>
    );
  }

  if (!ticket) {
    return (
      <View style={[styles.card, styles.centro, { backgroundColor: colores.glassBg, borderColor: colores.glassBorder }]}>
        <Text style={[styles.estado, { color: colores.gris }]}>Ticket no encontrado</Text>
      </View>
    );
  }

  const estado = ESTADOS[ticket.estado] || { bg: colores.fondoSuave, color: colores.gris };

  return (
    <View style={[styles.card, { backgroundColor: colores.glassBg, borderColor: colores.glassBorder }]}>
      <View style={styles.header}>
        <Text style={[styles.h3, { color: colores.primary }]}>
          Ticket #{ticket.id.slice(0, 8).toUpperCase()}
        </Text>
        <View style={[styles.badge, { backgroundColor: estado.bg }]}>
          <Text style={[styles.badgeTxt, { color: estado.color }]}>{ticket.estado}</Text>
        </View>
      </View>

      <View style={styles.restaurante}>
        <Text style={[styles.restauranteNombre, { color: colores.tinta }]}>
          {ticket.nombreRestaurante}
        </Text>
      </View>

      <View style={[styles.breakdown, { borderTopColor: colores.borde, borderBottomColor: colores.borde }]}>
        <View style={styles.row}>
          <Text style={[styles.rowTxt, { color: colores.tinta }]}>Precio base</Text>
          <Text style={[styles.rowTxt, { color: colores.tinta }]}>
            {(ticket.precioBase ?? 0).toFixed(2)} €
          </Text>
        </View>
        {(ticket.descuentoAplicado ?? 0) > 0 && (
          <View style={styles.row}>
            <Text style={[styles.rowTxt, { color: colores.verde }]}>Descuento puntos</Text>
            <Text style={[styles.rowTxt, { color: colores.verde }]}>
              -{(ticket.descuentoAplicado ?? 0).toFixed(2)} €
            </Text>
          </View>
        )}
        <View style={styles.row}>
          <Text style={[styles.rowTotal, { color: colores.tinta }]}>Total pagado</Text>
          <Text style={[styles.rowTotal, { color: colores.tinta }]}>
            {(ticket.totalPagado ?? 0).toFixed(2)} €
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.rowComision, { color: colores.gris }]}>
            Comisión MIRA ({ticket.comisionPct} %)
          </Text>
          <Text style={[styles.rowComision, { color: colores.gris }]}>
            {(ticket.importeComision ?? 0).toFixed(2)} €
          </Text>
        </View>
        {(ticket.puntosCanjeados ?? 0) > 0 && (
          <View style={styles.row}>
            <Text style={[styles.rowPuntos, { color: '#b8860b' }]}>Puntos canjeados</Text>
            <Text style={[styles.rowPuntos, { color: '#b8860b' }]}>{ticket.puntosCanjeados} pts</Text>
          </View>
        )}
      </View>

      {onClose ? (
        <Text style={styles.cerrar}>Cerrar</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: RADIO.xl,
    padding: 32,
    maxWidth: 500,
    width: '100%',
  },
  centro: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  h3: {
    fontFamily: FUENTES.display,
    fontWeight: '700',
    fontSize: 20.8,
    flexShrink: 1,
  },
  badge: {
    borderRadius: 999,
    paddingVertical: 3.2,
    paddingHorizontal: 9.6,
  },
  badgeTxt: {
    fontSize: 12.8,
    fontWeight: '600',
    fontFamily: FUENTES.textoSemi,
    textTransform: 'capitalize',
  },
  restaurante: {
    marginBottom: 24,
  },
  restauranteNombre: {
    fontFamily: FUENTES.textoBold,
    fontSize: 17.6,
    fontWeight: '600',
  },
  breakdown: {
    gap: 12.8,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowTxt: {
    fontFamily: FUENTES.texto,
    fontSize: 15.2,
  },
  rowTotal: {
    fontFamily: FUENTES.textoBold,
    fontSize: 17.6,
    fontWeight: '700',
  },
  rowComision: {
    fontFamily: FUENTES.texto,
    fontSize: 13.6,
  },
  rowPuntos: {
    fontFamily: FUENTES.texto,
    fontSize: 15.2,
    fontWeight: '600',
  },
  estado: {
    fontFamily: FUENTES.texto,
    fontSize: 15,
  },
  cerrar: {
    marginTop: 16,
    fontFamily: FUENTES.textoSemi,
    fontSize: 14.7,
    fontWeight: '600',
    color: '#16382C',
    textDecorationLine: 'underline',
    alignSelf: 'center',
  },
});
