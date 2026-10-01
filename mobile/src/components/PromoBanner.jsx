/**
 * Franja de ventajas — espejo de .promo (3 columnas ≥640, check dorado).
 */
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';
import { useTheme } from '../theme/ThemeContext';
import { FUENTES, ANCHO_MAX, GUTTER, GUTTER_MOVIL } from '../theme/tokens';

const TRADS = { es, ca, en };

const VENTAJAS = [
  { key: 'notaReal', keyDesc: 'notaDesc' },
  { key: 'cerca', keyDesc: 'cercaDesc' },
  { key: 'gratisTitulo', keyDesc: 'gratisDesc' },
];

export default function PromoBanner() {
  const t = useT(TRADS);
  const { colores } = useTheme();
  const { width } = useWindowDimensions();
  const cols = width >= 640 ? 3 : 1;
  const gutter = width <= 640 ? GUTTER_MOVIL : GUTTER;

  return (
    <View
      style={[styles.promo, { backgroundColor: colores.fondoSuave, borderColor: colores.glassBorder }]}
      accessibilityLabel={t('promo.titulo')}
    >
      <View style={[styles.lista, { maxWidth: ANCHO_MAX, paddingHorizontal: gutter }]}>
        {VENTAJAS.map((v) => (
          <View
            key={v.key}
            style={[styles.item, cols === 1 ? { width: '100%' } : { flex: 1 }]}
          >
            <View style={[styles.check, { backgroundColor: colores.dorado }]}>
              <Text style={styles.checkTxt}>✓</Text>
            </View>
            <Text style={[styles.texto, { color: colores.tinta }]}>
              <Text style={{ fontWeight: '700' }}>{t(`promo.${v.key}`)}.</Text> {t(`promo.${v.keyDesc}`)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  promo: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 32,
  },
  lista: {
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 19.2,
  },
  item: {
    flexDirection: 'row',
    gap: 12.8,
    alignItems: 'flex-start',
  },
  check: {
    width: 28.8,
    height: 28.8,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkTxt: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13.6,
    fontFamily: FUENTES.textoBold,
  },
  texto: {
    fontSize: 15.2,
    fontFamily: FUENTES.texto,
    lineHeight: 22,
    flex: 1,
  },
});
