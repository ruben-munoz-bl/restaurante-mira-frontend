/**
 * Avatar de cuenta (círculo con inicial) + marco opcional del emblema PNG.
 * Versión RN del EmblemaAvatar web: PNG del marco centrado con las mismas
 * escalas/offsets relativos que las reglas .emblema-* del CSS.
 */
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

const MARCOS = {
  foodie: {
    img: require('../../assets/images/emblemas/foodie.png'),
    escala: [1.023709, 1.005983],
    offset: [0.007755, -0.002216],
  },
  gourmet: {
    img: require('../../assets/images/emblemas/gourmet.png'),
    escala: [1.619527, 1.49167],
    offset: [-0.001937, -0.089113],
  },
  michelin: {
    img: require('../../assets/images/emblemas/michelin.png'),
    escala: [1.196256, 1.096812],
    offset: [-0.007312, -0.017549],
  },
};

export default function EmblemaAvatar({ inicial, emblema, size = 'md' }) {
  const { colores } = useTheme();
  const base = size === 'lg' ? 88 : 64;
  const marco = emblema ? MARCOS[emblema.id] : null;
  const w = marco ? base * marco.escala[0] : 0;
  const h = marco ? base * marco.escala[1] : 0;
  const dx = marco ? base * marco.offset[0] : 0;
  const dy = marco ? base * marco.offset[1] : 0;

  return (
    <View style={{ width: base, height: base }}>
      <View
        style={[
          styles.avatar,
          { width: base, height: base, borderRadius: base / 2, backgroundColor: colores.primaryContainer },
        ]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Text style={[styles.inicial, { fontSize: size === 'lg' ? 38.4 : 28.8 }]}>
          {inicial}
        </Text>
      </View>
      {marco && (
        <Image
          source={marco.img}
          style={{
            position: 'absolute',
            width: w,
            height: h,
            left: base / 2 - w / 2 + dx,
            top: base / 2 - h / 2 + dy,
          }}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  inicial: {
    color: '#fff',
    fontWeight: '800',
    textAlign: 'center',
  },
});
