/**
 * Cabecera glassmorphic RN — espejo de .site-header del web:
 * logo pill, tema ◐, idioma, menú (hamburger ≤767 / inline ≥768),
 * puntos pill con gradiente, racha, favoritos/mensajes, pills de panel,
 * cuenta y logout. Se oculta al bajar (solo móvil, como el web).
 */
import { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, Image, Animated, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT, useI18n } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';
import { useTheme } from '../theme/ThemeContext';
import { useAuthContext } from '../context/AuthContext';
import { useStreak } from '../context/StreakContext';
import { useBreakpoint } from '../theme/responsive';
import { FUENTES, RADIO, sombraCard } from '../theme/tokens';
import { IMG } from '../theme/imagenes';
import { IconoRejilla, IconoPersona, IconoSalir } from './shell/Iconos';
import { btnCta } from '../theme/ui';

const TRADS = { es, ca, en };

const NAV_ITEMS = [
  { key: 'descubrir', ruta: '/' },
  { key: 'mapa', ruta: '/mapa' },
  { key: 'reservas', ruta: '/reservas' },
  { key: 'contacto', ruta: '/contacto' },
];

export default function Header({ oculto = false, onAltoChange }) {
  const t = useT(TRADS);
  const { lang, cycleLang, available } = useI18n();
  const { colores, esOscuro, alternarTema } = useTheme();
  const auth = useAuthContext();
  const streak = useStreak();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { esMovil } = useBreakpoint();
  const [abierto, setAbierto] = useState(false);
  const [loadingStreak, setLoadingStreak] = useState(false);
  const [alto, setAlto] = useState(insets.top + 56);
  const [anim] = useState(() => new Animated.Value(0));

  const ocultoEfectivo = esMovil && oculto && !abierto;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: ocultoEfectivo ? -alto : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [ocultoEfectivo, alto, anim]);

  const notificarAlto = useCallback((h) => {
    setAlto(h);
    onAltoChange?.(h);
  }, [onAltoChange]);

  function ir(ruta) {
    setAbierto(false);
    if (pathname !== ruta) router.push(ruta);
  }

  async function salir() {
    setAbierto(false);
    try {
      await auth.cerrarSesion();
    } catch {
      /* noop */
    }
    router.replace('/');
  }

  async function handleStreakTap() {
    if (loadingStreak || !auth.usuario) return;
    setLoadingStreak(true);
    try {
      const data = await streak.fetchStreakData();
      streak.openStreakPopup(data || { racha: { dias: 0 }, puntos: 0, yaReclamado: false });
    } catch {
      streak.openStreakPopup({ racha: { dias: 0 }, puntos: 0, yaReclamado: false });
    } finally {
      setLoadingStreak(false);
    }
  }

  function conmutarMensajes() {
    if (pathname === '/mensajes') ir('/');
    else ir('/mensajes');
  }

  const { usuario, esAdmin, perfil, favoritos, noLeidos } = auth;
  const numFavoritos = favoritos?.length || 0;
  const puntosSaldo = streak.puntosSaldo;

  const navLista = (
    <View style={styles.navList}>
      {NAV_ITEMS.map((item) => (
        <Pressable
          key={item.key}
          onPress={() => ir(item.ruta)}
          accessibilityRole="link"
          hitSlop={6}
          style={styles.navItem}
        >
          <Text
            style={[
              styles.navItemTxt,
              { color: colores.gris },
              pathname === item.ruta && { color: colores.primaryContainer },
            ]}
          >
            {t(`nav.${item.key}`)}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  const cuentas = (
    <View style={styles.cuentas}>
      {usuario ? (
        <>
          <Pressable onPress={() => ir('/puntos')} accessibilityRole="link" accessibilityLabel={t('points.title')}>
            <LinearGradient
              colors={[colores.primaryContainer, colores.dorado]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.pointsPill}
            >
              <Image source={IMG.moneda} style={styles.pointsCoin} resizeMode="contain" />
              <Text style={styles.pointsTxt}>{puntosSaldo || 0}</Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={handleStreakTap}
            accessibilityLabel="Abrir racha diaria"
            accessibilityHint="Racha diaria"
            style={({ pressed }) => [
              styles.streakBtn,
              pressed && { transform: [{ scale: 0.95 }] },
              loadingStreak && { opacity: 0.5 },
            ]}
          >
            <LinearGradient colors={['#FEF3C7', '#FDE68A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.streakGrad}>
              <Image source={IMG.rachaFuego} style={styles.streakImg} resizeMode="contain" />
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={() => ir('/favoritos')}
            accessibilityLabel={`${t('nav.favoritos')} (${numFavoritos})`}
            style={({ pressed }) => [styles.btnFav, pressed && { borderColor: colores.rojo }]}
          >
            <Text style={[styles.btnFavTxt, { color: colores.tinta }]}>
              {`♥${numFavoritos > 0 ? ` ${numFavoritos}` : ''}`}
            </Text>
          </Pressable>

          <Pressable
            onPress={conmutarMensajes}
            accessibilityLabel={`${t('mensajes.titulo')}${noLeidos > 0 ? `, ${noLeidos} ${t('mensajes.sinLeer')}` : ''}`}
            style={({ pressed }) => [styles.btnFav, pressed && { borderColor: colores.rojo }]}
          >
            <Text style={[styles.btnFavTxt, { color: colores.tinta }]}>
              {`✉${noLeidos > 0 ? ` ${noLeidos}` : ''}`}
            </Text>
          </Pressable>

          {esAdmin && (
            <Pressable
              onPress={() => ir('/admin')}
              accessibilityLabel="Panel de Administracion"
              style={({ pressed }) => [styles.pillPanel, styles.pillAdmin, pressed && styles.pillHover]}
            >
              <IconoRejilla size={16} color="#fff" />
              <Text style={styles.pillPanelTxt}>Panel Admin</Text>
            </Pressable>
          )}

          {perfil?.tipo === 'empresa' && (
            <Pressable
              onPress={() => ir('/dashboard')}
              accessibilityLabel="Mi Panel de Restaurante"
              style={({ pressed }) => [
                styles.pillPanel,
                { backgroundColor: colores.primaryContainer },
                pressed && styles.pillHover,
              ]}
            >
              <IconoRejilla size={16} color={colores.primary} />
              <Text style={[styles.pillPanelTxt, { color: colores.primary }]}>Mi Panel</Text>
            </Pressable>
          )}

          <Pressable
            onPress={() => ir('/cuenta')}
            accessibilityLabel={usuario.email}
            style={({ pressed }) => [styles.cuentaLink, pressed && { borderColor: colores.primaryContainer }]}
          >
            <IconoPersona size={18} color={colores.tinta} />
            <Text style={[styles.cuentaTxt, { color: colores.tinta }]}>{t('nav.miCuenta')}</Text>
            <Text numberOfLines={1} style={[styles.cuentaNombre, { color: colores.gris }]}>
              {usuario.nombre || usuario.email}
            </Text>
          </Pressable>

          <Pressable
            onPress={salir}
            accessibilityLabel={t('nav.cerrarSesion')}
            style={({ pressed }) => [styles.logout, pressed && { backgroundColor: colores.fondoSuave }]}
          >
            <IconoSalir size={16} color={colores.tinta} />
            <Text style={[styles.logoutTxt, { color: colores.tinta }]}>{t('nav.cerrarSesion')}</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Pressable
            onPress={() => ir('/favoritos')}
            accessibilityLabel={`${t('nav.favoritos')} (${numFavoritos})`}
            style={({ pressed }) => [styles.btnFav, pressed && { borderColor: colores.rojo }]}
          >
            <Text style={[styles.btnFavTxt, { color: colores.tinta }]}>
              {`♥${numFavoritos > 0 ? ` ${numFavoritos}` : ''}`}
            </Text>
          </Pressable>

          <Pressable onPress={() => ir('/login')} style={({ pressed }) => pressed && { opacity: 0.75 }} accessibilityRole="link">
            <View style={styles.loginRow}>
              <IconoPersona size={16} color={colores.tinta} />
              <Text style={[styles.loginTxt, { color: colores.tinta }]}>{t('nav.iniciarSesion')}</Text>
            </View>
          </Pressable>

          <Pressable onPress={() => ir('/registro')} accessibilityRole="button">
            <Text style={[btnCta(colores, { peq: true }), styles.registroTxt]}>{t('nav.crearCuenta')}</Text>
          </Pressable>
        </>
      )}
    </View>
  );

  return (
    <Animated.View
      onLayout={(e) => notificarAlto(e.nativeEvent.layout.height)}
      style={[styles.raiz, { transform: [{ translateY: anim }] }]}
      accessibilityRole="header"
    >
      <View style={[styles.fila, { paddingTop: insets.top + (esMovil ? 9.6 : 10.4), paddingHorizontal: esMovil ? 16 : 24, backgroundColor: colores.glassBg, borderBottomColor: colores.glassBorder }]}>
        <BlurView intensity={30} tint={esOscuro ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        <View style={styles.filaContenido}>
          <Pressable
            onPress={() => ir('/')}
            accessibilityRole="link"
            accessibilityLabel="MIRA - inicio"
            style={({ pressed }) => [
              styles.logoPill,
              { borderColor: colores.glassBorder },
              sombraCard(colores),
              pressed && { opacity: 0.85 },
            ]}
          >
            <Image source={IMG.logo} style={styles.logoImg} resizeMode="contain" accessibilityLabel="MIRA" />
          </Pressable>

          <Pressable
            onPress={alternarTema}
            accessibilityRole="button"
            accessibilityLabel={esOscuro ? t('nav.modoClaro') : t('nav.modoOscuro')}
            accessibilityState={{ selected: esOscuro }}
            style={({ pressed }) => [styles.temaBoton, { borderColor: colores.glassBorder }, pressed && { borderColor: colores.dorado }]}
          >
            <Text style={[styles.temaTxt, { color: colores.tinta }]}>◐</Text>
          </Pressable>

          <Pressable
            onPress={cycleLang}
            accessibilityLabel={available[lang]}
            style={({ pressed }) => [styles.langBoton, { borderColor: colores.borde }, pressed && { borderColor: colores.verde }]}
          >
            <Text style={[styles.langTxt, { color: colores.tinta }]}>{lang.toUpperCase()}</Text>
          </Pressable>

          {!esMovil && (
            <>
              {navLista}
              <View style={{ flex: 1 }} />
              {cuentas}
            </>
          )}

          {esMovil && (
            <>
              <View style={{ flex: 1 }} />
              <Pressable
                onPress={() => setAbierto((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel={abierto ? t('nav.cerrarMenu') : t('nav.abrirMenu')}
                accessibilityState={{ expanded: abierto }}
                style={({ pressed }) => [styles.menuBoton, { borderColor: colores.glassBorder }, pressed && { opacity: 0.7 }]}
              >
                <Text style={[styles.menuTxt, { color: colores.tinta }]}>{abierto ? '✕' : '☰'}</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>

      {esMovil && abierto && (
        <View style={[styles.panel, { backgroundColor: colores.glassBg, borderTopColor: colores.glassBorder }]}>
          <BlurView intensity={30} tint={esOscuro ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          <View style={styles.panelContenido}>
            <View accessibilityLabel={t('nav.navegacion')}>{navLista}</View>
            <View style={styles.panelCuentas}>{cuentas}</View>
          </View>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  raiz: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  fila: {
    borderBottomWidth: 1,
    overflow: 'hidden',
    paddingBottom: 10.4,
  },
  filaContenido: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 24,
  },
  logoPill: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 14.4,
  },
  logoImg: {
    height: 28.8,
  },
  temaBoton: {
    width: 33.6,
    height: 33.6,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  temaTxt: {
    fontSize: 16.8,
    lineHeight: 19,
    fontWeight: '400',
  },
  langBoton: {
    width: 33.6,
    height: 33.6,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  langTxt: {
    fontSize: 10.4,
    fontWeight: '700',
    letterSpacing: 0.2,
    fontFamily: FUENTES.textoBold,
  },
  menuBoton: {
    borderWidth: 1,
    borderRadius: RADIO.peq,
    paddingVertical: 5.6,
    paddingHorizontal: 9.6,
    backgroundColor: 'transparent',
  },
  menuTxt: {
    fontSize: 19.2,
    lineHeight: 21,
    fontWeight: '600',
  },
  navList: {
    flexDirection: 'row',
    gap: 24,
    alignItems: 'center',
  },
  navItem: {
    paddingVertical: 2,
  },
  navItemTxt: {
    fontSize: 14.72,
    fontWeight: '600',
    fontFamily: FUENTES.textoSemi,
  },
  cuentas: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-end',
  },
  pointsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4.8,
    paddingVertical: 5.6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  pointsCoin: {
    width: 16,
    height: 16,
  },
  pointsTxt: {
    fontSize: 13.6,
    fontWeight: '700',
    fontFamily: FUENTES.textoBold,
    color: '#002218',
  },
  streakBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#F59E0B',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakGrad: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakImg: {
    width: 18,
    height: 18,
  },
  btnFav: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 3.2,
    paddingHorizontal: 8,
    backgroundColor: 'transparent',
  },
  btnFavTxt: {
    fontSize: 12.48,
    fontWeight: '600',
    fontFamily: FUENTES.textoSemi,
  },
  pillPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5.6,
    paddingVertical: 5.6,
    paddingHorizontal: 11.2,
    borderRadius: 8,
  },
  pillAdmin: {
    backgroundColor: '#b44d3e',
  },
  pillHover: {
    transform: [{ translateY: -1 }],
  },
  pillPanelTxt: {
    fontSize: 13.12,
    fontWeight: '700',
    fontFamily: FUENTES.textoBold,
    color: '#fff',
  },
  cuentaLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4.8,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 9.6,
    backgroundColor: 'transparent',
    maxWidth: 260,
  },
  cuentaTxt: {
    fontSize: 12.48,
    fontWeight: '600',
    fontFamily: FUENTES.textoSemi,
  },
  cuentaNombre: {
    maxWidth: 128,
    fontSize: 13.6,
    fontWeight: '500',
    fontFamily: FUENTES.textoMedio,
  },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: RADIO.peq,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  logoutTxt: {
    fontSize: 12.48,
    fontWeight: '600',
    fontFamily: FUENTES.textoSemi,
  },
  loginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5.6,
  },
  loginTxt: {
    fontSize: 14.72,
    fontWeight: '600',
    fontFamily: FUENTES.textoSemi,
  },
  registroTxt: {
    overflow: 'hidden',
    textAlign: 'center',
    writingDirection: 'ltr',
  },
  panel: {
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
    overflow: 'hidden',
  },
  panelContenido: {
    gap: 14.4,
    paddingHorizontal: 16,
    paddingTop: 14.4,
    paddingBottom: 6.4,
  },
  panelCuentas: {
    marginLeft: 0,
    justifyContent: 'flex-start',
  },
});
