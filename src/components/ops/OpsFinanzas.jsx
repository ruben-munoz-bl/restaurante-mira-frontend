/** OpsFinanzas — agregados mensuales con datos REALES de tickets. */
import { useEffect, useState } from 'react';
import { getOpsOverview, mensajeErrorFirestore, nombreRestauranteDe } from './opsData.js';
import { OpsLineChart } from './OpsCharts.jsx';
import DocumentoFiscal from '../fiscal/DocumentoFiscal.jsx';

export default function OpsFinanzas({ demo = null }) {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [documento, setDocumento] = useState(null);

  useEffect(() => {
    if (demo) { setDatos(demo); setCargando(false); return undefined; }
    let vivo = true;
    getOpsOverview()
      .then((d) => { if (vivo) { setDatos(d); setCargando(false); } })
      .catch((e) => { if (vivo) { setError(mensajeErrorFirestore(e, 'reservas/tickets')); setCargando(false); } });
    return () => { vivo = false; };
  }, [demo]);


  if (cargando) return <div className="ops-card" role="status"><h2>Cargando finanzas…</h2></div>;
  if (error && !datos) return <div className="ops-card" role="alert"><h2>Error</h2><p className="ops-error">{error}</p></div>;

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
      {documento && (
        <DocumentoFiscal tipo={documento} comisionPct={comisionPct}
          restaurante={documento === 'factura' ? { nombre: 'Can Solé', ciudad: 'Barcelona' } : null}
          onClose={() => setDocumento(null)} />
      )}
      <div className="ops-card">
        <div className="ops-card-head">
          <div>
            <h2>Finanzas &amp; Comisiones</h2>
            <p className="ops-card-sub">Datos reales de tickets · comisión {comisionPct}% · últimos 14 días</p>
          </div>
          <div className="ops-actions">
            <button type="button" className="ops-btn soft sm" onClick={() => setDocumento('factura')}>
              <span className="material-symbols-outlined">receipt_long</span>Ver Factura
            </button>
            <button type="button" className="ops-btn primary sm" onClick={() => setDocumento('fiscal')}>
              <span className="material-symbols-outlined">file_present</span>Reporte Fiscal
            </button>
          </div>
        </div>
        <div className="ops-metrics-3">
          <div>
            <span className="ops-metric-label">Comisiones (real)</span>
            <div className="ops-metric-value">€{comisionTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</div>
          </div>
          <div>
            <span className="ops-metric-label">Facturación bruta (real)</span>
            <div className="ops-metric-value">€{facturacionTotal.toLocaleString('es-ES', { maximumFractionDigits: 0 })}</div>
          </div>
          <div>
            <span className="ops-metric-label">Asistencia</span>
            <div className="ops-metric-value">{datos.kpis.asistenciaPct}%</div>
          </div>
        </div>
        <OpsLineChart serie={datos.serie} modo="meses" />
      </div>

      <div className="ops-card">
        <div className="ops-card-head">
          <div><h2>Detalle mensual</h2></div>
        </div>
        <div className="ops-table-wrap">
          <table className="ops-table">
            <thead><tr><th>Mes</th><th style={{ textAlign: 'right' }}>Tickets</th><th style={{ textAlign: 'right' }}>Facturación real</th><th style={{ textAlign: 'right' }}>Comisión real</th></tr></thead>
            <tbody>
              {meses.map(([m, d]) => (
                <tr key={m}>
                  <td><strong>{m}</strong></td>
                  <td className="num">{d.tickets}</td>
                  <td className="num">€{d.facturacion.toLocaleString('es-ES')}</td>
                  <td className="num">€{d.comisiones.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
              {meses.length === 0 && <tr><td colSpan="4" className="ops-empty">Sin movimientos.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="ops-muted" style={{ marginTop: 10 }}>
          Feed usado: {datos.feed.length} últimas reservas ({datos.feed.map((r) => nombreRestauranteDe(r)).slice(0, 3).join(', ')}{datos.feed.length > 3 ? '…' : ''}).
        </p>
      </div>
    </>
  );
}
