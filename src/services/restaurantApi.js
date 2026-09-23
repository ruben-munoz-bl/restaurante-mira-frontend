/**
 * Model — lectura de restaurantes vía API (intermediario mira-api).
 */
import { api } from './httpClient.js';
import { imagenParaRestaurante } from '../models/restaurantModel.js';

/** Restaurantes por tanda en la portada (scroll infinito). */
export const TAMANO_PAGINA = 27;

const PRECIOS_VALIDOS = ['€', '€€', '€€€'];

function mapearDoc(id, d) {
  const categorias = Array.isArray(d.categorias) ? d.categorias : [];
  const resenas = Array.isArray(d.resenas) ? d.resenas : [];
  return {
    id,
    nombre: d.nombre ?? 'Sin nombre',
    cocina: categorias[0] ?? 'Mediterránea',
    categorias,
    precio: PRECIOS_VALIDOS.includes(d.precio) ? d.precio : '€€',
    distanciaKm: null,
    coords:
      typeof d.coordenadas?.latitud === 'number' && typeof d.coordenadas?.longitud === 'number'
        ? { lat: d.coordenadas.latitud, lng: d.coordenadas.longitud }
        : null,
    valoracion: typeof d.rating_yelp === 'number' ? d.rating_yelp : 0,
    totalResenasYelp: d.total_resenas_yelp ?? 0,
    imagen: d.imagen_url || imagenParaRestaurante(categorias[0] ?? 'Mediterránea', id),
    descripcion:
      d.descripcion ||
      [categorias.join(' · '), d.direccion_completa || d.ciudad].filter(Boolean).join(' — ') ||
      'Restaurante recomendado por la guía MIRA.',
    direccion: d.direccion_completa || d.direccion || '',
    ciudad: d.ciudad || '',
    zona: d.zona_busqueda || '',
    telefono: d.telefono || '',
    yelpUrl: d.yelp_url || '',
    accesoDiscapacidad: d.accesoDiscapacidad ?? null,
    menuInfantil: d.menuInfantil ?? null,
    tronas: d.tronas ?? null,
    entornoTranquilo: d.entornoTranquilo ?? null,
    terraza: d.terraza ?? null,
    alergenos: d.alergenos || '',
    resenas,
    maxReservasPorHora: d.maxReservasPorHora ?? null,
  };
}

export async function fetchRestaurants() {
  const d = await api.get('/v1/restaurants?all=1', { auth: false });
  const items = d.items || d.data || [];
  return items.map((r) => mapearDoc(r.id, r));
}

export async function fetchPrimeraPagina() {
  const d = await api.get(`/v1/restaurants?limit=${TAMANO_PAGINA}`, { auth: false });
  return {
    items: (d.items || []).map((r) => mapearDoc(r.id, r)),
    cursor: d.cursor ?? null,
    terminado: Boolean(d.terminado),
  };
}

export async function fetchSiguientePagina(cursor) {
  if (!cursor) return { items: [], cursor: null, terminado: true };
  const d = await api.get(`/v1/restaurants?limit=${TAMANO_PAGINA}&cursor=${encodeURIComponent(cursor)}`, { auth: false });
  return {
    items: (d.items || []).map((r) => mapearDoc(r.id, r)),
    cursor: d.cursor ?? null,
    terminado: Boolean(d.terminado),
  };
}

export async function contarRestaurantes() {
  const d = await api.get('/v1/restaurants/count', { auth: false });
  return d.total ?? d.count ?? 0;
}

export async function fetchRestaurantePorId(id) {
  try {
    const d = await api.get(`/v1/restaurants/${encodeURIComponent(id)}`, { auth: false });
    if (!d || d.error === 'NOT_FOUND') return null;
    return mapearDoc(d.id, d);
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}
