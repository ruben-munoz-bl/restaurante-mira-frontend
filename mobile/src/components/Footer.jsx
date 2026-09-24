/**
 * Pie con columnas de navegación — espejo de .site-footer del web:
 * 1 columna ≤767, 2 ≥768, 4 ≥1024; fondo primary (o #111411 en oscuro).
 * Se renderiza DENTRO del scroll de AppShell (flujo del documento, como el web).
 */
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';
import { useTheme } from '../theme/ThemeContext';
import { FUENTES, ANCHO_MAX, GUTTER } from '../theme/tokens';

const TRADS = { es, ca, en };

const GAP = 28.8; // 1.8rem

export default function Footer() {
  const t = useT(TRADS);
  const { colores, esOscuro } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const cols = width >= 1024 ? 4 : width >= 768 ? 2 : 1;
  const bg = esOscuro ? '#111411' : colores.primary;
  const avail = Math.min(width, ANCHO_MAX) - GUTTER * 2;
  const colW = cols === 1 ? avail : (avail - GAP * (cols - 1)) / cols;

  function ir(ruta) {
    router.push(ruta);
  }

  const colStyle = (idx) => ({
    width: colW,
    marginBottom: GAP,
    marginRight: idx % cols === cols - 1 ? 0 : GAP,
  });

  const estiloLink = ({ pressed }) => ({
    fontSize: 14.72,
    fontFamily: FUENTES.texto,
    color: pressed ? '#fed65b' : '#e8e8e6',
    textDecorationLine: pressed ? 'underline' : 'none',
    textAlign: 'left',
  });

  const estiloTitulo = {
    fontSize: 13.12,
    textTransform: 'uppercase',
    letterSpacing: 1.05,
    color: '#a0a8a2',
    marginBottom: 9.6,
    fontWeight: '700',
    fontFamily: FUENTES.textoBold,
  };

  return (
    <View style={[styles.footer, { backgroundColor: bg }]}>
      <View style={[styles.inner, { paddingHorizontal: GUTTER }]}>
        <View style={colStyle(0)}>
          <Text style={styles.logo}>MIRA</Text>
          <Text style={styles.p}>{t('footer.titulo')}</Text>
        </View>

        <View style={colStyle(1)} accessibilityLabel={t('nav.descubrir')}>
          <Text style={estiloTitulo}>{t('nav.descubrir')}</Text>
          <View style={styles.lista}>
            <Pressable onPress={() => ir('/')} accessibilityRole="link">
              <Text style={estiloLink}>{t('hero.buscar')}</Text>
            </Pressable>
            <Pressable onPress={() => ir('/mapa')} accessibilityRole="link">
              <Text style={estiloLink}>{t('nav.mapa')}</Text>
            </Pressable>
            <Pressable onPress={() => ir('/reservas')} accessibilityRole="link">
              <Text style={estiloLink}>{t('nav.reservas')}</Text>
            </Pressable>
          </View>
        </View>

        <View style={colStyle(2)} accessibilityLabel={t('nav.miCuenta')}>
          <Text style={estiloTitulo}>{t('nav.miCuenta')}</Text>
          <View style={styles.lista}>
            <Pressable onPress={() => ir('/login')} accessibilityRole="link">
              <Text style={estiloLink}>{t('nav.iniciarSesion')}</Text>
            </Pressable>
            <Pressable onPress={() => ir('/registro')} accessibilityRole="link">
              <Text style={estiloLink}>{t('nav.crearCuenta')}</Text>
            </Pressable>
            <Pressable onPress={() => ir('/cuenta')} accessibilityRole="link">
              <Text style={estiloLink}>{t('nav.miCuenta')}</Text>
            </Pressable>
          </View>
        </View>

        <View style={colStyle(3)}>
          <Text style={estiloTitulo}>{t('nav.contacto')}</Text>
          <Text style={styles.p}>Calle del Mercado 12, Madrid</Text>
          <Text style={styles.p}>hola@mira.ejemplo — 910 123 456</Text>
        </View>
      </View>

      <View style={styles.bottom}>
        <View style={[styles.bottomP, { paddingHorizontal: GUTTER }]}>
          <Text style={styles.bottomTxt}>
            {t('footer.copyright')} · {t('footer.hecho')}
          </Text>
        </View>
        <View style={[styles.bottomP, { paddingHorizontal: GUTTER }]}>
          <Pressable onPress={() => ir('/privacidad')} accessibilityRole="link">
            <Text
              style={({ pressed }) => ({
                fontSize: 13.12,
                fontFamily: FUENTES.texto,
                color: pressed ? '#fed65b' : '#a0a8a2',
                textDecorationLine: pressed ? 'underline' : 'none',
              })}
            >
              {t('footer.avisoPrivacidad')}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    width: '100%',
  },
  inner: {
    maxWidth: ANCHO_MAX,
    width: '100%',
    alignSelf: 'center',
    paddingTop: 40,
    paddingBottom: 25.6,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  logo: {
    fontFamily: FUENTES.display,
    fontWeight: '700',
    fontSize: 22.4,
    letterSpacing: 0.45,
    color: '#fff',
    marginBottom: 0,
  },
  p: {
    fontSize: 14.72,
    fontFamily: FUENTES.texto,
    color: '#e8e8e6',
    marginBottom: 0,
    lineHeight: 22,
  },
  lista: {
    gap: 7.2,
    alignItems: 'flex-start',
  },
  bottom: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  bottomP: {
    maxWidth: ANCHO_MAX,
    width: '100%',
    alignSelf: 'center',
    paddingVertical: 16,
  },
  bottomTxt: {
    fontSize: 13.12,
    fontFamily: FUENTES.texto,
    color: '#a0a8a2',
  },
});
