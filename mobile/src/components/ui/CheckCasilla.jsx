/**
 * Checkbox de formulario web (.campo-check): cuadro 1.1rem + etiqueta en fila.
 */
import { Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { FUENTES } from '../../theme/tokens';

export default function CheckCasilla({ value, onToggle, children, style, disabled }) {
  const { colores } = useTheme();
  const activo = Boolean(value);
  return (
    <Pressable
      onPress={onToggle}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: activo, disabled: Boolean(disabled) }}
      style={({ pressed }) => [styles.fila, { opacity: pressed ? 0.75 : 1 }, style]}
    >
      <Text
        style={[
          styles.caja,
          {
            borderColor: activo ? colores.primaryContainer : colores.borde,
            backgroundColor: activo ? colores.primaryContainer : colores.fondo,
          },
        ]}
      >
        {activo ? '✓' : ''}
      </Text>
      <Text style={[styles.txt, { color: colores.tinta }]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9.6,
    paddingVertical: 3.2,
  },
  caja: {
    width: 17.6,
    height: 17.6,
    borderRadius: 4,
    borderWidth: 1.5,
    fontSize: 12,
    lineHeight: 15,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '700',
    overflow: 'hidden',
  },
  txt: {
    flex: 1,
    fontSize: 14.72,
    fontFamily: FUENTES.texto,
    lineHeight: 20,
  },
});
