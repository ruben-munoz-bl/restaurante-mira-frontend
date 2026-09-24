/**
 * Hero editorial — espejo de .hero (imagen + velo verde, título display,
 * subtítulo, CTA a #buscar y stats en pills translúcidas).
 */
import { View, Text, ImageBackground, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';
import { IMG } from '../theme/imagenes';
import { FUENTES, ANCHO_MAX, GUTTER } from '../theme/tokens';
import { clampPx } from '../theme/responsive';
import { btnCta } from '../theme/ui';

const TRADS = { es, ca, en };

export default function Hero({ total, numZonas, onBuscar }) {
  const t = useT(TRADS);
  const { width } = useWindowDimensions();
  const h1 = clampPx(2.5, 6, 4, width);
  const sub = 18; // 1.125rem

  return (
    <View style={styles.hero} accessibilityLabelledBy="hero-titulo">
      <ImageBackground source={IMG.heroDining} style={styles.bg} resizeMode="cover">
        <View style={styles.velo}>
          <View style={styles.contenido}>
            <Text style={[styles.titulo, { fontSize: h1, lineHeight: h1 * 1.1, marginBottom: h1 * 0.4 }]}>
              {t('hero.titulo')}
            </Text>
            <Text style={[styles.sub, { fontSize: sub, lineHeight: sub * 1.6, maxWidth: sub * 26 }]}>
              {t('hero.subtitulo')}
            </Text>
            <Pressable
              onPress={onBuscar}
              accessibilityRole="link"
              style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
            >
              <Text style={btnCta({ primaryContainer: '#16382C' }, { grande: true })}>{t('hero.buscar')}</Text>
            </Pressable>

            {(total > 0 || numZonas > 0) && (
              <View style={styles.stats} accessibilityLabel={t('hero.cifras')}>
                {total > 0 && (
                  <View style={styles.stat}>
                    <Text style={styles.statTxt}>
                      <Text style={styles.statFuerte}>{total.toLocaleString('es-ES')}</Text>
                      {' ' + t('hero.restaurantes')}
                    </Text>
                  </View>
                )}
                {numZonas > 0 && (
                  <View style={styles.stat}>
                    <Text style={styles.statTxt}>
                      <Text style={styles.statFuerte}>{numZonas}</Text>
                      {' ' + t('hero.zonas')}
                    </Text>
                  </View>
                )}
                <View style={styles.stat}>
                  <Text style={styles.statTxt}>
                    <Text style={styles.statFuerte}>50</Text>
                    {' ' + t('hero.resenasPorLocal')}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    minHeight: 480,
    width: '100%',
  },
  bg: {
    flex: 1,
    width: '100%',
    minHeight: 480,
  },
  velo: {
    flex: 1,
    backgroundColor: 'rgba(0, 34, 24, 0.6)',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: GUTTER,
  },
  contenido: {
    maxWidth: ANCHO_MAX,
    width: '100%',
    alignSelf: 'center',
  },
  titulo: {
    fontFamily: FUENTES.display,
    fontWeight: '700',
    color: '#fff',
    maxWidth: 560,
  },
  sub: {
    color: 'rgba(255, 255, 255, 0.88)',
    fontFamily: FUENTES.texto,
    fontWeight: '400',
    marginBottom: 24,
  },
  cta: {
    alignSelf: 'flex-start',
    marginTop: 0,
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 19.2,
    marginTop: 32,
    marginBottom: 32,
  },
  stat: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 999,
    paddingVertical: 9.6,
    paddingHorizontal: 19.2,
  },
  statTxt: {
    fontSize: 14.4,
    color: '#fff',
    fontFamily: FUENTES.texto,
  },
  statFuerte: {
    fontWeight: '800',
    fontFamily: FUENTES.textoExtra,
  },
});
