/**
 * Responsive helpers — replican las fuentes fluidas `clamp()` y los
 * breakpoints de App.css del web usando el ancho de ventana real.
 *
 * Web:  font-size: clamp(2.5rem, 6vw, 4rem)   (1rem = 16px)
 * RN:   fs.clamp(2.5, 6, 4) con useWindowDimensions()
 */
import { useWindowDimensions } from 'react-native';

export const REM = 16;

/** Breakpoints clave de App.css */
export const BP = {
  x400: 400,
  x500: 500,
  x560: 560,
  x640: 640,
  x768: 768,
  x1024: 1024,
};

export function useBreakpoint() {
  const { width, height } = useWindowDimensions();
  return {
    width,
    height,
    esMovil: width <= 767,
    esMovilAncho: width <= 1023,
    esEscritorio: width >= 1024,
    gte: (bp) => width >= bp,
    lt: (bp) => width < bp,
  };
}

/** clamp(minRem, vwPercent, maxRem) → px según el ancho actual */
export function clampPx(minRem, vwPct, maxRem, width) {
  const min = minRem * REM;
  const max = maxRem * REM;
  const fluid = (width * vwPct) / 100;
  return Math.min(Math.max(min, fluid), max);
}

/** Hook: funciones de tamaño fluido + breakpoints */
export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const fs = (minRem, vwPct, maxRem) => clampPx(minRem, vwPct, maxRem, width);
  return {
    width,
    height,
    fs,
    esMovil: width <= 767,
    esMovilAncho: width <= 1023,
    esEscritorio: width >= 1024,
    gte: (bp) => width >= bp,
    lt: (bp) => width < bp,
    gutter: width <= 640 ? 16 : 24,
  };
}

/** Tamaños tipográficos base del index.css web */
export const TIPO = {
  h1: (w) => clampPx(2.25, 5, 3.5, w),
  h2: (w) => clampPx(1.5, 3, 2, w),
  h3: (w) => clampPx(1.125, 2, 1.375, w),
  hero: (w) => clampPx(2.5, 6, 4, w),
  seccion: (w) => clampPx(1.5, 4, 1.9, w),
};
