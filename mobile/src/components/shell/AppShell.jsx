/**
 * Chrome global de la app — equivalente al layout de App.jsx web:
 * Header (absoluto, con inset de safe-area), aviso de email verificado,
 * contenido (scroll interno con Footer al final, como el flujo del documento
 * del web), BottomNav (móvil) y CookieBanner. Oculta el header al bajar
 * (solo móvil, igual que .site-header.oculto).
 */
import { createContext, useContext, useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { View, ScrollView, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useTheme } from '../../theme/ThemeContext';
import { useAuthContext } from '../../context/AuthContext';
import { useBreakpoint } from '../../theme/responsive';
import { FUENTES } from '../../theme/tokens';
import Header from '../Header';
import BottomNav from '../BottomNav';
import Footer from '../Footer';
import CookieBanner from '../CookieBanner';
import { rutaDesdePath, RUTAS_AUTH } from './rutas';

/** Acceso al scroll interno del shell (Hero → buscador, scroll infinito). */
const ShellContext = createContext({ scrollRef: { current: null }, headerH: 96 });

export function useShell() {
  return useContext(ShellContext);
}

export function AppShell({
  children,
  scroll = true,
  ocultarFooter = false,
  ocultarBottomNav = false,
  onCercaFinal,
}) {
  const { colores } = useTheme();
  const auth = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();
  const { esMovil } = useBreakpoint();
  const [oculto, setOculto] = useState(false);
  const [headerH, setHeaderH] = useState(96);
  const ultimoY = useRef(0);
  const scrollRef = useRef(null);
  const cercaRef = useRef(false);
  const ultimoDisparo = useRef(0);
  const cercaRefCb = useRef(onCercaFinal);
  useEffect(() => {
    cercaRefCb.current = onCercaFinal;
  }, [onCercaFinal]);

  const ruta = rutaDesdePath(pathname);
  const mostrarAviso =
    Boolean(auth.usuario) &&
    auth.usuario.emailVerified === false &&
    !RUTAS_AUTH.includes(ruta);

  const onScroll = useCallback(
    (e) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      // Scroll infinito: espejo del IntersectionObserver rootMargin 600px del web.
      if (cercaRefCb.current) {
        const dist = contentSize.height - layoutMeasurement.height - contentOffset.y;
        const cerca = dist < 600;
        const ahora = Date.now();
        if (cerca && !cercaRef.current && ahora - ultimoDisparo.current > 500) {
          ultimoDisparo.current = ahora;
          cercaRefCb.current();
        }
        cercaRef.current = cerca;
      }
      if (!esMovil) return;
      const y = contentOffset.y;
      const delta = y - ultimoY.current;
      if (y <= 60 || delta < 0) setOculto(false);
      else if (delta > 0) setOculto(true);
      ultimoY.current = y;
    },
    [esMovil],
  );

  const aviso = mostrarAviso ? (
    <View style={styles.aviso} accessibilityRole="alert">
      <Text style={styles.avisoTxt}>Tu correo no está verificado.</Text>
      <Pressable onPress={() => router.push('/cuenta')} accessibilityRole="link">
        <Text style={styles.avisoLink}>Verificar ahora</Text>
      </Pressable>
    </View>
  ) : null;

  const onHeaderLayout = useCallback((h) => setHeaderH(h), []);

  const shellValue = useMemo(() => ({ scrollRef, headerH }), [headerH]);

  return (
    <ShellContext.Provider value={shellValue}>
      <View style={[styles.raiz, { backgroundColor: colores.fondo }]}>
        <Header oculto={oculto} onAltoChange={onHeaderLayout} />
        {scroll ? (
          <ScrollView
            ref={scrollRef}
            style={styles.contenido}
            contentContainerStyle={[styles.scrollContenido, { paddingTop: headerH }]}
            onScroll={onScroll}
            scrollEventThrottle={32}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
          >
            {aviso}
            {children}
            {!ocultarFooter && <Footer />}
            <View style={{ height: 24 }} />
          </ScrollView>
        ) : (
          <View style={[styles.contenido, { paddingTop: headerH }]}>
            {aviso}
            <View style={styles.fijo}>{children}</View>
          </View>
        )}
        {!ocultarBottomNav && <BottomNav />}
        <CookieBanner usuario={auth.usuario} />
      </View>
    </ShellContext.Provider>
  );
}

const styles = StyleSheet.create({
  raiz: {
    flex: 1,
  },
  contenido: {
    flex: 1,
  },
  scrollContenido: {
    flexGrow: 1,
  },
  fijo: {
    flex: 1,
  },
  aviso: {
    backgroundColor: '#c25a1a',
    paddingVertical: 11.2,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 9.6,
  },
  avisoTxt: {
    color: '#fff',
    fontSize: 14.4,
    fontWeight: '600',
    fontFamily: FUENTES.textoSemi,
  },
  avisoLink: {
    color: '#fff',
    textDecorationLine: 'underline',
    fontSize: 14.4,
    fontWeight: '600',
    fontFamily: FUENTES.textoSemi,
  },
});

export default AppShell;
