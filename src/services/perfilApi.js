/**
 * Model — perfil en `usuarios/{uid}` vía API.
 */
import { api, apiFetch } from './httpClient.js';
import { detectarIdioma } from '../i18n/index.jsx';

export const PERFIL_VACIO = { tipo: 'cliente', soloVegano: false, alergias: [], lang: detectarIdioma() };

export async function obtenerPerfil() {
  try {
    const d = await api.get('/v1/users/me');
    if (!d || !d.uid) return { ...PERFIL_VACIO };
    const langs = ['es', 'ca', 'en'];
    return {
      tipo: d.tipo === 'empresa' || d.tipo === 'admin' ? d.tipo : 'cliente',
      nombre: d.nombre || '',
      email: d.email || '',
      soloVegano: d.soloVegano === true,
      alergias: Array.isArray(d.alergias) ? d.alergias : [],
      lang: langs.includes(d.lang) ? d.lang : detectarIdioma(),
    };
  } catch {
    return { ...PERFIL_VACIO };
  }
}

/**
 * Guarda el perfil en el backend. Con `token` (data test) se envía el Bearer
 * explícito; sin token usa la sesión actual, como siempre.
 */
export async function guardarPerfil(_uid, datos, token = null) {
  if (token) {
    await apiFetch('/v1/users/me', {
      method: 'PUT',
      body: datos,
      auth: false,
      headers: { Authorization: `Bearer ${token}` },
    });
    return;
  }
  await api.put('/v1/users/me', datos);
}
