/**
 * Construcción y saneado de los payloads de POST /v1/ai/agent.
 *
 * CONTRATO REAL (ver doc del backend):
 *   request : { message 1..2000, history? máx 10, confirmId? uuid }
 *   response: { reply, actions[], needsConfirm?, provider, model }
 *   actions[]: { tool, args, result }
 *     result.ok === true     → ejecutado, payload en result.data
 *     result.pending === true→ preparado, SIN ejecutar (espera confirmación)
 *     result.ok === false    → error: result.error + result.message (llegan en HTTP 200)
 *
 * Módulo PURO: cero imports, testeable con `node --test`.
 */

// ── Límites del contrato ────────────────────────────────────────────────
export const MAX_MENSAJE = 2000;
export const MAX_HISTORIAL = 10;
export const MAX_CONTENT = 4000;

/** El backend tarda hasta ~25 s: la red debe aguantar más (spec: >= 30 s). */
export const TIMEOUT_MS = 35000;

// ── Idempotencia ────────────────────────────────────────────────────────

/** UUID v4 con respaldo para contextos sin secure context. */
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

// ── Historial ───────────────────────────────────────────────────────────

const ROLES = new Set(['user', 'model']);

/** Últimas MAX_HISTORIAL entradas, tal cual exige el zod del backend. */
export function buildHistory(mensajes) {
  if (!Array.isArray(mensajes)) return [];
  return mensajes
    .filter((m) => m && ROLES.has(m.role) && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, MAX_CONTENT) }))
    .filter((m) => m.content.length > 0)
    .slice(-MAX_HISTORIAL);
}

export function construirBody({ message, history, confirmId }) {
  const body = { message: String(message ?? '').trim().slice(0, MAX_MENSAJE) };
  const h = buildHistory(history);
  if (h.length) body.history = h;
  if (esUuid(confirmId)) body.confirmId = confirmId;
  return body;
}

// ── Allowlist anti-PII ──────────────────────────────────────────────────
//
// Cada tool declara QUÉ claves fuente puede traer. Aunque el backend
// devuelva de más, aquí no sale. El valor es una lista de alias: el
// primero que exista gana (el backend usa snake_case en algunos docs).

const CAMPOS = {
  getRestaurant: {
    id: ['id'],
    nombre: ['nombre', 'nombreRestaurante'],
    valoracion: ['valoracion', 'rating_yelp', 'rating'],
    totalResenasYelp: ['totalResenasYelp', 'total_resenas_yelp', 'numero_resenas'],
    precio: ['precio'],
    cocina: ['cocina', 'categoria'],
    categorias: ['categorias'],
    ciudad: ['ciudad'],
    zona: ['zona', 'zona_busqueda'],
    direccion: ['direccion', 'direccion_completa'],
    telefono: ['telefono'],
    descripcion: ['descripcion'],
    terraza: ['terraza'],
    menuInfantil: ['menuInfantil'],
    alergenos: ['alergenos'],
    maxReservasPorHora: ['maxReservasPorHora'],
  },
  searchRestaurants: {
    items: ['items', 'data', 'restaurantes'],
    total: ['total', 'count'],
  },
  checkAvailability: {
    fecha: ['fecha'],
    hora: ['hora'],
    limite: ['limite', 'maxReservasPorHora', 'aforo'],
    ocupadas: ['ocupadas', 'reservadas'],
    libres: ['libres', 'disponibles'],
  },
  createReservation: {
    id: ['id'],
    codigo: ['codigo'],
    restauranteNombre: ['restauranteNombre', 'nombreRestaurante', 'restaurante'],
    fecha: ['fecha'],
    hora: ['hora'],
    comensales: ['comensales', 'personas'],
    estado: ['estado'],
    comentarios: ['comentarios'],
  },
  cancelReservation: {
    id: ['id'],
    codigo: ['codigo'],
    restauranteNombre: ['restauranteNombre', 'nombreRestaurante', 'restaurante'],
    fecha: ['fecha'],
    hora: ['hora'],
    comensales: ['comensales', 'personas'],
    estado: ['estado'],
  },
  listMyReservations: {
    items: ['items', 'data', 'reservas'],
    total: ['total', 'count'],
  },
  getBalance: {
    saldoActual: ['saldoActual', 'saldo', 'saldo_actual'],
    totalAcumulado: ['totalAcumulado', 'total_acumulado'],
    totalCanjeado: ['totalCanjeado', 'total_canjeado'],
    rachaLogin: ['rachaLogin', 'racha_login'],
    rachaReservas: ['rachaReservas', 'racha_reservas'],
    descuentoPendiente: ['descuentoPendiente', 'descuento_pendiente'],
  },
  getLedger: {
    items: ['items', 'data', 'movimientos', 'ledger'],
    total: ['total', 'count'],
  },
  dailyLogin: {
    puntos: ['puntos'],
    nuevoSaldo: ['nuevoSaldo', 'nuevo_saldo', 'saldo'],
    racha: ['racha'],
    yaReclamado: ['yaReclamado', 'ya_reclamado'],
  },
  spinWheel: {
    premio: ['premio', 'label'],
    puntos: ['puntos'],
    nuevoSaldo: ['nuevoSaldo', 'nuevo_saldo', 'saldo'],
    racha: ['racha'],
  },
  redeemPoints: {
    descuento: ['descuento', 'euros'],
    puntos: ['puntos'],
    nuevoSaldo: ['nuevoSaldo', 'nuevo_saldo', 'saldo'],
    totalCanjeado: ['totalCanjeado', 'total_canjeado'],
  },
  getMe: {
    nombre: ['nombre'],
    tipo: ['tipo'],
    lang: ['lang', 'idioma'],
    soloVegano: ['soloVegano', 'solo_vegano'],
  },
  listReviews: {
    items: ['items', 'data', 'resenas', 'reviews'],
    total: ['total', 'count'],
  },
  getUserReviews: {
    items: ['items', 'data', 'resenas', 'reviews'],
    total: ['total', 'count'],
  },
  listPromotions: {
    items: ['items', 'data', 'promociones', 'promotions'],
    total: ['total', 'count'],
  },
  listTickets: {
    items: ['items', 'data', 'tickets'],
    total: ['total', 'count'],
  },
  getTicket: {
    titulo: ['titulo', 'asunto'],
    estado: ['estado'],
    fecha: ['fecha'],
  },
  countRestaurants: {
    total: ['total', 'count'],
  },
  listMine: {
    items: ['items', 'data'],
    total: ['total', 'count'],
  },
  inviteMy: {
    items: ['items', 'data', 'enviadas', 'invitaciones'],
    aceptadas: ['aceptadas'],
    puntosTotales: ['puntosTotales', 'puntos_totales'],
  },
  myRestaurants: {
    items: ['items', 'data', 'restaurantes'],
    total: ['total', 'count'],
  },
};

