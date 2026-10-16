/**
 * Model — incidencias sobre `contactos` vía API.
 */
import { api } from './httpClient.js';

export async function esAdmin() {
  try {
    const d = await api.get('/v1/users/me/is-admin');
    return Boolean(d.isAdmin);
  } catch {
    return false;
  }
}

export async function listarMisIncidencias() {
  const d = await api.get('/v1/contactos/mine');
  return Array.isArray(d) ? d : d.data || [];
}

export async function listarPendientes() {
  const d = await api.get('/v1/contactos/pending');
  return Array.isArray(d) ? d : d.data || [];
}

export async function listarResueltas() {
  const d = await api.get('/v1/contactos/resolved');
  return Array.isArray(d) ? d : d.data || [];
}

// Avisos tras resolver: el menú lateral y las listas vuelven a pedir los datos (BUG-133).
const oyentes = new Set();
export function alResolverIncidencia(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

/** Campos obligatorios, como en la web: sin ellos la API responde 400 (BUG-133). */
export function validarResolucion(datos) {
  const resolucion = {};
  for (const [campo, max] of [['propuestaResolucion', 4000], ['solucion', 4000], ['encargado', 200]]) {
    const valor = String(datos?.[campo] || '').trim();
    if (!valor || valor.length > max) throw new Error('Completa propuesta, solución y encargado dentro del límite indicado.');
    resolucion[campo] = valor;
  }
  return resolucion;
}

export async function resolverIncidencia(id, datos) {
  const r = await api.put(`/v1/contactos/${encodeURIComponent(id)}/resolve`, validarResolucion(datos));
  oyentes.forEach((fn) => fn());
  return r;
}
