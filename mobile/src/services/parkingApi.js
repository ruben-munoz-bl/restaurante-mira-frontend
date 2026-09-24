/**
 * Parkings cercanos con Geoapify Places API.
 * - Key gratuita: 3 000 req/día (geoapify.com).
 * - Caché en localStorage 48 h por coordenadas.
 * - Sin key → aviso en consola + devuelve [].
 * - Fallback: Google Maps link si no hay parkings.
 */

const CACHE_TTL_MS = 48 * 60 * 60 * 1000; // 48 h

function getKey() {
  const k = process.env.EXPO_PUBLIC_GEOAPIFY_KEY;
  if (!k) {
    console.warn('[parkingApi] Falta EXPO_PUBLIC_GEOAPIFY_KEY en mobile/.env — parkings deshabilitados.');
  }
  return k || null;
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

  const key = getKey();
  if (!key) return [];

  const cached = leerCache(lat, lng);
  if (cached) return cached;

  // Geoapify usa orden lon,lat
  const lon = Number(lng);
  const la = Number(lat);

  const url = `https://api.geoapify.com/v2/places?categories=parking.cars&filter=circle:${lon},${la},500&bias=proximity:${lon},${la}&limit=10&apiKey=${key}`;

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);

    if (!res.ok) {
      console.warn(`[parkingApi] Geoapify respondió ${res.status}`);
      return [];
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
    console.warn('[parkingApi] Error fetching parkings:', err.message || err);
    return [];
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