/** Campos de una review suelta (dentro de una lista). */
const CAMPOS_REVIEWS = {
  id: ['id'],
  puntuacion: ['puntuacion', 'rating', 'puntuacion_yelp'],
  comentario: ['comentario', 'texto', 'comentarios'],
  restauranteId: ['restauranteId', 'restaurante_id'],
  createdAt: ['createdAt', 'created_at', 'fecha'],
};

/** Campos de una reserva suelta (dentro de una lista). */
const CAMPOS_RESERVAS = {
  id: ['id'],
  codigo: ['codigo'],
  restauranteNombre: ['restauranteNombre', 'nombreRestaurante', 'restaurante'],
  fecha: ['fecha'],
  hora: ['hora'],
  comensales: ['comensales', 'personas'],
  estado: ['estado'],
};

export const MAX_RESULTADOS_BUSQUEDA = 5;
export const MAX_RESULTADOS_LISTA = 8;

function primerValor(src, alias) {
  for (const clave of alias) {
    if (src[clave] !== undefined && src[clave] !== null) return src[clave];
  }
  return undefined;
}

function pick(src, mapa) {
  const out = {};
  if (!src || typeof src !== 'object') return out;
  for (const [destino, alias] of Object.entries(mapa)) {
    const v = primerValor(src, alias);
    if (v !== undefined) out[destino] = v;
  }
  return out;
}

/**
 * Item de búsqueda: el backend devuelve el documento crudo con snake_case
 * (`rating_yelp`, `categorias` como string, `zona_busqueda`...).
 * Sus claves son distintas a las de getRestaurant, de ahí su propia lista.
 */
const CAMPOS_ITEM_BUSQUEDA = {
  id: ['id'],
  nombre: ['nombre'],
  valoracion: ['valoracion', 'rating_yelp'],
  totalResenasYelp: ['totalResenasYelp', 'total_resenas_yelp'],
  precio: ['precio'],
  cocina: ['cocina', 'categoria'],
  categorias: ['categorias'],
  ciudad: ['ciudad'],
  zona: ['zona', 'zona_busqueda'],
  direccion: ['direccion', 'direccion_completa'],
  descripcion: ['descripcion'],
  imagen: ['imagen', 'imagen_url', 'image_url'],
  maxReservasPorHora: ['maxReservasPorHora'],
};

const MAPA_ITEM = {
  searchRestaurants: CAMPOS_ITEM_BUSQUEDA,
  getRestaurant: CAMPOS.getRestaurant,
  createReservation: CAMPOS.createReservation,
  cancelReservation: CAMPOS.cancelReservation,
  listReviews: CAMPOS_REVIEWS,
  getUserReviews: CAMPOS_REVIEWS,
  listMyReservations: CAMPOS_RESERVAS,
  listTickets: CAMPOS_RESERVAS,
};

