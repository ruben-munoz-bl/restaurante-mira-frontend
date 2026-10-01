import { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, Animated } from 'react-native';
import usePointsStore from '../../stores/usePointsStore.js';
import { IMG } from '../../theme/imagenes';
import { useT } from '../../i18n/index.jsx';
import es from '../../i18n/es.js';
import ca from '../../i18n/ca.js';
import en from '../../i18n/en.js';
import { useTheme } from '../../theme/ThemeContext';
import { FUENTES, RADIO } from '../../theme/tokens';

const TRADS = { es, ca, en };

export default function BalanceCard({ usuario }) {
  const t = useT(TRADS);
  const { colores } = useTheme();
  const { saldoActual, rachaLogin, rachaReservas, balanceLoading, fetchBalance } = usePointsStore();
  const [shimmer] = useState(() => new Animated.Value(0.45));

  useEffect(() => {
    if (usuario) fetchBalance();
  }, [usuario, fetchBalance]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0.45, duration: 750, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  if (balanceLoading) {
    return (
      <View style={[styles.card, { backgroundColor: colores.glassBg, borderColor: colores.glassBorder }]}>
        <Animated.View style={[styles.skeleton, { opacity: shimmer, backgroundColor: colores.fondoSuave }]} />
      </View>
    );
  }

  const semanas = rachaReservas?.semanasConsecutivas || 0;

  return (
    <View style={[styles.card, { backgroundColor: colores.glassBg, borderColor: colores.glassBorder }]}>
      <View style={styles.header}>
        <Text style={[styles.h3, { color: colores.tinta }]}>{t('points.title')}</Text>
        <Image source={IMG.moneda} style={styles.coin} resizeMode="contain" />
      </View>

      <View style={styles.saldo}>
        <Text style={[styles.amount, { color: colores.tinta }]}>{saldoActual}</Text>
        <Text style={[styles.label, { color: colores.gris }]}>{t('points.balance')}</Text>
      </View>

      <View style={styles.details}>
        <View style={styles.detail}>
          <Text style={[styles.detailLabel, { color: colores.gris }]}>Racha login</Text>
          <Text style={[styles.detailValue, { color: colores.tinta }]}>
            {rachaLogin?.dias || 0} {t('points.days')}
          </Text>
        </View>
        {semanas > 0 && (
          <View style={styles.detail}>
            <Text style={[styles.detailLabel, { color: colores.gris }]}>{t('points.multiplier')}</Text>
            <Text style={[styles.detailValue, styles.detailHighlight, { color: colores.primaryContainer }]}>
              x{rachaReservas.multiplicador}
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.footer, { borderTopColor: colores.borde }]}>
        <Text style={[styles.rate, { color: colores.gris }]}>{t('points.rate')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: RADIO.xl,
    padding: 24,
  },
  skeleton: {
    height: 140,
    borderRadius: RADIO.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  h3: {
    fontFamily: FUENTES.display,
    fontWeight: '700',
    fontSize: 20.8,
  },
  coin: {
    width: 44,
    height: 44,
  },
  saldo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  amount: {
    fontFamily: FUENTES.display,
    fontWeight: '800',
    fontSize: 48,
    lineHeight: 54,
  },
  label: {
    fontFamily: FUENTES.texto,
    fontSize: 14.4,
    fontWeight: '600',
    marginTop: 2,
  },
  details: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 12,
  },
  detail: {
    flex: 1,
    alignItems: 'center',
  },
  detailLabel: {
    fontFamily: FUENTES.texto,
    fontSize: 12.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  detailValue: {
    fontFamily: FUENTES.textoBold,
    fontSize: 16,
    fontWeight: '700',
  },
  detailHighlight: {
    fontSize: 18.4,
  },
  footer: {
    borderTopWidth: 1,
    paddingTop: 10,
    alignItems: 'center',
  },
  rate: {
    fontFamily: FUENTES.textoSemi,
    fontSize: 13.6,
    fontWeight: '600',
  },
});
