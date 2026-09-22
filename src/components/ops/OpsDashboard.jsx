/** OpsDashboard — vista "Dashboard General" (la de la imagen), con datos reales. */
import { useEffect, useState } from 'react';
import { getOpsOverview, nombreRestauranteDe, descargarCSV, csvReservas, mensajeErrorFirestore } from './opsData.js';
import { OpsLineChart, OpsDonut, OpsHBars } from './OpsCharts.jsx';
import { resolverIncidencia } from '../../services/incidenciaApi.js';
import { aprobarNegocio, rechazarNegocio } from '../../services/negocioApi.js';

function euros(n) {
  return `${Number(n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function antiguedad(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  const min = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
  if (min < 1) return 'ahora mismo';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  return h < 24 ? `hace ${h} h` : `hace ${Math.round(h / 24)} d`;
}

export default function OpsDashboard() {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [granularidad, setGranularidad] = useState('dias');
  const [resolviendo, setResolviendo] = useState('');

  useEffect(() => {
    let vivo = true;
    getOpsOverview()
      .then((d) => { if (vivo) { setDatos(d); setCargando(false); } })
      .catch((e) => { if (vivo) { setError(mensajeErrorFirestore(e, 'reservas')); setCargando(false); } });
    return () => { vivo = false; };
  }, []);

  async function resolver(item) {
    setError('');
    setResolviendo(item.id);
    try {
      if (item.kind === 'negocio') {
        await aprobarNegocio(item.id);
      } else {
        await resolverIncidencia(item.id);
      }
      setDatos((prev) => ({
        ...prev,
        incidenciasPreview: prev.incidenciasPreview.filter((x) => x.id !== item.id),
        kpis: { ...prev.kpis, incidenciasPendientes: Math.max(0, prev.kpis.incidenciasPendientes - 1) },
      }));
    } catch (e) {
      setError(e.message);
    } finally {
      setResolviendo('');
    }
  }

  async function rechazar(item) {
    setError('');
    setResolviendo(item.id);
    try {
      await rechazarNegocio(item.id);
      setDatos((prev) => ({
        ...prev,
        incidenciasPreview: prev.incidenciasPreview.filter((x) => x.id !== item.id),
        kpis: { ...prev.kpis, incidenciasPendientes: Math.max(0, prev.kpis.incidenciasPendientes - 1) },
      }));
    } catch (e) {
      setError(e.message);
    } finally {
      setResolviendo('');
    }
  }

  if (cargando) {
    return (
      <div className="ops-card" role="status">
        <h2>Cargando operativa…</h2>
        <p className="ops-card-sub">Agregando reservas, restaurantes e incidencias.</p>
      </div>
    );
  }
  if (error && !datos) {
    return (
      <div className="ops-card" role="alert">
        <h2>No se pudo cargar el panel</h2>
        <p className="ops-error">{error}</p>
      </div>
    );
  }

  const { kpis, serie, porEstado, ocupacion, incidenciasPreview, top, feed, avisos = [] } = datos;
  const estadosDonut = [
    { nombre: 'Confirmadas', valor: (porEstado.confirmada || 0) + (porEstado.completada || 0), color: '#0e6b47' },
    { nombre: 'Pendientes', valor: porEstado.pendiente || 0, color: '#6bfe9c' },
    { nombre: 'Canceladas', valor: porEstado.cancelada || 0, color: '#c9a227' },
    { nombre: 'No-show', valor: porEstado.no_show || 0, color: '#ba1a1a' },
  ];
  const totalPax = serie.reduce((s, d) => s + d.pax, 0);

  return (
    <>
      {error && <p className="ops-error" role="alert">{error}</p>}
      {avisos.length > 0 && (
        <p className="ops-error" role="alert">
          Sin permiso de lectura en: {avisos.join(', ')}. Se muestra el resto con datos reales.
          Pide al admin de Firebase que añada lectura de operador en las reglas (ver firestore.rules del repo).
        </p>
      )}

      {/* Hero */}
      <div className="ops-hero">
        <div>
          <span className="ops-live-chip"><i />MIRA Enterprise HQ</span>{' '}
          <span className="ops-sync">· Sincronización en vivo</span>
          <h1>Panel de Control Operativo &amp; Revenue</h1>
          <p>Visión global en tiempo real de reservas, comisiones estimadas y estado de la red gastronómica.</p>
        </div>
        <div className="ops-actions">
          <button type="button" className="ops-btn soft" onClick={() => { const c = csvReservas(feed); descargarCSV('facturas.csv', c.cabeceras, c.filas); }}>
            <span className="material-symbols-outlined">download</span>Descargar Facturas
          </button>
          <button type="button" className="ops-btn soft" onClick={() => { const c = csvReservas(feed); descargarCSV('reporte-fiscal.csv', c.cabeceras, c.filas); }}>
            <span className="material-symbols-outlined">file_present</span>Exportar Reporte Fiscal
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="ops-kpis">
        <div className="ops-kpi">
          <div className="ops-kpi-top">
            <span className="ops-kpi-label">Ingresos Comisión (est.)</span>
            <span className="material-symbols-outlined ops-kpi-icon">euro</span>
          </div>
          <div className="ops-kpi-value">€{euros(kpis.comisionTotal)}</div>
          <div className="ops-kpi-trend"><span className="ops-pill">8% base</span><span>por reserva</span></div>
          <div className="ops-kpi-sub"><span>Media comensal</span><strong>€2.10 net</strong></div>
          <div className="ops-bar"><i style={{ width: '72%' }} /></div>
        </div>
        <div className="ops-kpi">
          <div className="ops-kpi-top">
            <span className="ops-kpi-label">Reservas Globales</span>
            <span className="material-symbols-outlined ops-kpi-icon green">event_available</span>
          </div>
          <div className="ops-kpi-value">{kpis.reservasTotal.toLocaleString('es-ES')}</div>
          <div className="ops-kpi-trend"><span className="ops-pill">{kpis.asistenciaPct}% asistencia</span></div>
          <div className="ops-kpi-sub"><span>Tasa asistencia</span><strong>{kpis.asistenciaPct}%</strong></div>
          <div className="ops-bar"><i style={{ width: `${Math.min(100, kpis.asistenciaPct)}%` }} /></div>
        </div>
        <div className="ops-kpi">
          <div className="ops-kpi-top">
            <span className="ops-kpi-label">Restaurantes Activos</span>
            <span className="material-symbols-outlined ops-kpi-icon blue">storefront</span>
          </div>
          <div className="ops-kpi-value">{kpis.restaurantesActivos.toLocaleString('es-ES')} <small>locales</small></div>
          <div className="ops-kpi-trend"><span className="ops-pill info">red en Firestore</span></div>
          <div className="ops-kpi-sub"><span>Cubiertos 14 días</span><strong>{totalPax.toLocaleString('es-ES')} pax</strong></div>
          <div className="ops-bar"><i className="blue" style={{ width: '98%' }} /></div>
        </div>
        <div className="ops-kpi">
          <div className="ops-kpi-top">
            <span className="ops-kpi-label">Disputas &amp; Soporte</span>
            <span className="material-symbols-outlined ops-kpi-icon red">warning</span>
          </div>
          <div className="ops-kpi-value danger">{kpis.incidenciasPendientes} <small>Pendientes</small></div>
          <div className="ops-kpi-trend"><span className="ops-pill warn">{kpis.criticas} críticas</span><span>no-show / cargo</span></div>
          <div className="ops-kpi-sub"><span>Por revisar</span><strong>{kpis.incidenciasPendientes}</strong></div>
          <div className="ops-bar"><i className="red" style={{ width: `${Math.min(100, kpis.incidenciasPendientes * 10)}%` }} /></div>
        </div>
        <div className="ops-kpi">
          <div className="ops-kpi-top">
            <span className="ops-kpi-label">Comunidad MIRA</span>
            <span className="material-symbols-outlined ops-kpi-icon green">loyalty</span>
          </div>
          <div className="ops-kpi-value">{kpis.usuariosTotal.toLocaleString('es-ES')} <small>users</small></div>
          <div className="ops-kpi-trend"><span className="ops-pill info">puntos MIRA</span></div>
          <div className="ops-kpi-sub"><span>Comensales</span><strong>red activa</strong></div>
          <div className="ops-bar"><i style={{ width: '78%' }} /></div>
        </div>
      </div>

      {/* Gráfica + donut */}
      <div className="ops-grid-8-4">
        <div className="ops-card">
          <div className="ops-card-head">
            <div>
              <h2>Evolución de Comisiones y Facturación Bruta</h2>
              <p className="ops-card-sub">Comida (13–15h) y cena (20–22h) · últimos 14 días · comisiones estimadas al 8%</p>
            </div>
            <div className="ops-seg" role="tablist" aria-label="Granularidad">
              {['horas', 'dias', 'meses'].map((g) => (
                <button key={g} type="button" role="tab" aria-selected={granularidad === g}
                  className={granularidad === g ? 'active' : ''} onClick={() => setGranularidad(g)}>
                  {g === 'horas' ? 'Horas' : g === 'dias' ? 'Días' : 'Meses'}
                </button>
              ))}
            </div>
          </div>
          <div className="ops-metrics-3">
            <div>
              <span className="ops-metric-label"><span className="ops-metric-dot" style={{ background: '#0e6b47' }} />Comisiones MIRA (est.)</span>
              <div className="ops-metric-value">€{euros(kpis.comisionTotal)}</div>
            </div>
            <div>
              <span className="ops-metric-label"><span className="ops-metric-dot" style={{ background: '#004393' }} />Cubiertos 14 días</span>
              <div className="ops-metric-value">{totalPax.toLocaleString('es-ES')}</div>
            </div>
            <div>
              <span className="ops-metric-label"><span className="ops-metric-dot" style={{ background: '#006d37' }} />Asistencia</span>
              <div className="ops-metric-value">{kpis.asistenciaPct}%</div>
            </div>
          </div>
          <OpsLineChart serie={serie} modo={granularidad} />
        </div>
        <div className="ops-card">
          <div className="ops-card-head">
            <div>
              <h2>Estado de Reservas</h2>
              <p className="ops-card-sub">Distribución real por estado</p>
            </div>
            <span className="material-symbols-outlined" style={{ color: 'var(--ops-outline)' }}>devices</span>
          </div>
          <OpsDonut segmentos={estadosDonut} centro={kpis.reservasTotal} centroSub="PAX" />
          <div style={{ background: 'var(--ops-surface-low)', borderRadius: 8, padding: '12px 14px', marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700 }}>
              <span style={{ color: 'var(--ops-on-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ocupación por servicio (7 días)</span>
              <span style={{ color: 'var(--ops-primary)' }}>Capacidad sala</span>
            </div>
            <div style={{ marginTop: 10 }}>
              <OpsHBars filas={[
                { nombre: 'Comida (13:00 - 15:00)', valor: ocupacion.comida.pax, texto: `${ocupacion.comida.pax} pax`, clase: '' },
                { nombre: 'Cena (20:00 - 22:00)', valor: ocupacion.cena.pax, texto: `${ocupacion.cena.pax} pax (pico)`, clase: 'blue' },
              ]} />
            </div>
          </div>
        </div>
      </div>

      {/* Incidencias + Top */}
      <div className="ops-grid-2">
        <div className="ops-card">
          <div className="ops-card-head">
            <h2><span style={{ color: 'var(--ops-error)' }}>●</span> Incidencias &amp; Disputas Operativas</h2>
            {kpis.criticas > 0 && <span className="ops-pill warn">{kpis.criticas} críticas de atención inmediata</span>}
          </div>
          <div className="ops-inc-list">
            {incidenciasPreview.length === 0 && <p className="ops-empty">Sin incidencias pendientes. Todo en orden.</p>}
            {incidenciasPreview.map((it) => (
              <div className="ops-inc" key={`${it.kind}-${it.id}`}>
                <div className="ops-inc-main">
                  <span className={`material-symbols-outlined ops-inc-icon ${it.kind === 'negocio' ? 'grey' : 'red'}`}>
                    {it.kind === 'negocio' ? 'loyalty' : 'credit_card_off'}
                  </span>
                  <div>
                    <div className="ops-inc-title">
                      {it.nombre || it.nombreRestaurante || 'Incidencia'}
                      <span className="ops-pill warn">{it.kind === 'negocio' ? 'Nuevo local' : (it.motivo || 'Soporte')}</span>
                    </div>
                    <p className="ops-inc-text">
                      {it.kind === 'negocio'
                        ? `${it.ciudad || ''} · ${(it.categorias || []).join(', ')} · propuesta de empresa pendiente de revisión.`
                        : (it.mensaje || '').slice(0, 140)}
                    </p>
                    <div className="ops-inc-meta">
                      <span>{it.email || ''}</span>
                      <span>·</span>
                      <span>{antiguedad(it.creado)}</span>
                    </div>
                  </div>
                </div>
                <div className="ops-inc-actions">
                  <button type="button" className="ops-btn primary sm" disabled={resolviendo === it.id} onClick={() => resolver(it)}>
                    {it.kind === 'negocio' ? 'Aprobar' : 'Resolver'}
                  </button>
                  {it.kind === 'negocio' && (
                    <button type="button" className="ops-btn soft sm" disabled={resolviendo === it.id} onClick={() => rechazar(it)}>
                      Rechazar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="ops-card-foot">
            <span className="ops-muted">{kpis.incidenciasPendientes} totales pendientes</span>
          </div>
        </div>

        <div className="ops-card">
          <div className="ops-card-head">
            <div>
              <h2>Top Cubiertos de Hoy &amp; Auditoría</h2>
              <p className="ops-card-sub">Comisiones estimadas al 8% sobre 18 €/pax</p>
            </div>
          </div>
          <div className="ops-table-wrap">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Restaurante</th>
                  <th style={{ textAlign: 'right' }}>Cubiertos hoy</th>
                  <th style={{ textAlign: 'right' }}>Comisión est.</th>
                  <th style={{ textAlign: 'right' }}>Reservas</th>
                </tr>
              </thead>
              <tbody>
                {top.length === 0 && (
                  <tr><td colSpan="4" className="ops-empty">Sin servicio hoy todavía.</td></tr>
                )}
                {top.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <span className="ops-rest-cell">
                        <span className="ops-rest-ini">{(t.nombre || '?').slice(0, 2).toUpperCase()}</span>
                        <strong>{t.nombre}</strong>
                      </span>
                    </td>
                    <td className="num">{t.paxHoy} pax</td>
                    <td className="num">€{euros(t.comisionEst)}</td>
                    <td className="num">{t.reservasHoy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="ops-card-foot">
            <span className="ops-muted">Red global operacional</span>
          </div>
        </div>
      </div>

      {/* Feed en vivo */}
      <div className="ops-card">
        <div className="ops-card-head">
          <h2><span style={{ color: 'var(--ops-secondary)' }}>●</span> Feed de Reservas en Tiempo Real (Live Ops)</h2>
          <span className="ops-pill">Flujo de reservas activo</span>
        </div>
        <div className="ops-feed">
          {feed.length === 0 && <p className="ops-empty">Sin reservas registradas todavía.</p>}
          {feed.map((r) => (
            <div className="ops-feed-card" key={r.id}>
              <div className="ops-feed-top">
                <span className="ops-feed-id">#{r.codigo || r.id.slice(0, 6).toUpperCase()}</span>
                <span className={`ops-status-pill ${(r.estado === 'cancelada' || r.estado === 'no_show') ? 'danger' : (r.estado === 'pendiente' ? 'info' : '')}`}>
                  {r.estado === 'completada' ? 'Completada' : r.estado === 'cancelada' ? 'Cancelada' : r.estado === 'no_show' ? 'No-show' : r.estado === 'confirmada' ? 'Confirmada' : 'Pendiente'}
                </span>
              </div>
              <div>
                <div className="ops-feed-name">{r.usuarioNombre || r.usuarioEmail || 'Comensal'}</div>
                <div className="ops-feed-rest">{nombreRestauranteDe(r)}</div>
                <div className="ops-feed-meta">
                  <span className="material-symbols-outlined">schedule</span>
                  <span>{r.fecha} {r.hora}</span>
                  <span>·</span>
                  <span className="material-symbols-outlined">group</span>
                  <span>{r.comensales} pax</span>
                </div>
              </div>
              <div className="ops-feed-foot">
                <span>Comisión neta est.:</span>
                <strong>+€{Number(r.comision).toFixed(2)}</strong>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
