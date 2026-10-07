/**
 * Núcleo puro del cliente de auditoría (sin DOM ni red): saneado, cola por
 * lotes, dispositivo, periodos y formato de breakdown. Se testea con node --test.
 * Las reglas de saneado replican las del backend para no enviar lo que el
 * servidor va a descartar de todos modos.
 */

export const MAX_LOTE = 100;
export const MAX_TEXTO = 512;
const MAX_CLAVES = 15;
const CLAVE_PII = /(e-?mail|correo|tel[eé]fono|phone|m[oó]vil|token|password|contrase|clave|tarjeta|card|iban|cvv|dni|nif)/i;
const VALOR_PII = /([^\s@]+@[^\s@]+\.[^\s@]+)|(\b\d{13,19}\b)|(\+?\d[\d\s-]{8,}\d)/;
// Las fechas ISO (2026-10-07T12:00:00Z) parecen un teléfono para VALOR_PII: no son datos personales.
const ES_FECHA = /^\d{4}-\d{2}-\d{2}([T ][\d:.]+Z?)?$/;

function valorPlano(v) {
  if (v == null) return null;
  if (typeof v === 'string') return !ES_FECHA.test(v) && VALOR_PII.test(v) ? '[oculto]' : v.slice(0, MAX_TEXTO);
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'boolean') return v;
  if (Array.isArray(v)) return v.slice(0, 20).map((x) => (typeof x === 'object' ? null : valorPlano(x)));
  return String(JSON.stringify(v)).slice(0, MAX_TEXTO);
}

export function limpiarDatos(obj) {
  if (!obj || typeof obj !== 'object') return undefined;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (Object.keys(out).length >= MAX_CLAVES) break;
    if (CLAVE_PII.test(k) || v === undefined) continue;
    out[k.slice(0, 40)] = valorPlano(v);
  }
  return Object.keys(out).length ? out : undefined;
}

/**
 * Prepara un evento para enviarlo. Devuelve null si debe descartarse
 * (duración < 50 ms o scroll demasiado seguido en la misma sesión).
 */
export function sanearEvento(evento, { ahora = Date.now(), ultimosScroll = new Map() } = {}) {
  if (!evento?.tipo) return null;
  const meta = limpiarDatos(evento.meta);
  if (meta && typeof meta.duracionMs === 'number' && meta.duracionMs < 50) return null;
  if (evento.tipo === 'scroll_profundidad') {
    const k = evento.sesionId || 'local';
    if (ultimosScroll.has(k) && ahora - ultimosScroll.get(k) < 2000) return null;
    ultimosScroll.set(k, ahora);
  }
  const corta = (s, n = MAX_TEXTO) => (s == null ? undefined : String(s).slice(0, n));
  const limpio = {
    ...evento,
    ruta: corta(evento.ruta, 200),
    pagina: corta(evento.pagina, 80),
    entidadNombre: corta(evento.entidadNombre, 160),
    mensajeError: corta(evento.mensajeError),
    datos: limpiarDatos(evento.datos),
    meta,
    cambios: Array.isArray(evento.cambios) && evento.cambios.length
      ? evento.cambios.slice(0, 30).map((c) => ({ campo: String(c.campo).slice(0, 80), antes: valorPlano(c.antes), despues: valorPlano(c.despues) }))
      : undefined,
  };
  for (const k of Object.keys(limpio)) if (limpio[k] === undefined) delete limpio[k];
  return limpio;
}

/** Cola en memoria: agrupa eventos y los entrega en lotes de como mucho MAX_LOTE. */
export function crearCola({ maxPendientes = 1000 } = {}) {
  let pendientes = [];
  return {
    meter(e) {
      pendientes.push(e);
      if (pendientes.length > maxPendientes) pendientes = pendientes.slice(-maxPendientes);
    },
    tamano: () => pendientes.length,
    /** Saca el siguiente lote (o null si no hay). */
    sacarLote() {
      if (!pendientes.length) return null;
      const lote = pendientes.slice(0, MAX_LOTE);
      pendientes = pendientes.slice(MAX_LOTE);
      return lote;
    },
    /** Devuelve un lote que no se pudo enviar al principio de la cola. */
    devolver(lote) {
      pendientes = [...lote, ...pendientes].slice(0, maxPendientes);
    },
  };
}

