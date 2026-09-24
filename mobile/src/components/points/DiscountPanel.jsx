import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import usePointsStore from '../../stores/usePointsStore.js';
import { useT } from '../../i18n/index.jsx';
import es from '../../i18n/es.js';
import ca from '../../i18n/ca.js';
import en from '../../i18n/en.js';
import { useTheme } from '../../theme/ThemeContext';
import { FUENTES, RADIO } from '../../theme/tokens';

const TRADS = { es, ca, en };
const OPTIONS = [5, 10, 20];

export default function DiscountPanel({ usuario }) {
  const t = useT(TRADS);
  const { colores } = useTheme();
  const { saldoActual, descuentoPendiente, claimDiscount, balanceLoading } = usePointsStore();
  const [loadingEuros, setLoadingEuros] = useState(null);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(null);

  if (!usuario) return null;

  async function handleClaim(euros) {
    setError('');
    setOk(null);
    setLoadingEuros(euros);
    try {
      const result = await claimDiscount(euros);
      setOk(result.descuentoPendiente || { euros });
    } catch (err) {
      setError(err?.data?.message || err?.message || t('points.discountError'));
    } finally {
      setLoadingEuros(null);
    }
  }

  return (
    <View style={[styles.card, { backgroundColor: colores.glassBg, borderColor: colores.glassBorder }]}>
      <Text style={[styles.h3, { color: colores.primary }]}>{t('points.discountTitle')}</Text>
      <Text style={[styles.info, { color: colores.gris }]}>{t('points.discountInfo')}</Text>

      {descuentoPendiente ? (
        <View
          style={[
            styles.pending,
            { borderColor: colores.verde, backgroundColor: colores.fondoSuave },
          ]}
        >
          <Text style={[styles.pendingStrong, { color: colores.verde }]}>
            {descuentoPendiente.euros} € {t('points.discountPending')}
          </Text>
          <Text style={[styles.pendingHint, { color: colores.gris }]}>
            {t('points.discountPendingHint')}
          </Text>
        </View>
      ) : (
        <View style={styles.options}>
          {OPTIONS.map((euros) => {
            const pts = euros * 100;
            const insufficient = !balanceLoading && saldoActual < pts;
            const busy = loadingEuros !== null;
            return (
              <Pressable
                key={euros}
                onPress={() => handleClaim(euros)}
                disabled={busy || insufficient}
                accessibilityRole="button"
                accessibilityState={{ disabled: busy || insufficient }}
                style={({ pressed }) => [
                  styles.option,
                  {
                    backgroundColor: colores.papel,
                    borderColor: colores.borde,
                    opacity: busy || insufficient ? 0.45 : pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={[styles.optionEuros, { color: colores.verde }]}>{euros} €</Text>
                <Text style={[styles.optionPts, { color: colores.gris }]}>{pts} pts</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {error ? <Text style={[styles.error, { color: colores.rojo }]}>{error}</Text> : null}
      {ok ? <Text style={[styles.success, { color: colores.verde }]}>{t('points.discountClaimed')}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: RADIO.xl,
    padding: 24,
  },
  h3: {
    fontFamily: FUENTES.display,
    fontWeight: '700',
    fontSize: 20.8,
    marginBottom: 8,
  },
  info: {
    fontFamily: FUENTES.texto,
    fontSize: 15.2,
    lineHeight: 21,
    marginBottom: 20,
  },
  options: {
    flexDirection: 'row',
    gap: 12,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: RADIO.peq,
    paddingVertical: 14.4,
    paddingHorizontal: 8,
    gap: 4,
  },
  optionEuros: {
    fontFamily: FUENTES.display,
    fontWeight: '700',
    fontSize: 20,
  },
  optionPts: {
    fontFamily: FUENTES.texto,
    fontSize: 12.8,
  },
  pending: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: RADIO.peq,
    padding: 16,
    gap: 4,
  },
  pendingStrong: {
    fontFamily: FUENTES.textoBold,
    fontWeight: '700',
    fontSize: 15.2,
  },
  pendingHint: {
    fontFamily: FUENTES.texto,
    fontSize: 14.4,
  },
  error: {
    fontFamily: FUENTES.texto,
    fontSize: 14.4,
    marginTop: 12,
  },
  success: {
    fontFamily: FUENTES.texto,
    fontSize: 14.4,
    marginTop: 12,
  },
});
