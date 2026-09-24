/**
 * Tokens "Operator Hub" del dashboard (dashboard.css del web, con los
 * overrides de modo oscuro) + utilidades compartidas del panel.
 * useOpStyles() devuelve el StyleSheet completo ya resuelto sobre el tema.
 */
import { useMemo } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { FUENTES } from '../../theme/tokens';

/** ui-monospace del web. */
export const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

/** Asigna Plus Jakarta Sans a todo style sin fontFamily (según fontWeight). */
const FUENTE_POR_PESO = {
  '800': FUENTES.textoExtra,
  '700': FUENTES.textoBold,
  '600': FUENTES.textoSemi,
  '500': FUENTES.textoMedio,
  bold: FUENTES.textoBold,
};

function conFuentes(styles) {
  const out = {};
  for (const k of Object.keys(styles)) {
    const st = styles[k];
    if (st && typeof st === 'object' && st.fontFamily === undefined) {
      out[k] = { ...st, fontFamily: FUENTE_POR_PESO[st.fontWeight] || FUENTES.texto };
    } else {
      out[k] = st;
    }
  }
  return out;
}

const CLARO = {
  surface: '#f9f9ff',
  surfaceDim: '#cfdaf2',
  surfaceLowest: '#ffffff',
  surfaceLow: '#f0f3ff',
  surfaceContainer: '#e7eeff',
  surfaceHigh: '#dee8ff',
  surfaceHighest: '#d8e3fb',
  onSurface: '#111c2d',
  onVariant: '#3f4942',
  outline: '#6f7a72',
  outlineVariant: '#bec9c0',
  primary: '#005134',
  primaryContainer: '#0e6b47',
  onPrimary: '#ffffff',
  inversePrimary: '#85d7ab',
  secondary: '#006d37',
  secondaryContainer: '#6bfe9c',
  onSecondaryContainer: '#00743a',
  tertiary: '#004393',
  tertiaryContainer: '#005ac0',
  error: '#ba1a1a',
  canvas: '#F8FAFC',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  cardBg: '#ffffff',
  // Derivados de las reglas concretas del css (fondos por componente).
  thBg: 'rgba(240,243,255,0.6)',
  tdBorder: 'rgba(240,243,255,0.8)',
  tintLow: 'rgba(240,243,255,0.65)',
  tintLow35: 'rgba(240,243,255,0.35)',
  tintLow55: 'rgba(240,243,255,0.55)',
  kpiFootBg: 'rgba(240,243,255,0.6)',
  dropBg: 'rgba(240,243,255,0.65)',
  mesaBg: '#e7eeff',
  mesaColor: '#111c2d',
  chipActiveBg: '#005134',
  chipActiveColor: '#ffffff',
  chipActiveBorder: '#005134',
  premiumBg: '#a1f4c6',
  premiumColor: '#002112',
  panelDateBg: '#a1f4c6',
  panelDateColor: '#002112',
  overlay: 'rgba(15,23,42,0.78)',
  modalBg: '#ffffff',
  modalBorder: '#E2E8F0',
  modalColor: '#111c2d',
  statusPagadoBg: '#6bfe9c',
  statusPagadoColor: '#00743a',
  statusPagadoDot: '#006d37',
  statusEnMesaBg: '#6bfe9c',
  statusEnMesaColor: '#00743a',
  statusEnMesaDot: '#006d37',
  statusConfirmadaBg: '#a1f4c6',
  statusConfirmadaColor: '#002112',
  statusConfirmadaDot: '#005234',
  statusPendienteBg: '#FEF6E9',
  statusPendienteColor: '#975A16',
  statusPendienteDot: '#F5A623',
  statusCanceladaBg: '#FDEDEC',
  statusCanceladaColor: '#9C2519',
  statusCanceladaDot: '#E74C3C',
  statusNoShowBg: '#d8e2ff',
  statusNoShowColor: '#001a41',
  statusNoShowDot: '#004393',
  successPanelBg: '#d1fae5',
  successPanelColor: '#065f46',
  warnPanelBg: '#fef3c7',
  warnPanelBorder: '#fde68a',
  warnPanelColor: '#92400e',
  errorBg: '#ffdad6',
  errorColor: '#93000a',
};

