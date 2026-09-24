/**
 * Pantalla placeholder — se reemplaza fase a fase por la vista real del web.
 * Mantiene tema, tipografía y estructura mientras se migra.
 */
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { FUENTES, RADIO } from '../../theme/tokens';

export function Placeholder({ titulo, descripcion }) {
  const { colores } = useTheme();
  return (
    <SafeAreaView style={[styles.caja, { backgroundColor: colores.fondo }]} edges={['top']}>
      <View style={[styles.tarjeta, { backgroundColor: colores.papel, borderColor: colores.borde }]}>
        <Text style={[styles.titulo, { color: colores.tinta }]}>{titulo}</Text>
        <Text style={[styles.sub, { color: colores.gris }]}>
          {descripcion || 'Pendiente de migración (fase siguiente).'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  caja: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  tarjeta: {
    borderRadius: RADIO.md,
    borderWidth: 1,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    maxWidth: 420,
    width: '100%',
  },
  titulo: {
    fontFamily: FUENTES.display,
    fontSize: 28,
    textAlign: 'center',
    marginBottom: 8,
  },
  sub: {
    fontFamily: FUENTES.texto,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
});
