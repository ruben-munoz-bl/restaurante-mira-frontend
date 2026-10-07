/** OpsFinanzas — agregados mensuales con datos REALES de tickets. */
import { useEffect, useState } from 'react';
import { getOpsOverview, descargarCSV, csvReservas, mensajeErrorFirestore, nombreRestauranteDe } from './opsData.js';
import { OpsLineChart } from './OpsCharts.jsx';
import { getReservasGlobales } from './opsData.js';
import { useT } from '../../i18n/index.jsx';
import es from '../../i18n/es.js';
import ca from '../../i18n/ca.js';
import en from '../../i18n/en.js';

const TRADS = { es, ca, en };

export default function OpsFinanzas() {
  const t = useT(TRADS);
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let vivo = true;
    getOpsOverview()
      .then((d) => { if (vivo) { setDatos(d); setCargando(false); } })
      .catch((e) => { if (vivo) { setError(mensajeErrorFirestore(e, 'reservas/tickets')); setCargando(false); } });
    return () => { vivo = false; };
  }, []);

  async function exportar() {
    try {
      const lista = await getReservasGlobales({ limite: 500 });
      const c = csvReservas(lista);
      descargarCSV('reporte-fiscal.csv', c.cabeceras, c.filas);
    } catch (e) {
      setError(mensajeErrorFirestore(e, 'reservas'));
    }
  }

  if (cargando) return <div className="ops-card" role="status"><h2>{t('ops.cargandoFinanzas')}</h2></div>;
  if (error && !datos) return <div className="ops-card" role="alert"><h2>{t('ops.error')}</h2><p className="ops-error">{error}</p></div>;

  const porMes = {};
  datos.serie.forEach((s) => {
    const k = s.fecha.slice(0, 7);
    if (!porMes[k]) porMes[k] = { facturacion: 0, comisiones: 0, tickets: 0, reservas: 0 };
    porMes[k].comisiones = Math.round((porMes[k].comisiones + (s.comisiones || 0)) * 100) / 100;
    porMes[k].facturacion = Math.round((porMes[k].facturacion + (s.facturacion || 0)) * 100) / 100;
    porMes[k].tickets += s.tickets || 0;
    porMes[k].reservas += s.reservas || 0;
  });
  const meses = Object.entries(porMes).sort(([a], [b]) => a.localeCompare(b));
  const facturacionTotal = Number(datos.kpis.facturacionTotal) || 0;
  const comisionTotal = Number(datos.kpis.comisionTotal) || 0;
  const comisionPct = Number(datos.kpis.comisionPct) || 8;

  return (
    <>
      <div className="ops-card">
        <div className="ops-card-head">
          <div>
            <h2>{t('ops.seccFinanzas')}</h2>
            <p className="ops-card-sub">{t('ops.finanzasSub', { pct: comisionPct })}</p>
          </div>
          <button type="button" className="ops-btn soft sm" onClick={exportar}>
            <span className="material-symbols-outlined">file_present</span>{t('ops.exportarReporte')}
          </button>
        </div>
        <div className="ops-metrics-3">
          <div>
            <span className="ops-metric-label">{t('ops.comisionesReal')}</span>
            <div className="ops-metric-value">€{comisionTotal.toLocaleString(t('modelos.locale'), { minimumFractionDigits: 2 })}</div>
          </div>
          <div>
            <span className="ops-metric-label">{t('ops.facturacionBruta')}</span>
            <div className="ops-metric-value">€{facturacionTotal.toLocaleString(t('modelos.locale'), { maximumFractionDigits: 0 })}</div>
          </div>
          <div>
            <span className="ops-metric-label">{t('ops.asistencia')}</span>
            <div className="ops-metric-value">{datos.kpis.asistenciaPct}%</div>
          </div>
        </div>
        <OpsLineChart serie={datos.serie} modo="meses" />
      </div>

      <div className="ops-card">
        <div className="ops-card-head">
          <div><h2>{t('ops.detalleMensual')}</h2></div>
        </div>
        <div className="ops-table-wrap">
          <table className="ops-table">
            <thead><tr><th>{t('ops.colMes')}</th><th style={{ textAlign: 'right' }}>{t('ops.colTickets')}</th><th style={{ textAlign: 'right' }}>{t('ops.colFacturacionReal')}</th><th style={{ textAlign: 'right' }}>{t('ops.colComisionReal')}</th></tr></thead>
            <tbody>
              {meses.map(([m, d]) => (
                <tr key={m}>
                  <td><strong>{m}</strong></td>
                  <td className="num">{d.tickets}</td>
                  <td className="num">€{d.facturacion.toLocaleString(t('modelos.locale'))}</td>
                  <td className="num">€{d.comisiones.toLocaleString(t('modelos.locale'), { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
              {meses.length === 0 && <tr><td colSpan="4" className="ops-empty">{t('ops.sinMovimientos')}</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="ops-muted" style={{ marginTop: 10 }}>
          {t('ops.feedUsado', { n: datos.feed.length })} ({datos.feed.map((r) => nombreRestauranteDe(r)).slice(0, 3).join(', ')}{datos.feed.length > 3 ? '…' : ''}).
        </p>
      </div>
    </>
  );
}
