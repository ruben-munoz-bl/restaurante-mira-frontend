/**
 * Modal que muestra una factura o un reporte fiscal: cabecera, tabla con
 * desglose y totales. Si recibe `documento` (datos reales del panel) lo pinta
 * tal cual; si no, lo genera simulado (modo demo). Se puede imprimir (o guardar
 * como PDF desde el diálogo del navegador) y exportar a CSV.
 */
import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { generarFactura, generarReporteFiscal, csvDeDocumento } from './fiscalMock.js';
import { descargarCSV } from '../ops/opsData.js';
import './fiscal.css';

const eur = (n) => `${Number(n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: 'always' })} €`;
const fecha = (iso) => (iso ? new Date(`${String(iso).slice(0, 10)}T00:00:00`).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

export default function DocumentoFiscal({ tipo = 'factura', restaurante = null, comisionPct = 10, documento = null, simulado = true, onClose }) {
  const doc = useMemo(
    () => documento || (tipo === 'factura' ? generarFactura({ restaurante: restaurante || {}, comisionPct }) : generarReporteFiscal({ restaurante, comisionPct })),
    [documento, tipo, restaurante, comisionPct],
  );

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    document.body.classList.add('fx-abierto');
    return () => { document.removeEventListener('keydown', onKey); document.body.classList.remove('fx-abierto'); };
  }, [onClose]);

  const exportar = () => { const c = csvDeDocumento(doc); descargarCSV(c.nombre, c.cabeceras, c.filas); };

  return createPortal(
    <div className="fx-overlay" onClick={onClose} role="presentation">
      <div className="fx-hoja" role="dialog" aria-modal="true" aria-label={doc.tipo === 'factura' ? 'Factura' : 'Reporte fiscal'} onClick={(e) => e.stopPropagation()}>
        <div className="fx-barra">
          <span className={`fx-sim ${simulado ? '' : 'real'}`}>{simulado ? 'Documento simulado · demo' : 'Datos reales del panel'}</span>
          <div className="fx-barra-acciones">
            <button type="button" className="fx-btn" onClick={exportar}><span className="material-symbols-outlined">table_chart</span>CSV</button>
            <button type="button" className="fx-btn primario" onClick={() => window.print()}><span className="material-symbols-outlined">print</span>Imprimir / PDF</button>
            <button type="button" className="fx-btn icono" onClick={onClose} aria-label="Cerrar"><span className="material-symbols-outlined">close</span></button>
          </div>
        </div>

        <div className="fx-papel">
          <header className="fx-cabecera">
            <div>
              <div className="fx-logo">MIRA<i /></div>
              <p className="fx-mini">MIRA Restaurants S.L. · NIF B-67234519<br />Carrer de Pujades 77, 08005 Barcelona</p>
            </div>
            <div className="fx-titulo">
              <span className="fx-etiqueta">{doc.tipo === 'factura' ? 'Factura de comisiones' : 'Reporte fiscal'}</span>
              <h2>{doc.numero}</h2>
              <p className="fx-mini">Emitido el {fecha(doc.fechaEmision)} · {doc.periodo}</p>
            </div>
          </header>

          {doc.tipo === 'factura' ? <Factura doc={doc} /> : <Fiscal doc={doc} />}

          <footer className="fx-pie">
            <span>Documento generado automáticamente por MIRA Operator Hub.</span>
            <span>{simulado ? 'Datos simulados con fines de demostración · sin validez fiscal.' : 'Generado con los datos reales registrados en tu panel.'}</span>
          </footer>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Factura({ doc }) {
  const { resumen } = doc;
  return (
    <>
      <div className="fx-partes">
        <div className="fx-parte"><span>Emisor</span><strong>{doc.emisor.nombre}</strong><p>{doc.emisor.nif}<br />{doc.emisor.direccion}</p></div>
        <div className="fx-parte"><span>Cliente</span><strong>{doc.receptor.nombre}</strong><p>{doc.receptor.nif}<br />{doc.receptor.direccion}</p></div>
        <div className="fx-parte"><span>Vencimiento</span><strong>{fecha(doc.vencimiento)}</strong><p>Domiciliación SEPA<br />Comisión pactada {doc.comisionPct}%</p></div>
      </div>

      <div className="fx-tabla-wrap">
        <table className="fx-tabla">
          <thead>
            <tr><th>Fecha</th><th>Reserva</th><th>Cliente</th><th>Servicio</th><th className="n">Pax</th><th className="n">Ticket</th><th className="n">Comisión</th></tr>
          </thead>
          <tbody>
            {doc.lineas.length === 0 ? (
              <tr><td colSpan={7} className="fx-vacio">Sin tickets registrados en el periodo seleccionado</td></tr>
            ) : doc.lineas.map((l, i) => (
              <tr key={l.id} style={{ '--i': i }}>
                <td className="mono">{fecha(l.fecha)}</td>
                <td className="mono tenue">{l.codigo}</td>
                <td>{l.cliente}</td>
                <td><span className={`fx-chip ${l.servicio === 'Cena' ? 'noche' : ''}`}>{l.servicio}</span></td>
                <td className="n">{l.pax}</td>
                <td className="n">{eur(l.ticket)}</td>
                <td className="n fuerte">{eur(l.comision)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="fx-cierre">
        <div className="fx-nota">
          <strong>{doc.lineas.length} servicios liquidados</strong>
          <p>Facturación del local en el periodo: {eur(resumen.totalTickets)}. Neto a percibir por el restaurante tras comisión: <b>{eur(resumen.netoRestaurante)}</b>.</p>
        </div>
        <dl className="fx-totales">
          <div><dt>Base imponible</dt><dd>{eur(resumen.base)}</dd></div>
          <div><dt>IVA {resumen.ivaPct}%</dt><dd>{eur(resumen.iva)}</dd></div>
          <div className="total"><dt>Total factura</dt><dd>{eur(resumen.total)}</dd></div>
        </dl>
      </div>
    </>
  );
}

function Fiscal({ doc }) {
  const t = doc.totales;
  const max = Math.max(1, ...doc.filas.map((f) => f.ventas));
  return (
    <>
      <div className="fx-resumen">
        <div><span>Ámbito</span><strong>{doc.ambito}</strong></div>
        <div><span>Ventas declaradas</span><strong>{eur(t.ventas)}</strong></div>
        <div><span>IVA repercutido</span><strong>{eur(t.ivaRepercutido)}</strong></div>
        <div className="acento"><span>Comisiones MIRA</span><strong>{eur(t.comision)}</strong></div>
      </div>

      <div className="fx-tabla-wrap">
        <table className="fx-tabla">
          <thead>
            <tr><th>{doc.agrupacion}</th><th className="n">Ventas</th><th className="n">Base imp.</th><th className="n">IVA 10%</th><th className="n">Comisión {doc.comisionPct}%</th><th className="n">IVA 21% com.</th><th className="n">Neto</th></tr>
          </thead>
          <tbody>
            {doc.filas.map((f, i) => (
              <tr key={f.id} style={{ '--i': i }}>
                <td>
                  <strong>{f.concepto}</strong><span className="fx-sub">{f.sub}</span>
                  <span className="fx-barrita"><i style={{ '--w': f.ventas / max }} /></span>
                </td>
                <td className="n fuerte">{eur(f.ventas)}</td>
                <td className="n">{eur(f.base)}</td>
                <td className="n tenue">{eur(f.ivaRepercutido)}</td>
                <td className="n">{eur(f.comision)}</td>
                <td className="n tenue">{eur(f.ivaComision)}</td>
                <td className="n fuerte verde">{eur(f.neto)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>Total</td><td className="n">{eur(t.ventas)}</td><td className="n">{eur(t.base)}</td><td className="n">{eur(t.ivaRepercutido)}</td>
              <td className="n">{eur(t.comision)}</td><td className="n">{eur(t.ivaComision)}</td><td className="n">{eur(t.neto)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="fx-modelos">
        {doc.modelos.map((m) => (
          <div className="fx-modelo" key={m.codigo}>
            <span className="fx-modelo-cod">{m.codigo}</span>
            <div><strong>{m.nombre}</strong><p>{eur(m.importe)}</p></div>
            <span className={`fx-estado ${m.estado === 'Listo' || m.estado === 'Obligatorio' ? 'ok' : ''}`}>{m.estado}</span>
          </div>
        ))}
      </div>
    </>
  );
}
