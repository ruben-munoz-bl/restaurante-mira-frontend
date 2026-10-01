/**
 * Model — cliente de POST /v1/ai/agent (el agente MIRA de mira-api).
 *
 * Contrato (Fase 1 del backend):
 *   POST /v1/ai/agent
 *     Authorization:  Bearer <idToken>   → opcional (el agente admite invitados)
 *     Idempotency-Key: <uuid>           → uno por turno de usuario
 *   body: { message, history?, confirmId? }
 *   200:  { reply, actions[], needsConfirm?, provider, model }
 *
 * `auth:'opcional'` es imprescindible: httpClient lanza un 401 sintético
 * antes de la red si no hay sesión, y el agente debe funcionar sin login.
 */
import { api } from './httpClient.js';
import { construirBody, nuevaIdempotencyKey } from './aiPayload.js';

const RUTA = '/v1/ai/agent';

// Misma guarda que en httpClient.js: Vite sustituye `import.meta.env` en el
// build y el || {} lo deja seguro en Node para poder testear el flag.
const ENV = import.meta.env || {};

/**
 * Interruptor de la feature. ACTIVO POR DEFECTO: si la variable no está
 * definida, el chat se monta. Solo se oculta con VITE_AI_ENABLED=false.
 * (Importa que en Vercel, donde `.env` no se versiona, funcione sin
 * tener que añadir nada en el dashboard.)
 */
export const AI_HABILITADO =
  String(ENV.VITE_AI_ENABLED ?? 'true').toLowerCase() !== 'false';

/**
 * Mientras el backend no exista se responde con aiMock. También activo por
 * defecto: para hablar con mira-api de verdad, VITE_AI_MOCK=false.
 */
const USA_MOCK = String(ENV.VITE_AI_MOCK ?? 'true').toLowerCase() !== 'false';

/**
 * Envía un turno al agente.
 * @param {object}  opts
 * @param {string}  opts.message        texto del usuario (1..2000)
 * @param {Array}   [opts.history]      últimos turnos ya enviados
 * @param {string}  [opts.confirmId]    uuid de needsConfirm, al confirmar
 * @param {string}  [opts.idempotencyKey] clave a reutilizar en un reintento
 * @param {AbortSignal} [opts.signal]   botón "Parar"
 * @returns {Promise<object>} respuesta cruda (sin normalizar)
 */
export async function enviarTurno({ message, history, confirmId, idempotencyKey, signal } = {}) {
  const body = construirBody({ message, history, confirmId });
  const key = idempotencyKey || nuevaIdempotencyKey();

  if (USA_MOCK) {
    const { responderMock } = await import('./aiMock.js');
    return responderMock({ ...body, confirmId: body.confirmId ?? null, signal });
  }

  return api.post(RUTA, body, {
    auth: 'opcional',
    signal,
    headers: { 'Idempotency-Key': key },
  });
}

export { USA_MOCK };