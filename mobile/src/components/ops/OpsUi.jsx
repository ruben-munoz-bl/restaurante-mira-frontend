/**
 * Átomos del panel Ops (.ops-btn, .ops-card, .ops-modal, tablas…),
 * espejo de las clases del ops.css con componentes nativos.
 */
import { useState } from 'react';
import { View, Text, Pressable, TextInput, Modal, ScrollView } from 'react-native';
import { useOpsStyles, MONO } from './OpsTokens';
import { Simbolo } from '../shell/Simbolo';

/** Botón .ops-btn (primary | soft | danger, sm opcional). */
export function OpsBtn({ children, onPress, tipo = 'soft', sm, disabled, style, icono }) {
  const { s, op } = useOpsStyles();
  const fondo = tipo === 'primary' ? s.btnPrimary : tipo === 'danger' ? s.btnDanger : s.btnSoft;
  const color = tipo === 'primary' || tipo === 'danger' ? '#ffffff' : op.onSurface;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        s.btn,
        fondo,
        sm && s.btnSm,
        disabled && s.btnDisabled,
        { opacity: pressed ? 0.85 : 1 },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {icono ? <Simbolo name={icono} size={sm ? 13 : 15} color={color} /> : null}
        <Text style={[sm ? s.btnTxtSm : s.btnTxt, { color }]}>{children}</Text>
      </View>
    </Pressable>
  );
}

/** Píldora .ops-pill (ok | warn | info). */
export function OpsPill({ children, tipo }) {
  const { s } = useOpsStyles();
  return <Text style={[s.pill, tipo === 'warn' ? s.pillWarn : tipo === 'info' ? s.pillInfo : null]}>{children}</Text>;
}

/** Píldora de estado en tabla/feed .ops-status-pill (ok | warn | info | danger). */
export function OpsStatusPill({ children, tipo }) {
  const { s } = useOpsStyles();
  const extra =
    tipo === 'danger'
      ? s.statusPillDanger
      : tipo === 'info'
        ? s.statusPillInfo
        : tipo === 'warn'
          ? s.statusPillWarn
          : null;
  return <Text style={[s.statusPill, extra]}>{children}</Text>;
}

/** Card .ops-card con cabecera (título, sub, acciones). */
export function OpsCard({ titulo, sub, right, children, style, alerta, estado }) {
  const { s } = useOpsStyles();
  if (estado) {
    return (
      <View style={[s.card, style]}>
        <Text style={s.cardTitle}>{estado.titulo}</Text>
        {estado.sub ? <Text style={s.cardSub}>{estado.sub}</Text> : null}
      </View>
    );
  }
  return (
    <View style={[s.card, style]}>
      {titulo || right ? (
        <View style={s.cardHead}>
          <View style={s.cardHeadTitulo}>
            {titulo ? <Text style={s.cardTitle}>{titulo}</Text> : null}
            {sub ? <Text style={s.cardSub}>{sub}</Text> : null}
          </View>
          {right}
        </View>
      ) : null}
      {alerta ? <OpsError>{alerta}</OpsError> : null}
      {children}
    </View>
  );
}

export function OpsError({ children }) {
  const { s } = useOpsStyles();
  if (!children) return null;
  return <Text style={[s.errorBox, { marginBottom: 10 }]}>{children}</Text>;
}

export function OpsSuccess({ children }) {
  const { s } = useOpsStyles();
  if (!children) return null;
  return <Text style={[s.successBox, { marginBottom: 10 }]}>{children}</Text>;
}

export function OpsEmpty({ children, cargando }) {
  const { s } = useOpsStyles();
  return <Text style={s.empty}>{cargando ? 'Cargando…' : children}</Text>;
}

/** Input .ops-input. */
export function OpsInput({ value, onChangeText, placeholder, onSubmit, style, multiline, numberOfLines, keyboardType, maxLength }) {
  const { s } = useOpsStyles();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      onSubmitEditing={onSubmit}
      multiline={multiline}
      numberOfLines={numberOfLines}
      keyboardType={keyboardType}
      maxLength={maxLength}
      returnKeyType="search"
      style={[s.input, multiline && s.textarea, style]}
    />
  );
}

