/**
 * Carta del restaurante y pedido anticipado (contrato M01).
 * GET público: 404 = sin carta (no se ofrece pedir). Editor: empresa dueña o admin.
 */
import { api } from './httpClient.js';

/** Carta pública (solo platos disponibles) o null si el restaurante no tiene. */
export async function getCarta(restauranteId) {
  try {
    const c = await api.get(`/v1/cartas/${encodeURIComponent(restauranteId)}`, { auth: false });
    return c?.categorias?.length ? c : null;
  } catch (e) {
    if (e?.status === 404) return null;
    throw e;
  }
}

export const getCartaEditar = (restauranteId) => api.get(`/v1/cartas/${encodeURIComponent(restauranteId)}/editar`);

export const guardarCarta = (restauranteId, categorias) => api.put(`/v1/cartas/${encodeURIComponent(restauranteId)}`, { categorias });

/** { platoId: cantidad } → líneas del pedido (sin cantidades a 0), o null si está vacío. */
export function pedidoDesde(cantidades) {
  const lineas = Object.entries(cantidades || {})
    .filter(([, n]) => Number(n) > 0)
    .map(([platoId, n]) => ({ platoId, cantidad: Number(n) }));
  return lineas.length ? { lineas } : null;
}

/** Total orientativo en euros con 2 decimales. */
export function totalPedido(carta, cantidades) {
  const platos = (carta?.categorias || []).flatMap((c) => c.platos);
  const t = platos.reduce((s, p) => s + p.precio * (Number(cantidades?.[p.id]) || 0), 0);
  return Math.round(t * 100) / 100;
}
