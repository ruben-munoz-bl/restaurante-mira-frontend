/**
 * Model — reservas vía API (intermediario mira-api).
 * SLOTS alineados con el backend (11 franjas cada 30 min).
 */
import { api } from './httpClient.js';

/** Franjas fijas de reserva (comida + cena, 30 min). */
export const SLOTS = [
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '20:00', '20:30', '21:00', '21:30', '22:00',
];

export function limitePorResenas(totalResenasYelp) {
  const n = Number(totalResenasYelp) || 0;
  if (n < 100) return 4;
  if (n < 500) return 6;
  if (n < 1000) return 8;
  if (n < 2000) return 10;
  return 12;
}

export function limiteDelLocal(restaurante) {
  const propio = Number(restaurante?.maxReservasPorHora);
  if (Number.isInteger(propio) && propio > 0) return propio;
  return limitePorResenas(restaurante?.totalResenasYelp);
}

function hoyISO() {
  const h = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${h.getFullYear()}-${p(h.getMonth() + 1)}-${p(h.getDate())}`;
}

function validarReserva({ fecha, hora, comensales, comentarios }) {
  if (!fecha || fecha < hoyISO()) throw new Error('La fecha debe ser hoy o futura (YYYY-MM-DD).');
  if (!SLOTS.includes(hora)) throw new Error('Hora no válida: elige una de las franjas.');
  const n = Number(comensales);
  if (!Number.isInteger(n) || n < 1 || n > 10) throw new Error('Comensales: entre 1 y 10.');
  if ((comentarios || '').length > 500) throw new Error('Comentarios: máximo 500 caracteres.');
}

export async function getDisponibilidad(restaurante, fecha, hora) {
  const limite = limiteDelLocal(restaurante);
  if (!fecha || !hora) return { limite, ocupadas: 0, libres: limite };
  try {
    const q = new URLSearchParams({
      restauranteId: String(restaurante.id),
      fecha,
      hora,
    });
    const d = await api.get(`/v1/reservations/availability?${q}`);
    return d;
  } catch {
    return { limite, ocupadas: 0, libres: limite };
  }
}

export async function crearReserva({ restaurante, usuario, fecha, hora, comensales, comentarios = '' }) {
  if (!usuario?.uid) throw new Error('Debes iniciar sesión para reservar.');
  validarReserva({ fecha, hora, comensales, comentarios });
  const restaurantId = String(restaurante.id);
  const d = await api.post('/v1/reservations', {
    restaurantId,
    restauranteId: restaurantId,
    fecha,
    hora,
    comensales: Number(comensales),
    comentarios: (comentarios || '').trim(),
    nombreRestaurante: restaurante.nombre || '',
    usuarioNombre: usuario.displayName || usuario.nombre || usuario.email || '',
    usuarioEmail: usuario.email || '',
  });
  return {
    id: d.id,
    codigo: d.codigo,
    restauranteNombre: d.restauranteNombre || restaurante.nombre,
    fecha: d.fecha || fecha,
    hora: d.hora || hora,
    comensales: d.comensales ?? Number(comensales),
  };
}

export async function listarMisReservas() {
  const d = await api.get('/v1/reservations');
  const list = d.data || d;
  list.sort((a, b) => `${a.fecha || ''} ${a.hora || ''}`.localeCompare(`${b.fecha || ''} ${b.hora || ''}`));
  return list;
}

export async function cancelarReserva(reservaId) {
  await api.put(`/v1/reservations/${reservaId}/cancel`);
  return { ok: true };
}