const OSCURO = {
  ...CLARO,
  surface: '#1c201c',
  surfaceDim: '#242824',
  surfaceLowest: '#1c201c',
  surfaceLow: '#232824',
  surfaceContainer: '#2c332c',
  surfaceHigh: '#2e3530',
  surfaceHighest: '#343b35',
  onSurface: '#e2e8e4',
  onVariant: '#a0a8a2',
  outline: '#8a938e',
  outlineVariant: '#3a403c',
  primary: '#a8d5ba',
  primaryContainer: '#0d7353',
  onPrimary: '#111411',
  inversePrimary: '#16382C',
  secondary: '#a8d5ba',
  secondaryContainer: '#2a3d2e',
  onSecondaryContainer: '#c5e8d4',
  tertiary: '#8ab4ff',
  tertiaryContainer: '#1a2540',
  error: '#ffb3c1',
  canvas: '#111411',
  border: '#3a403c',
  borderStrong: '#4a504c',
  cardBg: '#1c201c',
  thBg: '#232824',
  tdBorder: '#2a2f2a',
  tintLow: '#232824',
  tintLow35: '#232824',
  tintLow55: 'rgba(240,243,255,0.55)',
  kpiFootBg: '#232824',
  dropBg: '#232824',
  mesaBg: '#2c332c',
  mesaColor: '#e2e8e4',
  chipActiveBg: '#0d7353',
  chipActiveColor: '#ffffff',
  chipActiveBorder: '#0d7353',
  premiumBg: '#1c3230',
  premiumColor: '#a8d5ba',
  panelDateBg: '#1c3230',
  panelDateColor: '#a8d5ba',
  overlay: 'rgba(0,0,0,0.82)',
  modalBg: '#1c201c',
  modalBorder: '#3a403c',
  modalColor: '#e2e8e4',
  statusPagadoBg: '#2a3d2e',
  statusPagadoColor: '#c5e8d4',
  statusPagadoDot: '#006d37',
  statusEnMesaBg: '#2a3d2e',
  statusEnMesaColor: '#c5e8d4',
  statusEnMesaDot: '#006d37',
  statusConfirmadaBg: '#1c3230',
  statusConfirmadaColor: '#a8d5ba',
  statusConfirmadaDot: '#005234',
  statusPendienteBg: '#332a1a',
  statusPendienteColor: '#fed65b',
  statusPendienteDot: '#F5A623',
  statusCanceladaBg: '#3a1f1f',
  statusCanceladaColor: '#ffb3c1',
  statusCanceladaDot: '#E74C3C',
  statusNoShowBg: '#d8e2ff',
  statusNoShowColor: '#001a41',
  statusNoShowDot: '#004393',
};

export function useOp() {
  const { tema } = useTheme();
  return tema === 'oscuro' ? OSCURO : CLARO;
}

export function euro(v) {
  return `${Number(v || 0).toFixed(2)}\u20AC`;
}

export function pct(v) {
  return `${(Number(v) || 0).toFixed(1)}%`;
}

export function initials(nombre) {
  if (!nombre) return 'MR';
  const parts = String(nombre).trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || '').join('') || 'MR';
}

export const isPendienteLocal = (s) =>
  ['pendiente', 'confirmada', 'activa', 'en_mesa', 'en mesa'].includes(String(s || '').toLowerCase());

export const isCanceladaLocal = (s) => String(s || '').toLowerCase() === 'cancelada';

export const estadoToBadge = (estado) => {
  const s = String(estado || '').toLowerCase();
  if (['completada', 'pagado', 'pagada'].includes(s)) return { cls: 'pagado', label: 'Pagado' };
  if (s === 'en_mesa' || s === 'en mesa') return { cls: 'en_mesa', label: 'En mesa' };
  if (s === 'confirmada') return { cls: 'confirmada', label: 'Confirmada' };
  if (['no_show', 'no-show', 'no show'].includes(s)) return { cls: 'no_show', label: 'No-show protegido' };
  if (s === 'cancelada') return { cls: 'cancelada', label: 'Cancelada' };
  return { cls: 'pendiente', label: 'Pendiente' };
};

/** [estilo base, estilo variante] para un badge de estado. */
export function estadoStyle(s, cls) {
  switch (cls) {
    case 'pagado':
      return [s.status, s.statusPagado];
    case 'en_mesa':
      return [s.status, s.statusEnMesa];
    case 'confirmada':
      return [s.status, s.statusConfirmada];
    case 'no_show':
      return [s.status, s.statusNoShow];
    case 'cancelada':
      return [s.status, s.statusCancelada];
    default:
      return [s.status, s.statusPendiente];
  }
}

