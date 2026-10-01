/**
 * Bottom navigation glass dock (≤767px) — espejo de .bottom-nav del web:
 * explorar, puntos, reservas, favoritos (+admin/panel) y botón de racha.
 */
import { useState } from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';
import { useTheme } from '../theme/ThemeContext';
import { useAuthContext } from '../context/AuthContext';
import { useStreak } from '../context/StreakContext';
import { useBreakpoint } from '../theme/responsive';
import { FUENTES } from '../theme/tokens';
import { IMG } from '../theme/imagenes';
import { IconoBusqueda, IconoCalendario, IconoCorazon, IconoRejilla, IconoPersona } from './shell/Iconos';
import { rutaDesdePath } from './shell/rutas';

const TRADS = { es, ca, en };

export default function BottomNav({ numReservas = 0 }) {
  const t = useT(TRADS);
  const { colores, esOscuro } = useTheme();
  const auth = useAuthContext();
  const streak = useStreak();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { esMovil } = useBreakpoint();
  const [loadingStreak, setLoadingStreak] = useState(false);

  if (!esMovil) return null;

  const ruta = rutaDesdePath(pathname);
  const { usuario, esAdmin, perfil, favoritos } = auth;
  const numFavoritos = favoritos?.length || 0;
  const puntosSaldo = streak.puntosSaldo;

  async function handleStreakTap() {
    if (loadingStreak || !usuario) return;
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

  const tabs = [
    {
      id: 'home',
      label: t('bottomNav.explorar'),
      ruta: '/',
      icon: (c) => <IconoBusqueda size={22} color={c} />,
    },
    {
      id: 'puntos',
      label: t('bottomNav.puntos') || 'Puntos',
      ruta: '/puntos',
      badge: puntosSaldo > 0 ? puntosSaldo : null,
      icon: () => <Image source={IMG.moneda} style={styles.coin} resizeMode="contain" />,
    },
    {
      id: 'reservas',
      label: t('bottomNav.reservas'),
      ruta: '/reservas',
      badge: numReservas,
      icon: (c) => <IconoCalendario size={22} color={c} />,
    },
    {
      id: 'favoritos',
      label: t('bottomNav.favoritos'),
      ruta: '/favoritos',
      badge: numFavoritos,
      icon: (c) => <IconoCorazon size={22} color={c} />,
    },
    ...(esAdmin
      ? [{ id: 'admin', label: 'Admin', ruta: '/admin', icon: (c) => <IconoRejilla size={22} color={c} /> }]
      : []),
    ...(perfil?.tipo === 'empresa'
      ? [{ id: 'dashboard', label: 'Panel', ruta: '/dashboard', icon: (c) => <IconoRejilla size={22} color={c} /> }]
      : []),
    {
      id: 'cuenta',
      label: t('bottomNav.perfil'),
      ruta: '/cuenta',
      icon: (c) => <IconoPersona size={22} color={c} />,
    },
  ];

  function irar(r) {
    if (pathname !== r) router.push(r);
  }

  return (
    <View style={[styles.nav, { borderTopColor: colores.glassBorder, backgroundColor: colores.glassBg, paddingBottom: insets.bottom }]}>
      <BlurView intensity={30} tint={esOscuro ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <View style={styles.inner}>
        {tabs.map((tab) => {
          const activa = ruta === tab.id;
          const color = activa ? colores.primaryContainer : colores.gris;
          return (
            <Pressable
              key={tab.id}
              onPress={() => irar(tab.ruta)}
              accessibilityRole="link"
              accessibilityState={{ selected: activa }}
              accessibilityLabel={tab.label}
              style={({ pressed }) => [styles.item, pressed && { opacity: 0.7 }]}
            >
              {tab.icon(color)}
              <Text style={[styles.itemTxt, { color }]} numberOfLines={1}>
                {tab.label}
              </Text>
              {tab.badge > 0 && (
                <View style={[styles.badge, { backgroundColor: colores.tertiaryContainer }]}>
                  <Text style={styles.badgeTxt}>{tab.badge}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
        {usuario && (
          <Pressable
            onPress={handleStreakTap}
            accessibilityRole="button"
            accessibilityLabel="Abrir racha diaria"
            style={({ pressed }) => [
              styles.streak,
              pressed && { transform: [{ scale: 0.95 }] },
              loadingStreak && { opacity: 0.6 },
            ]}
          >
            <LinearGradient colors={['#FEF3C7', '#FDE68A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.streakGrad}>
              <Image source={IMG.rachaFuego} style={styles.streakImg} resizeMode="contain" />
            </LinearGradient>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    borderTopWidth: 1,
    paddingVertical: 6.4,
    overflow: 'hidden',
    zIndex: 150,
  },
  inner: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  item: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2.4,
    paddingVertical: 4.8,
    paddingHorizontal: 9.6,
    position: 'relative',
    minWidth: 56,
  },
  itemTxt: {
    fontSize: 10.88,
    fontWeight: '600',
    fontFamily: FUENTES.textoSemi,
    textAlign: 'center',
  },
  coin: {
    width: 24,
    height: 24,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 1.6,
    minWidth: 16,
    height: 16,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3.2,
  },
  badgeTxt: {
    color: '#fff',
    fontSize: 9.6,
    fontWeight: '800',
    fontFamily: FUENTES.textoExtra,
  },
  streak: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: '#F59E0B',
    overflow: 'hidden',
    marginHorizontal: 2.4,
    alignSelf: 'center',
  },
  streakGrad: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakImg: {
    width: 26,
    height: 26,
  },
});
