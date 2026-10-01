import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import usePointsStore from '../../stores/usePointsStore.js';
import { useT } from '../../i18n/index.jsx';
import es from '../../i18n/es.js';
import ca from '../../i18n/ca.js';
import en from '../../i18n/en.js';
import { useTheme } from '../../theme/ThemeContext';
import { FUENTES, RADIO } from '../../theme/tokens';

const TRADS = { es, ca, en };

const TIPO_LABELS = {
  reserva: 'Reserva completada',
  login_diario: 'Login diario',
  racha_reserva_bonus: 'Bonus racha semanal',
  resena: 'Reseña',
  promo_view: 'Vista restaurante promocionado',
  promo_click: 'Click restaurante promocionado',
  invitacion: 'Invitación aceptada',
  canje_descuento: 'Canje de puntos',
  ajuste_admin: 'Ajuste admin',
  ajuste_admin_negativo: 'Ajuste admin',
  wheel: 'Ruleta',
};

const TIPO_COLORS = {
  reserva: '#2e7d32',
  login_diario: '#1565c0',
  racha_reserva_bonus: '#e65100',
  resena: '#6a1b9a',
  promo_view: '#00838f',
  promo_click: '#00838f',
  invitacion: '#f57f17',
  canje_descuento: '#c62828',
  ajuste_admin: '#616161',
  ajuste_admin_negativo: '#616161',
  wheel: '#ff6f00',
};

const FILTROS = [
  ['', 'Todos'],
  ['reserva', 'Reservas'],
  ['login_diario', 'Login diario'],
  ['resena', 'Reseñas'],
  ['invitacion', 'Invitaciones'],
  ['promo_view', 'Vistas promo'],
  ['promo_click', 'Clicks promo'],
  ['canje_descuento', 'Canjes'],
  ['ajuste_admin', 'Ajustes admin'],
];

function puntosDe(mov) {
  if (typeof mov.puntos === 'number') return mov.puntos;
  if (typeof mov.cantidad === 'number') return mov.cantidad;
  return 0;
}

export default function LedgerTable({ limit = 10, showFilters = false, usuario }) {
  const t = useT(TRADS);
  const { colores } = useTheme();
  const { ledger, fetchLedger, ledgerLoading } = usePointsStore();
  const [filtro, setFiltro] = useState('');

  useEffect(() => {
    if (usuario) fetchLedger({ tipo: filtro || undefined, limit });
    else if (usuario === undefined) fetchLedger({ tipo: filtro || undefined, limit });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario, filtro, limit]);

  function etiquetaTipo(mov) {
    const traducido = t(`points.types.${mov.tipo}`);
    if (typeof traducido === 'string' && !traducido.startsWith('points.')) return traducido;
    return TIPO_LABELS[mov.tipo] || mov.tipo;
  }

  if (ledgerLoading) {
    return (
      <View style={[styles.card, { backgroundColor: colores.glassBg, borderColor: colores.glassBorder }]}>
        <Text style={[styles.estado, { color: colores.gris }]}>Cargando historial...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colores.glassBg, borderColor: colores.glassBorder }]}>
      {showFilters && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtros} contentContainerStyle={styles.filtrosContenido}>
          {FILTROS.map(([valor, etiqueta]) => {
            const activo = filtro === valor;
            return (
              <Pressable
                key={etiqueta || 'todos'}
                onPress={() => setFiltro(valor)}
                accessibilityRole="button"
                accessibilityState={{ selected: activo }}
                style={({ pressed }) => [
                  styles.chip,
                  {
                    backgroundColor: activo ? colores.primaryContainer : colores.papel,
                    borderColor: activo ? colores.primaryContainer : colores.borde,
                  },
                  pressed && { opacity: 0.75 },
                ]}
              >
                <Text
                  style={[
                    styles.chipTxt,
                    { color: activo ? '#fff' : colores.tinta },
                  ]}
                >
                  {etiqueta}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <View style={[styles.headerRow, { borderBottomColor: colores.borde }]}>
        <Text style={[styles.th, styles.thConcepto, { color: colores.gris }]}>Concepto</Text>
        <Text style={[styles.th, styles.thPuntos, { color: colores.gris }]}>Puntos</Text>
        <Text style={[styles.th, styles.thFecha, { color: colores.gris }]}>Fecha</Text>
      </View>

      {ledger.map((mov) => {
        const pts = puntosDe(mov);
        const fecha = new Date(
          mov.createdAt?.seconds ? mov.createdAt.seconds * 1000 : mov.createdAt,
        ).toLocaleDateString('es-ES');
        return (
          <View key={mov.id} style={[styles.row, { borderBottomColor: colores.borde }]}>
            <View style={styles.rowConcepto}>
              <View style={[styles.badge, { backgroundColor: TIPO_COLORS[mov.tipo] || '#666' }]}>
                <Text style={styles.badgeTxt}>{etiquetaTipo(mov)}</Text>
              </View>
              {mov.descripcion ? (
                <Text style={[styles.desc, { color: colores.gris }]} numberOfLines={2}>
                  {mov.descripcion}
                </Text>
              ) : null}
            </View>
            <Text
              style={[
                styles.puntos,
                styles.thPuntos,
                { color: pts >= 0 ? colores.verde : colores.rojo },
              ]}
            >
              {pts >= 0 ? '+' : ''}
              {pts}
            </Text>
            <Text style={[styles.fecha, styles.thFecha, { color: colores.tinta }]}>{fecha}</Text>
          </View>
        );
      })}

      {ledger.length === 0 && (
        <Text style={[styles.estado, { color: colores.gris }]}>No hay movimientos todavía</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: RADIO.xl,
    padding: 24,
  },
  filtros: {
    marginBottom: 16,
    marginHorizontal: -4,
  },
  filtrosContenido: {
    gap: 8,
    paddingHorizontal: 4,
  },
  chip: {
    borderWidth: 1,
    borderRadius: RADIO.peq,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipTxt: {
    fontFamily: FUENTES.textoSemi,
    fontSize: 13.6,
    fontWeight: '600',
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingBottom: 8,
    marginBottom: 4,
  },
  th: {
    fontFamily: FUENTES.texto,
    fontSize: 13.6,
    fontWeight: '600',
  },
  thConcepto: {
    flex: 1,
  },
  thPuntos: {
    width: 72,
    textAlign: 'right',
  },
  thFecha: {
    width: 84,
    textAlign: 'right',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  rowConcepto: {
    flex: 1,
    paddingRight: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingVertical: 3.2,
    paddingHorizontal: 9.6,
  },
  badgeTxt: {
    color: '#fff',
    fontSize: 12.5,
    fontWeight: '500',
    fontFamily: FUENTES.texto,
  },
  desc: {
    fontFamily: FUENTES.texto,
    fontSize: 12.5,
    marginTop: 4,
    lineHeight: 17,
  },
  puntos: {
    fontFamily: FUENTES.textoBold,
    fontSize: 15.2,
    fontWeight: '600',
  },
  fecha: {
    fontFamily: FUENTES.texto,
    fontSize: 13.6,
  },
  estado: {
    fontFamily: FUENTES.texto,
    textAlign: 'center',
    paddingVertical: 32,
    fontSize: 15,
  },
});
