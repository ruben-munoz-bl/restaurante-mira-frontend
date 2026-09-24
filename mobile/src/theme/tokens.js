/**
 * Design tokens — Epicure Fork (forest pine, champagne gold, warm ivory).
 * Espejo exacto de src/styles/tokens.css del web (claro + oscuro).
 */

export const CLARO = {
  // Brand palette (Material Design 3 inspired)
  primary: '#002218',
  primaryContainer: '#16382C',
  secondary: '#735c00',
  secondaryContainer: '#fed65b',
  tertiary: '#43000e',
  tertiaryContainer: '#67081d',

  // Semantic roles
  fondo: '#f7faf6',
  fondoSuave: '#ecefeb',
  tinta: '#181c1a',
  gris: '#414844',
  borde: '#c1c8c3',
  verde: '#16382C',
  verdeOscuro: '#002218',
  verdeSuave: '#f1f4f1',
  rojo: '#67081d',
  estrella: '#fed65b',
  papel: '#ffffff',
  dorado: '#735c00',
  doradoClaro: '#c6924b',

  // Surfaces for overlays on photos
  badgeBg: 'rgba(255, 255, 255, 0.96)',
  favBg: 'rgba(255, 255, 255, 0.92)',

  // Additional semantic
  naranja: '#c25a1a',
  azul: '#1a56db',
  textoSec: '#6b7280',

  // Glassmorphism
  glassBg: 'rgba(247, 250, 246, 0.85)',
  glassBorder: 'rgba(22, 56, 44, 0.08)',

  // Sombras (tintadas verde, no negras)
  sombraRgb: [22, 56, 44],
  sombraCardOpacidad: 0.06,
  sombraHoverOpacidad: 0.12,
  sombraFlotanteRgb: [11, 37, 29],
  sombraFlotanteOpacidad: 0.16,

  colorScheme: 'light',
};

export const OSCURO = {
  primary: '#a8d5ba',
  primaryContainer: '#0d7353',
  secondary: '#fed65b',
  secondaryContainer: '#735c00',
  tertiary: '#ffb3c1',
  tertiaryContainer: '#8f1d14',

  fondo: '#111411',
  fondoSuave: '#1c201c',
  tinta: '#e2e8e4',
  gris: '#a0a8a2',
  borde: '#3a403c',
  verde: '#a8d5ba',
  verdeOscuro: '#c5e8d4',
  verdeSuave: '#1c3230',
  rojo: '#ffb3c1',
  estrella: '#fed65b',
  papel: '#1c201c',
  dorado: '#fed65b',
  doradoClaro: '#fed65b',
  naranja: '#e0854a',
  azul: '#5b8def',
  textoSec: '#a0a8a2',

  badgeBg: 'rgba(28, 32, 28, 0.92)',
  favBg: 'rgba(28, 32, 28, 0.88)',

  glassBg: 'rgba(17, 20, 17, 0.88)',
  glassBorder: 'rgba(168, 213, 186, 0.1)',

  sombraRgb: [0, 0, 0],
  sombraCardOpacidad: 0.35,
  sombraHoverOpacidad: 0.4,
  sombraFlotanteRgb: [0, 0, 0],
  sombraFlotanteOpacidad: 0.5,

  colorScheme: 'dark',
};

export const TEMAS = { claro: CLARO, oscuro: OSCURO };

/** Border radius (--radio, --radio-peq, --radio-xl) */
export const RADIO = { peq: 8, md: 12, xl: 24 };

/** Layout (--ancho-max, --gutter) */
export const ANCHO_MAX = 1320;
export const GUTTER = 24; // 1.5rem
export const GUTTER_MOVIL = 16; // 1rem

/** Tipografías (familias registradas en el root layout con @expo-google-fonts) */
export const FUENTES = {
  texto: 'PlusJakartaSans_400Regular',
  textoMedio: 'PlusJakartaSans_500Medium',
  textoSemi: 'PlusJakartaSans_600SemiBold',
  textoBold: 'PlusJakartaSans_700Bold',
  textoExtra: 'PlusJakartaSans_800ExtraBold',
  display: 'PlayfairDisplay_700Bold',
  displaySemi: 'PlayfairDisplay_600SemiBold',
  displayRegular: 'PlayfairDisplay_400Regular',
};

/** rgba() desde [r,g,b] + alpha */
export function rgba(rgb, a) {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${a})`;
}

/**
 * Sombra nativa equivalente a `box-shadow` (iOS shadow + Android elevation).
 * `tokens` = paleta activa (CLARO u OSCURO).
 */
export function sombraCard(tokens, { hover = false } = {}) {
  const op = hover ? tokens.sombraHoverOpacidad : tokens.sombraCardOpacidad;
  return {
    shadowColor: `rgb(${tokens.sombraRgb.join(',')})`,
    shadowOffset: { width: 0, height: hover ? 12 : 2 },
    shadowOpacity: op,
    shadowRadius: hover ? 16 : 8,
    elevation: hover ? 6 : 3,
  };
}

export function sombraFlotante(tokens) {
  return {
    shadowColor: `rgb(${tokens.sombraFlotanteRgb.join(',')})`,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: tokens.sombraFlotanteOpacidad,
    shadowRadius: 14,
    elevation: 10,
  };
}