/** Estilo del <Text> dentro del badge (color de la variante). */
export function estadoTxtStyle(s, cls) {
  switch (cls) {
    case 'pagado':
      return [s.statusTxtBase, s.statusPagadoTxt];
    case 'en_mesa':
      return [s.statusTxtBase, s.statusEnMesaTxt];
    case 'confirmada':
      return [s.statusTxtBase, s.statusConfirmadaTxt];
    case 'no_show':
      return [s.statusTxtBase, s.statusNoShowTxt];
    case 'cancelada':
      return [s.statusTxtBase, s.statusCanceladaTxt];
    default:
      return [s.statusTxtBase, s.statusPendienteTxt];
  }
}

export function estadoDotStyle(s, op, cls) {
  switch (cls) {
    case 'pagado':
      return [s.statusDot, { backgroundColor: op.statusPagadoDot }];
    case 'en_mesa':
      return [s.statusDot, { backgroundColor: op.statusEnMesaDot }];
    case 'confirmada':
      return [s.statusDot, { backgroundColor: op.statusConfirmadaDot }];
    case 'no_show':
      return [s.statusDot, { backgroundColor: op.statusNoShowDot }];
    case 'cancelada':
      return [s.statusDot, { backgroundColor: op.statusCanceladaDot }];
    default:
      return [s.statusDot, { backgroundColor: op.statusPendienteDot }];
  }
}

