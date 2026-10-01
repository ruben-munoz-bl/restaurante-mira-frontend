// Vite sustituye `import.meta.env` en build; el || {} lo hace seguro en Node
// (necesario para poder testear el cliente HTTP con `node --test`).
const ENV = import.meta.env || {};

const BASE_URL = (
  ENV.VITE_API_URL ||
  (ENV.PROD ? 'https://mira-api-xveu.onrender.com' : 'http://localhost:3000')
).replace(/\/$/, '');

async function getToken() {
  try {
    const { getAuth } = await import('firebase/auth');
    const { getFirebaseApp } = await import('./firebase.js');
    const auth = getAuth(getFirebaseApp());
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdToken();
  } catch {
    return null;
  }
}

/**
 * `auth` admite tres valores:
 *   true (default) → exige sesión; sin token lanza 401 sintético sin tocar la red.
 *   false          → sin cabecera Authorization.
 *   'opcional'     → adjunta el Bearer si lo hay, pero llama igual sin sesión.
 */
export async function apiFetch(path, { method = 'GET', body, headers = {}, auth = true, signal } = {}) {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const finalHeaders = { ...headers };
  if (body !== undefined && !(body instanceof FormData)) {
    finalHeaders['Content-Type'] = finalHeaders['Content-Type'] || 'application/json';
  }
  if (auth) {
    const token = await getToken();
    if (token) {
      finalHeaders.Authorization = `Bearer ${token}`;
    } else if (auth !== 'opcional') {
      // Sin sesión: no llamar a la API autenticada (evita 401 MISSING_TOKEN en consola).
      const err = new Error('No hay sesión activa');
      err.status = 401;
      err.noSession = true;
      throw err;
    }
  }

  const res = await fetch(url, {
    method,
    headers: finalHeaders,
    signal,
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  });

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const message = (data && (data.message || data.error)) || `HTTP ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    // El 429 del agente indica cuándo reintentar (segundos).
    const retryAfter = Number(res.headers?.get?.('Retry-After'));
    if (Number.isFinite(retryAfter) && retryAfter > 0) err.retryAfter = retryAfter;
    throw err;
  }

  return data;
}

export const api = {
  get: (path, opts) => apiFetch(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => apiFetch(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts) => apiFetch(path, { ...opts, method: 'PUT', body }),
  del: (path, opts) => apiFetch(path, { ...opts, method: 'DELETE' }),
};

export { BASE_URL };
