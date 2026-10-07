/**
 * OpsAuditoria — historial de eventos persistido en la BD (colección `auditoria`).
 * - Periodo y filtros viven en la URL (#/admin?seccion=auditoria&...): copiar el
 *   enlace reproduce la misma vista a otro admin.
 * - Todos los agregados vienen calculados del backend; aquí solo se pintan.
 * - Por defecto se suman eventos reales y simulados; el origen es un filtro opcional.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { auditoriaApi } from '../../services/auditoria.js';
import { formatearBreakdown, etiquetaCubo, leerEstadoUrl, escribirEstadoUrl } from '../../services/auditoriaCore.js';
import { CATEGORIAS, TIPOS, ORIGENES, FUENTES, infoTipo, colorTipo, etiquetaTipo } from './auditoriaCatalog.js';
import { GlassTooltip } from './OpsCharts.jsx';
import { descargarTexto } from './opsData.js';
import { useT } from '../../i18n/index.jsx';
import es from '../../i18n/es.js';
import ca from '../../i18n/ca.js';
import en from '../../i18n/en.js';
import './opsAuditoria.css';

const TRADS = { es, ca, en };
const SUBS = ['resumen', 'actividad', 'usuarios', 'administracion', 'eventos', 'exportar', 'simulacion'];
const PERIODOS = ['dia', 'semana', 'mes', 'todo'];
const VERDE = '#0e6b47';
const ORO = '#c9a227';

const fmt = (n) => (n == null ? '—' : Number(n).toLocaleString('es-ES'));
const fmtPct = (n) => (n == null ? '—' : `${String(n).replace('.', ',')} %`);
const fmtFecha = (iso) => (iso ? new Date(iso).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
const fmtValor = (v) => (v == null || v === '' ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v));

/* ───────── Estado en la URL ───────── */

function useEstadoUrl() {
  const [estado, setEstado] = useState(() => leerEstadoUrl(window.location.hash));
  useEffect(() => {
    const alCambiar = () => setEstado(leerEstadoUrl(window.location.hash));
    window.addEventListener('hashchange', alCambiar);
    return () => window.removeEventListener('hashchange', alCambiar);
  }, []);
  const actualizar = useCallback((parche) => {
    setEstado((prev) => {
      const nuevo = { ...prev, ...parche, seccion: 'auditoria' };
      Object.keys(nuevo).forEach((k) => { if (nuevo[k] === '' || nuevo[k] == null) delete nuevo[k]; });
      // replaceState: no dispara hashchange ni llena el historial con cada filtro.
      window.history.replaceState(null, '', escribirEstadoUrl('#/admin', nuevo));
      return nuevo;
    });
  }, []);
  return [estado, actualizar];
}

/** Carga con estados (cargando / error / datos) y reintento. */
function useCarga(fn, deps) {
  const [st, setSt] = useState({ cargando: true, error: null, datos: null });
  const [intento, setIntento] = useState(0);
  useEffect(() => {
    let vivo = true;
    setSt((p) => ({ ...p, cargando: true, error: null }));
    fn().then((datos) => vivo && setSt({ cargando: false, error: null, datos }))
      .catch((error) => vivo && setSt({ cargando: false, error, datos: null }));
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, intento]);
  return { ...st, reintentar: () => setIntento((i) => i + 1) };
}

/* ───────── Piezas comunes ───────── */

function Esqueleto({ filas = 3 }) {
  return (
    <div className="aud-esqueleto" role="status" aria-label="Cargando">
      {Array.from({ length: filas }, (_, i) => <span key={i} style={{ width: `${90 - i * 12}%` }} />)}
    </div>
  );
}

function Estado({ carga, vacio, t, onSimular, children }) {
  if (carga.cargando && !carga.datos) return <Esqueleto filas={4} />;
  if (carga.error) {
    return (
      <div className="aud-estado error" role="alert">
        <span className="material-symbols-outlined">error</span>
        <p>{t('auditoria.error')} <small>{carga.error.message}</small></p>
        <button type="button" className="ops-btn soft sm" onClick={carga.reintentar}>{t('auditoria.reintentar')}</button>
      </div>
    );
  }
  if (vacio) {
    return (
      <div className="aud-estado">
        <span className="material-symbols-outlined">inbox</span>
        <p>{t('auditoria.vacio')}</p>
        {onSimular && <button type="button" className="ops-btn primary sm" onClick={onSimular}>{t('auditoria.irSimulacion')}</button>}
      </div>
    );
  }
  return children;
}

function ChipTipo({ tipo }) {
  const i = infoTipo(tipo);
  return (
    <span className="aud-chip" style={{ '--c': colorTipo(tipo) }}>
      <span className="material-symbols-outlined">{i.icono}</span>{i.etiqueta}
    </span>
  );
}

function Kpi({ etiqueta, valor, delta, invertir = false }) {
  const bueno = delta == null ? null : invertir ? delta <= 0 : delta >= 0;
  return (
    <div className="ops-kpi aud-kpi">
      <span className="ops-kpi-label">{etiqueta}</span>
      <div className="ops-kpi-value">{valor}</div>
      <span className={`aud-delta ${bueno == null ? '' : bueno ? 'ok' : 'mal'}`}>
        {delta == null ? '— vs periodo anterior' : `${delta > 0 ? '+' : ''}${String(delta).replace('.', ',')} % vs anterior`}
      </span>
    </div>
  );
}

