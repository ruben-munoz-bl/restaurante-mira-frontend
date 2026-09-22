/** OpsFinanzas — agregados mensuales (comisiones est. 8%) + exportación CSV. */
import { useEffect, useState } from 'react';
import { getOpsOverview, descargarCSV, csvReservas, mensajeErrorFirestore, nombreRestauranteDe } from './opsData.js';
import { OpsLineChart } from './OpsCharts.jsx';
import { getReservasGlobales } from './opsData.js';

export default function OpsFinanzas() {
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

  if (cargando) return <div className="ops-card" role="status"><h2>Cargando finanzas…</h2></div>;
  if (error && !datos) return <div className="ops-card" role="alert"><h2>Error</h2><p className="ops-error">{error}</p></div>;

  const porMes = {};
  datos.serie.forEach((s) => {
    const k = s.fecha.slice(0, 7);
    if (!porMes[k]) porMes[k] = { facturacion: 0, comisiones: 0, tickets: 0 };
    porMes[k].comisiones = Math.round((porMes[k].comisiones + s.comisiones) * 100) / 100;
    porMes[k].tickets += s.reservas;
    porMes[k].facturacion = Math.round((porMes[k].facturacion + s.pax * 18) * 100) / 100;
  });
  const meses = Object.entries(porMes).sort(([a], [b]) => a.localeCompare(b));

  return (
    <>
      <div className="ops-card">
        <div className="ops-card-head">
          <div>
            <h2>Finanzas &amp; Comisiones</h2>
            <p className="ops-card-sub">Estimación al 8% sobre ticket medio de 18 €/pax · últimos 14 días</p>
          </div>
          <button type="button" className="ops-btn soft sm" onClick={exportar}>
            <span className="material-symbols-outlined">file_present</span>Exportar Reporte Fiscal
          </button>
        </div>
        <div className="ops-metrics-3">
          <div>
            <span className="ops-metric-label">Comisiones (est.)</span>
            <div className="ops-metric-value">€{datos.kpis.comisionTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</div>
          </div>
          <div>
            <span className="ops-metric-label">GMV bruto (est.)</span>
            <div className="ops-metric-value">€{(datos.kpis.comisionTotal / 0.08).toLocaleString('es-ES', { maximumFractionDigits: 0 })}</div>
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
            <thead><tr><th>Mes</th><th style={{ textAlign: 'right' }}>Reservas</th><th style={{ textAlign: 'right' }}>GMV est.</th><th style={{ textAlign: 'right' }}>Comisión est.</th></tr></thead>
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
