/**
 * Chrome global de la app — equivalente al layout de App.jsx web:
 * Header (absoluto, con inset de safe-area), aviso de email verificado,
 * contenido (scroll interno con Footer al final, como el flujo del documento
 * del web), BottomNav (móvil) y CookieBanner. Oculta el header al bajar
 * (solo móvil, igual que .site-header.oculto).
 */
import { useRef, useState, useCallback } from 'react';
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

export function AppShell({ children, scroll = true, ocultarFooter = false, ocultarBottomNav = false }) {
  const { colores } = useTheme();
  const auth = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();
  const { esMovil } = useBreakpoint();
  const [oculto, setOculto] = useState(false);
  const [headerH, setHeaderH] = useState(96);
  const ultimoY = useRef(0);

  const ruta = rutaDesdePath(pathname);
  const mostrarAviso =
    Boolean(auth.usuario) &&
    auth.usuario.emailVerified === false &&
    !RUTAS_AUTH.includes(ruta);

  const onScroll = useCallback(
    (e) => {
      if (!esMovil) return;
      const y = e.nativeEvent.contentOffset.y;
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

  return (
    <View style={[styles.raiz, { backgroundColor: colores.fondo }]}>
      <Header oculto={oculto} onAltoChange={onHeaderLayout} />
      {scroll ? (
        <ScrollView
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
