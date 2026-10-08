/**
 * Chip seleccionable (espejo de .chip-check web): pastilla que se rellena al activarse.
 */
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { FUENTES } from '../../theme/tokens';

export default function Chip({ value, onToggle, children, disabled }) {
  const { colores } = useTheme();
  const activo = Boolean(value);
  return (
    <Pressable
      onPress={onToggle}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: activo, disabled: Boolean(disabled) }}
      hitSlop={4}
      style={({ pressed }) => [
        styles.chip,
        {
          borderColor: activo ? colores.primaryContainer : colores.borde,
          backgroundColor: activo ? colores.primaryContainer : colores.papel,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
      ]}
    >
      <Text style={[styles.txt, { color: activo ? '#fff' : colores.tinta }]}>
        {activo ? '✓ ' : ''}
        {children}
      </Text>
    </Pressable>
  );
}

export function ChipGrid({ children }) {
  return <View style={styles.grid}>{children}</View>;
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  txt: {
    fontSize: 14.4,
    fontFamily: FUENTES.textoSemi,
  },
});
