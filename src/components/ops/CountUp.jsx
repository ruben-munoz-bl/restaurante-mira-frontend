/** Número que sube hasta su valor al montarse (y se reajusta si cambia). */
import { useEffect, useRef, useState } from 'react';

export default function CountUp({ valor = 0, decimales = 0, duracion = 900 }) {
  const objetivo = Number(valor) || 0;
  const [actual, setActual] = useState(0);
  const desde = useRef(0);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setActual(objetivo); return undefined; }
    const inicio = performance.now();
    const origen = desde.current;
    let raf;
    const paso = (t) => {
      const p = Math.min(1, (t - inicio) / duracion);
      const e = 1 - (1 - p) ** 4; // ease-out quart
      const v = origen + (objetivo - origen) * e;
      desde.current = v;
      setActual(v);
      if (p < 1) raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [objetivo, duracion]);

  return (
    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
      {actual.toLocaleString('es-ES', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })}
    </span>
  );
}
