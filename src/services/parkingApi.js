/**
 * Parkings cercanos con Geoapify Places API.
 * - Key gratuita: 3 000 req/día (geoapify.com).
 * - Caché en localStorage 48 h por coordenadas.
 * - Sin key (o si Geoapify falla) → OpenStreetMap vía Overpass, gratis y sin registro.
 * - Fallback: Google Maps link si no hay parkings.
 */

const CACHE_TTL_MS = 48 * 60 * 60 * 1000; // 48 h

function getKey() {
  return (import.meta.env || {}).VITE_GEOAPIFY_KEY || null;
}

// Instancia principal y espejo de respaldo (si una falla o va saturada, se prueba la otra).
const OVERPASS_URLS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];

function distanciaMetros(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const rad = (g) => (g * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

const TIPO_OSM = { underground: 'Subterráneo', 'multi-storey': 'Multinivel', surface: 'Superficie', rooftop: 'Azotea' };

/**
 * Alternativa sin clave: OpenStreetMap (Nominatim y, de respaldo, Overpass). Gratis, sin registro.
 * Se usa cuando no hay VITE_GEOAPIFY_KEY o Geoapify falla.
 */
/** Nominatim (buscador oficial de OSM): rápido y estable. Caja de ~500 m alrededor del punto. */
async function fetchParkingsNominatim(la, lon) {
  const dLat = 0.0045;
  const dLon = dLat / Math.cos((la * Math.PI) / 180);
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&amenity=parking&bounded=1&limit=15&extratags=1&viewbox=${lon - dLon},${la + dLat},${lon + dLon},${la - dLat}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'Accept-Language': 'es' } });
    if (!res.ok) throw new Error(`Nominatim respondió ${res.status}`);
    const lista = await res.json();
    return mapearOSM(
      {
        elements: lista.map((x) => ({
          type: x.osm_type,
          id: x.osm_id,
          lat: Number(x.lat),
          lon: Number(x.lon),
          tags: { name: x.name, ...(x.extratags || {}) },
        })),
      },
      la,
      lon,
    ).filter((p) => p.distanciaMetros <= 600);
  } finally {
    clearTimeout(t);
  }
}

async function fetchParkingsOSM(la, lon) {
  try {
    const lista = await fetchParkingsNominatim(la, lon);
    if (lista.length) return lista;
  } catch {
    /* si Nominatim falla, se prueba Overpass */
  }
  const consulta = `[out:json][timeout:15];(nwr["amenity"="parking"]["access"!="private"](around:500,${la},${lon}););out center 40;`;
  let ultimoError;
  for (const url of OVERPASS_URLS) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(url, { method: 'POST', body: new URLSearchParams({ data: consulta }), signal: ctrl.signal });
      if (!res.ok) throw new Error(`Overpass respondió ${res.status}`);
      return mapearOSM(await res.json(), la, lon);
    } catch (err) {
      ultimoError = err;
    } finally {
      clearTimeout(t);
    }
  }
  throw ultimoError;
}

function mapearOSM(json, la, lon) {
  return (json.elements || [])
      .map((e) => {
        const tags = e.tags || {};
        const plat = e.lat ?? e.center?.lat;
        const plon = e.lon ?? e.center?.lon;
        if (plat == null || plon == null) return null;
        return {
          id: `osm-${e.type}-${e.id}`,
          nombre: tags.name || tags.operator || (tags.parking === 'underground' ? 'Parking subterráneo' : 'Parking'),
          lat: plat,
          lon: plon,
          distanciaMetros: distanciaMetros(la, lon, plat, plon),
          gratuito: tags.fee === 'no' ? 'yes' : 'no',
          accesible: tags.wheelchair === 'yes' || Number(tags['capacity:disabled']) > 0 ? 'Sí' : '—',
          direccion: [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ') || '—',
          tipo: TIPO_OSM[tags.parking] || '—',
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.distanciaMetros - b.distanciaMetros)
      .slice(0, 10);
}

function cacheKey(lat, lng) {
  return `parkings_${Number(lat).toFixed(4)}_${Number(lng).toFixed(4)}`;
}

function leerCache(lat, lng) {
  try {
    const raw = localStorage.getItem(cacheKey(lat, lng));
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) {
      localStorage.removeItem(cacheKey(lat, lng));
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function escribirCache(lat, lng, data) {
  try {
    localStorage.setItem(cacheKey(lat, lng), JSON.stringify({ ts: Date.now(), data }));
  } catch { /* storage lleno o bloqueado */ }
}

function clasificarTipo(categories) {
  if (!Array.isArray(categories)) return '—';
  for (const c of categories) {
    if (c.includes('underground')) return 'Subterráneo';
    if (c.includes('multistorey')) return 'Multinivel';
    if (c.includes('surface')) return 'Superficie';
  }
  return '—';
}

/**
 * Fetch parkings cercanos (≤500 m) con Geoapify.
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<Array>}
 */
export async function fetchNearbyParkings(lat, lng) {
  if (lat == null || lng == null) return [];

  const cached = leerCache(lat, lng);
  if (cached && cached.length) return cached;

  // Geoapify usa orden lon,lat
  const lon = Number(lng);
  const la = Number(lat);

  const key = getKey();
  if (!key) {
    try {
      const osm = await fetchParkingsOSM(la, lon);
      escribirCache(lat, lng, osm);
      return osm;
    } catch (err) {
      console.warn('[parkingApi] OpenStreetMap no disponible:', err.message || err);
      return [];
    }
  }

  const url = `https://api.geoapify.com/v2/places?categories=parking.cars&filter=circle:${lon},${la},500&bias=proximity:${lon},${la}&limit=10&apiKey=${key}`;

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);

    if (!res.ok) {
      console.warn(`[parkingApi] Geoapify respondió ${res.status}; uso OpenStreetMap`);
      return fetchParkingsOSM(la, lon).catch(() => []);
    }

    const json = await res.json();
    const features = Array.isArray(json.features) ? json.features : [];

    const parkings = features
      .map((f) => {
        const p = f.properties || {};
        const geom = f.geometry?.coordinates || [];
        return {
          id: f.properties?.place_id || `geoapify-${geom[1]}-${geom[0]}`,
          nombre: p.name || 'Parking',
          lat: geom[1] ?? null,
          lon: geom[0] ?? null,
          distanciaMetros: p.distance ?? null,
          gratuito: p.conditions?.includes('no_fee') ? 'yes' : 'no',
          accesible: p.facilities?.wheelchair ? 'Sí' : '—',
          direccion: p.formatted || '—',
          tipo: clasificarTipo(p.categories),
        };
      })
      .filter((p) => p.lat != null && p.lon != null)
      .sort((a, b) => (a.distanciaMetros ?? Infinity) - (b.distanciaMetros ?? Infinity))
      .slice(0, 10);

    escribirCache(lat, lng, parkings);
    return parkings;
  } catch (err) {
    console.warn('[parkingApi] Error con Geoapify; uso OpenStreetMap:', err.message || err);
    return fetchParkingsOSM(la, lon).catch(() => []);
  }
}

/** Texto corto "220 m" / "1,2 km". */
export function formatoDistancia(m) {
  if (m == null) return '';
  if (m < 1000) return `${m} m`;
  return `${(m / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} km`;
}

/** Enlace Google Maps a un punto. */
export function mapsLink(lat, lng) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/** Búsqueda de parkings en Google Maps alrededor del restaurante. */
export function buscarParkingEnGoogle(lat, lng) {
  return `https://www.google.com/maps/search/?api=1&query=parking+near+${lat},${lng}`;
}
