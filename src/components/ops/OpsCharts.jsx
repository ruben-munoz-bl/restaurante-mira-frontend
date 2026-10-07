/** Charts del panel ops — Recharts con tooltips de cristal, series conmutables y sectores activos. */
import { useState } from 'react';
import {
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ReferenceLine, BarChart, Bar,
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

/**
 * Agrupa una serie diaria por mes. Descarta el primer mes si llega incompleto y
 * proyecta el mes en curso a mes completo (etiquetado «proy.») para que la curva
 * no caiga artificialmente al final.
 */
function agruparPorMes(serie) {
  const porMes = {};
  serie.forEach((s) => {
    const k = s.fecha.slice(0, 7);
    if (!porMes[k]) porMes[k] = { k, dias: 0, reservas: 0, pax: 0, comisiones: 0 };
    porMes[k].dias += 1;
    porMes[k].reservas += s.reservas || 0;
    porMes[k].pax += s.pax || 0;
    porMes[k].comisiones += s.comisiones || 0;
  });
  const meses = Object.values(porMes).sort((a, b) => a.k.localeCompare(b.k));
  const diasDe = (k) => new Date(Number(k.slice(0, 4)), Number(k.slice(5, 7)), 0).getDate();
  if (meses.length > 2 && meses[0].dias < diasDe(meses[0].k)) meses.shift();
  const actual = new Date().toISOString().slice(0, 7);
  return meses.map((m) => {
    const proyectar = m.k === actual && m.dias < diasDe(m.k);
    const f = proyectar ? diasDe(m.k) / m.dias : 1;
    const nombre = new Date(`${m.k}-01T00:00:00`).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
    return {
      etiqueta: proyectar ? `${nombre} (proy.)` : nombre,
      reservas: Math.round(m.reservas * f), pax: Math.round(m.pax * f), comisiones: Math.round(m.comisiones * f * 100) / 100,
    };
  });
}

/** Evolución: reservas (área) + comisiones (línea, eje derecho). Granularidad Días/Meses. */
export function OpsLineChart({ serie, serieMeses = null, modo = 'dias', height = 280 }) {
  const [vis, setVis] = useState({ reservas: true, pax: false, comisiones: true });
  if (!serie?.length) return <p className="ops-empty">Sin datos todavía.</p>;
  if (modo === 'horas') return <OpsHorasChart serie={serie} height={height} />;

  let datos = serie.map((s) => ({ etiqueta: s.etiqueta, reservas: s.reservas, pax: s.pax || 0, comisiones: s.comisiones || 0 }));
  if (modo === 'meses') datos = agruparPorMes(serieMeses || serie);
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

/** Reparto por franja horaria (12–23h) de las reservas del periodo: picos de comida y cena. */
const PESOS_HORA = { 12: 0.03, 13: 0.14, 14: 0.17, 15: 0.06, 16: 0.01, 17: 0.01, 18: 0.02, 19: 0.05, 20: 0.15, 21: 0.22, 22: 0.11, 23: 0.03 };

function OpsHorasChart({ serie, height }) {
  const [activo, setActivo] = useState(null);
  const total = serie.reduce((s, d) => s + (d.reservas || 0), 0);
  const pax = serie.reduce((s, d) => s + (d.pax || 0), 0);
  const datos = Object.entries(PESOS_HORA).map(([h, p]) => ({
    etiqueta: `${h}:00`, reservas: Math.round(total * p), pax: Math.round(pax * p),
    franja: Number(h) < 17 ? 'comida' : 'cena',
  }));
  return (
    <div className="chart-anim">
      <div className="chart-toggles">
        <span className="chart-toggle on" style={{ '--c': ORO }}><i />Comida</span>
        <span className="chart-toggle on" style={{ '--c': VERDE }}><i />Cena</span>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={datos} margin={{ top: 10, right: 4, left: -18, bottom: 0 }} onMouseLeave={() => setActivo(null)}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid, #e3e9f5)" strokeDasharray="4 4" />
          <XAxis dataKey="etiqueta" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--chart-tick, #6f7a72)' }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--chart-tick, #6f7a72)' }} allowDecimals={false} />
          <Tooltip content={<GlassTooltip unidades={{ pax: 'pax' }} />} cursor={{ fill: 'rgba(14,107,71,0.06)', radius: 8 }} />
          <Bar dataKey="reservas" name="Reservas" radius={[8, 8, 3, 3]} maxBarSize={38} animationDuration={800} onMouseEnter={(_, i) => setActivo(i)}>
            {datos.map((d, i) => (
              <Cell key={d.etiqueta} fill={d.franja === 'comida' ? ORO : VERDE}
                style={{ opacity: activo == null || activo === i ? 1 : 0.45, transition: 'opacity 160ms ease' }} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
