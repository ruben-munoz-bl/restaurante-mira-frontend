/**
 * Reseñas vía API (intermediario mira-api).
 */
import { api } from './httpClient.js';

export async function crearResena({ restauranteId, puntuacion, comentario }) {
  if (!puntuacion || puntuacion < 1 || puntuacion > 5) throw new Error('Puntuación 1-5.');
  if (!comentario?.trim()) throw new Error('Escribe un comentario.');
  const d = await api.post('/v1/reviews', {
    restauranteId: String(restauranteId),
    puntuacion: Number(puntuacion),
    comentario: comentario.trim(),
  });
  return d.id || d.reviewId;
}

export async function listarResenasDeRestaurante(restauranteId) {
  const d = await api.get(`/v1/reviews/${encodeURIComponent(restauranteId)}`, { auth: false });
  const list = d.data || d || [];
  list.sort((a, b) => (b.likes || 0) - (a.likes || 0) || (b.puntuacion || 0) - (a.puntuacion || 0));
  return list;
}

export async function listarResenasDeUsuario(usuarioId) {
  const d = await api.get(`/v1/reviews/user/${encodeURIComponent(usuarioId)}`, { auth: false });
  const list = Array.isArray(d) ? d : d.data || [];
  list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return list;
}

export async function darLikeResena(resenaId) {
  await api.post(`/v1/reviews/${encodeURIComponent(resenaId)}/like`);
}

export async function quitarLikeResena(resenaId) {
  await api.del(`/v1/reviews/${encodeURIComponent(resenaId)}/like`);
}
