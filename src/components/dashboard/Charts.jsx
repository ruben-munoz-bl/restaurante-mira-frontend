import { useState } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from "recharts";
import { GlassTooltip, SerieToggles } from "../ops/OpsCharts.jsx";

const VERDE = "#0E6B47";
const ORO = "#E0A526";
const ROJO = "#D9534F";
const AZUL = "#2D6FD8";
const COLORS = [VERDE, ORO, ROJO, AZUL, "#6bfe9c", "#004393", "#85d7ab", "#bec9c0"];
const eje = { tickLine: false, axisLine: false, tick: { fontSize: 11, fill: "var(--chart-tick, #6f7a72)" } };

function mesCorto(m) {
  const d = new Date(`${m}-01T00:00:00`);
  return Number.isNaN(d.getTime()) ? m : d.toLocaleDateString("es-ES", { month: "short", year: "2-digit" });
}

export function RevenueLineChart({ data, title }) {
  const [vis, setVis] = useState({ facturacion: true, comisiones: true });
  if (!data || Object.keys(data).length === 0) return <p className="vacio-texto">Sin datos</p>;
  const chartData = Object.entries(data)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, d]) => ({ mes: mesCorto(mes), facturacion: Math.round(d.facturacion * 100) / 100, comisiones: Math.round(d.comisiones * 100) / 100 }));
  const series = [
    { key: "facturacion", nombre: "Facturación", color: VERDE },
    { key: "comisiones", nombre: "Comisiones", color: ORO },
  ];

  return (
    <div className="dash-chart chart-anim">
      <div className="dash-chart-head">
        <h3 className="dash-chart-title">{title}</h3>
        <SerieToggles series={series} visibles={vis} onToggle={(k) => setVis((v) => ({ ...v, [k]: !v[k] }))} />
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.32} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid vertical={false} stroke="var(--chart-grid, #e9eef5)" strokeDasharray="4 4" />
          <XAxis dataKey="mes" {...eje} />
          <YAxis {...eje} tickFormatter={(v) => `${v}€`} />
          <Tooltip content={<GlassTooltip unidades={{ facturacion: "€", comisiones: "€" }} />} cursor={{ stroke: VERDE, strokeDasharray: "3 3", strokeOpacity: 0.5 }} />
          {series.filter((s) => vis[s.key]).map((s) => (
            <Area key={s.key} type="monotone" dataKey={s.key} name={s.nombre} stroke={s.color} strokeWidth={2.5}
              fill={`url(#grad-${s.key})`} animationDuration={900} dot={{ r: 3, fill: s.color, strokeWidth: 0 }}
              activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2 }} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ReservationsPieChart({ completadas, canceladas, noShow, pendientes, title }) {
  const [activo, setActivo] = useState(null);
  const total = completadas + canceladas + noShow + pendientes;
  if (total === 0) return <p className="vacio-texto">Sin datos</p>;
  const chartData = [
    { name: "Completadas", value: completadas, color: VERDE },
    { name: "Pendientes", value: pendientes, color: AZUL },
    { name: "Canceladas", value: canceladas, color: ORO },
    { name: "No Show", value: noShow, color: ROJO },
  ].filter(d => d.value > 0);
  const sel = activo != null ? chartData[activo] : null;

  return (
    <div className="dash-chart chart-anim">
      <h3 className="dash-chart-title">{title}</h3>
      <div className="ops-donut-wrap" style={{ justifyContent: "center" }}>
        <div style={{ position: "relative", width: 200, height: 200, flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={84} paddingAngle={3} cornerRadius={4}
                stroke="none" rootTabIndex={-1} onMouseEnter={(_, i) => setActivo(i)} onMouseLeave={() => setActivo(null)} animationDuration={900}>
                {chartData.map((d, i) => (
                  <Cell key={d.name} fill={d.color} className="donut-celda"
                    style={{ opacity: activo == null || activo === i ? 1 : 0.28, transform: activo === i ? "scale(1.06)" : "scale(1)" }} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="donut-centro">
            <strong key={sel?.name || "t"}>{sel ? sel.value : total}</strong>
            <span>{sel ? sel.name : "reservas"}</span>
          </div>
        </div>
        <div className="ops-legend">
          {chartData.map((d, i) => (
            <button type="button" key={d.name} className={`ops-legend-row ${activo === i ? "activo" : ""}`}
              onMouseEnter={() => setActivo(i)} onMouseLeave={() => setActivo(null)} onFocus={() => setActivo(i)} onBlur={() => setActivo(null)}>
              <span style={{ display: "flex", alignItems: "center" }}><span className="ops-dot" style={{ background: d.color }} />{d.name}</span>
              <strong>{Math.round((d.value / total) * 100)}%</strong>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function RevenueBarChart({ data, title }) {
  const [activo, setActivo] = useState(null);
  if (!data || Object.keys(data).length === 0) return <p className="vacio-texto">Sin datos</p>;
  const chartData = Object.entries(data)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, d]) => ({ mes: mesCorto(mes), tickets: d.tickets || 0 }));

  return (
    <div className="dash-chart chart-anim">
      <h3 className="dash-chart-title">{title}</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} margin={{ top: 10, right: 8, left: -18, bottom: 0 }} onMouseLeave={() => setActivo(null)}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid, #e9eef5)" strokeDasharray="4 4" />
          <XAxis dataKey="mes" {...eje} />
          <YAxis {...eje} allowDecimals={false} />
          <Tooltip content={<GlassTooltip />} cursor={{ fill: "rgba(14,107,71,0.06)", radius: 8 }} />
          <Bar dataKey="tickets" name="Tickets" radius={[8, 8, 3, 3]} maxBarSize={44} animationDuration={800}
            onMouseEnter={(_, i) => setActivo(i)}>
            {chartData.map((_, i) => <Cell key={i} fill={VERDE} style={{ opacity: activo == null || activo === i ? 1 : 0.45, transition: "opacity 160ms ease" }} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RestaurantPerformanceChart({ data, title }) {
  if (!data || Object.keys(data).length === 0) return <p className="vacio-texto">Sin datos</p>;
  const chartData = Object.entries(data)
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, 10)
    .map(([id, d]) => ({
      nombre: d.nombre || id.slice(0, 8),
      completadas: d.completadas,
      canceladas: d.canceladas,
      noShow: d.noShow,
    }));

  return (
    <div className="dash-chart chart-anim">
      <h3 className="dash-chart-title">{title}</h3>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 8 }}>
          <CartesianGrid horizontal={false} stroke="var(--chart-grid, #e9eef5)" strokeDasharray="4 4" />
          <XAxis type="number" {...eje} />
          <YAxis type="category" dataKey="nombre" width={120} {...eje} />
          <Tooltip content={<GlassTooltip />} cursor={{ fill: "rgba(14,107,71,0.06)" }} />
          <Bar dataKey="completadas" stackId="a" fill={COLORS[0]} name="Completadas" animationDuration={800} />
          <Bar dataKey="canceladas" stackId="a" fill={COLORS[1]} name="Canceladas" animationDuration={800} />
          <Bar dataKey="noShow" stackId="a" fill={COLORS[2]} name="No Show" radius={[0, 6, 6, 0]} animationDuration={800} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
