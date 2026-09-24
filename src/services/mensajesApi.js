/**
 * Model — mensajería interna vía API.
 */
import { api } from './httpClient.js';

export async function listarMensajes() {
  const d = await api.get('/v1/mensajes');
  return Array.isArray(d) ? d : d.data || [];
}

export async function contarNoLeidos() {
  try {
    const d = await api.get('/v1/mensajes/unread-count');
    return d.count ?? 0;
  } catch {
    return 0;
  }
}

export async function marcarLeido(id) {
  await api.put(`/v1/mensajes/${encodeURIComponent(id)}/read`);
}
