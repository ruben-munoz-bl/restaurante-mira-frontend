/**
 * DemoPaneles (#/demo-paneles) — vista de demostración de los paneles admin y
 * restaurante con datos simulados. No requiere sesión ni lee de Firestore.
 */
import { useState } from 'react';
import OpsDashboard from './OpsDashboard.jsx';
import OpsFinanzas from './OpsFinanzas.jsx';
import { RevenueLineChart, ReservationsPieChart, RevenueBarChart } from '../dashboard/Charts.jsx';
import DocumentoFiscal from '../fiscal/DocumentoFiscal.jsx';
import OpsInformeUsuarios from './OpsInformeUsuarios.jsx';
import { crearOverviewSimulado } from './opsDemo.js';
import '../../styles/ops.css';

const DEMO = crearOverviewSimulado();
const ING_MES = {
  '2026-05': { facturacion: 6120, comisiones: 489.6, tickets: 64 },
  '2026-06': { facturacion: 7480, comisiones: 598.4, tickets: 78 },
  '2026-07': { facturacion: 9310, comisiones: 744.8, tickets: 96 },
  '2026-08': { facturacion: 8640, comisiones: 691.2, tickets: 88 },
  '2026-09': { facturacion: 10220, comisiones: 817.6, tickets: 104 },
  '2026-10': { facturacion: 4150, comisiones: 332.0, tickets: 41 },
};

export default function DemoPaneles() {
  const [vista, setVista] = useState('admin');
  const [documento, setDocumento] = useState(null);
  const tabs = [['admin', 'Panel admin'], ['finanzas', 'Finanzas'], ['restaurante', 'Panel restaurante'], ['clientes', 'Informe clientes']];

  return (
    <div className="ops-shell">
      <main className="ops-content" style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span className="ops-pill warn">Modo demo · datos simulados, sin consultas</span>
          <div className="ops-seg" role="tablist" aria-label="Vista">
            {tabs.map(([id, nombre]) => (
              <button key={id} type="button" role="tab" aria-selected={vista === id} className={vista === id ? 'active' : ''} onClick={() => setVista(id)}>{nombre}</button>
            ))}
          </div>
        </div>

        {vista === 'admin' && <OpsDashboard demo={DEMO} />}
        {vista === 'finanzas' && <OpsFinanzas demo={DEMO} />}
        {vista === 'clientes' && <OpsInformeUsuarios soloSimulado />}
        {vista === 'restaurante' && (
          <>
            <div className="ops-hero">
              <div>
                <h1>Can Solé · Panel del restaurante</h1>
                <p>Gráficos del panel de partner con datos simulados.</p>
              </div>
              <div className="ops-actions">
                <button type="button" className="ops-btn soft" onClick={() => setDocumento('factura')}><span className="material-symbols-outlined">receipt_long</span>Factura</button>
                <button type="button" className="ops-btn primary" onClick={() => setDocumento('fiscal')}><span className="material-symbols-outlined">file_present</span>Reporte Fiscal</button>
              </div>
            </div>
            <div className="ops-grid-8-4">
              <div className="ops-card"><RevenueLineChart data={ING_MES} title="Evolución de ingresos" /></div>
              <div className="ops-card"><ReservationsPieChart completadas={96} canceladas={23} noShow={9} pendientes={41} title="Distribución de reservas" /></div>
            </div>
            <div className="ops-card"><RevenueBarChart data={ING_MES} title="Tickets por mes" /></div>
          </>
        )}
      </main>
      {documento && (
        <DocumentoFiscal tipo={documento} comisionPct={8} restaurante={documento === 'factura' ? { nombre: 'Can Solé', ciudad: 'Barcelona', direccion: 'Carrer Sant Carles 4' } : { nombre: 'Can Solé' }} onClose={() => setDocumento(null)} />
      )}
    </div>
  );
}
