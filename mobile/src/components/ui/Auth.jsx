/**
 * Piezas compartidas de las páginas de autenticación web
 * (.auth-pagina, .auth-tarjeta, .auth-sub, .auth-error, .auth-boton, .auth-alt).
 */
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { FUENTES, RADIO, ANCHO_MAX, sombraFlotante } from '../../theme/tokens';
import { btnCta, btnSecundario } from '../../theme/ui';

export function AuthPagina({ children, style }) {
  return <View style={[styles.pagina, style]}>{children}</View>;
}

export function AuthTarjeta({ titulo, children, style }) {
  const { colores } = useTheme();
  return (
    <View
      style={[
        styles.tarjeta,
        { backgroundColor: colores.papel, borderColor: colores.glassBorder },
        sombraFlotante(colores),
        style,
      ]}
    >
      {titulo ? (
        <Text style={[styles.titulo, { color: colores.tinta }]}>{titulo}</Text>
      ) : null}
      {children}
    </View>
  );
}

export function AuthSub({ children, verde }) {
  const { colores } = useTheme();
  return (
    <Text
      style={[
        styles.sub,
        { color: verde ? colores.verde : colores.gris },
        verde && { fontWeight: '600' },
      ]}
      accessibilityRole={verde ? 'status' : undefined}
    >
      {children}
    </Text>
  );
}

export function AuthError({ children, style }) {
  return (
    <Text style={[styles.error, style]} accessibilityRole="alert">
      {children}
    </Text>
  );
}

export function AuthBoton({ children, onPress, disabled, secundario, peq }) {
  const { colores } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.boton,
        { opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
      ]}
    >
      <Text style={secundario ? btnSecundario(colores, { peq }) : btnCta(colores, { grande: !peq, peq })}>
        {children}
      </Text>
    </Pressable>
  );
}

export function AuthEnlace({ onPress, children, style }) {
  const { colores } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="link" style={style}>
      <Text style={[styles.enlace, { color: colores.primaryContainer }]}>{children}</Text>
    </Pressable>
  );
}

export function AuthAlt({ children }) {
  const { colores } = useTheme();
  return <Text style={[styles.alt, { color: colores.tinta }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  pagina: {
    width: '100%',
    maxWidth: ANCHO_MAX,
    alignSelf: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    paddingBottom: 64,
    alignItems: 'center',
  },
  tarjeta: {
    width: '100%',
    maxWidth: 430,
    borderWidth: 1,
    borderRadius: RADIO.xl,
    paddingVertical: 32,
    paddingHorizontal: 28.8,
    gap: 14.4,
  },
  titulo: {
    fontFamily: FUENTES.display,
    fontWeight: '700',
    fontSize: 28.8,
    margin: 0,
  },
  sub: {
    fontSize: 15,
    fontFamily: FUENTES.texto,
    lineHeight: 21,
  },
  error: {
    margin: 0,
    backgroundColor: '#fdecea',
    borderWidth: 1,
    borderColor: '#8f1d14',
    color: '#8f1d14',
    borderRadius: RADIO.peq,
    paddingVertical: 9.6,
    paddingHorizontal: 12.8,
    fontSize: 14.4,
    fontFamily: FUENTES.texto,
  },
  boton: {
    width: '100%',
    marginTop: 4.8,
  },
  enlace: {
    fontWeight: '600',
    fontFamily: FUENTES.textoSemi,
    fontSize: 14.72,
    textDecorationLine: 'underline',
  },
  alt: {
    margin: 0,
    fontSize: 14.72,
    textAlign: 'center',
    fontFamily: FUENTES.texto,
    lineHeight: 21,
  },
});