function Barras({ resp, etiqueta = (v) => v, color = () => VERDE, onClick }) {
  const { filas, vacio } = formatearBreakdown(resp, { etiqueta, color });
  if (vacio) return <p className="ops-empty">Sin datos</p>;
  return (
    <ul className="aud-barras">
      {filas.map((f) => (
        <li key={f.valor}>
          <button type="button" disabled={!onClick || f.valor === '__resto'} onClick={() => onClick?.(f.valor)}>
            <span className="aud-barras-nombre">{f.etiqueta}</span>
            <span className="aud-barras-n">{fmt(f.n)} · {f.pct}</span>
            <span className="aud-barras-pista"><i style={{ transform: `scaleX(${f.ancho})`, background: f.color || VERDE }} /></span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function Diff({ cambios }) {
  if (!cambios?.length) return null;
  return (
    <table className="aud-diff">
      <tbody>
        {cambios.map((c) => (
          <tr key={c.campo}>
            <th>{c.campo}</th>
            <td className="antes">{fmtValor(c.antes)}</td>
            <td aria-hidden="true">→</td>
            <td className="despues">{fmtValor(c.despues)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DetalleEvento({ evento, onClose }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [onClose]);
  if (!evento) return null;
  const campos = ['ts', 'tipo', 'fuente', 'origen', 'resultado', 'codigoError', 'mensajeError', 'actorTipo', 'actorNombre', 'actorUid',
    'entidadTipo', 'entidadNombre', 'entidadId', 'pagina', 'ruta', 'accion', 'sesionId', 'anonId', 'simRunId'];
  return (
    <div className="ops-modal-overlay" onClick={onClose}>
      <div className="ops-modal aud-detalle" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="aud-det-t">
        <h3 id="aud-det-t"><ChipTipo tipo={evento.tipo} /></h3>
        <dl className="aud-dl">
          {campos.filter((c) => evento[c] != null && evento[c] !== '').map((c) => (
            <div key={c}><dt>{c}</dt><dd>{c === 'ts' ? new Date(evento.ts).toLocaleString('es-ES') : fmtValor(evento[c])}</dd></div>
          ))}
          {evento.dispositivo && <div><dt>dispositivo</dt><dd>{[evento.dispositivo.tipo, evento.dispositivo.os, evento.dispositivo.navegador, evento.dispositivo.pais].filter(Boolean).join(' · ') || '—'}</dd></div>}
        </dl>
        <Diff cambios={evento.cambios} />
        {evento.datos && <pre className="informe-json">{JSON.stringify(evento.datos, null, 2)}</pre>}
        {evento.meta && <pre className="informe-json">{JSON.stringify(evento.meta, null, 2)}</pre>}
        <div className="ops-modal-actions"><button type="button" className="ops-btn soft sm" onClick={onClose}>Cerrar</button></div>
      </div>
    </div>
  );
}

function TablaEventos({ items, onVer, compacta = false }) {
  return (
    <div className="ops-table-wrap">
      <table className="ops-table aud-tabla">
        <thead>
          <tr><th>Fecha</th><th>Evento</th><th>Actor</th>{!compacta && <th>Entidad</th>}<th>Origen</th><th>Resultado</th></tr>
        </thead>
        <tbody>
          {items.map((e) => (
            <tr key={e.id} onClick={() => onVer(e)} tabIndex={0} onKeyDown={(k) => k.key === 'Enter' && onVer(e)}>
              <td className="num">{fmtFecha(e.ts)}</td>
              <td><ChipTipo tipo={e.tipo} />{e.cambios?.length ? <span className="aud-mini">· {e.cambios.length} cambio{e.cambios.length > 1 ? 's' : ''}</span> : null}</td>
              <td>{e.actorNombre || e.actorUid || <span className="ops-muted">anónimo</span>}{e.actorTipo === 'admin' && <span className="ops-pill info aud-mini">admin</span>}</td>
              {!compacta && <td>{e.entidadNombre || e.entidadId || '—'}</td>}
              <td><span className={`ops-pill ${e.fuente === 'sim' ? 'warn' : ''}`}>{FUENTES[e.fuente] || e.fuente}</span> <span className="ops-muted">{ORIGENES[e.origen] || e.origen}</span></td>
              <td>{e.resultado === 'error' ? <span className="ops-pill warn">error {e.codigoError || ''}</span> : 'ok'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ───────── Sub-pestañas ───────── */

function Resumen({ filtros, t, irSim, onFiltrarTipo }) {
  const ov = useCarga(() => auditoriaApi.overview(filtros), [JSON.stringify(filtros)]);
  const se = useCarga(() => auditoriaApi.series(filtros), [JSON.stringify(filtros)]);
  const k = ov.datos?.kpis;
  const d = ov.datos?.deltas || {};
  const puntos = (se.datos?.puntos || []).map((p) => ({ ...p, etiqueta: etiquetaCubo(p.clave) }));
  return (
    <Estado carga={ov} vacio={ov.datos && k.eventos === 0} t={t} onSimular={irSim}>
      {k && (
        <>
          <div className="ops-kpis aud-kpis">
            <Kpi etiqueta="Eventos" valor={fmt(k.eventos)} delta={d.eventos} />
            <Kpi etiqueta="Sesiones" valor={fmt(k.sesiones)} delta={d.sesiones} />
            <Kpi etiqueta="Usuarios activos" valor={fmt(k.usuariosActivos)} delta={d.usuariosActivos} />
            <Kpi etiqueta="% errores" valor={fmtPct(k.pctErrores)} delta={d.pctErrores} invertir />
            <Kpi etiqueta="Admins activos" valor={fmt(k.adminsActivos)} delta={d.adminsActivos} />
            <Kpi etiqueta="Accesos denegados" valor={fmt(k.accesosDenegados)} delta={d.accesosDenegados} invertir />
          </div>
          <div className="ops-grid-8-4">
            <div className="ops-card">
              <div className="ops-card-head"><div><h2>Eventos por periodo</h2><p className="ops-card-sub">Real y simulado apilados · {se.datos?.granularidad || ''}</p></div></div>
              {se.cargando && !se.datos ? <Esqueleto /> : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={puntos} margin={{ top: 10, right: 6, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="audReal" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={VERDE} stopOpacity={0.35} /><stop offset="100%" stopColor={VERDE} stopOpacity={0} /></linearGradient>
                      <linearGradient id="audSim" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={ORO} stopOpacity={0.3} /><stop offset="100%" stopColor={ORO} stopOpacity={0} /></linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="var(--chart-grid, #e3e9f5)" strokeDasharray="4 4" />
                    <XAxis dataKey="etiqueta" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--chart-tick, #6f7a72)' }} minTickGap={14} />
                    <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--chart-tick, #6f7a72)' }} />
                    <Tooltip content={<GlassTooltip />} />
                    <Area type="monotone" dataKey="sim" stackId="1" name="Simulado" stroke={ORO} fill="url(#audSim)" strokeWidth={2} animationDuration={700} />
                    <Area type="monotone" dataKey="real" stackId="1" name="Real" stroke={VERDE} fill="url(#audReal)" strokeWidth={2.5} animationDuration={700} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="ops-card">
              <div className="ops-card-head"><div><h2>Top tipos</h2><p className="ops-card-sub">Pulsa uno para filtrar la vista</p></div></div>
              <Barras resp={{ total: k.eventos, items: ov.datos.porTipo }} etiqueta={etiquetaTipo} color={colorTipo} onClick={onFiltrarTipo} />
              <h3 className="aud-h3">Por origen</h3>
              <Barras resp={{ total: k.eventos, items: ov.datos.porOrigen }} etiqueta={(v) => ORIGENES[v] || v} />
            </div>
          </div>
        </>
      )}
    </Estado>
  );
}

const DIMS_ACTIVIDAD = [
  ['dispositivo.tipo', 'Dispositivo'], ['dispositivo.os', 'Sistema'], ['dispositivo.navegador', 'Navegador'], ['pagina', 'Página'], ['pais', 'País'],
];
const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function Actividad({ filtros, t, irSim }) {
  const [gran, setGran] = useState('');
  const f = gran ? { ...filtros, granularidad: gran } : filtros;
  const se = useCarga(() => auditoriaApi.series(f), [JSON.stringify(f)]);
  const act = useCarga(() => auditoriaApi.actividad(filtros), [JSON.stringify(filtros)]);
  const dims = useCarga(() => Promise.all(DIMS_ACTIVIDAD.map(([dimension]) => auditoriaApi.breakdown({ ...filtros, dimension, top: 6 }))), [JSON.stringify(filtros)]);
  const puntos = (se.datos?.puntos || []).map((p) => ({ ...p, etiqueta: etiquetaCubo(p.clave) }));
  const max = Math.max(1, ...(act.datos?.calor || []).flat());
  const vacio = se.datos && !puntos.some((p) => p.eventos > 0);
  return (
    <Estado carga={se} vacio={vacio} t={t} onSimular={irSim}>
      <div className="ops-card">
        <div className="ops-card-head">
          <div><h2>Actividad por periodo</h2><p className="ops-card-sub">Sesiones y usuarios únicos por cubo</p></div>
          <div className="ops-seg" role="tablist" aria-label="Granularidad">
            {[['', 'Auto'], ['dia', 'Día'], ['semana', 'Semana'], ['mes', 'Mes']].map(([g, n]) => (
              <button key={n} type="button" role="tab" aria-selected={gran === g} className={gran === g ? 'active' : ''} onClick={() => setGran(g)}>{n}</button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={puntos} margin={{ top: 10, right: 6, left: -16, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid, #e3e9f5)" strokeDasharray="4 4" />
            <XAxis dataKey="etiqueta" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--chart-tick, #6f7a72)' }} minTickGap={10} />
            <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--chart-tick, #6f7a72)' }} />
            <Tooltip content={<GlassTooltip />} cursor={{ fill: 'rgba(14,107,71,0.06)' }} />
            <Bar dataKey="sesiones" name="Sesiones" fill={VERDE} radius={[6, 6, 2, 2]} maxBarSize={28} animationDuration={700} />
            <Bar dataKey="usuarios" name="Usuarios" fill={ORO} radius={[6, 6, 2, 2]} maxBarSize={28} animationDuration={700} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="aud-dims">
        {DIMS_ACTIVIDAD.map(([dim, nombre], i) => (
          <div className="ops-card" key={dim}>
            <h3 className="aud-h3">{nombre}</h3>
            {dims.cargando && !dims.datos ? <Esqueleto /> : <Barras resp={dims.datos?.[i]} />}
          </div>
        ))}
      </div>

      <div className="ops-grid-2">
        <div className="ops-card">
          <div className="ops-card-head"><div><h2>Mapa de calor</h2><p className="ops-card-sub">Eventos por día de la semana y hora (UTC)</p></div></div>
          {act.datos ? (
            <div className="aud-calor" role="img" aria-label="Mapa de calor de actividad">
              <span />
              {Array.from({ length: 24 }, (_, h) => <span key={`h${h}`} className="aud-calor-h">{h % 3 === 0 ? h : ''}</span>)}
              {act.datos.calor.map((fila, d) => [
                <span key={`d${d}`} className="aud-calor-d">{DIAS[d]}</span>,
                ...fila.map((v, h) => <i key={`${d}-${h}`} title={`${DIAS[d]} ${h}:00 · ${v} eventos`} style={{ opacity: v ? 0.12 + 0.88 * (v / max) : 0.05 }} />),
              ])}
            </div>
          ) : <Esqueleto />}
        </div>
        <div className="ops-card">
          <div className="ops-card-head"><div><h2>Embudos</h2><p className="ops-card-sub">Sesiones que llegan a cada paso</p></div></div>
          {act.datos ? Object.entries(act.datos.funnels).map(([nombre, pasos]) => (
            <div key={nombre} className="aud-funnel">
              <h3 className="aud-h3">{nombre === 'registro' ? 'Registro' : 'Reserva'}</h3>
              {pasos.map((p, i) => {
                const base = pasos[0].sesiones;
                return (
                  <div key={p.paso} className="aud-funnel-paso">
                    <span>{etiquetaTipo(p.paso)}</span>
                    <span className="aud-barras-pista"><i style={{ transform: `scaleX(${base ? p.sesiones / base : 0})`, background: i === pasos.length - 1 ? ORO : VERDE }} /></span>
                    <strong>{fmt(p.sesiones)}</strong>
                    <small>{base ? `${Math.round((p.sesiones / base) * 100)} %` : '—'}</small>
                  </div>
                );
              })}
            </div>
          )) : <Esqueleto />}
        </div>
      </div>
    </Estado>
  );
}

function Timeline({ uid, onClose }) {
  const tl = useCarga(() => auditoriaApi.timeline(uid), [uid]);
  const [ver, setVer] = useState(null);
  return (
    <div className="ops-card aud-timeline">
      <div className="ops-card-head">
        <div><h2>Timeline · {uid}</h2><p className="ops-card-sub">{tl.datos ? `${tl.datos.total} eventos, incluidos los cambios que le hicieron los admins` : ''}</p></div>
        <button type="button" className="ops-btn soft sm" onClick={onClose}>Cerrar</button>
      </div>
      {tl.cargando && !tl.datos ? <Esqueleto /> : (
        <ol className="aud-tl">
          {(tl.datos?.items || []).map((e) => (
            <li key={e.id} style={{ '--c': colorTipo(e.tipo) }}>
              <button type="button" onClick={() => setVer(e)}>
                <span className="aud-tl-fecha">{fmtFecha(e.ts)}</span>
                <ChipTipo tipo={e.tipo} />
                {e.actorTipo === 'admin' && e.actorUid !== uid && <span className="ops-pill info">por {e.actorNombre || e.actorUid}</span>}
              </button>
              <Diff cambios={e.cambios} />
            </li>
          ))}
        </ol>
      )}
      <DetalleEvento evento={ver} onClose={() => setVer(null)} />
    </div>
  );
}

function Usuarios({ filtros, t, irSim, uidSel, onSel }) {
  const us = useCarga(() => auditoriaApi.usuarios(filtros), [JSON.stringify(filtros)]);
  const [q, setQ] = useState('');
  const lista = (us.datos?.items || []).filter((u) => !q || `${u.uid} ${u.nombre || ''}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      {uidSel && <Timeline uid={uidSel} onClose={() => onSel('')} />}
      <Estado carga={us} vacio={us.datos && us.datos.items.length === 0} t={t} onSimular={irSim}>
        <div className="ops-card">
          <div className="ops-card-head">
            <div><h2>Usuarios ({fmt(lista.length)})</h2><p className="ops-card-sub">Última actividad, nº de eventos, último login y dispositivo</p></div>
            <input className="ops-input" type="search" placeholder="Buscar uid o nombre…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="ops-table-wrap">
            <table className="ops-table aud-tabla">
              <thead><tr><th>Usuario</th><th>Origen</th><th className="num">Eventos</th><th>Última actividad</th><th>Último login</th><th>Dispositivo</th></tr></thead>
              <tbody>
                {lista.slice(0, 200).map((u) => (
                  <tr key={u.uid} onClick={() => onSel(u.uid)} tabIndex={0} onKeyDown={(k) => k.key === 'Enter' && onSel(u.uid)} className={uidSel === u.uid ? 'sel' : ''}>
                    <td><strong>{u.nombre || '—'}</strong><div className="ops-muted aud-mini">{u.uid}</div></td>
                    <td><span className={`ops-pill ${u.fuente === 'sim' ? 'warn' : ''}`}>{FUENTES[u.fuente] || '—'}</span></td>
                    <td className="num">{fmt(u.eventos)}</td>
                    <td>{fmtFecha(u.ultimaActividad)}</td>
                    <td>{fmtFecha(u.ultimoLogin)}</td>
                    <td>{u.dispositivo || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Estado>
    </>
  );
}

function Administracion({ filtros, t, irSim, actorUid, onActor }) {
  const f = { ...filtros, actorTipo: 'admin', actorUid: actorUid || undefined, limite: 200 };
  const logs = useCarga(() => auditoriaApi.logs(f), [JSON.stringify(f)]);
  const admins = useCarga(() => auditoriaApi.breakdown({ ...filtros, actorTipo: 'admin', dimension: 'actorTipo' }), [JSON.stringify(filtros)]);
  const [ver, setVer] = useState(null);
  const nombres = useMemo(() => {
    const m = new Map();
    (logs.datos?.items || []).forEach((e) => e.actorUid && m.set(e.actorUid, e.actorNombre || e.actorUid));
    return [...m.entries()];
  }, [logs.datos]);
  const acciones = (logs.datos?.items || []).filter((e) => e.tipo !== 'admin_login');
  return (
    <Estado carga={logs} vacio={logs.datos && logs.datos.total === 0} t={t} onSimular={irSim}>
      <div className="ops-card">
        <div className="ops-card-head">
          <div>
            <h2>Acciones de administración</h2>
            <p className="ops-card-sub">Quién entró y qué cambió (antes → después) · {fmt(admins.datos?.total)} eventos de admins</p>
          </div>
          <select className="ops-input" value={actorUid || ''} onChange={(e) => onActor(e.target.value)} aria-label="Admin">
            <option value="">Todos los admins</option>
            {nombres.map(([uid, n]) => <option key={uid} value={uid}>{n}</option>)}
          </select>
        </div>
        <ul className="aud-admin">
          {acciones.map((e) => (
            <li key={e.id}>
              <button type="button" onClick={() => setVer(e)}>
                <span className="aud-tl-fecha">{fmtFecha(e.ts)}</span>
                <strong>{e.actorNombre || e.actorUid || 'sistema'}</strong>
                <ChipTipo tipo={e.tipo} />
                <span className="ops-muted">{e.entidadNombre || e.entidadId || ''}</span>
                {e.fuente === 'sim' && <span className="ops-pill warn">sim</span>}
              </button>
              <Diff cambios={e.cambios} />
            </li>
          ))}
          {!acciones.length && <li className="ops-empty">Solo hay entradas de admin en este periodo, sin cambios.</li>}
        </ul>
        <p className="ops-muted">Entradas al panel en el periodo: {fmt((logs.datos?.items || []).filter((e) => e.tipo === 'admin_login').length)}</p>
      </div>
      <DetalleEvento evento={ver} onClose={() => setVer(null)} />
    </Estado>
  );
}

function Eventos({ filtros, setUrl, url, t, irSim }) {
  const [vivo, setVivo] = useState(true);
  const [primera, setPrimera] = useState([]); // se refresca cada 5 s
  const [extra, setExtra] = useState([]); // páginas cargadas con "Cargar más"
  const [cursor, setCursor] = useState(null);
  const [total, setTotal] = useState(null);
  const [st, setSt] = useState({ cargando: true, error: null });
  const [ver, setVer] = useState(null);
  const clave = JSON.stringify(filtros);

  const cargar = useCallback(async () => {
    try {
      const r = await auditoriaApi.logs({ ...filtros, limite: 50 });
      setPrimera(r.items);
      setTotal(r.total);
      setCursor((c) => c ?? r.cursor);
      setSt({ cargando: false, error: null });
    } catch (error) {
      setSt({ cargando: false, error });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  useEffect(() => { setPrimera([]); setExtra([]); setCursor(null); setSt({ cargando: true, error: null }); cargar(); }, [cargar]);
  useEffect(() => {
    if (!vivo) return undefined;
    const id = setInterval(() => { if (document.visibilityState === 'visible') cargar(); }, 5000);
    return () => clearInterval(id);
  }, [vivo, cargar]);

  async function mas() {
    const r = await auditoriaApi.logs({ ...filtros, limite: 50, cursor });
    setExtra((prev) => [...prev, ...r.items]);
    setCursor(r.cursor);
  }

  const vistos = new Set();
  const items = [...primera, ...extra].filter((e) => !vistos.has(e.id) && vistos.add(e.id));

  return (
    <div className="ops-card">
      <div className="ops-card-head">
        <div><h2>Eventos {vivo && <span className="ops-live-chip"><i />en vivo</span>}</h2><p className="ops-card-sub">{total == null ? '' : `${fmt(total)} en el periodo · refresco cada 5 s`}</p></div>
        <button type="button" className="ops-btn soft sm" onClick={() => setVivo((v) => !v)}>
          <span className="material-symbols-outlined">{vivo ? 'pause' : 'play_arrow'}</span>{vivo ? 'Pausar' : 'Reanudar'}
        </button>
      </div>
      <div className="ops-toolbar aud-filtros" role="search">
        <input className="ops-input" type="search" placeholder="Texto libre (tipo, actor, entidad, página…)" defaultValue={url.buscar || ''}
          onKeyDown={(e) => e.key === 'Enter' && setUrl({ buscar: e.currentTarget.value })} onBlur={(e) => setUrl({ buscar: e.currentTarget.value })} />
        <select className="ops-input" value={url.tipos || ''} onChange={(e) => setUrl({ tipos: e.target.value })} aria-label="Tipo">
          <option value="">Todos los tipos</option>
          {Object.entries(CATEGORIAS).map(([c, info]) => (
            <optgroup key={c} label={info.nombre}>
              {Object.entries(TIPOS).filter(([, v]) => v.categoria === c).map(([tipo, v]) => <option key={tipo} value={tipo}>{v.etiqueta}</option>)}
            </optgroup>
          ))}
        </select>
        <select className="ops-input" value={url.origen || ''} onChange={(e) => setUrl({ origen: e.target.value })} aria-label="Origen técnico">
          <option value="">Web, panel y API</option>
          {Object.entries(ORIGENES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="ops-input" value={url.resultado || ''} onChange={(e) => setUrl({ resultado: e.target.value })} aria-label="Resultado">
          <option value="">ok y error</option><option value="ok">Solo ok</option><option value="error">Solo errores</option>
        </select>
        <select className="ops-input" value={url.dispositivo || ''} onChange={(e) => setUrl({ dispositivo: e.target.value })} aria-label="Dispositivo">
          <option value="">Cualquier dispositivo</option><option value="mobile">Móvil</option><option value="tablet">Tablet</option><option value="desktop">Escritorio</option>
        </select>
        <input className="ops-input" placeholder="Actor uid" defaultValue={url.actorUid || ''} onBlur={(e) => setUrl({ actorUid: e.currentTarget.value.trim() })} />
      </div>
      <Estado carga={{ ...st, datos: items.length ? items : null, reintentar: cargar }} vacio={!st.cargando && !st.error && items.length === 0} t={t} onSimular={irSim}>
        <TablaEventos items={items} onVer={setVer} />
        {cursor && <div className="aud-mas"><button type="button" className="ops-btn soft sm" onClick={mas}>Cargar más</button></div>}
      </Estado>
      <DetalleEvento evento={ver} onClose={() => setVer(null)} />
    </div>
  );
}

function Exportar({ filtros, url }) {
  const [estado, setEstado] = useState({});
  async function exportar(periodo, formato) {
    const f = { ...filtros, periodo, formato };
    delete f.desde; delete f.hasta;
    const k = `${periodo}-${formato}`;
    try {
      if (periodo === 'todo') {
        const est = await auditoriaApi.estimarExport(f);
        const mb = est.bytesAprox / 1048576;
        if (!window.confirm(`El histórico completo son ${fmt(est.eventos)} eventos (~${mb < 1 ? `${Math.max(1, Math.round(est.bytesAprox / 1024))} KB` : `${mb.toFixed(1)} MB`}). ¿Exportar?`)) return;
      }
      setEstado((s) => ({ ...s, [k]: 'generando' }));
      const texto = await auditoriaApi.exportar(f);
      descargarTexto(`auditoria_${periodo}_${new Date().toISOString().slice(0, 10)}.${formato}`, texto, formato === 'json' ? 'application/json' : 'text/csv;charset=utf-8');
      setEstado((s) => ({ ...s, [k]: 'ok' }));
    } catch (e) {
      setEstado((s) => ({ ...s, [k]: `error: ${e.message}` }));
    }
  }
  const filtrosActivos = ['fuente', 'tipos', 'origen', 'resultado', 'actorUid', 'dispositivo', 'buscar'].filter((c) => url[c]);
  return (
    <div className="ops-card">
      <div className="ops-card-head">
        <div>
          <h2>Exportar</h2>
          <p className="ops-card-sub">El fichero lo genera el servidor con los filtros aplicados{filtrosActivos.length ? ` (${filtrosActivos.join(', ')})` : ' (sin filtros)'}. Cada exportación queda registrada en la auditoría.</p>
        </div>
      </div>
      <div className="aud-export">
        {PERIODOS.map((p) => (
          <div key={p} className="aud-export-fila">
            <strong>{{ dia: 'Día (hoy)', semana: 'Semana actual', mes: 'Mes actual', todo: 'Todo el histórico' }[p]}</strong>
            {['csv', 'json'].map((fmtx) => (
              <button key={fmtx} type="button" className={`ops-btn ${fmtx === 'csv' ? 'primary' : 'soft'} sm`} disabled={estado[`${p}-${fmtx}`] === 'generando'} onClick={() => exportar(p, fmtx)}>
                <span className="material-symbols-outlined">download</span>{fmtx.toUpperCase()}
              </button>
            ))}
            <span className="ops-muted aud-mini">{estado[`${p}-csv`] || estado[`${p}-json`] || ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Simulacion({ t, onCambio }) {
  const [est, setEst] = useState(null);
  const [totales, setTotales] = useState(null);
  const [error, setError] = useState('');
  const [anios, setAnios] = useState(2);
  const sondeo = useRef(null);

  const refrescar = useCallback(async () => {
    try {
      const [s, e] = await Promise.all([auditoriaApi.simEstado(), auditoriaApi.estado()]);
      setEst(s);
      setTotales(e.totales);
      return s;
    } catch (err) { setError(err.message); return null; }
  }, []);

  useEffect(() => { refrescar(); return () => clearInterval(sondeo.current); }, [refrescar]);

  function sondear() {
    clearInterval(sondeo.current);
    sondeo.current = setInterval(async () => {
      const s = await refrescar();
      if (s && !s.enCurso && s.sim?.estado !== 'en_curso') { clearInterval(sondeo.current); onCambio(); }
    }, 1000);
  }

  async function simular() {
    setError('');
    try { await auditoriaApi.simular({ usuarios: 100, dias: 30 }); sondear(); } catch (e) { setError(e.message); }
  }
  async function limpiar() {
    if (!window.confirm('Se borrarán SOLO los eventos simulados (fuente: sim). Los reales no se tocan. ¿Continuar?')) return;
    try { await auditoriaApi.limpiarSimulacion(est?.simRunId || null); await refrescar(); onCambio(); } catch (e) { setError(e.message); }
  }
  async function purgar() {
    if (!window.confirm(`Purga por retención: se borrarán TODOS los eventos (reales y simulados) de hace más de ${anios} años.`)) return;
    if (window.prompt('Escribe PURGAR para confirmar') !== 'PURGAR') return;
    try { const r = await auditoriaApi.purgar(anios); window.alert(`Borrados ${r.borrados} eventos.`); await refrescar(); onCambio(); } catch (e) { setError(e.message); }
  }

  const sim = est?.sim;
  const progreso = sim?.total ? sim.escritos / sim.total : 0;
  const enCurso = est?.enCurso || sim?.estado === 'en_curso';
  return (
    <div className="ops-grid-2">
      <div className="ops-card">
        <div className="ops-card-head"><div><h2>Simulación de 100 usuarios</h2><p className="ops-card-sub">Sesiones verosímiles repartidas en los últimos 30 días, con picos de comida y cena y 3 admins.</p></div></div>
        {error && <p className="ops-error" role="alert">{error}</p>}
        <div className="aud-sim-totales">
          <div><strong>{fmt(totales?.real)}</strong><span>reales</span></div>
          <div><strong>{fmt(totales?.sim)}</strong><span>simulados</span></div>
          <div><strong>{fmt(totales?.eventos)}</strong><span>total en BD</span></div>
        </div>
        {enCurso && (
          <div className="aud-progreso" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progreso * 100)}>
            <span className="aud-barras-pista"><i style={{ transform: `scaleX(${progreso})` }} /></span>
            <small>{fmt(sim?.escritos)} / {fmt(sim?.total)} eventos escritos</small>
          </div>
        )}
        {sim && !enCurso && (
          <p className="ops-muted">
            Última: <strong>{sim.estado}</strong>{sim.simRunId ? ` · ${sim.simRunId}` : ''}
            {sim.resumen ? ` · ${fmt(sim.resumen.eventos)} eventos, ${fmt(sim.resumen.sesiones)} sesiones, ${sim.resumen.dias} días, ${sim.resumen.semanas} semanas` : ''}
            {sim.borrados != null ? ` · ${fmt(sim.borrados)} borrados` : ''}
          </p>
        )}
        <div className="ops-modal-actions" style={{ justifyContent: 'flex-start' }}>
          <button type="button" className="ops-btn primary" onClick={simular} disabled={enCurso}><span className="material-symbols-outlined">group_add</span>Simular 100 usuarios</button>
          <button type="button" className="ops-btn soft" onClick={limpiar} disabled={enCurso || !totales?.sim}><span className="material-symbols-outlined">cleaning_services</span>Limpiar simulación</button>
        </div>
      </div>
      <div className="ops-card">
        <div className="ops-card-head"><div><h2>Retención</h2><p className="ops-card-sub">Purga de eventos antiguos. Pide doble confirmación y no se puede deshacer.</p></div></div>
        <label className="ops-field">Borrar eventos de hace más de
          <select className="ops-input" value={anios} onChange={(e) => setAnios(Number(e.target.value))}>
            {[1, 2, 3, 5].map((n) => <option key={n} value={n}>{n} año{n > 1 ? 's' : ''}</option>)}
          </select>
        </label>
        <button type="button" className="ops-btn danger sm" onClick={purgar}>Purgar</button>
        <p className="ops-muted" style={{ marginTop: 12 }}>{t('auditoria.excluirPropioSub')}</p>
      </div>
    </div>
  );
}

/* ───────── Contenedor ───────── */

export default function OpsAuditoria() {
  const t = useT(TRADS);
  const [url, setUrl] = useEstadoUrl();
  const [version, setVersion] = useState(null);
  const [aviso, setAviso] = useState(false);
  const [leyenda, setLeyenda] = useState(null);
  const [recarga, setRecarga] = useState(0);
  const [copiado, setCopiado] = useState(false);

  const sub = SUBS.includes(url.sub) ? url.sub : 'resumen';
  const periodo = PERIODOS.includes(url.periodo) ? url.periodo : 'mes';
  const filtros = useMemo(() => ({
    periodo, desde: url.desde, hasta: url.hasta, fuente: url.fuente, tipos: url.tipos, origen: url.origen,
    resultado: url.resultado, actorUid: sub === 'eventos' ? url.actorUid : undefined, dispositivo: url.dispositivo, buscar: url.buscar, _r: recarga,
  }), [periodo, url, sub, recarga]);
  const filtrosApi = filtros; // `_r` viaja a la API solo para forzar recarga tras simular/limpiar

  // Leyenda real/sim y control de versión: una llamada ligera (agregado cacheado en el backend).
  useEffect(() => {
    let vivo = true;
    auditoriaApi.overview({ ...filtrosApi, fuente: undefined }).then((r) => {
      if (!vivo) return;
      setLeyenda(r.porFuente);
      if (version != null && r.version !== version) setAviso(true);
      setVersion(r.version);
    }).catch(() => {});
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filtrosApi)]);

  async function copiarEnlace() {
    try { await navigator.clipboard.writeText(window.location.href); setCopiado(true); setTimeout(() => setCopiado(false), 1600); } catch { /* sin portapapeles */ }
  }

  const irSim = () => setUrl({ sub: 'simulacion' });
  const props = { filtros: filtrosApi, t, irSim };

  return (
    <div className="aud">
      <div className="ops-card aud-cabecera">
        <div className="ops-card-head">
          <div>
            <h2><span className="material-symbols-outlined">query_stats</span> {t('auditoria.titulo')}</h2>
            <p className="ops-card-sub">{t('auditoria.sub')}</p>
          </div>
          <button type="button" className="ops-btn soft sm" onClick={copiarEnlace}>
            <span className="material-symbols-outlined">link</span>{copiado ? t('auditoria.enlaceCopiado') : t('auditoria.copiarEnlace')}
          </button>
        </div>
        <div className="aud-controles">
          <div className="ops-seg" role="tablist" aria-label="Periodo">
            {PERIODOS.map((p) => (
              <button key={p} type="button" role="tab" aria-selected={periodo === p && !url.desde} className={periodo === p && !url.desde ? 'active' : ''}
                onClick={() => setUrl({ periodo: p, desde: '', hasta: '' })}>{t(`auditoria.periodo.${p}`)}</button>
            ))}
          </div>
          <label className="aud-rango">
            <span>{t('auditoria.periodo.personalizado')}</span>
            <input type="date" className="ops-input" value={url.desde || ''} onChange={(e) => setUrl({ desde: e.target.value })} />
            <input type="date" className="ops-input" value={url.hasta || ''} onChange={(e) => setUrl({ hasta: e.target.value })} />
          </label>
          <select className="ops-input" value={url.fuente || ''} onChange={(e) => setUrl({ fuente: e.target.value })} aria-label={t('auditoria.origen.label')}>
            <option value="">{t('auditoria.origen.label')}: {t('auditoria.origen.todo')}</option>
            <option value="real">{t('auditoria.origen.real')}</option>
            <option value="sim">{t('auditoria.origen.sim')}</option>
          </select>
          {url.tipos && <button type="button" className="ops-pill info aud-quitar" onClick={() => setUrl({ tipos: '' })}>{etiquetaTipo(url.tipos)} ✕</button>}
          {leyenda && <span className="aud-leyenda"><i className="real" />{t('auditoria.leyenda', { real: fmt(leyenda.real), sim: fmt(leyenda.sim) })}<i className="sim" /></span>}
        </div>
        {aviso && <p className="ops-pill warn aud-aviso">{t('auditoria.recalculando')}</p>}
        <nav className="aud-subtabs" aria-label="Sub-pestañas de auditoría">
          {SUBS.map((s) => (
            <button key={s} type="button" aria-current={sub === s ? 'page' : undefined} className={sub === s ? 'active' : ''} onClick={() => setUrl({ sub: s, uid: s === 'usuarios' ? url.uid : '' })}>
              {t(`auditoria.subtabs.${s}`)}
            </button>
          ))}
        </nav>
      </div>

      {sub === 'resumen' && <Resumen {...props} onFiltrarTipo={(tipo) => setUrl({ tipos: tipo, sub: 'eventos' })} />}
      {sub === 'actividad' && <Actividad {...props} />}
      {sub === 'usuarios' && <Usuarios {...props} uidSel={url.uid} onSel={(uid) => setUrl({ uid })} />}
      {sub === 'administracion' && <Administracion {...props} actorUid={url.actorUid} onActor={(actorUid) => setUrl({ actorUid })} />}
      {sub === 'eventos' && <Eventos {...props} url={url} setUrl={setUrl} />}
      {sub === 'exportar' && <Exportar {...props} url={url} />}
      {sub === 'simulacion' && <Simulacion t={t} onCambio={() => setRecarga((r) => r + 1)} />}
    </div>
  );
}

