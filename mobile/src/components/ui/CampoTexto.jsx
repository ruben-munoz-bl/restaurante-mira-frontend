/**
 * Campo de formulario web (.campo): etiqueta + input de texto.
 * `rightSlot` añade un elemento a la derecha (p.ej. el ojo de contraseña).
 */
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { FUENTES, RADIO } from '../../theme/tokens';

export default function CampoTexto({ label, style, rightSlot, ...rest }) {
  const { colores } = useTheme();
  return (
    <View style={[styles.campo, style]}>
      {label ? <Text style={[styles.label, { color: colores.gris }]}>{label}</Text> : null}
      <View style={styles.wrap}>
        <TextInput
          placeholderTextColor={colores.gris}
          style={[
            styles.input,
            { backgroundColor: colores.fondo, borderColor: colores.borde, color: colores.tinta },
            rightSlot ? { paddingRight: 44 } : null,
          ]}
          {...rest}
        />
        {rightSlot ? <View style={styles.right}>{rightSlot}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  campo: {
    gap: 4.8,
  },
  label: {
    fontSize: 12.48,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.75,
    fontFamily: FUENTES.textoBold,
  },
  wrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: RADIO.peq,
    paddingHorizontal: 12,
    paddingVertical: 9.6,
    fontFamily: FUENTES.texto,
    fontSize: 15,
    width: '100%',
  },
  right: {
    position: 'absolute',
    right: 6,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
});
