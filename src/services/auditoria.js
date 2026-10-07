/**
 * Cliente de auditoría: track() encola eventos y los envía por lotes a
 * POST /v1/auditoria/batch. El historial vive en la BD; aquí solo hay una cola
 * temporal en memoria.
 *
 * Privacidad: sin cookies ni terceros. `anonId` es un UUID en localStorage que
 * solo identifica la sesión de navegación anónima; la IP la guarda el servidor
 * con hash. El actor (uid/email) lo pone siempre el servidor a partir del token.
 *
 * También expone `auditoriaApi` con las lecturas del panel (solo admin).
 */
import { api } from './httpClient.js';
import { sanearEvento, crearCola, detectarDispositivo } from './auditoriaCore.js';

const FLUSH_MS = 4000;
const SESION_INACTIVA_MS = 30 * 60000;
const cola = crearCola();
const ultimosScroll = new Map();
let temporizador = null;
let enviando = false;
let reintentoEn = 0;
let dispositivo = null;
let instalado = false;

const hayDom = () => typeof window !== 'undefined' && typeof document !== 'undefined';

function uuid() {
  try { return crypto.randomUUID(); } catch { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`; }
}

function anonId() {
  try {
    let id = localStorage.getItem('mira:anon');
    if (!id) { id = uuid(); localStorage.setItem('mira:anon', id); }
    return id;
  } catch { return null; }
}

/** Sesión por pestaña; caduca tras 30 min sin actividad. Devuelve { id, nueva }. */
function sesion() {
  try {
    const ahora = Date.now();
    const s = JSON.parse(sessionStorage.getItem('mira:sesion') || 'null');
    if (s && ahora - s.ultimo < SESION_INACTIVA_MS) {
      sessionStorage.setItem('mira:sesion', JSON.stringify({ ...s, ultimo: ahora }));
      return { id: s.id, nueva: false };
    }
    const id = uuid();
    sessionStorage.setItem('mira:sesion', JSON.stringify({ id, ultimo: ahora }));
    return { id, nueva: true };
  } catch { return { id: null, nueva: false }; }
}

function infoDispositivo() {
  if (dispositivo || !hayDom()) return dispositivo;
  dispositivo = detectarDispositivo({
    userAgent: navigator.userAgent,
    ancho: window.screen?.width || window.innerWidth,
    alto: window.screen?.height || window.innerHeight,
    dpr: window.devicePixelRatio || 1,
    touch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    lang: navigator.language,
    zonaHoraria: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  return dispositivo;
}

/** Nombre corto de la página a partir del hash (#/restaurante/abc → restaurante). */
export function paginaDe(hash = hayDom() ? window.location.hash : '') {
  const limpio = hash.replace(/^#\/?/, '').split('?')[0];
  return (limpio.split('/')[0] || 'inicio').slice(0, 80);
}

function encolar(evento) {
  const limpio = sanearEvento(evento, { ultimosScroll });
  if (!limpio) return;
  cola.meter(limpio);
  programar();
}

function programar(ms = FLUSH_MS) {
  if (temporizador || !hayDom()) return;
  temporizador = setTimeout(() => { temporizador = null; enviar(); }, Math.max(ms, reintentoEn - Date.now(), 0));
}

/** Envía todo lo pendiente. Si falla, devuelve el lote a la cola y espera (backoff). */
export async function enviar() {
  if (enviando) return;
  enviando = true;
  try {
    for (let lote = cola.sacarLote(); lote; lote = cola.sacarLote()) {
      try {
        await api.post('/v1/auditoria/batch', { eventos: lote }, { auth: 'opcional' });
        reintentoEn = 0;
      } catch (e) {
        if (e.status === 400) continue; // lote inválido: no tiene sentido reintentarlo
        cola.devolver(lote);
        reintentoEn = Date.now() + 30000;
        programar(30000);
        break;
      }
    }
  } finally {
    enviando = false;
  }
}

/**
 * Registra un evento de la web. `props` admite los campos del esquema:
 * entidadTipo, entidadId, entidadNombre, accion, datos, meta, cambios, resultado, codigoError...
 */
export function track(tipo, props = {}) {
  if (!hayDom()) return;
  const s = sesion();
  const base = {
    origen: 'app',
    anonId: anonId(),
    sesionId: s.id,
    ruta: window.location.hash || '#/',
    pagina: paginaDe(),
    dispositivo: infoDispositivo(),
    ts: new Date().toISOString(),
  };
  if (s.nueva && tipo !== 'sesion_iniciada') encolar({ ...base, tipo: 'sesion_iniciada' });
  encolar({ ...base, ...props, tipo });
}

/** Acción de un admin en el panel (con `cambios` antes/después en las escrituras). */
export function trackPanel(tipo, props = {}) {
  track(tipo, { ...props, origen: 'panel' });
}

/** Envuelve una promesa de escritura: registra ok/error con el mismo tipo. */
export async function conAuditoria(tipo, props, promesa, { panel = false } = {}) {
  const t0 = Date.now();
  const registrar = panel ? trackPanel : track;
  try {
    const r = await promesa;
    registrar(tipo, { ...props, meta: { ...(props.meta || {}), latenciaMs: Date.now() - t0 } });
    return r;
  } catch (e) {
    registrar(tipo, { ...props, resultado: 'error', codigoError: String(e.status || e.code || 'ERROR'), mensajeError: e.message });
    throw e;
  }
}

/* ───────── Instrumentación global (navegación, scroll, salidas, CTAs) ───────── */

export function instalarAuditoria() {
  if (instalado || !hayDom()) return;
  instalado = true;
  let umbrales = new Set();

  const vista = () => {
    umbrales = new Set();
    track('pagina_vista', { datos: { referrer: document.referrer ? new URL(document.referrer).hostname : null } });
  };
  vista();
  window.addEventListener('hashchange', (e) => {
    track('ruta_cambiada', { datos: { desde: paginaDe(new URL(e.oldURL).hash), hacia: paginaDe() } });
    vista();
  });

  let pendienteScroll = false;
  window.addEventListener('scroll', () => {
    if (pendienteScroll) return;
    pendienteScroll = true;
    requestAnimationFrame(() => {
      pendienteScroll = false;
      const alto = document.documentElement.scrollHeight - window.innerHeight;
      if (alto < 200) return;
      const pct = (window.scrollY / alto) * 100;
      for (const u of [25, 50, 75, 100]) {
        if (pct >= u - 1 && !umbrales.has(u)) {
          umbrales.add(u);
          track('scroll_profundidad', { meta: { valor: u } });
        }
      }
    });
  }, { passive: true });

  document.addEventListener('click', (e) => {
    const a = e.target.closest?.('a[href^="http"]');
    if (a && a.host !== window.location.host) track('enlace_salida', { datos: { destino: a.hostname } });
    const cta = e.target.closest?.('[data-cta], .btn-cta');
    if (cta) track('cta_pulsado', { accion: (cta.dataset.cta || cta.textContent || '').trim().slice(0, 80) });
  }, { capture: true });

  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') enviar(); });
  window.addEventListener('pagehide', () => { track('sesion_cerrada'); enviar(); });
}

/* ───────── Lecturas del panel (solo admin) ───────── */

function qs(params = {}) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v != null && v !== '') p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : '';
}

export const auditoriaApi = {
  overview: (f) => api.get(`/v1/auditoria/overview${qs(f)}`),
  series: (f) => api.get(`/v1/auditoria/series${qs(f)}`),
  breakdown: (f) => api.get(`/v1/auditoria/breakdown${qs(f)}`),
  actividad: (f) => api.get(`/v1/auditoria/actividad${qs(f)}`),
  usuarios: (f) => api.get(`/v1/auditoria/usuarios${qs(f)}`),
  logs: (f) => api.get(`/v1/auditoria/logs${qs(f)}`),
  timeline: (uid) => api.get(`/v1/auditoria/usuario/${encodeURIComponent(uid)}`),
  estimarExport: (f) => api.get(`/v1/auditoria/export${qs({ ...f, estimar: 1 })}`),
  /** El backend genera el fichero (y registra export_auditoria). Devuelve el texto. */
  exportar: async (f) => {
    const r = await api.get(`/v1/auditoria/export${qs(f)}`);
    return typeof r === 'string' ? r : JSON.stringify(r, null, 2);
  },
  estado: () => api.get('/v1/auditoria/estado'),
  guardarAjustes: (ajustes) => api.put('/v1/auditoria/ajustes', ajustes),
  simEstado: () => api.get('/v1/auditoria/sim/estado'),
  simular: (opts = {}) => api.post('/v1/auditoria/sim/run', opts),
  limpiarSimulacion: (simRunId) => api.post('/v1/auditoria/sim/reset', simRunId ? { simRunId } : {}),
  purgar: (anios) => api.post(`/v1/auditoria/purge?anios=${anios}`, { confirmacion: 'PURGAR' }),
};