export function useOpStyles() {
  const op = useOp();
  const s = useMemo(
    () =>
      conFuentes(
        Object.assign(
        StyleSheet.create({
          // — Página / hub —
          contenedor: {
            backgroundColor: op.canvas,
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 32,
            width: '100%',
            maxWidth: 1280,
            alignSelf: 'center',
          },
          hub: {
            backgroundColor: op.canvas,
            borderRadius: 16,
            padding: 12,
            gap: 12,
          },

          // — Topbar —
          topbar: {
            backgroundColor: op.surfaceLowest,
            padding: 16,
            borderRadius: 16,
            borderColor: op.border,
            borderWidth: 1,
            flexDirection: 'column',
            gap: 14,
            shadowColor: '#0e6b47',
            shadowOpacity: 0.04,
            shadowRadius: 3,
            shadowOffset: { width: 0, height: 1 },
            elevation: 1,
          },
          topbarLeft: { flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 },
          liveBadge: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5.6,
            paddingVertical: 2.4,
            paddingHorizontal: 9.6,
            borderRadius: 9999,
            backgroundColor: op.secondaryContainer,
          },
          liveBadgeTxt: {
            fontSize: 10,
            fontWeight: '700',
            letterSpacing: 0.4,
            textTransform: 'uppercase',
            color: op.onSecondaryContainer,
          },
          liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: op.secondary },
          topbarMeta: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 8,
            marginTop: 5.6,
          },
          restSelectorWrap: { position: 'relative' },
          restSelector: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: op.surfaceLow,
            paddingVertical: 7.2,
            paddingHorizontal: 10.4,
            borderRadius: 8,
          },
          restAvatar: {
            width: 32,
            height: 32,
            borderRadius: 6.4,
            backgroundColor: op.primaryContainer,
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '800',
            fontSize: 12.8,
            color: op.onPrimary,
          },
          restName: {
            fontWeight: '700',
            fontSize: 15.2,
            lineHeight: 17,
            color: op.onSurface,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          },
          restSub: { fontSize: 10.9, color: op.onVariant, fontFamily: MONO },
          restDropdown: {
            position: 'absolute',
            top: '100%',
            marginTop: 6,
            left: 0,
            zIndex: 40,
            minWidth: 260,
            maxWidth: 340,
            backgroundColor: '#ffffff',
            borderColor: '#e4e7e4',
            borderWidth: 1,
            borderRadius: 10.4,
            shadowColor: '#0f172a',
            shadowOpacity: 0.18,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 6 },
            elevation: 6,
            padding: 6.4,
            gap: 2.4,
          },
          restDropdownTitle: {
            fontSize: 10.4,
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: 0.4,
            color: '#6b7280',
            paddingHorizontal: 8,
            paddingTop: 5.6,
            paddingBottom: 4,
          },
          restDropdownItem: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8.8,
            width: '100%',
            paddingVertical: 8.8,
            paddingHorizontal: 8,
            borderRadius: 7.2,
          },
          restDropdownItemActive: { backgroundColor: '#e8f5ee' },
          restDropdownInfo: { flexDirection: 'column', gap: 1.6, minWidth: 0, flex: 1 },
          restDropdownNombre: { fontWeight: '700', fontSize: 13.1, color: '#111827' },
          restDropdownMeta: { fontSize: 10.4, color: '#6b7280', fontFamily: MONO },
          restDropdownEmpty: { fontSize: 12.5, color: '#6b7280', padding: 8 },
          dateChip: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6.4,
            backgroundColor: op.surfaceLow,
            paddingVertical: 7.2,
            paddingHorizontal: 10.4,
            borderRadius: 8,
            fontSize: 12.5,
            fontWeight: '600',
          },
          dateChipTxt: { fontSize: 12.5, fontWeight: '600', color: op.onSurface },
          premiumBadge: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingVertical: 4,
            paddingHorizontal: 9.6,
            borderRadius: 9999,
            backgroundColor: op.premiumBg,
          },
          premiumBadgeTxt: { fontSize: 10, fontWeight: '700', color: op.premiumColor },
          topbarActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6.4, alignItems: 'center' },

          // — Botones —
          btnPrimary: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6.4,
            backgroundColor: op.primary,
            paddingVertical: 8.8,
            paddingHorizontal: 14.4,
            borderRadius: 8,
            fontSize: 13.1,
            fontWeight: '600',
          },
          btnPrimaryTxt: { color: op.onPrimary, fontSize: 13.1, fontWeight: '600' },
          btnPrimarySmall: { paddingVertical: 5.6, paddingHorizontal: 9.6, borderRadius: 8 },
          btnPrimarySmallTxt: { fontSize: 11.5, fontWeight: '600', color: op.onPrimary },
          btnPrimaryDisabled: { opacity: 0.6 },
          btnGhost: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5.6,
            backgroundColor: op.surfaceLow,
            paddingVertical: 8.8,
            paddingHorizontal: 12,
            borderRadius: 8,
          },
          btnGhostTxt: { color: op.onSurface, fontSize: 13.1, fontWeight: '600' },
          btnGhostSmall: { paddingVertical: 5.6, paddingHorizontal: 9.6, borderRadius: 8 },
          btnGhostSmallTxt: { fontSize: 11.5, fontWeight: '600', color: op.onSurface },
          btnGhostLight: { backgroundColor: op.surfaceLowest },
          btnSinFondo: { padding: 0, backgroundColor: 'transparent' },

          // — KPIs —
          kpiGrid: { flexDirection: 'column', gap: 12 },
          kpiCard: {
            backgroundColor: op.surfaceLowest,
            borderColor: op.border,
            borderWidth: 1,
            borderRadius: 12,
            padding: 14.4,
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: 132,
            shadowColor: '#0e6b47',
            shadowOpacity: 0.04,
            shadowRadius: 3,
            shadowOffset: { width: 0, height: 1 },
            elevation: 1,
          },
          kpiHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
          kpiLabel: {
            fontSize: 9.9,
            fontWeight: '700',
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            color: op.onVariant,
            lineHeight: 12,
          },
          kpiSub: { fontSize: 10.9, color: op.outline, marginTop: 2.4 },
          kpiIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
          kpiIcon1: { backgroundColor: op.surfaceLow, color: op.primary },
          kpiIcon2: { backgroundColor: 'rgba(107,254,156,0.35)', color: op.secondary },
          kpiIcon3: { backgroundColor: op.surfaceContainer, color: op.tertiary },
          kpiIcon4: { backgroundColor: '#d8e2ff', color: op.tertiary },
          kpiValue: { fontSize: 23.2, fontWeight: '800', color: op.onSurface, letterSpacing: -0.4 },
          kpiValueUd: { fontSize: 12, fontWeight: '400', color: op.outline },
          kpiTrend: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 3.2,
            paddingVertical: 2.4,
            paddingHorizontal: 7.2,
            borderRadius: 9999,
            fontSize: 10.9,
            fontWeight: '700',
          },
          kpiTrendUp: { backgroundColor: op.secondaryContainer, color: op.onSecondaryContainer },
          kpiTrendNeutral: { backgroundColor: op.surfaceContainer, color: op.onSurface },
          kpiTrendPax: { backgroundColor: '#a1f4c6', color: '#002112' },
          kpiFoot: {
            marginTop: 9.6,
            backgroundColor: op.kpiFootBg,
            borderRadius: 8,
            paddingVertical: 6.4,
            paddingHorizontal: 8,
            flexDirection: 'row',
            justifyContent: 'space-between',
            fontSize: 11.5,
          },
          kpiFootLabel: { color: op.onVariant, fontSize: 11.5 },
          kpiFootVal: { fontFamily: MONO, fontWeight: '700', color: op.onSurface, fontSize: 11.5 },

          // — Reconciliación —
          reco: {
            backgroundColor: op.surfaceLowest,
            borderColor: op.border,
            borderWidth: 1,
            borderRadius: 16,
            padding: 16,
            flexDirection: 'column',
            gap: 12,
            shadowColor: '#0e6b47',
            shadowOpacity: 0.04,
            shadowRadius: 3,
            shadowOffset: { width: 0, height: 1 },
            elevation: 1,
          },
          recoHead: { flexDirection: 'column', gap: 8 },
          recoTitle: {
            fontWeight: '700',
            fontSize: 15.2,
            color: op.onSurface,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6.4,
            flexWrap: 'wrap',
          },
          recoBadge: {
            paddingVertical: 2.4,
            paddingHorizontal: 7.2,
            borderRadius: 9999,
            backgroundColor: op.secondaryContainer,
            fontSize: 9.9,
            fontWeight: '700',
            color: op.onSecondaryContainer,
          },
          recoGrid: { flexDirection: 'column', gap: 12 },
          drop: {
            backgroundColor: op.dropBg,
            borderRadius: 12,
            padding: 20,
            alignItems: 'center',
          },
          dropIcon: {
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: op.surfaceLowest,
            shadowColor: '#000',
            shadowOpacity: 0.06,
            shadowRadius: 3,
            shadowOffset: { width: 0, height: 1 },
            elevation: 1,
            alignItems: 'center',
            justifyContent: 'center',
            color: op.primary,
            marginTop: 9.6,
          },
          dropH4: { fontWeight: '700', fontSize: 13.6, marginTop: 9.6, textAlign: 'center' },
          dropP: { fontSize: 11.5, color: op.onVariant, marginTop: 3.2, textAlign: 'center' },
          dropFila: { flexDirection: 'row', gap: 8, marginTop: 9.6, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' },
          monoChico: { fontFamily: MONO, color: op.onSurface, fontSize: 10.9 },
          ledger: {
            backgroundColor: op.tintLow35,
            borderRadius: 12,
            padding: 12,
            flexDirection: 'column',
            gap: 6.4,
          },
          ledgerHead: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 9.9,
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: 0.6,
            color: op.onVariant,
          },
          ledgerItem: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 8.8,
            backgroundColor: op.surfaceLowest,
            borderRadius: 8,
            fontSize: 11.5,
            shadowColor: '#000',
            shadowOpacity: 0.03,
            shadowRadius: 2,
            shadowOffset: { width: 0, height: 1 },
            elevation: 1,
          },

          // — Paneles (dual) —
          dual: { flexDirection: 'column', gap: 12 },
          panel: {
            backgroundColor: op.surfaceLowest,
            borderColor: op.border,
            borderWidth: 1,
            borderRadius: 16,
            padding: 16,
            flexDirection: 'column',
            shadowColor: '#0e6b47',
            shadowOpacity: 0.04,
            shadowRadius: 3,
            shadowOffset: { width: 0, height: 1 },
            elevation: 1,
          },
          panelEditing: { borderColor: op.primaryContainer },
          panelHead: { flexDirection: 'column', gap: 6.4, paddingBottom: 9.6 },
          panelTitle: {
            fontWeight: '700',
            fontSize: 15.2,
            color: op.onSurface,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6.4,
            flexWrap: 'wrap',
          },
          panelDate: {
            paddingVertical: 2.4,
            paddingHorizontal: 6.4,
            borderRadius: 4.8,
            backgroundColor: op.panelDateBg,
            fontFamily: MONO,
            fontSize: 10.9,
            fontWeight: '800',
            color: op.panelDateColor,
          },
          panelSub: { fontSize: 10.9, color: op.onVariant },

          // — Ocupación —
          occupancy: {
            backgroundColor: op.surfaceLow,
            borderRadius: 8,
            padding: 9.6,
            flexDirection: 'column',
            gap: 6.4,
            marginBottom: 9.6,
          },
          occupancyHead: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            fontSize: 9.9,
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: 0.4,
            flexWrap: 'wrap',
          },
          occupancyHeadTxt: { fontSize: 9.9, fontWeight: '700', color: op.onSurface },
          occupancyHeadMono: { fontFamily: MONO, color: op.primary, fontSize: 9.9, fontWeight: '700' },
          bar: {
            height: 8.8,
            backgroundColor: op.surfaceHighest,
            borderRadius: 9999,
            overflow: 'hidden',
            flexDirection: 'row',
          },
          barAlmuerzo: { backgroundColor: op.primary, height: '100%' },
          barCena: { backgroundColor: '#4ae183', height: '100%' },
          barLibre: { backgroundColor: op.outlineVariant, height: '100%' },
          legend: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', fontSize: 10.6, color: op.onVariant },
          legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
          legendTxt: { fontSize: 10.6, color: op.onVariant },
          legendDot: { width: 8, height: 8, borderRadius: 4 },

          // — Navegación de fechas —
          dateNav: {
            flexDirection: 'row',
            gap: 5.6,
            alignItems: 'center',
            flexWrap: 'wrap',
            backgroundColor: op.surfaceLow,
            padding: 5.6,
            borderRadius: 9.6,
            borderColor: op.border,
            borderWidth: 1,
            marginTop: 8,
          },
          dateNavBtn: {
            width: 32,
            height: 32,
            borderRadius: 6.4,
            backgroundColor: op.surfaceLowest,
            alignItems: 'center',
            justifyContent: 'center',
            borderColor: 'transparent',
            borderWidth: 1,
          },
          dateInput: {
            height: 32,
            paddingHorizontal: 8,
            borderColor: op.outlineVariant,
            borderWidth: 1,
            borderRadius: 6.4,
            backgroundColor: op.surfaceLowest,
            color: op.onSurface,
            fontSize: 12.5,
            fontFamily: MONO,
            minWidth: 118,
          },
          dateChips: { flexDirection: 'row', gap: 4.8, flexGrow: 1, flexBasis: 220 },
          dateChipBtn: {
            paddingHorizontal: 9.6,
            paddingVertical: 4.8,
            borderRadius: 999,
            borderColor: op.border,
            borderWidth: 1,
            backgroundColor: op.surfaceLowest,
          },
          dateChipBtnTxt: { fontSize: 10.9, fontWeight: '600', color: op.onSurface },
          dateChipBtnActive: { backgroundColor: op.chipActiveBg, borderColor: op.chipActiveBorder },
          dateChipBtnActiveTxt: { color: op.chipActiveColor, fontSize: 10.9, fontWeight: '700' },

          // — Tablas —
          tableWrap: { overflow: 'hidden', borderRadius: 6.4 },
          tableHead: { flexDirection: 'row', backgroundColor: op.thBg },
          th: {
            paddingVertical: 9.6,
            paddingHorizontal: 8,
            fontSize: 9.9,
            fontWeight: '700',
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            color: op.onVariant,
          },
          thVista: { paddingVertical: 9.6, paddingHorizontal: 8, justifyContent: 'center' },
          thTxt: {
            fontSize: 9.9,
            fontWeight: '700',
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            color: op.onVariant,
          },
          tr: { flexDirection: 'row', backgroundColor: op.surfaceLowest },
          td: {
            paddingVertical: 9.6,
            paddingHorizontal: 8,
            borderBottomWidth: 1,
            borderBottomColor: op.tdBorder,
            justifyContent: 'center',
          },
          thFirst: { borderTopLeftRadius: 6.4, borderBottomLeftRadius: 0 },
          mono: { fontFamily: MONO, fontWeight: '700' },
          monoClaro: { fontFamily: MONO, fontSize: 9.9, color: op.outline },
          mesa: {
            paddingHorizontal: 5.6,
            paddingVertical: 1.6,
            borderRadius: 4.8,
            backgroundColor: op.mesaBg,
            fontFamily: MONO,
            fontSize: 10.6,
            fontWeight: '700',
            color: op.mesaColor,
            overflow: 'hidden',
          },
          empty: { textAlign: 'center', padding: 24, color: op.onVariant, fontSize: 13.1 },
          dirRowActive: { backgroundColor: 'rgba(14,107,71,0.06)' },

          // — Directorio —
          directory: {
            backgroundColor: op.surfaceLowest,
            borderColor: op.border,
            borderWidth: 1,
            borderRadius: 16,
            padding: 16,
            shadowColor: '#0e6b47',
            shadowOpacity: 0.04,
            shadowRadius: 3,
            shadowOffset: { width: 0, height: 1 },
            elevation: 1,
          },
          dirHead: { flexDirection: 'column', gap: 9.6, marginBottom: 12 },
          dirTitulo: { fontWeight: '800', fontSize: 15.2, color: op.onSurface },
          dirFilters: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 4,
            backgroundColor: op.surfaceLow,
            padding: 3.2,
            borderRadius: 8,
          },
          dirFilter: { paddingVertical: 4.8, paddingHorizontal: 9.6, borderRadius: 6.4 },
          dirFilterTxt: { fontSize: 11.2, fontWeight: '600', color: op.onVariant },
          dirFilterActivo: {
            backgroundColor: op.surfaceLowest,
            shadowColor: '#000',
            shadowOpacity: 0.06,
            shadowRadius: 2,
            shadowOffset: { width: 0, height: 1 },
            elevation: 1,
          },
          dirFilterTxtActivo: { fontSize: 11.2, fontWeight: '700', color: op.primary },

          // — Previsión —
          forecastList: { flexDirection: 'column', gap: 6.4 },
          forecastItem: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 8.8,
            backgroundColor: op.tintLow55,
            borderRadius: 8,
          },
          forecastItemActivo: { borderColor: op.primaryContainer, borderWidth: 2 },
          forecastIzq: { flexDirection: 'row', alignItems: 'center', gap: 9.6, flex: 1 },
          cal: {
            width: 38.4,
            height: 38.4,
            borderRadius: 8,
            backgroundColor: op.surfaceLowest,
            alignItems: 'center',
            justifyContent: 'center',
          },
          calDay: { fontSize: 9.6, fontWeight: '700', color: op.outline, textTransform: 'uppercase' },
          calNum: { fontSize: 13.1, fontWeight: '800', color: op.onSurface },
          forecastMeta: { flex: 1, marginLeft: 9.6, minWidth: 0 },
          forecastTitle: {
            fontWeight: '700',
            fontSize: 12.5,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4.8,
            flexWrap: 'wrap',
          },
          forecastSub: { fontSize: 10.9, color: op.onVariant },
          tag: { paddingVertical: 1.6, paddingHorizontal: 4.8, borderRadius: 4, fontSize: 9.3, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4, overflow: 'hidden' },
          tagSoldout: { backgroundColor: '#ffdad6', color: '#93000a' },
          tagAlta: { backgroundColor: op.secondaryContainer, color: op.onSecondaryContainer },
          tagCerrado: { backgroundColor: '#d8e2ff', color: '#001a41' },
          filtroBanner: {
            backgroundColor: op.secondaryContainer,
            paddingVertical: 5.6,
            paddingHorizontal: 8,
            borderRadius: 6.4,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          },
          filtroBannerTxt: { fontSize: 10.9, color: op.onSecondaryContainer },
          forecastEmpty: { fontSize: 11.5, color: op.onVariant, padding: 12 },
          aforoFoot: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingTop: 8,
            borderTopWidth: 1,
            borderTopColor: op.surfaceLow,
            fontSize: 10.9,
            color: op.onVariant,
          },

          // — Cajas de aviso / info —
          cajaWarn: {
            backgroundColor: op.warnPanelBg,
            borderColor: op.warnPanelBorder,
            borderWidth: 1,
            color: op.warnPanelColor,
            padding: 16,
            borderRadius: 12,
          },
          cajaWarnTxt: { color: op.warnPanelColor, fontSize: 13.1 },
          cajaWarnTitulo: { color: op.warnPanelColor, fontWeight: '800', fontSize: 13.1, flexDirection: 'row', alignItems: 'center', gap: 6.4 },
          cajaExito: { backgroundColor: op.successPanelBg, color: op.successPanelColor, padding: 16, borderRadius: 12, alignItems: 'center' },
          cajaExitoTxt: { color: op.successPanelColor, fontWeight: '800', fontSize: 13.1, textAlign: 'center' },
          infoBox: {
            backgroundColor: op.surfaceLow,
            borderRadius: 9.6,
            padding: 11.2,
            flexDirection: 'row',
            gap: 8,
            alignItems: 'flex-start',
            borderColor: op.outlineVariant,
            borderWidth: 1,
          },
          infoBoxTxt: { fontSize: 11.5, color: op.onSurface, flex: 1, lineHeight: 17 },
          syncChip: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6.4,
            backgroundColor: op.surfaceLow,
            paddingVertical: 5.6,
            paddingHorizontal: 9.6,
            borderRadius: 8,
            fontSize: 10.9,
          },
          kpiFila: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 9.6 },
          piePagina: { textAlign: 'center', fontSize: 10.9, color: op.outline, padding: 8 },

          // — Badges de estado —
          status: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingVertical: 2.4,
            paddingHorizontal: 7.2,
            borderRadius: 9999,
            fontSize: 9.9,
            fontWeight: '700',
            overflow: 'hidden',
          },
          statusPagado: { backgroundColor: op.statusPagadoBg },
          statusPagadoTxt: { color: op.statusPagadoColor },
          statusEnMesa: { backgroundColor: op.statusEnMesaBg },
          statusEnMesaTxt: { color: op.statusEnMesaColor },
          statusConfirmada: { backgroundColor: op.statusConfirmadaBg },
          statusConfirmadaTxt: { color: op.statusConfirmadaColor },
          statusPendiente: { backgroundColor: op.statusPendienteBg },
          statusPendienteTxt: { color: op.statusPendienteColor },
          statusCancelada: { backgroundColor: op.statusCanceladaBg },
          statusCanceladaTxt: { color: op.statusCanceladaColor },
          statusNoShow: { backgroundColor: op.statusNoShowBg },
          statusNoShowTxt: { color: op.statusNoShowColor },
          statusDot: { width: 5.6, height: 5.6, borderRadius: 2.8 },

          // — Campos de formulario —
          opFieldLabel: { fontSize: 15, color: op.onSurface, marginBottom: 4 },
          opInput: {
            minHeight: 38.4,
            borderColor: op.outlineVariant,
            borderWidth: 1,
            borderRadius: 8,
            backgroundColor: op.surfaceLowest,
            paddingHorizontal: 10.4,
            paddingVertical: 8,
            fontSize: 13.1,
            color: op.onSurface,
          },
          opTextarea: { minHeight: 76, textAlignVertical: 'top' },
          opInputRo: { backgroundColor: 'transparent', borderWidth: 0, paddingHorizontal: 0 },
          opSelect: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 6,
            minHeight: 38.4,
            borderColor: op.outlineVariant,
            borderWidth: 1,
            borderRadius: 8,
            backgroundColor: op.surfaceLowest,
            paddingHorizontal: 10.4,
          },
          opSelectTxt: { fontSize: 13.1, color: op.onSurface, flex: 1 },
          selectChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'transparent' },
          selectChipTxt: { fontSize: 12.5, fontWeight: '600', color: op.onSurface },
          opOpcionesOverlay: {
            flex: 1,
            backgroundColor: op.overlay,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          },
          opOpciones: {
            width: '100%',
            maxWidth: 400,
            backgroundColor: op.modalBg,
            borderColor: op.modalBorder,
            borderWidth: 1,
            borderRadius: 12,
            padding: 6,
          },
          opOpcionItem: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 11,
            paddingHorizontal: 12,
            borderRadius: 8,
            gap: 8,
          },
          opOpcionActiva: { backgroundColor: op.surfaceLow },
          opOpcionTxt: { fontSize: 13.1, color: op.onSurface, flex: 1 },
          opOpcionTxtActiva: { color: op.primary, fontWeight: '700' },
          opModalOverlay: {
            flex: 1,
            backgroundColor: op.overlay,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          },
          opModal: {
            width: '100%',
            backgroundColor: op.modalBg,
            borderColor: op.modalBorder,
            borderWidth: 1,
            borderRadius: 16,
            padding: 20,
            color: op.modalColor,
            shadowColor: '#000000',
            shadowOpacity: 0.38,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 12 },
            elevation: 10,
          },
          modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
          modalHeadTitle: { fontWeight: '800', fontSize: 15.2, color: op.modalColor },
          modalHeadSub: { fontSize: 10.9, color: op.onVariant, marginTop: 2 },
          modalFoot: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 6.4,
            borderTopWidth: 1,
            borderTopColor: op.surfaceLow,
            fontSize: 10.9,
            color: op.onVariant,
          },
          modalFootTxt: { fontSize: 10.9, color: op.onVariant },
          modalCierre: { flexDirection: 'row', justifyContent: 'flex-end', gap: 6.4 },
        }),
        {
          statusTxtBase: { fontSize: 9.9, fontWeight: '700' },
        },
      ),
      ),
    [op],
  );
  return { op, s };
}
