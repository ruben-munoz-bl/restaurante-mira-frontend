/**
 * Model — incidencias sobre `contactos` vía API.
 */
import { api } from './httpClient.js';
import { validarResolucion } from './incidenciaResolucion.js';
import { conAuditoria } from './auditoria.js';

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

/** Se emite tras resolver: el menú lateral y las listas vuelven a pedir los datos (BUG-133). */
export const EVENTO_INCIDENCIAS = 'mira:incidencias';

export async function resolverIncidencia(id, datos) {
  const resolucion = validarResolucion(datos);
  const r = await conAuditoria('incidencia_resuelta', { entidadTipo: 'incidencia', entidadId: String(id), cambios: [{ campo: 'estado', antes: 'pendiente', despues: 'resuelta' }] },
    api.put(`/v1/contactos/${encodeURIComponent(id)}/resolve`, resolucion), { panel: true });
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENTO_INCIDENCIAS));
  return r;
}
