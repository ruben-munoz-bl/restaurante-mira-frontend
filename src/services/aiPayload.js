/**
 * Construcción y saneado de los payloads de /v1/ai/agent.
 *
 * Módulo PURO: cero imports, testeable con `node --test`
 * (ver nota de aiErrors.js).
 */

// ── Límites del contrato (zod del backend) ──────────────────────────────
export const MAX_MENSAJE = 2000;
export const MAX_HISTORIAL = 10;
export const MAX_CONTENT = 4000;

// ── Idempotencia ─────────────────────────────────────────────────────────

/** UUID v4 con respaldo para contextos sin secure context (crypto.randomUUID). */
export function nuevaIdempotencyKey() {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  if (c && typeof c.getRandomValues === 'function') {
    const b = c.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function esUuid(v) {
  return typeof v === 'string' && UUID_RE.test(v);
}

// ── Historial ────────────────────────────────────────────────────────────

const ROLES = new Set(['user', 'model']);

/**
 * Últimos MAX_HISTORIAL mensajes en el formato que espera el zod del
 * backend: [{ role:'user'|'model', content:1..4000 }].
 * Excluye el mensaje que se está enviando ahora mismo.
 */
export function buildHistory(mensajes) {
  if (!Array.isArray(mensajes)) return [];
  return mensajes
    .filter((m) => m && ROLES.has(m.role) && typeof m.content === 'string')
    .map((m) => ({
      role: m.role,
      content: m.content.trim().slice(0, MAX_CONTENT),
    }))
    .filter((m) => m.content.length > 0)
    .slice(-MAX_HISTORIAL);
}

/** Cuerpo de la petición, ya recortado a los límites del contrato. */
export function construirBody({ message, history, confirmId }) {
  const body = { message: String(message ?? '').trim().slice(0, MAX_MENSAJE) };
  const h = buildHistory(history);
  if (h.length) body.history = h;
  if (esUuid(confirmId)) body.confirmId = confirmId;
  return body;
}

// ── Whitelist anti-PII ───────────────────────────────────────────────────
//
// Defense in depth: aunque el backend devuelva de más, aquí no se pinta.
// El allowlist es por tool; una tool desconocida NO devuelve datos.

const LISTA = (s) => s.split(' ').filter(Boolean);

const CAMPOS_POR_TOOL = Object.freeze({
  getRestaurant: LISTA(
    'id nombre valoracion totalResenasYelp precio cocina categorias ciudad zona direccion telefono descripcion terraza menuInfantil alergenos maxReservasPorHora',
  ),
  checkAvailability: LISTA('fecha hora limite ocupadas libres'),
  createReservation: LISTA(
    'id codigo restauranteNombre fecha hora comensales estado comentarios',
  ),
  cancelReservation: LISTA(
    'id codigo restauranteNombre fecha hora comensales estado',
  ),
  getBalance: LISTA(
    'saldoActual totalAcumulado totalCanjeado rachaLogin rachaReservas descuentoPendiente',
  ),
  dailyLogin: LISTA('puntos nuevoSaldo racha yaReclamado'),
  spinWheel: LISTA('premio puntos nuevoSaldo racha'),
  redeemPoints: LISTA('descuento puntos nuevoSaldo totalCanjeado'),
  getMe: LISTA('nombre tipo lang soloVegano'),
  getUserReviews: LISTA('puntuacion comentario createdAt restauranteId'),
  listMyReservations: LISTA(
    'id codigo restauranteNombre fecha hora comensales estado',
  ),
  listReviews: LISTA('id puntuacion comentario createdAt usuarioId'),
});

const CAMPOS_BUSQUEDA = LISTA(
  'id nombre valoracion totalResenasYelp precio cocina categorias ciudad zona',
);

/** Máximo de resultados que se pintan de una búsqueda. */
export const MAX_RESULTADOS_BUSQUEDA = 5;

/**
 * Devuelve una copia de `result` con SOLO los campos permitidos para `tool`.
 * Tool desconocida o sin allowlist → objeto vacío (nada de datos).
 */
export function camposVisibles(tool, result) {
  if (!result || typeof result !== 'object') return {};
  const src = Array.isArray(result) ? result[0] : result;

  // Herramientas de listado: se mapea cada item por su propia allowlist.
  if (tool === 'searchRestaurants') {
    const items = Array.isArray(result.items)
      ? result.items
      : Array.isArray(result)
        ? result
        : [];
    return {
      items: items
        .slice(0, MAX_RESULTADOS_BUSQUEDA)
        .map((r) => pick(r, CAMPOS_BUSQUEDA)),
    };
  }

  const permitidos = CAMPOS_POR_TOOL[tool];
  if (!permitidos) return {};
  return pick(src, permitidos);
}

function pick(src, permitidos) {
  const out = {};
  if (!src || typeof src !== 'object') return out;
  for (const k of permitidos) {
    const v = src[k];
    if (v !== undefined) out[k] = v;
  }
  return out;
}

// ── Normalización de la respuesta ────────────────────────────────────────

const MAX_REPLY = 4000;

/**
 * Convierte la respuesta cruda del backend en la forma que consume la UI,
 * tolerante a campos ausentes o con tipos raros.
 */
export function normalizarRespuesta(d) {
  if (!d || typeof d !== 'object') {
    return { reply: '', actions: [], needsConfirm: null, provider: null, model: null };
  }

  const reply = typeof d.reply === 'string' ? d.reply.trim().slice(0, MAX_REPLY) : '';

  const actions = (Array.isArray(d.actions) ? d.actions : [])
    .filter((a) => a && typeof a === 'object' && typeof a.tool === 'string')
    .slice(0, 20)
    .map((a) => ({
      tool: a.tool,
      ok: a.ok !== false,
      args: a.args && typeof a.args === 'object' ? a.args : null,
      error: a.ok === false ? (a.error || null) : null,
      result: a.ok === false ? null : camposVisibles(a.tool, a.result),
    }));

  const nc = d.needsConfirm;
  const needsConfirm =
    nc && typeof nc === 'object' && esUuid(nc.confirmId)
      ? {
          confirmId: nc.confirmId,
          summary: typeof nc.summary === 'string' ? nc.summary.slice(0, 300) : '',
        }
      : null;

  return {
    reply,
    actions,
    needsConfirm,
    provider: typeof d.provider === 'string' ? d.provider : null,
    model: typeof d.model === 'string' ? d.model : null,
  };
}