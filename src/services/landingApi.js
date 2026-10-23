/**
 * Datos de las secciones de la landing (M07). Todo es opcional y tolerante a
 * fallos: si un endpoint aún no está desplegado, devuelve una lista vacía y la
 * sección se oculta sola.
 */
import { api } from './httpClient.js';
import { promotionsApi } from './api.js';
import { fotoDePlato } from './fotosPlatos.js';
import { primerPlatoLocal } from '../models/landingModel.js';

// Fotos generadas del plato visto desde arriba y recortado (public/platos/<slug>.webp).
const PLATOS_RECORTADOS = new Set([
  'bravas', 'brunch-completo', 'cafe-de-especialidad', 'calcots', 'calzone', 'churros', 'crep-de-setas',
  'ensalada-cesar', 'entrana', 'entrecot', 'huevos-benedict', 'jamon-iberico', 'kebab-mixto', 'lasana',
  'menu-degustacion', 'paella', 'patatas', 'pizza-cuatro-quesos', 'plato-del-dia', 'pulpo-a-la-gallega',
  'risotto-de-setas', 'sopa-del-dia', 'tortilla', 'tostada-con-tomate', 'zarzuela',
]);

/** «Lasaña» → "lasana", «Calçots» → "calcots". */
export function slugPlato(nombre) {
  return String(nombre || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Ruta de la foto recortada del plato, o null si no hay. */
export function fotoRecortada(nombre) {
  const slug = slugPlato(nombre);
  return PLATOS_RECORTADOS.has(slug) ? `/platos/${slug}.webp` : null;
}

/** Firestore puede serializar fechas como ISO o como { seconds } / { _seconds }. */
function aMs(valor) {
  if (valor == null || valor === '') return null;
  if (typeof valor === 'number') return valor;
  if (typeof valor === 'string') {
    const ms = new Date(valor).getTime();
    return Number.isNaN(ms) ? null : ms;
  }
  const seg = valor.seconds ?? valor._seconds;
  return typeof seg === 'number' ? seg * 1000 : null;
}

/**
 * Promociones vigentes (GET /v1/promotions?estado=activa, público).
 * El estado no cambia solo al caducar: se filtra aquí por fechas y, si hay
 * varias para el mismo restaurante, se queda la de mayor prioridad.
 */
export async function fetchPromocionesActivas() {
  let promos;
  try {
    promos = await promotionsApi.list({ estado: 'activa' });
  } catch {
    return [];
  }
  if (!Array.isArray(promos)) return [];
  const ahora = Date.now();
  const porRestaurante = new Map();
  for (const p of promos) {
    const inicio = aMs(p.fechaInicio);
    const fin = aMs(p.fechaFin);
    if (inicio != null && inicio > ahora) continue;
    if (fin != null && fin < ahora) continue;
    if (!p.restauranteId) continue;
    const previa = porRestaurante.get(p.restauranteId);
    if (!previa || (Number(p.prioridad) || 0) > (Number(previa.prioridad) || 0)) {
      porRestaurante.set(p.restauranteId, p);
    }
  }
  return [...porRestaurante.values()];
}

/** Restaurantes con más reservas de la semana (M12). */
export async function fetchMasReservados(limite = 8) {
  try {
    const d = await api.get(`/v1/restaurants/mas-reservados?dias=7&limit=${limite}`, { auth: false });
    return (d.data || []).filter((r) => r?.id != null && Number(r.reservas) > 0);
  } catch {
    return [];
  }
}

/** Primera carta disponible de cada restaurante, con foto resuelta. */
async function platoDe(restaurante) {
  let plato = null;
  try {
    const carta = await api.get(`/v1/cartas/${encodeURIComponent(restaurante.id)}`, { auth: false });
    plato = (carta?.categorias || []).flatMap((c) => c.platos || []).find((p) => p?.nombre) || null;
  } catch {
    // shortcut: sin cartas sembradas (M14) se usa la carta simulada del frontend.
    // Quitar el fallback cuando producción tenga /v1/cartas.
  }
  if (!plato) plato = primerPlatoLocal(restaurante);
  if (!plato) return null;
  // La foto del restaurante manda; si no, la recortada del plato y, en último caso, Wikipedia.
  const recortada = plato.foto ? null : fotoRecortada(plato.nombre);
  const foto = plato.foto || recortada || (await fotoDePlato(plato.nombre));
  if (!foto) return null;
  return {
    restaurante,
    plato: { nombre: plato.nombre, precio: plato.precio, foto, recortada: Boolean(recortada) },
  };
}

/**
 * Platos destacados para la sección de fotos. Se piden solo las primeras
 * cartas (una petición por restaurante) y las que no existen o no tienen foto
 * se descartan.
 */
/** Mira el triple de restaurantes y pone primero los platos con foto recortada. */
export async function fetchPlatosDestacados(restaurantes, limite = 8) {
  const lista = (restaurantes || []).slice(0, limite * 3);
  const resultados = await Promise.allSettled(lista.map(platoDe));
  return resultados
    .filter((r) => r.status === 'fulfilled' && r.value)
    .map((r) => r.value)
    .sort((a, b) => Boolean(b.plato?.recortada) - Boolean(a.plato?.recortada))
    .slice(0, limite);
}
