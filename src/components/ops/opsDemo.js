/**
 * Overview simulado del panel admin: mismas claves que getOpsOverview(), pero
 * generado en memoria (cero lecturas). Se usa en el modo «Datos de presentación».
 */

export function crearOverviewSimulado() {
  const hoy = new Date();
  // Desde el día 1 de hace 4 meses hasta hoy: meses completos + el mes en curso.
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 4, 1);
  const dias = Math.round((hoy - inicio) / 864e5) + 1;
  const serieMeses = Array.from({ length: dias }, (_, i) => {
    const d = new Date(inicio); d.setDate(inicio.getDate() + i);
    const crecimiento = i * 0.12; // la red crece mes a mes
    const reservas = Math.round(12 + crecimiento + Math.sin(i / 1.6) * 6 + (d.getDay() >= 5 ? 9 : 0) + ((i * 7) % 5));
    const pax = Math.round(reservas * 2.7);
    const facturacion = Math.round(pax * 34.5 * 100) / 100;
    return {
      fecha: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      etiqueta: d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
      reservas, pax, facturacion, comisiones: Math.round(facturacion * 0.08 * 100) / 100, tickets: Math.round(reservas * 0.8),
    };
  });
  const serie = serieMeses.slice(-14);
  const sum = (k) => serie.reduce((s, d) => s + d[k], 0);
  const locales = ['Can Solé', 'La Taverna del Port', 'El Celler de Gràcia', 'Mar i Muntanya', 'Sushi Born'];
  const clientes = ['Laura Martí', 'Jordi Puig', 'Marta Soler', 'Pau Ferrer', 'Anna Vidal', 'Marc Roca', 'Clara Font', 'Sergi Mas'];
  const estados = ['confirmada', 'completada', 'pendiente', 'confirmada', 'cancelada', 'completada', 'no_show', 'pendiente'];
  return {
    kpis: {
      facturacionTotal: sum('facturacion'), comisionTotal: sum('comisiones'), mediaComensal: 34.5, comisionPct: 8,
      ticketPromedio: Math.round((sum('facturacion') / Math.max(1, sum('tickets'))) * 100) / 100, ticketsTotal: sum('tickets'), altas7d: 3, reservasTotal: sum('reservas'), asistenciaPct: 90,
      restaurantesActivos: 48, incidenciasPendientes: 2, criticas: 1, usuariosTotal: 1284,
    },
    serie,
    serieMeses,
    porEstado: (() => {
      const t = sum('reservas');
      const cancelada = Math.round(t * 0.07); const no_show = Math.round(t * 0.03); const pendiente = Math.round(t * 0.12);
      const completada = Math.round(t * 0.3);
      return { confirmada: t - cancelada - no_show - pendiente - completada, completada, pendiente, cancelada, no_show };
    })(),
    ocupacion: (() => { const p = serie.slice(-7).reduce((s, d) => s + d.pax, 0); return { comida: { pax: Math.round(p * 0.42) }, cena: { pax: Math.round(p * 0.58) } }; })(),
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

