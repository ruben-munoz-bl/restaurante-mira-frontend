/** Charts SVG del panel ops — sin dependencias, con tooltip al pasar el ratón. */
import { useState } from 'react';

const VERDE = '#0e6b47';
const VERDE_CLARO = '#006d37';
const AZUL = '#004393';

function puntosSerie(serie, getY, w, h, pad) {
  const vals = serie.map(getY);
  const max = Math.max(1, ...vals);
  const n = serie.length;
  const x = (i) => pad + (i * (w - pad * 2)) / Math.max(1, n - 1);
  const y = (v) => h - pad - (v / max) * (h - pad * 2);
  return { x, y, max };
}

function curvaSuave(pts) {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const mx = (x0 + x1) / 2;
    d += ` C${mx},${y0} ${mx},${y1} ${x1},${y1}`;
  }
  return d;
}

/** Evolución: reservas (línea) + comisiones (área). Granularidad Días/Meses/Horas. */
export function OpsLineChart({ serie, modo = 'dias', height = 260 }) {
  const [hover, setHover] = useState(null);
  const w = 800;
  const h = 240;
  const pad = 12;
  if (!serie?.length) return <p className="ops-empty">Sin datos todavía.</p>;

  let datos = serie;
  let etiquetas = serie.map((s) => s.etiqueta);
  if (modo === 'meses') {
    const porMes = {};
    serie.forEach((s) => {
      const k = s.fecha.slice(0, 7);
      if (!porMes[k]) porMes[k] = { fecha: k, etiqueta: k.slice(5), reservas: 0, comisiones: 0 };
      porMes[k].reservas += s.reservas;
      porMes[k].comisiones = Math.round((porMes[k].comisiones + s.comisiones) * 100) / 100;
    });
    datos = Object.values(porMes);
    etiquetas = datos.map((d) => d.etiqueta);
  }
  if (modo === 'horas') {
    return <p className="ops-empty">La vista por horas usa los slots de reserva (13–15h y 20–22h) en la sección Reservas.</p>;
  }

  const { x, y } = puntosSerie(datos, (d) => d.reservas, w, h, pad);
  const { y: yC } = puntosSerie(datos, (d) => d.comisiones, w, h, pad);
  const ptsR = datos.map((d, i) => [x(i), y(d.reservas)]);
  const ptsC = datos.map((d, i) => [x(i), yC(d.comisiones)]);
  const area = `${curvaSuave(ptsR)} L${x(datos.length - 1)},${h - pad} L${x(0)},${h - pad} Z`;
  const pico = datos.reduce((m, d, i) => (d.reservas > (datos[m]?.reservas ?? -1) ? i : m), 0);

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height, overflow: 'visible' }} role="img" aria-label="Evolución de reservas y comisiones">
        <defs>
          <linearGradient id="opsArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={VERDE} stopOpacity="0.32" />
            <stop offset="100%" stopColor={VERDE} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[40, 100, 160].map((gy) => (
          <line key={gy} x1="0" x2={w} y1={gy} y2={gy} stroke="#d8e3fb" strokeDasharray="4 4" strokeWidth="1" />
        ))}
        <path d={area} fill="url(#opsArea)" />
        <path d={curvaSuave(ptsC)} fill="none" stroke={AZUL} strokeDasharray="2 2" strokeWidth="2" opacity="0.6" />
        <path d={curvaSuave(ptsR)} fill="none" stroke={VERDE} strokeWidth="3.5" strokeLinecap="round" />
        <circle cx={x(pico)} cy={y(datos[pico].reservas)} r="5" fill={VERDE} stroke="#fff" strokeWidth="2" />
        {datos.map((d, i) => (
          <rect
            key={d.fecha}
            x={x(i) - (w / Math.max(1, datos.length)) / 2}
            y="0"
            width={w / Math.max(1, datos.length)}
            height={h}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
        {hover != null && datos[hover] && (
          <g pointerEvents="none">
            <line x1={x(hover)} x2={x(hover)} y1="0" y2={h} stroke={VERDE} strokeDasharray="3 3" strokeWidth="1" />
            <circle cx={x(hover)} cy={y(datos[hover].reservas)} r="5" fill={VERDE} stroke="#fff" strokeWidth="2" />
          </g>
        )}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div className="ops-xlabels" style={{ flex: 1 }}>
          {etiquetas.filter((_, i) => i % Math.ceil(etiquetas.length / 8) === 0).map((e) => (
            <span key={e}>{e}</span>
          ))}
        </div>
      </div>
      {hover != null && datos[hover] && (
        <p className="ops-muted" aria-live="polite" style={{ margin: '6px 0 0' }}>
          <strong>{datos[hover].etiqueta}</strong> · {datos[hover].reservas} reservas · {datos[hover].pax ?? '—'} pax ·{' '}
          {Number(datos[hover].comisiones).toFixed(2)} € com. est.
        </p>
      )}
    </div>
  );
}

/** Donut de distribución (p. ej. por estado). */
export function OpsDonut({ segmentos, centro, centroSub }) {
  const total = segmentos.reduce((s, x) => s + x.valor, 0);
  if (!total) return <p className="ops-empty">Sin datos todavía.</p>;
  let acc = 0;
  const R = 15.915;
  return (
    <div className="ops-donut-wrap">
      <div style={{ position: 'relative', width: 144, height: 144, flexShrink: 0 }}>
        <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
          <circle cx="18" cy="18" r={R} fill="none" stroke="#e7eeff" strokeWidth="4" />
          {segmentos.map((s) => {
            const frac = (s.valor / total) * 100;
            const el = (
              <circle
                key={s.nombre}
                cx="18"
                cy="18"
                r={R}
                fill="none"
                stroke={s.color}
                strokeWidth="4"
                strokeDasharray={`${frac}, 100`}
                strokeDashoffset={-acc}
              />
            );
            acc += frac;
            return el;
          })}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <strong style={{ fontSize: 20, fontVariantNumeric: 'tabular-nums' }}>{centro}</strong>
          <span style={{ fontSize: 11, color: 'var(--ops-on-variant)', textTransform: 'uppercase' }}>{centroSub}</span>
        </div>
      </div>
      <div className="ops-legend">
        {segmentos.map((s) => (
          <div className="ops-legend-row" key={s.nombre}>
            <span style={{ display: 'flex', alignItems: 'center' }}>
              <span className="ops-dot" style={{ background: s.color }} />
              {s.nombre}
            </span>
            <strong>{Math.round((s.valor / total) * 100)}%</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Barras horizontales (p. ej. ocupación por servicio). */
export function OpsHBars({ filas }) {
  if (!filas?.length) return <p className="ops-empty">Sin datos todavía.</p>;
  const max = Math.max(1, ...filas.map((f) => f.valor));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {filas.map((f) => (
        <div key={f.nombre}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
            <span>{f.nombre}</span>
            <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{f.texto}</strong>
          </div>
          <div className="ops-bar" style={{ height: 8, marginTop: 0 }}>
            <i className={f.clase || ''} style={{ width: `${Math.round((f.valor / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
