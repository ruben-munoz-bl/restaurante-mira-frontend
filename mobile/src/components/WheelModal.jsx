import { useState, useCallback } from 'react';
import { Modal, View, Text, Pressable, ScrollView, Animated, Easing, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { IMG } from '../theme/imagenes';
import { FUENTES } from '../theme/tokens';

const LogoCircular = IMG.logoCircular;

const PRIZES = [
  { puntos: 20, label: '20', color: '#006A55', textColor: '#fff' },
  { puntos: 25, label: '25', color: '#05886d', textColor: '#fff' },
  { puntos: 30, label: '30', color: '#FFC800', textColor: '#1a1a1a' },
  { puntos: 50, label: '50', color: '#FF8600', textColor: '#fff' },
  { puntos: 100, label: '100', color: '#FF4B4B', textColor: '#fff' },
];

const SEGMENT_ANGLE = 360 / PRIZES.length;
const RUEDA = 268;
const C = RUEDA / 2; // centro (viewBox escalado 300 → 268)

function punto(anguloDeg, radio) {
  const rad = ((anguloDeg - 90) * Math.PI) / 180;
  return [C + radio * Math.cos(rad), C + radio * Math.sin(rad)];
}

export default function WheelModal({ onSpin, onClose }) {
  const { colores } = useTheme();
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [error, setError] = useState(false);
  const [objetivo, setObjetivo] = useState(0);
  const [rot] = useState(() => new Animated.Value(0));

  const girar = useCallback(
    async (event) => {
      if (spinning || result) return;
      if (event?.stopPropagation) event.stopPropagation();
      setSpinning(true);
      setError(false);

      let prize;
      try {
        prize = await onSpin?.();
      } catch {
        setError(true);
        setSpinning(false);
        return;
      }

      if (!prize) {
        setError(true);
        setSpinning(false);
        return;
      }

      const prizeIndex = PRIZES.findIndex((p) => p.puntos === prize.puntos);
      const matchedPrize = prizeIndex >= 0 ? PRIZES[prizeIndex] : PRIZES[0];
      const idx = prizeIndex >= 0 ? prizeIndex : 0;

      const baseAngle = idx * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
      const extraRotations = 5 * 360 + (360 - baseAngle);
      const total = objetivo + extraRotations;
      setObjetivo(total);

      Animated.timing(rot, {
        toValue: total,
        duration: 5000,
        easing: Easing.bezier(0.17, 0.67, 0.12, 0.99),
        useNativeDriver: true,
      }).start();

      setTimeout(() => {
        setResult(matchedPrize);
        setSpinning(false);
        setShowResult(true);
        setTimeout(() => {
          onClose?.({ ...matchedPrize, nuevoSaldo: prize.nuevoSaldo });
        }, 4000);
      }, 5200);
    },
    [spinning, result, objetivo, rot, onSpin, onClose],
  );

  const rotacion = rot.interpolate({
    inputRange: [0, Math.max(objetivo, 1)],
    outputRange: ['0deg', `${Math.max(objetivo, 1)}deg`],
    extrapolate: 'extend',
  });

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={() => onClose?.(null)}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
            {/* Cintillo */}
            <View style={styles.header}>
              <View style={styles.brand}>
                <View style={[styles.brandIcono, { backgroundColor: colores.primaryContainer }]}>
                  <LogoCircular width={22} height={22} />
                </View>
                <View>
                  <Text style={[styles.brandNombre, { color: colores.primaryContainer }]}>MIRA CLUB</Text>
                  <Text style={[styles.brandSub, { color: colores.gris }]}>Ruleta del Día 7</Text>
                </View>
              </View>
            </View>

            <View style={styles.body}>
              <Text style={[styles.titulo, { color: '#181c1a' }]}>¡Completaste la racha de 7 días! 🎉</Text>
              <Text style={[styles.subtitulo, { color: '#414844' }]}>
                Gira la ruleta para ganar entre <Text style={styles.bold}>20 y 100 MIRA Points</Text>
              </Text>

              <View style={styles.contenedor}>
                <Text style={styles.puntero}>▼</Text>
                <View style={styles.outer}>
                  <Animated.View style={{ width: RUEDA, height: RUEDA, transform: [{ rotate: rotacion }] }}>
                    <Svg width={RUEDA} height={RUEDA} viewBox="0 0 300 300">
                      {PRIZES.map((prize, i) => {
                        const startAngle = i * SEGMENT_ANGLE;
                        const endAngle = startAngle + SEGMENT_ANGLE;
                        const [x1, y1] = punto(startAngle, 140);
                        const [x2, y2] = punto(endAngle, 140);
                        const largeArc = SEGMENT_ANGLE > 180 ? 1 : 0;

                        return (
                          <Path
                            key={i}
                            d={`M150,150 L${x1},${y1} A140,140 0 ${largeArc},1 ${x2},${y2} Z`}
                            fill={prize.color}
                            stroke="#fff"
                            strokeWidth="2"
                          />
                        );
                      })}
                      {PRIZES.map((prize, i) => {
                        const midAngle = (i * SEGMENT_ANGLE + SEGMENT_ANGLE / 2);
                        const [tx, ty] = punto(midAngle, 95);
                        return (
                          <SvgText
                            key={`t-${i}`}
                            x={tx}
                            y={ty}
                            fill={prize.textColor}
                            fontSize="22"
                            fontWeight="900"
                            textAnchor="middle"
                            dominantBaseline="central"
                            rotation={midAngle}
                            origin={`${tx}, ${ty}`}
                          >
                            {prize.label}
                          </SvgText>
                        );
                      })}
                      <Circle cx="150" cy="150" r="30" fill="#fff" stroke="#e5e7eb" strokeWidth="2" />
                      <Circle cx="150" cy="150" r="12" fill={colores.primaryContainer} />
                    </Svg>
                  </Animated.View>
                </View>
              </View>

              {!result && !error && (
                <Pressable onPress={girar} disabled={spinning} accessibilityRole="button">
                  <LinearGradient
                    colors={spinning ? ['#D1D5DB', '#D1D5DB'] : ['#FBBF24', '#F59E0B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.spinBtn}
                  >
                    <Text style={[styles.spinTxt, spinning && { color: '#6B7280' }]}>
                      {spinning ? 'Girando...' : '🎡 ¡GIRAR RULETA!'}
                    </Text>
                  </LinearGradient>
                </Pressable>
              )}

              {error && (
                <View style={styles.error}>
                  <Text style={[styles.errorTxt, { color: '#c62828' }]}>
                    Error al girar la ruleta. Inténtalo de nuevo.
                  </Text>
                  <Pressable onPress={girar} accessibilityRole="button">
                    <LinearGradient
                      colors={['#FBBF24', '#F59E0B']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={styles.spinBtn}
                    >
                      <Text style={styles.spinTxt}>Reintentar</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              )}
            </View>

            {showResult && result && (
              <View style={styles.resultado}>
                <Text style={styles.resultadoIcono}>🎉</Text>
                <Text style={[styles.resultadoTitulo, { color: '#181c1a' }]}>¡Felicidades!</Text>
                <View style={styles.resultadoPremio}>
                  <Image source={IMG.moneda} style={styles.resultadoMoneda} resizeMode="contain" />
                  <Text style={styles.resultadoPuntos}>+{result.puntos} MIRA Points</Text>
                </View>
                <Text style={[styles.resultadoSub, { color: '#414844' }]}>Se han añadido a tu saldo</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 20, 15, 0.7)',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modal: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '92%',
    backgroundColor: '#FCFBF8',
    borderRadius: 32,
    borderWidth: 4,
    borderColor: 'rgba(251, 191, 36, 0.2)',
    overflow: 'hidden',
  },
  contenido: {
    paddingBottom: 24,
  },
  header: {
    paddingHorizontal: 25.6,
    paddingTop: 19.2,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9.6,
  },
  brandIcono: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  brandNombre: {
    fontSize: 11.2,
    fontWeight: '900',
    letterSpacing: 0.9,
    fontFamily: FUENTES.textoExtra,
  },
  brandSub: {
    fontSize: 10.4,
    fontWeight: '700',
    fontFamily: FUENTES.textoBold,
    marginTop: -1,
  },
  body: {
    paddingHorizontal: 25.6,
    paddingBottom: 16,
    alignItems: 'center',
  },
  titulo: {
    fontFamily: FUENTES.display,
    fontSize: 22.4,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitulo: {
    fontSize: 13.6,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: FUENTES.textoMedio,
  },
  bold: {
    fontWeight: '800',
    fontFamily: FUENTES.textoExtra,
  },
  contenedor: {
    width: 280,
    height: 280,
    marginBottom: 19.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  puntero: {
    position: 'absolute',
    top: -10,
    zIndex: 10,
    fontSize: 29,
    color: '#F59E0B',
    textShadowColor: 'rgba(245, 158, 11, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  outer: {
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 6,
    borderColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 6,
  },
  spinBtn: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#B45309',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
    elevation: 4,
    minWidth: 220,
  },
  spinTxt: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.3,
    fontFamily: FUENTES.textoExtra,
  },
  error: {
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  errorTxt: {
    fontSize: 13.6,
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: FUENTES.textoBold,
  },
  resultado: {
    alignItems: 'center',
    paddingHorizontal: 25.6,
    paddingTop: 16,
  },
  resultadoIcono: {
    fontSize: 48,
    marginBottom: 5,
  },
  resultadoTitulo: {
    fontFamily: FUENTES.display,
    fontSize: 25.6,
    fontWeight: '900',
    marginBottom: 8,
  },
  resultadoPremio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  resultadoMoneda: {
    width: 40,
    height: 40,
  },
  resultadoPuntos: {
    fontSize: 22.4,
    fontWeight: '900',
    color: '#D97706',
    fontFamily: FUENTES.textoExtra,
  },
  resultadoSub: {
    fontSize: 13.6,
    fontWeight: '600',
    fontFamily: FUENTES.textoMedio,
  },
});
