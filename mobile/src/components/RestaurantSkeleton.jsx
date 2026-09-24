/**
 * Skeleton de carga para RestaurantCard — misma estructura que la card
 * con barras en shimmer (opacidad animada, espejo de la animación CSS).
 */
import { useEffect, useState } from 'react';
import { View, Animated, StyleSheet, useWindowDimensions } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { RADIO } from '../theme/tokens';

export function altoMedia(width) {
  if (width >= 1024) return 168;
  if (width <= 400) return 108;
  return 200;
}

function Barra({ ancho, alto, anim }) {
  const { colores } = useTheme();
  return (
    <Animated.View
      style={{
        width: ancho,
        height: alto,
        borderRadius: 4,
        marginBottom: 4,
        backgroundColor: colores.fondoSuave,
        opacity: anim,
      }}
    />
  );
}

export default function RestaurantSkeleton({ anchoCard }) {
  const { width } = useWindowDimensions();
  const { colores } = useTheme();
  const [anim] = useState(() => new Animated.Value(0.45));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.45, duration: 750, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  const media = altoMedia(width);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colores.papel, borderColor: colores.glassBorder, width: anchoCard },
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={[styles.media, { height: media, backgroundColor: colores.fondoSuave, opacity: anim }]} />
      <View style={styles.cuerpo}>
        <Barra ancho="70%" alto={16.8} anim={anim} />
        <Barra ancho="50%" alto={13.6} anim={anim} />
        <Barra ancho="55%" alto={12} anim={anim} />
        <Barra ancho="35%" alto={12} anim={anim} />
        <Barra ancho="90%" alto={11.2} anim={anim} />
        <Barra ancho="60%" alto={11.2} anim={anim} />
        <View style={styles.acciones}>
          <Animated.View
            style={[styles.btn, { backgroundColor: colores.fondoSuave, opacity: anim }]}
          />
          <Animated.View
            style={[styles.btn2, { backgroundColor: colores.fondoSuave, opacity: anim }]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: RADIO.xl,
    overflow: 'hidden',
    flexGrow: 1,
    flexShrink: 1,
  },
  media: {
    width: '100%',
  },
  cuerpo: {
    padding: 16,
    paddingTop: 16,
    paddingHorizontal: 17.6,
    gap: 2,
  },
  acciones: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6.4,
  },
  btn: {
    height: 32,
    width: 120,
    borderRadius: RADIO.peq,
  },
  btn2: {
    height: 32,
    width: 90,
    borderRadius: RADIO.peq,
  },
});
