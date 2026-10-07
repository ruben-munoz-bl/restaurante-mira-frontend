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
import '../../styles/ops.css';

function crearDemo() {
  const hoy = new Date();
  const serie = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(hoy); d.setDate(hoy.getDate() - 13 + i);
    const reservas = Math.round(18 + Math.sin(i / 1.6) * 7 + i * 0.8 + (d.getDay() >= 5 ? 9 : 0));
    const pax = Math.round(reservas * 2.7);
    const facturacion = Math.round(pax * 34.5 * 100) / 100;
    return {
      fecha: d.toISOString().slice(0, 10),
      etiqueta: d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
      reservas, pax, facturacion, comisiones: Math.round(facturacion * 0.08 * 100) / 100, tickets: Math.round(reservas * 0.8),
    };
  });
  const sum = (k) => serie.reduce((s, d) => s + d[k], 0);
  const locales = ['Can Solé', 'La Taverna del Port', 'El Celler de Gràcia', 'Mar i Muntanya', 'Sushi Born'];
  const clientes = ['Laura Martí', 'Jordi Puig', 'Marta Soler', 'Pau Ferrer', 'Anna Vidal', 'Marc Roca', 'Clara Font', 'Sergi Mas'];
  const estados = ['confirmada', 'completada', 'pendiente', 'confirmada', 'cancelada', 'completada', 'no_show', 'pendiente'];
  return {
    kpis: {
      facturacionTotal: sum('facturacion'), comisionTotal: sum('comisiones'), mediaComensal: 34.5, comisionPct: 8,
      ticketPromedio: 93.15, ticketsTotal: sum('tickets'), altas7d: 3, reservasTotal: sum('reservas'), asistenciaPct: 91,
      restaurantesActivos: 48, incidenciasPendientes: 2, criticas: 1, usuariosTotal: 1284,
    },
    serie,
    porEstado: { confirmada: 182, completada: 96, pendiente: 41, cancelada: 23, no_show: 9 },
    ocupacion: { comida: { pax: 312 }, cena: { pax: 468 } },
    incidenciasPreview: [
      { id: 'd1', kind: 'incidencia', nombreRestaurante: 'Brasa Lleida', motivo: 'Cargo no-show', mensaje: 'El cliente reclama un cargo por no presentarse que asegura haber cancelado a tiempo.', email: 'cliente@demo.es', creado: Date.now() - 42 * 60000 },
      { id: 'd2', kind: 'negocio', nombre: 'Trattoria Sitges', ciudad: 'Sitges', categorias: ['Italiana', 'Pasta'], email: 'hola@trattoria.demo', creado: Date.now() - 5 * 3600000 },
    ],
    top: locales.map((nombre, i) => ({ id: `t${i}`, nombre, paxHoy: 64 - i * 9, comisionHoy: (64 - i * 9) * 34.5 * 0.08, reservasHoy: 22 - i * 3 })),
    feed: clientes.map((c, i) => ({
      id: `f${i}abcdef`, codigo: `MR-${48210 + i * 37}`, usuarioNombre: c, restauranteNombre: locales[i % locales.length],
      fecha: hoy.toISOString().slice(0, 10), hora: i % 2 ? '21:00' : '14:00', comensales: 2 + (i % 4), estado: estados[i],
      comisionReal: estados[i] === 'completada', comision: (2 + (i % 4)) * 34.5 * 0.08,
    })),
    avisos: [],
  };
}

const DEMO = crearDemo();
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
