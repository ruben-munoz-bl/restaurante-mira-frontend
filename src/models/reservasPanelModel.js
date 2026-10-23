/**
 * Sección Reservas y pedidos del panel (M10): lógica pura sobre
 * GET /v1/reservations/restaurante → { data: [ { id, codigo, fecha, hora,
 * comensales, estado, comentarios, presentadaEn, cliente: { nombre }, pedido } ] }.
 */

export const DIAS_PANEL = 7;

/** Rango { desde, hasta } (AAAA-MM-DD) de hoy a hoy + dias. */
export function rangoPanel(hoyISO, dias = DIAS_PANEL) {
  const d = new Date(`${hoyISO}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return { desde: hoyISO, hasta: d.toISOString().slice(0, 10) };
}

const esCancelada = (r) => String(r?.estado || '').toLowerCase().startsWith('cancel');

/** Agrupa por fecha (orden de fecha y hora); con soloPedido deja solo las que llevan pedido. */
export function agruparPorDia(reservas, { soloPedido = false } = {}) {
  const filas = (Array.isArray(reservas) ? reservas : [])
    .filter((r) => r?.id && r.fecha && (!soloPedido || r.pedido))
    .slice()
    .sort((a, b) => `${a.fecha} ${a.hora || ''}`.localeCompare(`${b.fecha} ${b.hora || ''}`));
  const grupos = [];
  for (const r of filas) {
    const ultimo = grupos[grupos.length - 1];
    const fila = { ...r, cancelada: esCancelada(r), presentada: Boolean(r.presentadaEn) };
    if (ultimo?.fecha === r.fecha) ultimo.reservas.push(fila);
    else grupos.push({ fecha: r.fecha, reservas: [fila] });
  }
  return grupos;
}

/** Marca como presentada la reserva devuelta por el check-in, sin esperar a recargar. */
export function marcarPresentada(reservas, reserva) {
  if (!reserva?.id) return reservas;
  return (reservas || []).map((r) => (r.id === reserva.id ? { ...r, presentadaEn: reserva.presentadaEn || new Date().toISOString() } : r));
}
