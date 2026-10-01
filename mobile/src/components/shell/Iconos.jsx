/**
 * Iconos SVG inline (mismos paths que el <svg> del web) con react-native-svg.
 * Se usa donde el web tenía SVG inline; para ligaduras Material Symbols → <Simbolo/>.
 */
import Svg, { Circle, Path, Rect, Polyline, Line } from 'react-native-svg';

const base = (size) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
});

export function IconoBusqueda({ size = 22, color = 'currentColor', style }) {
  return (
    <Svg {...base(size)} stroke={color} style={style}>
      <Circle cx="11" cy="11" r="8" />
      <Path d="M21 21l-4.35-4.35" />
    </Svg>
  );
}

export function IconoCalendario({ size = 22, color = 'currentColor', style }) {
  return (
    <Svg {...base(size)} stroke={color} style={style}>
      <Rect x="3" y="4" width="18" height="18" rx="2" />
      <Path d="M16 2v4M8 2v4M3 10h18" />
    </Svg>
  );
}

export function IconoCorazon({ size = 22, color = 'currentColor', style }) {
  return (
    <Svg {...base(size)} stroke={color} style={style}>
      <Path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </Svg>
  );
}

export function IconoRejilla({ size = 22, color = 'currentColor', style }) {
  return (
    <Svg {...base(size)} stroke={color} style={style}>
      <Rect x="3" y="3" width="7" height="7" />
      <Rect x="14" y="3" width="7" height="7" />
      <Rect x="14" y="14" width="7" height="7" />
      <Rect x="3" y="14" width="7" height="7" />
    </Svg>
  );
}

export function IconoPersona({ size = 22, color = 'currentColor', style }) {
  return (
    <Svg {...base(size)} stroke={color} style={style}>
      <Path d="M19 21v-2a4 4 0 00-4-4H9a4 4 0 00-4 4v2" />
      <Circle cx="12" cy="7" r="4" />
    </Svg>
  );
}

export function IconoSalir({ size = 16, color = 'currentColor', style }) {
  return (
    <Svg {...base(size)} stroke={color} style={style}>
      <Path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <Polyline points="16 17 21 12 16 7" />
      <Line x1="21" y1="12" x2="9" y2="12" />
    </Svg>
  );
}
