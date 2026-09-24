/**
 * Service — cookies: consentimiento en localStorage (invitado)
 * y en la API `usuarios/{uid}.consentimientoCookies` (logueado).
 */
import { api } from './httpClient.js';

const LS_CONSENT = 'mira:cookies';

export const COOKIE_CATEGORIAS = [
  { key: 'necesarias', label: 'Necesarias', desc: 'Imprescindibles para que la web funcione (sesión, carrito, cookies). No se pueden desactivar.', requerida: true },
  { key: 'preferencias', label: 'Preferencias', desc: 'Recuerdan tu tema (claro/oscuro), filtros y ajustes de la web.' },
  { key: 'analiticas', label: 'Analíticas', desc: 'Nos ayudan a entender qué páginas visitas y cómo usas la web para mejorarla.' },
  { key: 'marketing', label: 'Marketing', desc: 'Permiten mostrarte publicidad relevante en otros sitios web.' },
];

export const COOKIE_DEFAULT = { necesarias: true, preferencias: false, analiticas: false, marketing: false };

export async function leerCookies(uid) {
  if (uid) {
    try {
      const d = await api.get('/v1/users/me');
      if (d && d.consentimientoCookies) return d.consentimientoCookies;
    } catch { /* sin red: fallback a localStorage */ }
  }
  try {
    const raw = localStorage.getItem(LS_CONSENT);
    return raw ? JSON.parse(raw) : { ...COOKIE_DEFAULT, timestamp: null };
  } catch {
    return { ...COOKIE_DEFAULT, timestamp: null };
  }
}

export async function guardarCookies(consentimiento) {
  const datos = { ...consentimiento, timestamp: new Date().toISOString() };
  try {
    localStorage.setItem(LS_CONSENT, JSON.stringify(datos));
  } catch { /* localStorage lleno */ }
  try {
    await api.put('/v1/users/me', { consentimientoCookies: datos });
  } catch { /* sin red: queda en localStorage */ }
  return datos;
}

export function tieneConsentimiento(cookies) {
  return cookies && typeof cookies.timestamp === 'string' && cookies.timestamp.length > 0;
}

export function categoriaActiva(cookies, key) {
  if (!cookies) return key === 'necesarias';
  return Boolean(cookies[key]);
}
