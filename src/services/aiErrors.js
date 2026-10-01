/**
 * Mapeo de errores del agente MIRA a mensajes en español.
 *
 * Módulo PURO: cero imports, para poder testearlo con `node --test`
 * (los módulos que importan httpClient no se pueden testear porque
 * httpClient usa import.meta.env, que no existe en Node).
 *
 * Precedencia (igual que DiscountPanel.jsx:28):
 *   1. err.data.message  → texto del servidor, ya escrito en español
 *   2. tabla local por código
 *   3. genérico por status
 */

/** Códigos de mira-api declarados en el contrato de /v1/ai/agent. */
export const CODIGOS = Object.freeze([
  'MISSING_TOKEN',
  'INVALID_TOKEN',
  'FORBIDDEN',
  'VALIDATION_ERROR',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'INSUFFICIENT',
  'WHEEL_LOCKED',
]);

const POR_CODIGO = Object.freeze({
  MISSING_TOKEN: 'Inicia sesión para que pueda ayudarte con tu cuenta.',
  INVALID_TOKEN: 'Tu sesión ha caducado. Vuelve a iniciar sesión.',
  FORBIDDEN: 'Esa acción no está disponible para tu tipo de cuenta.',
  VALIDATION_ERROR: 'Revisa los datos: falta algo o el formato no es válido.',
  NOT_FOUND: 'No encuentro ese recurso.',
  CONFLICT: 'Hay un conflicto con esa operación. Prueba con otra opción.',
  RATE_LIMITED: 'Voy muy rápido. Prueba en unos segundos.',
  INSUFFICIENT: 'No tienes saldo suficiente para eso.',
  WHEEL_LOCKED: 'La ruleta se abre con una racha de 7 días.',
});

const POR_STATUS = Object.freeze({
  400: 'No pude entender el mensaje. Prueba a reformularlo.',
  401: 'Inicia sesión para que pueda ayudarte.',
  403: 'Esa acción no está disponible para tu tipo de cuenta.',
  404: 'No encuentro ese recurso.',
  409: 'Hay un conflicto con esa operación.',
  429: 'Voy muy rápido. Prueba en unos segundos.',
});

const GENERICO =
  'Ahora no puedo consultarlo. Prueba en un momento.';

/**
 * Traduce un error a la forma que consume la UI.
 * @returns {{mensaje:string, loginRequerido:boolean, retryAfter:number|null,
 *            reintentable:boolean, codigo:string|null, status:number|null,
 *            abortado:boolean}}
 */
export function desdeError(err) {
  const status = Number(err?.status) || null;
  const codigo = err?.data?.error || err?.codigo || null;
  const abortado = err?.name === 'AbortError' || codigo === 'ABORT_ERR';

  // "Parar" no es un fallo: la UI lo descarta sin pintar nada.
  if (abortado) return {
    mensaje: '',
    loginRequerido: false,
    retryAfter: null,
    reintentable: false,
    codigo: codigo || 'ABORT_ERR',
    status,
    abortado: true,
  };

  const delServidor =
    typeof err?.data?.message === 'string' ? err.data.message.trim() : '';

  const mensaje =
    delServidor ||
    (codigo && POR_CODIGO[codigo]) ||
    POR_STATUS[status] ||
    GENERICO;

  return {
    mensaje,
    loginRequerido: status === 401 || codigo === 'MISSING_TOKEN' || codigo === 'INVALID_TOKEN',
    retryAfter: Number(err?.retryAfter) > 0 ? Number(err.retryAfter) : null,
    // 403 → parar y explicar (guardrail 2 del backend): nunca ofrecer reintento.
    reintentable: status !== 403 && codigo !== 'FORBIDDEN',
    codigo,
    status,
    abortado: false,
  };
}

/** Texto suelto a partir de un código suelto (para errores dentro de `actions[]`). */
export function desdeCodigo(codigo, status = null) {
  return desdeError({ status, codigo });
}