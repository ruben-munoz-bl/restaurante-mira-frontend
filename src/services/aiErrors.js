/**
 * Mapeo de errores del agente MIRA a mensajes en español.
 *
 * Hay DOS caminos distintos, porque el backend reporta los errores de
 * negocio dentro de actions[].result con HTTP 200:
 *   1. desdeError(err)        → errores HTTP (400, 404, 429, 500)
 *   2. desdeResultado(r)     → { ok:false, error, message } dentro de actions[]
 *
 * Precedencia (como en DiscountPanel.jsx:28):
 *   texto del servidor (ya viene en español) > tabla local > genérico
 *
 * Módulo PURO: cero imports, testeable con `node --test`.
 */

/** `error` de HTTP + `result.error` de actions[]. */
export const CODIGOS_HTTP = Object.freeze([
  'VALIDATION_ERROR',
  'NOT_FOUND',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
]);

/** `result.error` dentro de actions[] (llegan con HTTP 200). */
export const CODIGOS_ACCION = Object.freeze([
  'MISSING_TOKEN',
  'FORBIDDEN',
  'WHEEL_LOCKED',
  'INSUFFICIENT',
  'SELF_INVITE',
  'NOT_FOUND',
  'CONFLICT',
  'VALIDATION_ERROR',
  'INTERNAL_ERROR',
]);

const POR_CODIGO = Object.freeze({
  // HTTP
  VALIDATION_ERROR: 'No pude entender el mensaje. Prueba a reformularlo.',
  NOT_FOUND: 'No encuentro ese recurso.',
  RATE_LIMITED: 'Voy muy rápido. Espera un momento y reintenta.',
  INTERNAL_ERROR: 'Ahora no puedo consultarlo. Prueba en un momento.',
  // actions[]
  MISSING_TOKEN: 'Inicia sesión para que pueda ayudarte con tu cuenta.',
  FORBIDDEN: 'Esa acción no está disponible para tu tipo de cuenta.',
  WHEEL_LOCKED: 'La ruleta se abre con una racha de 7 días.',
  INSUFFICIENT: 'No tienes saldo suficiente para eso.',
  SELF_INVITE: 'No puedes invitarte a ti mismo.',
  CONFLICT: 'Hay un conflicto con esa operación.',
});

const GENERICO = 'Ahora no puedo consultarlo. Prueba en un momento.';
const TIMEOUT = 'Esto está tardando más de lo normal. Prueba en un momento.';
const SIN_SERVIDOR =
  'No puedo conectarme con mira-api. Comprueba que esté en marcha y que VITE_API_URL apunte a él.';

/**
 * Un fetch fallido (DNS, CORS, servidor caído) llega como TypeError sin
 * status ni data. Es el fallo más común al pasar a la API real y sin este
 * mensaje el usuario solo ve "algo ha ido mal".
 */
function esFalloDeRed(err) {
  if (err?.status || err?.data) return false;
  const t = err?.constructor?.name;
  return t === 'TypeError' || /failed to fetch|networkerror|load failed/i.test(String(err?.message || ''));
}

const vacio = (codigo, status, extra = {}) => ({
  mensaje: '',
  loginRequerido: false,
  retryAfter: null,
  reintentable: false,
  codigo,
  status,
  abortado: false,
  ...extra,
});

/**
 * Traduce un error HTTP al modelo que consume la UI.
 * @returns {{mensaje, loginRequerido, retryAfter, reintentable, codigo, status, abortado}}
 */
export function desdeError(err) {
  const status = Number(err?.status) || null;
  const codigo = err?.data?.error || err?.codigo || null;

  // "Parar" no es un fallo: la UI lo descarta sin pintar nada.
  if (err?.name === 'AbortError') return vacio(codigo || 'ABORT_ERR', status, { abortado: true });

  // El deadline del backend es ~25 s: si llegamos al timeout de red, es
  // "tarda", no "está roto".
  if (err?.name === 'TimeoutError') {
    return { ...vacio('TIMEOUT', status), mensaje: TIMEOUT, reintentable: true };
  }

  // No hubo respuesta: hay que decirlo de forma accionable.
  if (esFalloDeRed(err)) {
    return {
      ...vacio('SIN_SERVIDOR', status),
      mensaje: SIN_SERVIDOR,
      reintentable: true,
      loginRequerido: false,
    };
  }

  const delServidor = typeof err?.data?.message === 'string' ? err.data.message.trim() : '';
  const mensaje = delServidor || POR_CODIGO[codigo] || GENERICO;

  // 5xx del agente: "Error interno" no le dice nada a un usuario. Le damos
  // contexto sin perder el texto del servidor.
  const esServidorCaido = status >= 500;
  const detalle = esServidorCaido
    ? delServidor
      ? `${delServidor} Es un problema del servicio; prueba en un momento.`
      : 'El servicio no está disponible ahora mismo. Prueba en un momento.'
    : mensaje;

  return {
    mensaje: detalle,
    // Un token inválido NO da 401: el backend lo trata como anónimo y
    // contesta 200. Así que solo un 401 real pide iniciar sesión.
    loginRequerido: status === 401,
    retryAfter: Number(err?.retryAfter) > 0 ? Number(err.retryAfter) : null,
    // 403 no está en el contrato HTTP (el rol falla dentro de result), pero
    // si apareciera: explicar y parar, nunca reintentar.
    reintentable: status !== 401 && status !== 403,
    codigo,
    status,
    abortado: false,
  };
}

/**
 * Traduce el error de negocio dentro de actions[].result (HTTP 200).
 * @param {{error?:string, message?:string}} result
 */
export function desdeResultado(result) {
  const codigo = typeof result?.error === 'string' ? result.error : null;
  // result.message ya es texto amable para mostrar (según el backend).
  const delServidor = typeof result?.message === 'string' ? result.message.trim() : '';
  return {
    mensaje: delServidor || POR_CODIGO[codigo] || GENERICO,
    loginRequerido: codigo === 'MISSING_TOKEN',
    retryAfter: null,
    // FORBIDDEN → explicar y parar, nunca reintentar (guardrail del backend).
    reintentable: codigo !== 'FORBIDDEN' && codigo !== 'MISSING_TOKEN',
    codigo,
    status: null,
    abortado: false,
  };
}

/** Texto suelto a partir de un código suelto. */
export function desdeCodigo(codigo) {
  return desdeResultado({ error: codigo });
}