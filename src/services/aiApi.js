/**
 * Model — cliente de POST /v1/ai/agent.
 *
 * Contrato real del backend:
 *   POST /v1/ai/agent
 *     Authorization:  Bearer <ID_TOKEN>   → opcional (sin token = anónimo)
 *     Idempotency-Key: <uuid>             → una por cada paso de confirmación
 *   body: { message, history?, confirmId? }
 *   200 : { reply, actions[], needsConfirm?, provider, model }
 *   400 : VALIDATION_ERROR · 404 NOT_FOUND · 429 RATE_LIMITED · 500 INTERNAL_ERROR
 *
 * `auth:'opcional'` es imprescindible: httpClient lanzaba un 401 sintético
 * antes de la red si no había sesión, y el agente debe funcionar sin login.
 */
import { api } from './httpClient.js';
import { construirBody, nuevaIdempotencyKey, TIMEOUT_MS } from './aiPayload.js';

const RUTA = '/v1/ai/agent';

// Vite sustituye `import.meta.env` en el build; el || {} lo deja seguro en Node.
const ENV = import.meta.env || {};

// Seam para tests de integración (ver test/integrationAgente.mjs): en Node no
// existe import.meta.env, así que se permite inyectar las variables por global.
if (typeof globalThis !== 'undefined' && globalThis.__MIRA_ENV__) {
  Object.assign(ENV, globalThis.__MIRA_ENV__);
}

/**
 * Interruptor de la feature. ACTIVO POR DEFECTO: si la variable no está
 * definida, el chat se monta. Solo se oculta con VITE_AI_ENABLED=false.
 * (Importa que en Vercel, donde `.env` no se versiona, funcione sin tocar
 * el dashboard.)
 */
export const AI_HABILITADO =
  String(ENV.VITE_AI_ENABLED ?? 'true').toLowerCase() !== 'false';

/**
 * Apunta a mira-api de verdad por defecto: el chat llama a
 * POST {VITE_API_URL}/v1/ai/agent. Solo usa aiMock.js si se pide
 * explícitamente con VITE_AI_MOCK=true, que es lo que hay que poner para
 * desarrollar la UI sin backend.
 */
const USA_MOCK = String(ENV.VITE_AI_MOCK ?? 'false').toLowerCase() === 'true';

/**
 * Combina el abort externo (botón "Parar") con un timeout propio.
 * El backend admite hasta ~25 s; la spec pide >= 30 s de timeout de red.
 */
function conTimeout(signal, ms) {
  const ctl = new AbortController();
  const t = setTimeout(() => {
    ctl.abort(Object.assign(new Error('timeout'), { name: 'TimeoutError' }));
  }, ms);
  const alAbortar = () => ctl.abort(signal?.reason);
  if (signal) {
    if (signal.aborted) alAbortar();
    else signal.addEventListener('abort', alAbortar);
  }
  return {
    signal: ctl.signal,
    liberar: () => {
      clearTimeout(t);
      signal?.removeEventListener('abort', alAbortar);
    },
  };
}

/**
 * Envía un turno al agente.
 * @param {object} opts
 * @param {string} opts.message               texto del usuario (1..2000)
 * @param {Array}  [opts.history]             últimas entradas ya enviadas
 * @param {string} [opts.confirmId]           uuid de needsConfirm, en el paso 2
 * @param {string} [opts.idempotencyKey]      clave a reutilizar en un reintento
 * @param {AbortSignal} [opts.signal]        botón "Parar"
 */
export async function enviarTurno({ message, history, confirmId, idempotencyKey, signal } = {}) {
  const body = construirBody({ message, history, confirmId });
  const key = idempotencyKey || nuevaIdempotencyKey();

  if (USA_MOCK) {
    const { responderMock } = await import('./aiMock.js');
    return responderMock({ ...body, confirmId: body.confirmId ?? null, signal });
  }

  const { signal: senal, liberar } = conTimeout(signal, TIMEOUT_MS);
  try {
    return await api.post(RUTA, body, {
      auth: 'opcional',
      signal: senal,
      headers: { 'Idempotency-Key': key },
    });
  } finally {
    liberar();
  }
}

export { USA_MOCK };