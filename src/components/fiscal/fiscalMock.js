/**
 * Generador de documentos fiscales SIMULADOS (factura y reporte fiscal).
 * No hace ninguna lectura: todo sale de una semilla determinista, así el mismo
 * restaurante y periodo producen siempre el mismo documento (ideal para demos).
 */

const IVA = 0.21; // IVA general sobre la comisión de MIRA
const IVA_HOSTELERIA = 0.10; // IVA reducido de restauración (lo repercute el local)
const RETENCION = 0; // MIRA no practica retención IRPF a sociedades

const NOMBRES = [
  'Laura Martí', 'Jordi Puig', 'Marta Soler', 'Pau Ferrer', 'Anna Vidal', 'Marc Roca',
  'Clara Font', 'Sergi Mas', 'Núria Pons', 'Albert Camps', 'Elena Serra', 'Oriol Riba',
  'Júlia Costa', 'David Bosch', 'Laia Torres', 'Carlos Ruiz',
];
const LOCALES = [
  { nombre: 'Can Solé', ciudad: 'Barcelona' }, { nombre: 'La Taverna del Port', ciudad: 'Tarragona' },
  { nombre: 'El Celler de Gràcia', ciudad: 'Barcelona' }, { nombre: 'Mar i Muntanya', ciudad: 'Girona' },
  { nombre: 'Brasa Lleida', ciudad: 'Lleida' }, { nombre: 'Sushi Born', ciudad: 'Barcelona' },
  { nombre: 'Trattoria Sitges', ciudad: 'Sitges' }, { nombre: 'Casa Mila Tapas', ciudad: 'Reus' },
];

function semilla(texto) {
  let h = 2166136261;
  for (const c of String(texto)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

/** PRNG mulberry32: rápido y reproducible. */
function rng(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r2 = (n) => Math.round(n * 100) / 100;

export function periodoActual() {
  const d = new Date();
  return { anio: d.getFullYear(), mes: d.getMonth() + 1, trimestre: Math.floor(d.getMonth() / 3) + 1 };
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** Factura de comisiones MIRA → restaurante, una línea por servicio liquidado. */
export function generarFactura({ restaurante = {}, comisionPct = 10, lineasMax = 14 } = {}) {
  const { anio, mes } = periodoActual();
  const nombre = restaurante.nombre || 'Restaurante Demo';
  const rand = rng(semilla(`${nombre}-${anio}-${mes}`));
  const n = 9 + Math.floor(rand() * (lineasMax - 8));
  const diasMes = new Date(anio, mes, 0).getDate();
  const hoy = Math.min(new Date().getDate(), diasMes);

  const lineas = Array.from({ length: n }, (_, i) => {
    const dia = 1 + Math.floor(rand() * Math.max(1, hoy));
    const pax = 2 + Math.floor(rand() * 5);
    const ticket = r2(pax * (22 + rand() * 38));
    const comision = r2(ticket * (comisionPct / 100));
    return {
      id: `L${i + 1}`,
      fecha: `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`,
      codigo: `MR-${(semilla(nombre + i) % 90000 + 10000)}`,
      cliente: NOMBRES[Math.floor(rand() * NOMBRES.length)],
      pax,
      servicio: rand() > 0.45 ? 'Cena' : 'Comida',
      ticket,
      comision,
    };
  }).sort((a, b) => a.fecha.localeCompare(b.fecha));

  const totalTickets = r2(lineas.reduce((s, l) => s + l.ticket, 0));
  const base = r2(lineas.reduce((s, l) => s + l.comision, 0));
  const iva = r2(base * IVA);
  const total = r2(base + iva);

  return {
    tipo: 'factura',
    numero: `MIRA-${anio}-${String(mes).padStart(2, '0')}-${String(semilla(nombre) % 9000 + 1000)}`,
    fechaEmision: new Date().toISOString().slice(0, 10),
    vencimiento: new Date(Date.now() + 15 * 864e5).toISOString().slice(0, 10),
    periodo: `${MESES[mes - 1]} ${anio}`,
    emisor: { nombre: 'MIRA Restaurants S.L.', nif: 'B-67234519', direccion: 'Carrer de Pujades 77, 08005 Barcelona' },
    receptor: {
      nombre,
      nif: `B-${String(semilla(nombre) % 90000000 + 10000000)}`,
      direccion: [restaurante.direccion, restaurante.ciudad].filter(Boolean).join(', ') || 'Barcelona',
    },
    comisionPct,
    lineas,
    resumen: { totalTickets, base, ivaPct: IVA * 100, iva, total, netoRestaurante: r2(totalTickets - total) },
  };
}

/**
 * Reporte fiscal trimestral. Para un restaurante: desglose por mes.
 * Para el admin (sin restaurante): desglose por local de la red.
 */
export function generarReporteFiscal({ restaurante = null, comisionPct = 10 } = {}) {
  const { anio, trimestre } = periodoActual();
  const clave = restaurante?.nombre || 'red-mira';
  const rand = rng(semilla(`${clave}-${anio}-T${trimestre}`));
  const mesesT = [0, 1, 2].map((k) => (trimestre - 1) * 3 + k);

  const filas = restaurante
    ? mesesT.map((m) => {
      const ventas = r2(4200 + rand() * 7800);
      return { id: m, concepto: MESES[m][0].toUpperCase() + MESES[m].slice(1), sub: `${18 + Math.floor(rand() * 40)} tickets`, ventas };
    })
    : LOCALES.map((l, i) => {
      const ventas = r2(6000 + rand() * 22000);
      return { id: i, concepto: l.nombre, sub: l.ciudad, ventas };
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
    numero: `RF-${anio}-T${trimestre}-${String(semilla(clave) % 900 + 100)}`,
    fechaEmision: new Date().toISOString().slice(0, 10),
    periodo: `${trimestre}º trimestre ${anio}`,
    ambito: restaurante ? restaurante.nombre : 'Red MIRA · Cataluña',
    agrupacion: restaurante ? 'Mes' : 'Restaurante',
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

export function csvDeDocumento(doc) {
  if (doc.tipo === 'factura') {
    return {
      nombre: `${doc.numero}.csv`,
      cabeceras: ['Fecha', 'Reserva', 'Cliente', 'Servicio', 'Pax', 'Ticket', `Comisión ${doc.comisionPct}%`],
      filas: doc.lineas.map((l) => [l.fecha, l.codigo, l.cliente, l.servicio, l.pax, l.ticket.toFixed(2), l.comision.toFixed(2)]),
    };
  }
  return {
    nombre: `${doc.numero}.csv`,
    cabeceras: [doc.agrupacion, 'Ventas', 'Base imponible', 'IVA 10%', 'Comisión', 'IVA comisión', 'Neto'],
    filas: doc.filas.map((f) => [f.concepto, f.ventas, f.base, f.ivaRepercutido, f.comision, f.ivaComision, f.neto].map((v) => (typeof v === 'number' ? v.toFixed(2) : v))),
  };
}