/** Control segmentado .ops-seg (filtros de estado, granularidad…). */
export function OpsSeg({ valor, onChange, opciones }) {
  const { s } = useOpsStyles();
  return (
    <View style={s.seg} accessibilityRole="tablist">
      {opciones.map((o) => {
        const v = typeof o === 'string' ? o : o.valor;
        const et = typeof o === 'string' ? o : o.etiqueta;
        const activo = valor === v;
        return (
          <Pressable key={v} onPress={() => onChange(v)} accessibilityRole="tab" accessibilityState={{ selected: activo }}>
            <Text style={[s.segBtn, activo ? s.segBtnActivo : null]}>{et}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Modal ops (.ops-modal-overlay + .ops-modal). */
export function OpsModal({ visible, onClose, children }) {
  const { s } = useOpsStyles();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.modalOverlay} onPress={onClose}>
        {/* Captura los toques internos para que NO cierren el modal al tocar contenido inerte,
            mientras TextInput/Pressable hijos siguen respondiendo primero. */}
        <View style={s.modal} onStartShouldSetResponder={() => true}>
          {children}
        </View>
      </Pressable>
    </Modal>
  );
}

/** Campo con etiqueta .ops-field. */
export function OpsField({ label, children }) {
  const { s } = useOpsStyles();
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

/** Cabecera de sección de modal (título + sub). */
export function OpsModalTitulo({ children, sub }) {
  const { s } = useOpsStyles();
  return (
    <View>
      <Text style={s.modalTitulo}>{children}</Text>
      {sub ? <Text style={s.muted}>{sub}</Text> : null}
    </View>
  );
}

/**
 * Tabla horizontal (.ops-table-wrap): cabecera fija + filas con anchos.
 * cols: [{ w, titulo, derecha }]
 */
export function OpsTabla({ cols, children, minWidth }) {
  const { s } = useOpsStyles();
  const total = minWidth || cols.reduce((a, c) => a + c.w, 0);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tableWrap} contentContainerStyle={{ minWidth: total }}>
      <View style={{ width: total }}>
        <View style={{ flexDirection: 'row' }}>
          {cols.map((c) => (
            <View key={c.titulo} style={[s.th, { width: c.w }]}>
              <Text style={[s.thTxt, { textAlign: c.derecha ? 'right' : c.centro ? 'center' : 'left' }]} numberOfLines={1}>
                {c.titulo}
              </Text>
            </View>
          ))}
        </View>
        {children}
      </View>
    </ScrollView>
  );
}

/** Celda de tabla. */
export function OpsTd({ w, children, derecha, centro, style }) {
  const { s } = useOpsStyles();
  return (
    <View
      style={[
        s.td,
        { width: w, alignItems: derecha ? 'flex-end' : centro ? 'center' : 'flex-start' },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Fila de tabla. */
export function OpsTr({ children, style }) {
  return <View style={[{ flexDirection: 'row' }, style]}>{children}</View>;
}

/** Barra .ops-bar con relleno por porcentaje. */
export function OpsBar({ pct, clase }) {
  const { s } = useOpsStyles();
  const ancho = Math.max(0, Math.min(100, pct || 0));
  return (
    <View style={s.bar}>
      <View style={[s.barFill, clase === 'blue' ? s.barFillBlue : clase === 'red' ? s.barFillRed : null, { width: `${ancho}%` }]} />
    </View>
  );
}

/** Code inline .ops-code. */
export function OpsCode({ children }) {
  const { s } = useOpsStyles();
  return <Text style={[s.code, { fontFamily: MONO }]}>{children}</Text>;
}

/** Avatar .ops-avatar. */
export function OpsAvatar({ txt, size = 34 }) {
  const { s } = useOpsStyles();
  return (
    <View style={[s.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: size * 0.41 }}>{txt}</Text>
    </View>
  );
}

/** Hook auxiliar para estados de “actuando” en listas. */
export function useActuando() {
  const [id, setId] = useState('');
  return { actuando: id, setActuando: setId };
}