/** Dispositivo a partir de userAgent + pantalla (sin huellas: nada de canvas ni fuentes). */
export function detectarDispositivo({ userAgent = '', ancho = 0, alto = 0, dpr = 1, touch = false, lang = '', zonaHoraria = '' } = {}) {
  const ua = userAgent;
  const os = /iPad/.test(ua) ? 'iPadOS' : /iPhone|iPod/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android'
    : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? (touch && ancho >= 700 ? 'iPadOS' : 'macOS') : /Linux/.test(ua) ? 'Linux' : 'otro';
  const navegador = /Edg\//.test(ua) ? 'Edge' : /SamsungBrowser/.test(ua) ? 'Samsung Internet' : /OPR\//.test(ua) ? 'Opera'
    : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'otro';
  const corto = Math.min(ancho, alto || ancho);
  const tipo = os === 'iPadOS' || (/Android/.test(ua) && !/Mobile/.test(ua)) || (touch && corto >= 600 && corto < 1100) ? 'tablet'
    : /Mobi|iPhone|Android/.test(ua) || (touch && corto < 600) ? 'mobile' : 'desktop';
  return {
    tipo, os, navegador,
    pantalla: { ancho: Math.round(ancho), alto: Math.round(alto), dpr: Math.round(dpr * 100) / 100 },
    touch: Boolean(touch), lang: String(lang).slice(0, 20), zonaHoraria: String(zonaHoraria).slice(0, 60),
  };
}

/* ───────── Periodos (mismo criterio que el backend, en UTC) ───────── */

const DIA = 86400000;
export const PERIODOS = ['dia', 'semana', 'mes', 'todo'];

export function normalizarPeriodo(periodo = 'mes', ahora = new Date()) {
  const p = PERIODOS.includes(periodo) ? periodo : 'mes';
  const hoy = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate()));
  let desde;
  if (p === 'dia') desde = hoy;
  else if (p === 'semana') desde = new Date(hoy.getTime() - ((hoy.getUTCDay() + 6) % 7) * DIA);
  else if (p === 'mes') desde = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), 1));
  else desde = new Date(0);
  return { periodo: p, desde, hasta: new Date(ahora.getTime() + 1), granularidad: p === 'dia' ? 'hora' : p === 'todo' ? 'mes' : 'dia' };
}

/** Etiqueta legible de un cubo de serie ("2026-10-07", "2026-W41", "2026-10", "2026-10-07T13:00"). */
export function etiquetaCubo(clave, lang = 'es') {
  if (/^\d{4}-W\d{2}$/.test(clave)) return `S${clave.slice(6)}`;
  if (/^\d{4}-\d{2}$/.test(clave)) return new Date(`${clave}-01T00:00:00Z`).toLocaleDateString(lang, { month: 'short', year: '2-digit', timeZone: 'UTC' });
  if (/T\d{2}:00$/.test(clave)) return `${clave.slice(11, 13)}h`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(clave)) return new Date(`${clave}T00:00:00Z`).toLocaleDateString(lang, { day: '2-digit', month: 'short', timeZone: 'UTC' });
  return clave;
}

/**
 * Filas de breakdown listas para pintar: etiqueta/color desde el catálogo,
 * "—" cuando no hay base para el porcentaje (nunca se inventa un 0 %).
 */
export function formatearBreakdown(resp, { etiqueta = (v) => v, color = () => null } = {}) {
  const total = resp?.total || 0;
  const filas = (resp?.items || []).map((it) => ({
    valor: it.valor,
    etiqueta: it.valor === 'sin dato' ? 'sin dato' : etiqueta(it.valor),
    n: it.n,
    pct: it.pct == null ? '—' : `${String(it.pct).replace('.', ',')} %`,
    ancho: total ? it.n / total : 0,
    color: color(it.valor),
  }));
  if (resp?.resto) filas.push({ valor: '__resto', etiqueta: 'Otros', n: resp.resto, pct: total ? `${String(Math.round((resp.resto / total) * 1000) / 10).replace('.', ',')} %` : '—', ancho: total ? resp.resto / total : 0, color: null });
  return { total, filas, vacio: total === 0 };
}

/* ───────── Estado de la vista en la URL (#/admin?seccion=auditoria&...) ───────── */

export const CLAVES_URL = ['seccion', 'sub', 'periodo', 'desde', 'hasta', 'fuente', 'tipos', 'origen', 'resultado', 'actorUid', 'dispositivo', 'buscar', 'uid', 'dim'];

export function leerEstadoUrl(hash = '') {
  const i = hash.indexOf('?');
  const params = new URLSearchParams(i === -1 ? '' : hash.slice(i + 1));
  const out = {};
  for (const k of CLAVES_URL) if (params.get(k)) out[k] = params.get(k);
  return out;
}

export function escribirEstadoUrl(base, estado) {
  const params = new URLSearchParams();
  for (const k of CLAVES_URL) if (estado[k]) params.set(k, estado[k]);
  const q = params.toString();
  return q ? `${base}?${q}` : base;
}

/** Diff campo a campo entre dos objetos planos (para `cambios` de escrituras del panel). */
export function diffCambios(antes = {}, despues = {}) {
  return Object.keys(despues)
    .filter((k) => JSON.stringify(antes?.[k] ?? null) !== JSON.stringify(despues[k] ?? null))
    .map((campo) => ({ campo, antes: antes?.[campo] ?? null, despues: despues[campo] ?? null }));
}
