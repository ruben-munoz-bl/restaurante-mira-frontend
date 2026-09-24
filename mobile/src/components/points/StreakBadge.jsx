import { useState, useEffect, useCallback } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { IMG } from '../../theme/imagenes';
import { useTheme } from '../../theme/ThemeContext';
import { FUENTES, RADIO } from '../../theme/tokens';

const TOTAL_DAYS = 7;

export default function StreakBadge({ rachaLogin, rachaReservas, onOpenStreak, fetchStreakData }) {
  const { colores } = useTheme();
  const [loading, setLoading] = useState(false);
  const [localRacha, setLocalRacha] = useState(rachaLogin);

  useEffect(() => {
    setLocalRacha(rachaLogin);
  }, [rachaLogin]);

  useEffect(() => {
    if (!fetchStreakData) return undefined;
    let alive = true;
    fetchStreakData()
      .then((data) => {
        if (!alive) return;
        if (data?.racha) setLocalRacha(data.racha);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dias = localRacha?.dias || 0;
  const multiplicador = rachaReservas?.multiplicador || 1;
  const semanas = rachaReservas?.semanasConsecutivas || 0;
  const yaReclamado = Boolean(localRacha?.yaReclamado);
  const esDia7 = (localRacha?.dia7Disponible ?? dias >= 7) || dias >= 7;
  const puntosHoy = yaReclamado
    ? 0
    : (localRacha?.puntosHoy ?? (esDia7 ? 0 : Math.min(5 + 3 * Math.max(0, dias), 15)));
  const diasRestantes = Math.max(0, TOTAL_DAYS - dias);
  const progreso = Math.min((dias / TOTAL_DAYS) * 100, 100);

  const handleClick = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const data = await fetchStreakData?.();
      if (data?.racha) setLocalRacha(data.racha);
      onOpenStreak?.(data || { racha: localRacha, puntos: 0, yaReclamado: false });
    } catch {
      onOpenStreak?.({ racha: localRacha, puntos: 0, yaReclamado: false });
    } finally {
      setLoading(false);
    }
  }, [loading, fetchStreakData, onOpenStreak, localRacha]);

  return (
    <Pressable
      onPress={handleClick}
      accessibilityRole="button"
      accessibilityState={{ disabled: loading }}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colores.glassBg, borderColor: esDia7 ? '#F59E0B' : colores.glassBorder },
        pressed && { opacity: 0.9 },
      ]}
    >
      <View style={styles.fireSection}>
        <View
          style={[
            styles.fireWrap,
            {
              backgroundColor: esDia7 ? '#FBBF24' : '#FEF3C7',
              borderColor: '#F59E0B',
            },
          ]}
        >
          <Image source={IMG.rachaFuego} style={styles.fireImg} resizeMode="contain" />
          {!esDia7 && (
            <View style={[styles.fireCount, { backgroundColor: colores.primaryContainer, borderColor: colores.papel }]}>
              <Text style={styles.fireCountTxt}>{dias}</Text>
            </View>
          )}
          {esDia7 && (
            <View style={[styles.fireCount, styles.fireCountWheel, { borderColor: colores.papel }]}>
              <Text style={styles.fireCountTxt}>🎡</Text>
            </View>
          )}
        </View>

        <View style={styles.fireInfo}>
          <Text style={[styles.fireTitle, { color: colores.tinta }]}>
            {esDia7 ? '¡Ruleta lista!' : `Racha: ${dias} día${dias !== 1 ? 's' : ''}`}
          </Text>
          <Text style={[styles.fireSub, { color: colores.gris }]}>
            {esDia7
              ? 'Toca para girar la ruleta y ganar hasta 100 MIRA pts'
              : dias === 0
                ? 'Entra hoy para empezar tu racha'
                : `+${puntosHoy} MIRA pts hoy${diasRestantes > 0 ? ` · ${diasRestantes} días para la ruleta` : ''}`}
          </Text>
        </View>

        <Text style={[styles.fireArrow, { color: loading ? colores.gris : colores.gris }]}>
          {loading ? '⏳' : '→'}
        </Text>
      </View>

      <View style={[styles.progressSection, { borderTopColor: colores.glassBorder }]}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressLabel, { color: colores.gris }]}>Progreso de racha</Text>
          <Text style={[styles.progressCount, { color: colores.primaryContainer }]}>{dias}/7 días</Text>
        </View>

        <View style={[styles.progressTrack, { backgroundColor: 'rgba(0,0,0,0.06)' }]}>
          <View
            style={[
              styles.progressFill,
              { width: `${progreso}%`, backgroundColor: colores.primaryContainer },
            ]}
          />
          <View style={styles.progressDots}>
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <View
                key={d}
                style={[
                  styles.progressDot,
                  d <= dias && { backgroundColor: colores.primaryContainer, borderColor: colores.primaryContainer },
                  d === 7 && esDia7 && { backgroundColor: '#F59E0B', borderColor: '#F59E0B', width: 14, height: 14 },
                ]}
              />
            ))}
          </View>
        </View>

        <View style={styles.progressDays}>
          {[1, 2, 3, 4, 5, 6, 7].map((d) => (
            <Text
              key={d}
              style={[
                styles.progressDayLabel,
                { color: colores.gris },
                d <= dias && { color: colores.primaryContainer },
              ]}
            >
              {d === 7 ? '🎡' : d}
            </Text>
          ))}
        </View>
      </View>

      {semanas > 0 && (
        <View style={[styles.reserva, { borderTopColor: colores.glassBorder }]}>
          <Text style={styles.reservaIcon}>⭐</Text>
          <View style={styles.reservaInfo}>
            <Text style={[styles.reservaValue, { color: colores.primary }]}>x{multiplicador}</Text>
            <Text style={[styles.reservaLabel, { color: colores.gris }]}>
              {semanas} semana{semanas > 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: RADIO.xl,
    paddingVertical: 19.2,
    paddingHorizontal: 22.4,
    gap: 16,
  },
  fireSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  fireWrap: {
    width: 64,
    height: 64,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fireImg: {
    width: 44,
    height: 44,
  },
  fireCount: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fireCountWheel: {
    backgroundColor: '#F59E0B',
  },
  fireCountTxt: {
    color: '#fff',
    fontSize: 10.4,
    fontWeight: '900',
  },
  fireInfo: {
    flex: 1,
  },
  fireTitle: {
    fontFamily: FUENTES.textoBold,
    fontSize: 15.2,
    fontWeight: '800',
    marginBottom: 1,
  },
  fireSub: {
    fontFamily: FUENTES.texto,
    fontSize: 12.5,
    fontWeight: '600',
    lineHeight: 17.5,
  },
  fireArrow: {
    fontSize: 19.2,
    fontWeight: '600',
  },
  progressSection: {
    paddingTop: 9.6,
    borderTopWidth: 1,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontFamily: FUENTES.textoBold,
    fontSize: 11.5,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  progressCount: {
    fontFamily: FUENTES.textoBold,
    fontSize: 11.5,
    fontWeight: '800',
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    justifyContent: 'center',
    marginBottom: 6,
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    borderRadius: 999,
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    zIndex: 1,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.12)',
  },
  progressDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressDayLabel: {
    width: 16,
    textAlign: 'center',
    fontSize: 9.6,
    fontWeight: '700',
  },
  reserva: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12.8,
    paddingTop: 9.6,
    borderTopWidth: 1,
  },
  reservaIcon: {
    fontSize: 24,
  },
  reservaInfo: {
    flexDirection: 'column',
  },
  reservaValue: {
    fontFamily: FUENTES.textoBold,
    fontSize: 19.2,
    fontWeight: '700',
  },
  reservaLabel: {
    fontFamily: FUENTES.texto,
    fontSize: 12.8,
  },
});
