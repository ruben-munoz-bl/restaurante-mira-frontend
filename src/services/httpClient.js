const BASE_URL = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? 'https://mira-api-xveu.onrender.com' : 'http://localhost:3000')
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

export async function apiFetch(path, { method = 'GET', body, headers = {}, auth = true } = {}) {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const finalHeaders = { ...headers };
  if (body !== undefined && !(body instanceof FormData)) {
    finalHeaders['Content-Type'] = finalHeaders['Content-Type'] || 'application/json';
  }
  if (auth) {
    const token = await getToken();
    // Sin sesión: no llamar a la API autenticada (evita 401 MISSING_TOKEN en consola).
    if (!token) {
      const err = new Error('No hay sesión activa');
      err.status = 401;
      err.noSession = true;
      throw err;
    }
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers: finalHeaders,
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
