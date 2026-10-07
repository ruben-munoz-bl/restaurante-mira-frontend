/**
 * Trazabilidad REAL del lado cliente: cada llamada que la web hace a la API
 * queda anotada aquí (método, ruta, estado, ms, uid). Vive en memoria y en
 * sessionStorage: no lee ni escribe en la base de datos.
 * Mismo formato que los registros de `logs` del backend, con `origen: 'real'`.
 */
const CLAVE = 'mira:traza-real';
const MAX = 500;
const oyentes = new Set();
let registros = cargar();

function cargar() {
  try {
    const v = JSON.parse(globalThis.sessionStorage?.getItem(CLAVE) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function guardar() {
  try { globalThis.sessionStorage?.setItem(CLAVE, JSON.stringify(registros)); } catch { /* sin almacenamiento */ }
}

/** /v1/restaurants/abc123?x=1 → /v1/restaurants/:id (ids largos o con dígitos). */
export function normalizarRuta(path) {
  const limpio = String(path || '').replace(/^https?:\/\/[^/]+/, '').split('?')[0];
  return limpio.split('/').map((s) => (!/^v\d+$/.test(s) && (s.length >= 12 || /\d/.test(s)) ? ':id' : s)).join('/');
}

export function moduloDe(ruta) {
  const m = /^\/v\d+\/([^/?]+)/.exec(ruta);
  return m ? m[1] : 'otros';
}

export function registrarPeticion({ metodo, path, status, ms, uid }) {
  const ruta = normalizarRuta(path);
  const ts = new Date().toISOString();
  registros = [...registros, {
    ts, metodo, ruta, path: String(path || '').split('?')[0], modulo: moduloDe(ruta), status, ms: Math.round(ms),
    uid: uid || null, rol: null, anonimo: !uid, origen: 'real',
    requestId: `web_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    queryKeys: [...new URLSearchParams(String(path || '').split('?')[1] || '').keys()],
  }].slice(-MAX);
  guardar();
  oyentes.forEach((f) => f(registros));
}

export function obtenerTrazaReal() { return registros; }

export function limpiarTrazaReal() {
  registros = [];
  guardar();
  oyentes.forEach((f) => f(registros));
}

export function suscribirTrazaReal(f) {
  oyentes.add(f);
  return () => oyentes.delete(f);
}

/**
 * Acción del admin sobre un usuario SIMULADO: no sale a la red (la BD no
 * conoce esos uid), pero queda en la traza marcada como `origen: 'simulado'`.
 */
export function registrarAccionSimulada({ metodo = 'POST', path, uid }) {
  const ruta = normalizarRuta(path);
  registros = [...registros, {
    ts: new Date().toISOString(), metodo, ruta, path, modulo: moduloDe(ruta), status: 200, ms: 0,
    uid: uid || null, rol: 'admin', anonimo: false, origen: 'simulado',
    requestId: `sim_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`, queryKeys: [],
  }].slice(-MAX);
  guardar();
  oyentes.forEach((f) => f(registros));
}
