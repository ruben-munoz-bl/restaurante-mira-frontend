/**
 * Documentos fiscales construidos con datos REALES del panel (tickets subidos
 * e ingresos por mes). Devuelven exactamente la misma forma que fiscalMock.js
 * para que DocumentoFiscal los renderice sin distinguir la fuente.
 */
import { periodoActual } from './fiscalMock.js';

const IVA = 0.21; // IVA sobre la comisión de MIRA
const IVA_HOSTELERIA = 0.10; // IVA reducido de restauración
const RETENCION = 0;

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const r2 = (n) => Math.round(Number(n || 0) * 100) / 100;

export function fechaDeTicket(t) {
  if (t?.fecha) return String(t.fecha).slice(0, 10);
  if (t?.createdAt?.toDate) return t.createdAt.toDate().toISOString().slice(0, 10);
  return '';
}

/** Factura de comisiones con los tickets reales subidos por el restaurante. */
export function facturaReal({ restaurante = {}, comisionPct = 10, tickets = [] } = {}) {
  const { anio, mes } = periodoActual();
  const nombre = restaurante.nombre || 'Mi restaurante';

  const lineas = tickets.map((t, i) => {
    const ticket = r2(t.totalPagado);
    const comision = t.importeComision != null ? r2(t.importeComision) : r2(ticket * (comisionPct / 100));
    return {
      id: t.id || `T${i + 1}`,
      fecha: fechaDeTicket(t),
      codigo: t.codigoReserva || String(t.id || '').slice(0, 6) || `T${i + 1}`,
      cliente: t.clienteNombre || t.restauranteNombre || '—',
      pax: t.comensales ?? t.pax ?? '—',
      servicio: t.hora ? (String(t.hora) < '16:00' ? 'Comida' : 'Cena') : 'Ticket',
      ticket,
      comision,
    };
  }).sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));

  const totalTickets = r2(lineas.reduce((s, l) => s + l.ticket, 0));
  const base = r2(lineas.reduce((s, l) => s + l.comision, 0));
  const iva = r2(base * IVA);
  const total = r2(base + iva);

  return {
    tipo: 'factura',
    real: true,
    numero: `MIRA-${anio}-${String(mes).padStart(2, '0')}-${String(restaurante.id || 'REAL').slice(-4).toUpperCase()}`,
    fechaEmision: new Date().toISOString().slice(0, 10),
    vencimiento: new Date(Date.now() + 15 * 864e5).toISOString().slice(0, 10),
    periodo: `${MESES[mes - 1]} ${anio}`,
    emisor: { nombre: 'MIRA Restaurants S.L.', nif: 'B-67234519', direccion: 'Carrer de Pujades 77, 08005 Barcelona' },
    receptor: {
      nombre,
      nif: restaurante.nif || '—',
      direccion: [restaurante.direccion, restaurante.ciudad].filter(Boolean).join(', ') || '—',
    },
    comisionPct,
    lineas,
    resumen: { totalTickets, base, ivaPct: IVA * 100, iva, total, netoRestaurante: r2(totalTickets - total) },
  };
}

/** Reporte fiscal trimestral con los ingresos reales agrupados por mes. */
export function reporteFiscalReal({ restaurante = null, comisionPct = 10, ingresosPorMes = {} } = {}) {
  const { anio, trimestre } = periodoActual();
  const mesesT = [0, 1, 2].map((k) => (trimestre - 1) * 3 + k);

  const filas = mesesT.map((m) => {
    const clave = `${anio}-${String(m + 1).padStart(2, '0')}`;
    const d = ingresosPorMes[clave] || {};
    return {
      id: m,
      concepto: MESES[m][0].toUpperCase() + MESES[m].slice(1),
      sub: `${Number(d.tickets) || 0} tickets`,
      ventas: r2(d.facturacion),
    };
  });

  filas.forEach((f) => {
    f.base = r2(f.ventas / (1 + IVA_HOSTELERIA));
    f.ivaRepercutido = r2(f.ventas - f.base);
    f.comision = r2(f.ventas * (comisionPct / 100));
    f.ivaComision = r2(f.comision * IVA);
    f.retencion = r2(f.comision * RETENCION);
    f.neto = r2(f.ventas - f.comision - f.ivaComision);
  });

  const suma = (k) => r2(filas.reduce((s, f) => s + f[k], 0));
  const totales = {
    ventas: suma('ventas'), base: suma('base'), ivaRepercutido: suma('ivaRepercutido'),
    comision: suma('comision'), ivaComision: suma('ivaComision'), neto: suma('neto'),
  };

  return {
    tipo: 'fiscal',
    real: true,
    numero: `RF-${anio}-T${trimestre}-${String(restaurante?.id || 'REAL').slice(-4).toUpperCase()}`,
    fechaEmision: new Date().toISOString().slice(0, 10),
    periodo: `${trimestre}º trimestre ${anio}`,
    ambito: restaurante?.nombre || 'Mi restaurante',
    agrupacion: 'Mes',
    comisionPct,
    filas,
    totales,
    modelos: [
      { codigo: '303', nombre: 'IVA trimestral', importe: r2(totales.ivaRepercutido - totales.ivaComision), estado: 'Listo' },
      { codigo: '347', nombre: 'Operaciones con terceros', importe: totales.comision, estado: totales.comision > 3005.06 ? 'Obligatorio' : 'No aplica' },
      { codigo: '111', nombre: 'Retenciones IRPF', importe: 0, estado: 'Sin retención' },
    ],
  };
}
