/**
 * Model — incidencias sobre `contactos` vía API.
 */
import { api } from './httpClient.js';
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

export async function resolverIncidencia(id) {
  await conAuditoria('incidencia_resuelta', { entidadTipo: 'incidencia', entidadId: String(id), cambios: [{ campo: 'estado', antes: 'pendiente', despues: 'resuelta' }] },
    api.put(`/v1/contactos/${encodeURIComponent(id)}/resolve`), { panel: true });
}
