/** OpsDashboard — vista "Dashboard General" (la de la imagen), con datos reales. */
import { useEffect, useState } from 'react';
import { getOpsOverview, nombreRestauranteDe, mensajeErrorFirestore } from './opsData.js';
import { OpsLineChart, OpsDonut, OpsHBars } from './OpsCharts.jsx';
import { resolverIncidencia } from '../../services/incidenciaApi.js';
import { aprobarNegocio, rechazarNegocio } from '../../services/negocioApi.js';
import DocumentoFiscal from '../fiscal/DocumentoFiscal.jsx';
import CountUp from './CountUp.jsx';
import { useT } from '../../i18n/index.jsx';
import es from '../../i18n/es.js';
import ca from '../../i18n/ca.js';
import en from '../../i18n/en.js';
import TestReservas from '../TestReservas.jsx';

const TRADS = { es, ca, en };

function euros(n, locale) {
  return `${Number(n || 0).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function antiguedad(ts, t) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  const min = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
  if (min < 1) return t('ops.ahoraMismo');
  if (min < 60) return t('ops.haceMin', { n: min });
  const h = Math.round(min / 60);
  return h < 24 ? t('ops.haceH', { n: h }) : t('ops.haceD', { n: Math.round(h / 24) });
}

export default function OpsDashboard({ demo = null, esAdmin = false, todos = [] }) {
  const t = useT(TRADS);
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [granularidad, setGranularidad] = useState('dias');
  const [resolviendo, setResolviendo] = useState('');
  const [documento, setDocumento] = useState(null);
  const [verTest, setVerTest] = useState(false);

  useEffect(() => {
    if (demo) { setDatos(demo); setCargando(false); return undefined; }
    let vivo = true;
    getOpsOverview()
      .then((d) => { if (vivo) { setDatos(d); setCargando(false); } })
      .catch((e) => { if (vivo) { setError(mensajeErrorFirestore(e, 'reservas')); setCargando(false); } });
    return () => { vivo = false; };
  }, [demo]);

  async function resolver(item) {
    setError('');
    setResolviendo(item.id);
    try {
      if (demo) {
        // modo presentación: no se toca la base de datos
      } else if (item.kind === 'negocio') {
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
      if (!demo) await rechazarNegocio(item.id);
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
        <h2>{t('ops.cargandoOperativa')}</h2>
        <p className="ops-card-sub">{t('ops.cargandoOperativaSub')}</p>
      </div>
    );
  }
  if (error && !datos) {
    return (
      <div className="ops-card" role="alert">
        <h2>{t('ops.errorPanel')}</h2>
        <p className="ops-error">{error}</p>
      </div>
    );
  }

  const { kpis, serie, porEstado, ocupacion, incidenciasPreview, top, feed, avisos = [] } = datos;
  const LOC = t('modelos.locale');
  const estadosDonut = [
    { nombre: t('ops.confirmadas'), valor: (porEstado.confirmada || 0) + (porEstado.completada || 0), color: '#0e6b47' },
    { nombre: t('ops.pendientes'), valor: porEstado.pendiente || 0, color: '#6bfe9c' },
    { nombre: t('ops.canceladas'), valor: porEstado.cancelada || 0, color: '#c9a227' },
    { nombre: t('ops.estadoNoShow'), valor: porEstado.no_show || 0, color: '#ba1a1a' },
  ];
  const totalPax = serie.reduce((s, d) => s + d.pax, 0);
  const facturacionTotal = Number(kpis.facturacionTotal) || 0;
  const comisionTotal = Number(kpis.comisionTotal) || 0;
  const mediaComensal = Number(kpis.mediaComensal) || 0;
  const comisionPct = Number(kpis.comisionPct) || 8;
  const ticketPromedio = Number(kpis.ticketPromedio) || 0;
  const ticketsTotal = Number(kpis.ticketsTotal) || 0;
  const altas7d = Number(kpis.altas7d) || 0;

  return (
    <>
      {error && <p className="ops-error" role="alert">{error}</p>}
      {documento && (
        <DocumentoFiscal tipo={documento} comisionPct={comisionPct}
          restaurante={documento === 'factura' ? { nombre: top[0]?.nombre || 'Can Solé', ciudad: 'Barcelona' } : null}
          onClose={() => setDocumento(null)} />
      )}
      {avisos.length > 0 && (
        <p className="ops-error" role="alert">
          {t('ops.sinPermisoLectura', { lista: avisos.join(', ') })}
        </p>
      )}

      {/* Hero */}
      <div className="ops-hero">
        <div>
          <span className="ops-live-chip"><i />MIRA Enterprise HQ</span>{' '}
          <span className="ops-sync">{t('ops.syncVivo')}</span>
          <h1>{t('ops.panelTitulo')}</h1>
          <p>{t('ops.panelSub')}</p>
        </div>
        <div className="ops-actions">
          <button type="button" className="ops-btn soft" onClick={() => setDocumento('factura')}>
            <span className="material-symbols-outlined">download</span>{t('ops.descargarFacturas')}
          </button>
          <button type="button" className="ops-btn soft" onClick={() => setDocumento('fiscal')}>
            <span className="material-symbols-outlined">file_present</span>{t('ops.exportarReporte')}
          </button>
          {esAdmin && (
            <button
              type="button"
              className={verTest ? 'ops-btn primary' : 'ops-btn soft'}
              onClick={() => setVerTest((v) => !v)}
              aria-expanded={verTest}
            >
              <span className="material-symbols-outlined">science</span>Data test
            </button>
          )}
        </div>
      </div>

      {/* Data test: 10 usuarios de prueba + sus reservas (no toca la sesión) */}
      {verTest && (
        <TestReservas esAdmin={esAdmin} todos={todos} onOcultar={() => setVerTest(false)} />
      )}

      {/* KPIs */}
      <div className="ops-kpis">
        <div className="ops-kpi">
          <div className="ops-kpi-top">
            <span className="ops-kpi-label">{t('ops.ingresosBrutos')}</span>
            <span className="material-symbols-outlined ops-kpi-icon">euro</span>
          </div>
          <div className="ops-kpi-value">€<CountUp valor={facturacionTotal} decimales={2} /></div>
          <div className="ops-kpi-trend"><span className="ops-pill">{t('ops.nTickets', { n: ticketsTotal })}</span></div>
          <div className="ops-kpi-sub"><span>{t('ops.ticketMedio')}</span><strong>€{euros(ticketPromedio, LOC)}</strong></div>
          <div className="ops-bar"><i style={{ width: ticketsTotal ? '100%' : '0%' }} /></div>
        </div>
        <div className="ops-kpi">
          <div className="ops-kpi-top">
            <span className="ops-kpi-label">{t('ops.comisionMiraReal')}</span>
            <span className="material-symbols-outlined ops-kpi-icon">receipt_long</span>
          </div>
          <div className="ops-kpi-value">€<CountUp valor={comisionTotal} decimales={2} /></div>
          <div className="ops-kpi-trend"><span className="ops-pill">{t('ops.pctBase', { pct: comisionPct })}</span></div>
          <div className="ops-kpi-sub"><span>{t('ops.mediaComensal')}</span><strong>€{euros(mediaComensal, LOC)}</strong></div>
          <div className="ops-bar"><i style={{ width: facturacionTotal ? '100%' : '0%' }} /></div>
        </div>
        <div className="ops-kpi">
          <div className="ops-kpi-top">
            <span className="ops-kpi-label">{t('ops.reservasGlobalesKpi')}</span>
            <span className="material-symbols-outlined ops-kpi-icon green">event_available</span>
          </div>
          <div className="ops-kpi-value"><CountUp valor={kpis.reservasTotal} /></div>
          <div className="ops-kpi-trend"><span className="ops-pill">{t('ops.pctAsistencia', { n: kpis.asistenciaPct })}</span></div>
          <div className="ops-kpi-sub"><span>{t('ops.tasaAsistencia')}</span><strong>{kpis.asistenciaPct}%</strong></div>
          <div className="ops-bar"><i style={{ width: `${Math.min(100, kpis.asistenciaPct)}%` }} /></div>
        </div>
        <div className="ops-kpi">
          <div className="ops-kpi-top">
            <span className="ops-kpi-label">{t('ops.restaurantesActivos')}</span>
            <span className="material-symbols-outlined ops-kpi-icon blue">storefront</span>
          </div>
          <div className="ops-kpi-value"><CountUp valor={kpis.restaurantesActivos} /> <small>{t('ops.locales')}</small></div>
          <div className="ops-kpi-trend"><span className="ops-pill info">{t('ops.altas7d', { n: altas7d })}</span></div>
          <div className="ops-kpi-sub"><span>{t('ops.cubiertos14')}</span><strong>{totalPax.toLocaleString(LOC)} pax</strong></div>
          <div className="ops-bar"><i className="blue" style={{ width: kpis.restaurantesActivos ? '100%' : '0%' }} /></div>
        </div>
        <div className="ops-kpi">
          <div className="ops-kpi-top">
            <span className="ops-kpi-label">{t('ops.disputasSoporte')}</span>
            <span className="material-symbols-outlined ops-kpi-icon red">warning</span>
          </div>
          <div className="ops-kpi-value danger">{kpis.incidenciasPendientes} <small>{t('ops.pendientes')}</small></div>
          <div className="ops-kpi-trend"><span className="ops-pill warn">{t('ops.criticas', { n: kpis.criticas })}</span><span>{t('ops.noShowCargo')}</span></div>
          <div className="ops-kpi-sub"><span>{t('ops.porRevisar')}</span><strong>{kpis.incidenciasPendientes}</strong></div>
          <div className="ops-bar"><i className="red" style={{ width: `${Math.min(100, kpis.incidenciasPendientes * 10)}%` }} /></div>
        </div>
        <div className="ops-kpi">
          <div className="ops-kpi-top">
            <span className="ops-kpi-label">Comunidad MIRA</span>
            <span className="material-symbols-outlined ops-kpi-icon green">loyalty</span>
          </div>
          <div className="ops-kpi-value"><CountUp valor={kpis.usuariosTotal} /> <small>{t('ops.users')}</small></div>
          <div className="ops-kpi-trend"><span className="ops-pill info">{t('ops.puntosMira')}</span></div>
          <div className="ops-kpi-sub"><span>{t('ops.comensales')}</span><strong>{t('ops.redActiva')}</strong></div>
          <div className="ops-bar"><i style={{ width: kpis.usuariosTotal ? '100%' : '0%' }} /></div>
        </div>
      </div>

      {/* Gráfica + donut */}
      <div className="ops-grid-8-4">
        <div className="ops-card">
          <div className="ops-card-head">
            <div>
              <h2>{t('ops.evolucionTitulo')}</h2>
              <p className="ops-card-sub">{demo ? t('ops.evolucionSubDemo') : t('ops.evolucionSub')}</p>
            </div>
            <div className="ops-seg" role="tablist" aria-label={t('ops.granularidad')}>
              {['horas', 'dias', 'meses'].map((g) => (
                <button key={g} type="button" role="tab" aria-selected={granularidad === g}
                  className={granularidad === g ? 'active' : ''} onClick={() => setGranularidad(g)}>
                  {g === 'horas' ? t('ops.horas') : g === 'dias' ? t('ops.diasLabel') : t('ops.meses')}
                </button>
              ))}
            </div>
          </div>
          <div className="ops-metrics-3">
            <div>
              <span className="ops-metric-label"><span className="ops-metric-dot" style={{ background: '#0e6b47' }} />{t('ops.comisionesMiraReal')}</span>
              <div className="ops-metric-value">€{euros(comisionTotal, LOC)}</div>
            </div>
            <div>
              <span className="ops-metric-label"><span className="ops-metric-dot" style={{ background: '#004393' }} />{t('ops.cubiertos14')}</span>
              <div className="ops-metric-value">{totalPax.toLocaleString(LOC)}</div>
            </div>
            <div>
              <span className="ops-metric-label"><span className="ops-metric-dot" style={{ background: '#006d37' }} />{t('ops.asistencia')}</span>
              <div className="ops-metric-value">{kpis.asistenciaPct}%</div>
            </div>
          </div>
          <OpsLineChart serie={serie} serieMeses={datos.serieMeses} modo={granularidad} />
        </div>
        <div className="ops-card">
          <div className="ops-card-head">
            <div>
              <h2>{t('ops.estadoReservas')}</h2>
              <p className="ops-card-sub">{t('ops.distribucionEstado')}</p>
            </div>
            <span className="material-symbols-outlined" style={{ color: 'var(--ops-outline)' }}>devices</span>
          </div>
          <OpsDonut segmentos={estadosDonut} centro={kpis.reservasTotal} centroSub="reservas" />
          <div style={{ background: 'var(--ops-surface-low)', borderRadius: 8, padding: '12px 14px', marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700 }}>
              <span style={{ color: 'var(--ops-on-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('ops.ocupacionServicio')}</span>
              <span style={{ color: 'var(--ops-primary)' }}>{t('ops.capacidadSala')}</span>
            </div>
            <div style={{ marginTop: 10 }}>
              <OpsHBars filas={[
                { nombre: t('ops.comidaRango'), valor: ocupacion.comida.pax, texto: t('ops.nPax', { n: ocupacion.comida.pax }), clase: '' },
                { nombre: t('ops.cenaRango'), valor: ocupacion.cena.pax, texto: t('ops.paxPico', { n: ocupacion.cena.pax }), clase: 'blue' },
              ]} />
            </div>
          </div>
        </div>
      </div>

      {/* Incidencias + Top */}
      <div className="ops-grid-2">
        <div className="ops-card">
          <div className="ops-card-head">
            <h2><span style={{ color: 'var(--ops-error)' }}>●</span> {t('ops.incidenciasDisputas')}</h2>
            {kpis.criticas > 0 && <span className="ops-pill warn">{t('ops.criticasAtencion', { n: kpis.criticas })}</span>}
          </div>
          <div className="ops-inc-list">
            {incidenciasPreview.length === 0 && <p className="ops-empty">{t('ops.sinIncidenciasTodo')}</p>}
            {incidenciasPreview.map((it) => (
              <div className="ops-inc" key={`${it.kind}-${it.id}`}>
                <div className="ops-inc-main">
                  <span className={`material-symbols-outlined ops-inc-icon ${it.kind === 'negocio' ? 'grey' : 'red'}`}>
                    {it.kind === 'negocio' ? 'loyalty' : 'credit_card_off'}
                  </span>
                  <div>
                    <div className="ops-inc-title">
                      {it.nombre || it.nombreRestaurante || t('ops.incidencia')}
                      <span className="ops-pill warn">{it.kind === 'negocio' ? t('ops.nuevoLocal') : (it.motivo || t('ops.soporte'))}</span>
                    </div>
                    <p className="ops-inc-text">
                      {it.kind === 'negocio'
                        ? t('ops.propuestaEmpresa', { resto: `${it.ciudad || ''} · ${(it.categorias || []).join(', ')}` })
                        : (it.mensaje || '').slice(0, 140)}
                    </p>
                    <div className="ops-inc-meta">
                      <span>{it.email || ''}</span>
                      <span>·</span>
                      <span>{antiguedad(it.creado, t)}</span>
                    </div>
                  </div>
                </div>
                <div className="ops-inc-actions">
                  <button type="button" className="ops-btn primary sm" disabled={resolviendo === it.id} onClick={() => resolver(it)}>
                    {it.kind === 'negocio' ? t('ops.aprobar') : t('ops.resolver')}
                  </button>
                  {it.kind === 'negocio' && (
                    <button type="button" className="ops-btn soft sm" disabled={resolviendo === it.id} onClick={() => rechazar(it)}>
                      {t('ops.rechazar')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="ops-card-foot">
            <span className="ops-muted">{t('ops.totalesPendientes', { n: kpis.incidenciasPendientes })}</span>
          </div>
        </div>

        <div className="ops-card">
          <div className="ops-card-head">
            <div>
              <h2>{t('ops.topTitulo')}</h2>
              <p className="ops-card-sub">{t('ops.topSub', { pct: comisionPct })}</p>
            </div>
          </div>
          <div className="ops-table-wrap">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>{t('ops.colRestaurante')}</th>
                  <th style={{ textAlign: 'right' }}>{t('ops.colCubiertosHoy')}</th>
                  <th style={{ textAlign: 'right' }}>{t('ops.colComisionReal')}</th>
                  <th style={{ textAlign: 'right' }}>{t('ops.colReservas')}</th>
                </tr>
              </thead>
              <tbody>
                {top.length === 0 && (
                  <tr><td colSpan="4" className="ops-empty">{t('ops.sinServicioHoy')}</td></tr>
                )}
                {top.map((fila) => (
                  <tr key={fila.id}>
                    <td>
                      <span className="ops-rest-cell">
                        <span className="ops-rest-ini">{(fila.nombre || '?').slice(0, 2).toUpperCase()}</span>
                        <strong>{fila.nombre}</strong>
                      </span>
                    </td>
                    <td className="num">{t('ops.nPax', { n: fila.paxHoy })}</td>
                    <td className="num">€{euros(fila.comisionHoy, LOC)}</td>
                    <td className="num">{fila.reservasHoy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="ops-card-foot">
            <span className="ops-muted">{t('ops.redGlobal')}</span>
          </div>
        </div>
      </div>

      {/* Feed en vivo */}
      <div className="ops-card">
        <div className="ops-card-head">
          <h2><span style={{ color: 'var(--ops-secondary)' }}>●</span> {t('ops.feedTitulo')}</h2>
          <span className="ops-pill">{t('ops.flujoReservas')}</span>
        </div>
        <div className="ops-feed">
          {feed.length === 0 && <p className="ops-empty">{t('ops.sinReservasFeed')}</p>}
          {feed.map((r) => (
            <div className="ops-feed-card" key={r.id}>
              <div className="ops-feed-top">
                <span className="ops-feed-id">#{r.codigo || r.id.slice(0, 6).toUpperCase()}</span>
                <span className={`ops-status-pill ${(r.estado === 'cancelada' || r.estado === 'no_show') ? 'danger' : (r.estado === 'pendiente' ? 'info' : '')}`}>
                  {r.estado === 'completada' ? t('ops.estadoCompletada') : r.estado === 'cancelada' ? t('ops.estadoCancelada') : r.estado === 'no_show' ? t('ops.estadoNoShow') : r.estado === 'confirmada' ? t('ops.estadoConfirmada') : t('ops.estadoPendiente')}
                </span>
              </div>
              <div>
                <div className="ops-feed-name">{r.usuarioNombre || r.usuarioEmail || t('ops.comensal')}</div>
                <div className="ops-feed-rest">{nombreRestauranteDe(r)}</div>
                <div className="ops-feed-meta">
                  <span className="material-symbols-outlined">schedule</span>
                  <span>{r.fecha} {r.hora}</span>
                  <span>·</span>
                  <span className="material-symbols-outlined">group</span>
                  <span>{t('ops.nPax', { n: r.comensales })}</span>
                </div>
              </div>
              <div className="ops-feed-foot">
                <span>{r.comisionReal ? t('ops.comisionRealLabel') : t('ops.comisionPendienteLabel')}</span>
                <strong>{r.comisionReal ? `+€${Number(r.comision).toFixed(2)}` : '—'}</strong>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
