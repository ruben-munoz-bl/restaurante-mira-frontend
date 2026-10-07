/** Charts del panel ops — Recharts con tooltips de cristal, series conmutables y sectores activos. */
import { useState } from 'react';
import {
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ReferenceLine,
} from 'recharts';

const VERDE = '#0e6b47';
const AZUL = '#2d6fd8';
const ORO = '#c9a227';

const fmtEur = (v) => `${Number(v || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

/** Tooltip compartido (también lo usa el panel de restaurante). */
export function GlassTooltip({ active, payload, label, unidades = {} }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tip">
      <div className="chart-tip-label">{label}</div>
      {payload.map((p) => (
        <div className="chart-tip-row" key={p.dataKey}>
          <span className="chart-tip-dot" style={{ background: p.color || p.payload?.color }} />
          <span>{p.name}</span>
          <strong>{unidades[p.dataKey] === '€' ? fmtEur(p.value) : `${Number(p.value).toLocaleString('es-ES')}${unidades[p.dataKey] ? ` ${unidades[p.dataKey]}` : ''}`}</strong>
        </div>
      ))}
    </div>
  );
}

/** Píldoras que encienden/apagan series. */
export function SerieToggles({ series, visibles, onToggle }) {
  return (
    <div className="chart-toggles" role="group" aria-label="Series visibles">
      {series.map((s) => (
        <button key={s.key} type="button" aria-pressed={visibles[s.key]} className={`chart-toggle ${visibles[s.key] ? 'on' : ''}`}
          style={{ '--c': s.color }} onClick={() => onToggle(s.key)}>
          <i />{s.nombre}
        </button>
      ))}
    </div>
  );
}

/** Evolución: reservas (área) + comisiones (línea, eje derecho). Granularidad Días/Meses. */
export function OpsLineChart({ serie, modo = 'dias', height = 280 }) {
  const [vis, setVis] = useState({ reservas: true, pax: false, comisiones: true });
  if (!serie?.length) return <p className="ops-empty">Sin datos todavía.</p>;
  if (modo === 'horas') {
    return <p className="ops-empty">La vista por horas usa los slots de reserva (13–15h y 20–22h) en la sección Reservas.</p>;
  }

  let datos = serie.map((s) => ({ etiqueta: s.etiqueta, reservas: s.reservas, pax: s.pax || 0, comisiones: s.comisiones || 0 }));
  if (modo === 'meses') {
    const porMes = {};
    serie.forEach((s) => {
      const k = s.fecha.slice(0, 7);
      if (!porMes[k]) porMes[k] = { etiqueta: k, reservas: 0, pax: 0, comisiones: 0 };
      porMes[k].reservas += s.reservas;
      porMes[k].pax += s.pax || 0;
      porMes[k].comisiones = Math.round((porMes[k].comisiones + (s.comisiones || 0)) * 100) / 100;
    });
    datos = Object.values(porMes);
  }
  const media = datos.reduce((a, d) => a + d.reservas, 0) / datos.length;
  const series = [
    { key: 'reservas', nombre: 'Reservas', color: VERDE },
    { key: 'pax', nombre: 'Comensales', color: ORO },
    { key: 'comisiones', nombre: 'Comisión €', color: AZUL },
  ];

  return (
    <div className="chart-anim">
      <SerieToggles series={series} visibles={vis} onToggle={(k) => setVis((v) => ({ ...v, [k]: !v[k] }))} />
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={datos} margin={{ top: 10, right: 4, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="opsGradR" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={VERDE} stopOpacity={0.35} />
              <stop offset="100%" stopColor={VERDE} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="opsGradP" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ORO} stopOpacity={0.28} />
              <stop offset="100%" stopColor={ORO} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--chart-grid, #e3e9f5)" strokeDasharray="4 4" />
          <XAxis dataKey="etiqueta" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--chart-tick, #6f7a72)' }} minTickGap={16} />
          <YAxis yAxisId="izq" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--chart-tick, #6f7a72)' }} allowDecimals={false} />
          <YAxis yAxisId="der" orientation="right" hide />
          <Tooltip content={<GlassTooltip unidades={{ comisiones: '€', pax: 'pax' }} />} cursor={{ stroke: VERDE, strokeDasharray: '3 3', strokeOpacity: 0.5 }} />
          {vis.reservas && <ReferenceLine yAxisId="izq" y={media} stroke={VERDE} strokeOpacity={0.35} strokeDasharray="2 4" label={{ value: 'media', position: 'insideTopRight', fontSize: 10, fill: VERDE }} />}
          {vis.pax && <Area yAxisId="izq" type="monotone" dataKey="pax" name="Comensales" stroke={ORO} strokeWidth={2} fill="url(#opsGradP)" animationDuration={900} activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} />}
          {vis.reservas && <Area yAxisId="izq" type="monotone" dataKey="reservas" name="Reservas" stroke={VERDE} strokeWidth={3} fill="url(#opsGradR)" animationDuration={900} activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }} />}
          {vis.comisiones && <Line yAxisId="der" type="monotone" dataKey="comisiones" name="Comisión" stroke={AZUL} strokeWidth={2} strokeDasharray="5 4" dot={false} animationDuration={1100} activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} />}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Donut interactivo: el sector y la fila de leyenda se resaltan juntos. */
export function OpsDonut({ segmentos, centro, centroSub }) {
  const [activo, setActivo] = useState(null);
  const datos = segmentos.filter((s) => s.valor > 0);
  const total = datos.reduce((s, x) => s + x.valor, 0);
  if (!total) return <p className="ops-empty">Sin datos todavía.</p>;
  const sel = activo != null ? datos[activo] : null;

  return (
    <div className="ops-donut-wrap">
      <div style={{ position: 'relative', width: 170, height: 170, flexShrink: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={datos} dataKey="valor" nameKey="nombre" innerRadius={52} outerRadius={70} paddingAngle={3} cornerRadius={4}
              stroke="none" rootTabIndex={-1}
              onMouseEnter={(_, i) => setActivo(i)} onMouseLeave={() => setActivo(null)}
              animationDuration={900} animationBegin={100}>
              {datos.map((s, i) => (
                <Cell key={s.nombre} fill={s.color} className="donut-celda"
                  style={{ opacity: activo == null || activo === i ? 1 : 0.28, transform: activo === i ? 'scale(1.06)' : 'scale(1)' }} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-centro">
          <strong key={sel?.nombre || 'total'}>{sel ? `${Math.round((sel.valor / total) * 100)}%` : centro}</strong>
          <span>{sel ? sel.nombre : centroSub}</span>
        </div>
      </div>
      <div className="ops-legend">
        {datos.map((s, i) => (
          <button type="button" className={`ops-legend-row ${activo === i ? 'activo' : ''}`} key={s.nombre}
            onMouseEnter={() => setActivo(i)} onMouseLeave={() => setActivo(null)} onFocus={() => setActivo(i)} onBlur={() => setActivo(null)}>
            <span style={{ display: 'flex', alignItems: 'center' }}>
              <span className="ops-dot" style={{ background: s.color }} />
              {s.nombre}
            </span>
            <strong>{s.valor} · {Math.round((s.valor / total) * 100)}%</strong>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Barras horizontales (p. ej. ocupación por servicio) que crecen al montarse. */
export function OpsHBars({ filas }) {
  if (!filas?.length) return <p className="ops-empty">Sin datos todavía.</p>;
  const max = Math.max(1, ...filas.map((f) => f.valor));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {filas.map((f, i) => (
        <div key={f.nombre} className="ops-hbar" title={f.texto}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
            <span>{f.nombre}</span>
            <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{f.texto}</strong>
          </div>
          <div className="ops-bar" style={{ height: 8, marginTop: 0 }}>
            <i className={f.clase || ''} style={{ width: `${Math.round((f.valor / max) * 100)}%`, animationDelay: `${150 + i * 80}ms` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