function itemsDe(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  for (const k of ['items', 'data', 'reservas', 'resenas', 'reviews', 'restaurantes', 'promociones', 'promotions', 'tickets', 'movimientos', 'ledger', 'enviadas', 'invitaciones']) {
    if (Array.isArray(data[k])) return data[k];
  }
  return [];
}

/**
 * Campos cuyo valor es una lista/objeto contenedor: se mapean con
 * mapearLista() en lugar de copiarse tal cual.
 */
const CONTENEDOR = new Set(['items', 'total']);

/**
 * Copia de `result.data` con SOLO los campos permitidos para `tool`.
 * Tool sin allowlist o sin data → objeto vacío (no se muestra nada).
 */
export function camposVisibles(tool, data) {
  const mapa = CAMPOS[tool];
  if (!mapa) return {};
  // El backend puede devolver la lista directamente como array.
  if (Array.isArray(data)) data = { items: data };
  if (!data || typeof data !== 'object') return {};

  const out = {};
  for (const [clave, alias] of Object.entries(mapa)) {
    const v = primerValor(data, alias);
    if (v === undefined) continue;
    if (CONTENEDOR.has(clave)) {
      if (typeof v === 'object') {
        const mapeado = mapearLista(tool, v);
        // items y total van al mismo nivel: { items: [...], total: n }
        if (clave === 'items') Object.assign(out, mapeado);
        else out[clave] = mapeado;
      } else if (clave === 'total' && typeof v === 'number') {
        out[clave] = v;
      }
    } else {
      out[clave] = v;
    }
  }
  return out;
}

function mapearLista(tool, contenedor) {
  const items = itemsDe(contenedor);
  if (items.length === 0) return items;
  const mapaItem = MAPA_ITEM[tool];
  if (!mapaItem) {
    // Sin allowlist de item: se recorta el número y se descartan los campos.
    return { items: items.slice(0, MAX_RESULTADOS_LISTA).map(() => ({})), total: totalDe(contenedor, items.length) };
  }
  return {
    items: items.slice(0, MAX_RESULTADOS_LISTA).map((it) => pick(it, mapaItem)),
    total: totalDe(contenedor, items.length),
  };
}

function totalDe(contenedor, porDefecto) {
  if (!contenedor || typeof contenedor !== 'object') return porDefecto;
  const t = primerValor(contenedor, ['total', 'count']);
  return typeof t === 'number' ? t : porDefecto;
}

// ── Clasificación de actions[].result ───────────────────────────────────

export const ESTADO_OK = 'ok';
export const ESTADO_PENDIENTE = 'pendiente';
export const ESTADO_ERROR = 'error';
export const ESTADO_DESCONOCIDO = 'desconocido';

/**
 * El resultado va DENTRO de result, no en el action. Ojo: `ok:false` llega
 * con HTTP 200, así que nunca pasa por el manejador de errores HTTP.
 */
export function clasificarResultado(tool, result) {
  if (!result || typeof result !== 'object') {
    return { estado: ESTADO_DESCONOCIDO, data: {}, error: null, message: null };
  }
  if (result.ok === false) {
    return {
      estado: ESTADO_ERROR,
      data: {},
      error: typeof result.error === 'string' ? result.error : null,
      message: typeof result.message === 'string' ? result.message.trim().slice(0, 300) : '',
    };
  }
  if (result.pending === true) {
    // Preparado pero NO ejecutado: nunca se pinta como "hecho".
    return { estado: ESTADO_PENDIENTE, data: {}, error: null, message: null };
  }
  if (result.ok === true) {
    return { estado: ESTADO_OK, data: camposVisibles(tool, result.data), error: null, message: null };
  }
  // Sin `ok` ni `pending`: si trae data lo damos por válido; si no, desconocido.
  if (result.data && typeof result.data === 'object') {
    return { estado: ESTADO_OK, data: camposVisibles(tool, result.data), error: null, message: null };
  }
  return { estado: ESTADO_DESCONOCIDO, data: {}, error: null, message: null };
}

// ── Normalización de la respuesta ───────────────────────────────────────

const MAX_REPLY = 4000;
const MAX_ACTIONS = 30;

/**
 * Respuesta cruda → forma que consume la UI, tolerante a campos ausentes.
 * `needsConfirm.payload` NO se expone al cliente (el confirmId ya va dentro).
 */
export function normalizarRespuesta(d) {
  if (!d || typeof d !== 'object') {
    return { reply: '', actions: [], needsConfirm: null, provider: null, model: null };
  }

  const reply = typeof d.reply === 'string' ? d.reply.trim().slice(0, MAX_REPLY) : '';

  const actions = (Array.isArray(d.actions) ? d.actions : [])
    .filter((a) => a && typeof a === 'object' && typeof a.tool === 'string')
    .slice(0, MAX_ACTIONS)
    .map((a) => ({
      tool: a.tool,
      args: a.args && typeof a.args === 'object' ? a.args : null,
      ...clasificarResultado(a.tool, a.result),
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