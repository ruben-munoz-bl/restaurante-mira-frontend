/**
 * Átomos visuales del Operator Hub (botones, badges, campos, modal),
 * espejo de las clases .op-* del dashboard.css.
 */
import { useEffect, useState } from 'react';
import { View, Text, Pressable, TextInput, Modal, Animated, ScrollView } from 'react-native';
import { useOpStyles } from './OpTokens';
import { Simbolo } from '../shell/Simbolo';
import { FUENTES } from '../../theme/tokens';

/** Punto con animación opPulse (opacity 1 → 0.4). */
export function PuntoPulso({ color, size = 6, periodo = 1600, style }) {
  const [pulso] = useState(() => new Animated.Value(1));
  useEffect(() => {
    const seq = Animated.loop(
      Animated.sequence([
        Animated.timing(pulso, { toValue: 0.4, duration: periodo / 2, useNativeDriver: true }),
        Animated.timing(pulso, { toValue: 1, duration: periodo / 2, useNativeDriver: true }),
      ]),
    );
    seq.start();
    return () => seq.stop();
  }, [pulso, periodo]);
  return (
    <Animated.View
      style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: pulso }, style]}
    />
  );
}

export function OpBtnPrimary({ children, onPress, disabled, small, light, style, txtStyle }) {
  const { s } = useOpStyles();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        s.btnPrimary,
        small && s.btnPrimarySmall,
        light && s.btnGhostLight,
        disabled && s.btnPrimaryDisabled,
        { opacity: pressed ? 0.85 : 1 },
        style,
      ]}
    >
      <Text style={[s.btnPrimaryTxt, small && s.btnPrimarySmallTxt, txtStyle]}>{children}</Text>
    </Pressable>
  );
}

export function OpBtnGhost({ children, onPress, disabled, small, light, style, txtStyle }) {
  const { s } = useOpStyles();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        s.btnGhost,
        small && s.btnGhostSmall,
        light && s.btnGhostLight,
        { opacity: pressed ? 0.8 : 1 },
        style,
      ]}
    >
      <Text style={[s.btnGhostTxt, small && s.btnGhostSmallTxt, txtStyle]}>{children}</Text>
    </Pressable>
  );
}

/** Botón de solo texto (web: <button style={{background:'none', border:'none'}}>). */
export function OpLink({ children, onPress, style, txtStyle, size = 10.9, color }) {
  const { op } = useOpStyles();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }, style]}
    >
      <Text
        style={[
          { color: color || op.primary, fontWeight: '700', fontSize: size, fontFamily: FUENTES.textoBold },
          txtStyle,
        ]}
      >
        {children}
      </Text>
    </Pressable>
  );
}

export function OpStatus({ cls, children, style }) {
  const { s, op } = useOpStyles();
  const variante =
    cls === 'pagado'
      ? s.statusPagado
      : cls === 'en_mesa'
        ? s.statusEnMesa
        : cls === 'confirmada'
          ? s.statusConfirmada
          : cls === 'no_show'
            ? s.statusNoShow
            : cls === 'cancelada'
              ? s.statusCancelada
              : s.statusPendiente;
  const txtVariante =
    cls === 'pagado'
      ? s.statusPagadoTxt
      : cls === 'en_mesa'
        ? s.statusEnMesaTxt
        : cls === 'confirmada'
          ? s.statusConfirmadaTxt
          : cls === 'no_show'
            ? s.statusNoShowTxt
            : cls === 'cancelada'
              ? s.statusCanceladaTxt
              : s.statusPendienteTxt;
  const puntoColor =
    cls === 'pagado'
      ? op.statusPagadoDot
      : cls === 'en_mesa'
        ? op.statusEnMesaDot
        : cls === 'confirmada'
          ? op.statusConfirmadaDot
          : cls === 'no_show'
            ? op.statusNoShowDot
            : cls === 'cancelada'
              ? op.statusCanceladaDot
              : op.statusPendienteDot;
  return (
    <View style={[s.status, variante, style]}>
      <View style={[s.statusDot, { backgroundColor: puntoColor }]} />
      <Text style={[s.statusTxtBase, txtVariante]}>{children}</Text>
    </View>
  );
}

export function OpField({ label, children, style }) {
  const { s } = useOpStyles();
  return (
    <View style={[{ flexBasis: 220, flexGrow: 1 }, style]}>
      <Text style={s.opFieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

export function OpInput({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  style,
  editable = true,
  maxLength,
}) {
  const { s, op } = useOpStyles();
  return (
    <TextInput
      value={value == null ? '' : String(value)}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={op.outline}
      keyboardType={keyboardType}
      multiline={multiline}
      editable={editable}
      maxLength={maxLength}
      style={[s.opInput, multiline && s.opTextarea, !editable && s.opInputRo, style]}
    />
  );
}

/**
 * Select estilo .op-select (o variante 'chip' transparente para el topbar):
 * trigger + Modal con la lista de opciones.
 */
export function OpSelect({ value, opciones, onChange, placeholder, variant, style }) {
  const { s, op } = useOpStyles();
  const [abierto, setAbierto] = useState(false);
  const actual = opciones.find((o) => (typeof o === 'string' ? o : o.valor) === value);
  const etiqueta = actual ? (typeof actual === 'string' ? actual : actual.etiqueta) : placeholder || '—';
  const enChip = variant === 'chip';
  return (
    <>
      <Pressable
        onPress={() => setAbierto(true)}
        accessibilityRole="button"
        style={({ pressed }) => [enChip ? s.selectChip : s.opSelect, { opacity: pressed ? 0.8 : 1 }, style]}
      >
        <Text style={enChip ? s.selectChipTxt : s.opSelectTxt} numberOfLines={1}>
          {etiqueta}
        </Text>
        <Simbolo name={enChip ? 'unfold_more' : 'expand_more'} size={enChip ? 14 : 18} color={enChip ? op.onSurface : op.onVariant} />
      </Pressable>
      <Modal visible={abierto} transparent animationType="fade" onRequestClose={() => setAbierto(false)}>
        <Pressable style={s.opOpcionesOverlay} onPress={() => setAbierto(false)}>
          <View style={s.opOpciones}>
            {opciones.map((o) => {
              const val = typeof o === 'string' ? o : o.valor;
              const txt = typeof o === 'string' ? o : o.etiqueta;
              const sel = val === value;
              return (
                <Pressable
                  key={val}
                  onPress={() => {
                    onChange(val);
                    setAbierto(false);
                  }}
                  style={({ pressed }) => [s.opOpcionItem, sel && s.opOpcionActiva, { opacity: pressed ? 0.75 : 1 }]}
                >
                  <Text style={[s.opOpcionTxt, sel && s.opOpcionTxtActiva]}>{txt}</Text>
                  {sel ? <Simbolo name="check" size={16} color={op.primary} /> : null}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

/** Modal opaco del Operator Hub (.op-modal-overlay + .op-modal). */
export function OpModal({ visible, onClose, maxWidth = 576, children, scroll }) {
  const { s } = useOpStyles();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={s.opModalOverlay}
        onPress={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <View style={[s.opModal, { maxWidth }]}>
          {scroll ? (
            <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ gap: 12 }}>
              {children}
            </ScrollView>
          ) : (
            <View style={{ gap: 12 }}>{children}</View>
          )}
        </View>
      </Pressable>
    </Modal>
  );
}

export function OpEmpty({ children, style }) {
  const { s } = useOpStyles();
  return <Text style={[s.empty, style]}>{children}</Text>;
}
