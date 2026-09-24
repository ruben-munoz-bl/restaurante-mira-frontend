/**
 * Campo select nativo — equivalente a <select> del web (.campo).
 * Abre un Modal con la lista de opciones; el trigger replica el aspecto
 * de .campo input/select (fondo, borde, radio peq).
 */
import { useState } from 'react';
import { View, Text, Pressable, Modal, FlatList, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { FUENTES, RADIO } from '../../theme/tokens';

export function CampoEtiqueta({ children }) {
  const { colores } = useTheme();
  return (
    <Text
      style={{
        fontSize: 12.48,
        fontWeight: '700',
        color: colores.gris,
        textTransform: 'uppercase',
        letterSpacing: 0.75,
        fontFamily: FUENTES.textoBold,
        marginBottom: 4.8,
      }}
    >
      {children}
    </Text>
  );
}

export default function SelectCampo({ label, value, opciones, onChange, placeholder, style }) {
  const { colores } = useTheme();
  const [abierto, setAbierto] = useState(false);
  const opcionesNorm = opciones.map((o) => (typeof o === 'object' ? o : { valor: o, etiqueta: String(o) }));
  const sel = opcionesNorm.find((o) => String(o.valor) === String(value));
  const texto = sel ? sel.etiqueta : placeholder || '';
  const datos = placeholder
    ? [{ valor: '', etiqueta: placeholder }, ...opcionesNorm.filter((o) => o.valor !== '')]
    : opcionesNorm;

  return (
    <View style={style}>
      {label ? <CampoEtiqueta>{label}</CampoEtiqueta> : null}
      <Pressable
        onPress={() => setAbierto(true)}
        accessibilityRole="button"
        accessibilityState={{ expanded: abierto }}
        style={({ pressed }) => [
          styles.trigger,
          {
            backgroundColor: colores.fondo,
            borderColor: pressed ? colores.primaryContainer : colores.borde,
          },
        ]}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.texto,
            { color: sel ? colores.tinta : colores.gris, fontWeight: sel ? '400' : '400' },
          ]}
        >
          {texto}
        </Text>
        <Text style={[styles.chevron, { color: colores.gris }]}>▾</Text>
      </Pressable>

      <Modal visible={abierto} transparent animationType="fade" onRequestClose={() => setAbierto(false)}>
        <Pressable style={styles.backdrop} onPress={() => setAbierto(false)}>
          <View style={[styles.lista, { backgroundColor: colores.papel, borderColor: colores.borde }]}>
            <FlatList
              data={datos}
              keyExtractor={(o) => String(o.valor)}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const activo = String(item.valor) === String(value);
                return (
                  <Pressable
                    onPress={() => {
                      onChange(item.valor);
                      setAbierto(false);
                    }}
                    style={({ pressed }) => [
                      styles.opcion,
                      {
                        backgroundColor: activo
                          ? colores.fondoSuave
                          : pressed
                            ? colores.fondoSuave
                            : 'transparent',
                      },
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      style={{
                        fontFamily: FUENTES.texto,
                        fontSize: 15,
                        color: activo ? colores.primaryContainer : colores.tinta,
                        fontWeight: activo ? '700' : '400',
                        flex: 1,
                      }}
                    >
                      {item.etiqueta}
                    </Text>
                    {activo ? <Text style={{ color: colores.primaryContainer, fontSize: 15 }}>✓</Text> : null}
                  </Pressable>
                );
              }}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    borderWidth: 1,
    borderRadius: RADIO.peq,
    paddingHorizontal: 12,
    paddingVertical: 9.6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    minHeight: 40,
  },
  texto: {
    fontFamily: FUENTES.texto,
    fontSize: 15,
    flex: 1,
  },
  chevron: {
    fontSize: 12,
    fontWeight: '700',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 34, 24, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  lista: {
    borderRadius: RADIO.md,
    borderWidth: 1,
    maxHeight: '70%',
    overflow: 'hidden',
    paddingVertical: 4,
  },
  opcion: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
