/**
 * Model — lectura de restaurantes vía API (intermediario mira-api).
 */
import { api } from './httpClient.js';
import { imagenParaRestaurante } from '../models/restaurantModel.js';
import { conServiciosEstimados } from '../models/serviciosEstimados.js';

/** Restaurantes por tanda en la portada (scroll infinito). */
export const TAMANO_PAGINA = 27;

const PRECIOS_VALIDOS = ['€', '€€', '€€€'];

function toCoordNumber(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function extraerCoords(d) {
  const c = d.coordenadas || {};
  const lat = toCoordNumber(c.latitud ?? c.lat ?? d.lat);
  const lng = toCoordNumber(c.longitud ?? c.lng ?? c.lon ?? d.lng);
  if (lat == null || lng == null) return null;
  return { lat, lng };
}

function mapearDoc(id, d) {
  return conServiciosEstimados(mapearDocBase(id, d));
}

function mapearDocBase(id, d) {
  const categorias = Array.isArray(d.categorias) ? d.categorias : [];
  const resenas = Array.isArray(d.resenas) ? d.resenas : [];
  return {
    id,
    nombre: d.nombre ?? 'Sin nombre',
    cocina: categorias[0] ?? 'Mediterránea',
    categorias,
    precio: PRECIOS_VALIDOS.includes(d.precio) ? d.precio : '€€',
    distanciaKm: null,
    coords: extraerCoords(d),
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

/*
 * Caché del catálogo completo (?all=1).
 * Cada descarga lee TODOS los documentos en el backend (≈700 lecturas), y la
 * pedían el buscador en cada cambio de filtro, el mapa y Descubrir. Ahora:
 * - en memoria: se descarga una vez y se reutiliza durante CATALOGO_TTL_MS;
 * - peticiones simultáneas comparten la misma descarga (no se duplica);
 * - copia en sessionStorage para que recargar la pestaña tampoco la repita.
 * Los errores no se cachean: el siguiente intento vuelve a pedirlo.
 */
export const CATALOGO_TTL_MS = 10 * 60 * 1000;
const CLAVE_SESION = 'mira:catalogo:v1';

let catalogo = null; // { items, guardado }
let enVuelo = null; // Promise<items> mientras hay una descarga en curso

const fresco = (c) => c && Date.now() - c.guardado < CATALOGO_TTL_MS;

function leerSesion() {
  try {
    const raw = globalThis.sessionStorage?.getItem(CLAVE_SESION);
    const c = raw ? JSON.parse(raw) : null;
    return fresco(c) && Array.isArray(c.items) ? c : null;
  } catch {
    return null;
  }
}

function guardarSesion(c) {
  try {
    globalThis.sessionStorage?.setItem(CLAVE_SESION, JSON.stringify(c));
  } catch {
    /* sin almacenamiento o cuota llena: basta con la memoria */
  }
}

/** Olvida el catálogo cacheado (p. ej. tras crear o editar un restaurante). */
export function invalidarCatalogo() {
  catalogo = null;
  enVuelo = null;
  try {
    globalThis.sessionStorage?.removeItem(CLAVE_SESION);
  } catch {
    /* nada que limpiar */
  }
}

/** Catálogo completo. `forzar: true` ignora la caché y vuelve a pedirlo. */
export async function fetchRestaurants({ forzar = false } = {}) {
  if (!forzar) {
    if (!fresco(catalogo)) catalogo = leerSesion();
    if (fresco(catalogo)) return [...catalogo.items];
    if (enVuelo) return [...(await enVuelo)];
  }
  const descarga = api.get('/v1/restaurants?all=1', { auth: false }).then((d) => {
    const items = (d.items || d.data || []).map((r) => mapearDoc(r.id, r));
    catalogo = { items, guardado: Date.now() };
    guardarSesion(catalogo);
    return items;
  });
  enVuelo = descarga;
  try {
    return [...(await descarga)];
  } finally {
    if (enVuelo === descarga) enVuelo = null;
  }
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
  // Si el catálogo ya está en memoria, no hace falta otra lectura.
  const enCache = fresco(catalogo) && catalogo.items.find((r) => String(r.id) === String(id));
  if (enCache) return enCache;
  try {
    const d = await api.get(`/v1/restaurants/${encodeURIComponent(id)}`, { auth: false });
    if (!d || d.error === 'NOT_FOUND') return null;
    return mapearDoc(d.id, d);
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}
