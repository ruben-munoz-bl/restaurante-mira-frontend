/**
 * Lista de espera, reserva en grupo (JAM) y carga en directo de la API.
 */
import { api, BASE_URL } from './httpClient.js';
import { track, conAuditoria } from './auditoria.js';

export const esperaApi = {
  unirse: (d) => conAuditoria('reserva_iniciada', { accion: 'lista_espera', entidadTipo: 'restaurante', entidadId: String(d.restauranteId) },
    api.post('/v1/espera', d)),
  mias: async () => (await api.get('/v1/espera/mias')).items || [],
  salir: (id) => api.del(`/v1/espera/${encodeURIComponent(id)}`),
};

export const jamsApi = {
  crear: async (d) => {
    const r = await api.post('/v1/jams', d);
    track('cta_pulsado', { accion: 'jam_creada', entidadTipo: 'jam', entidadId: r.codigo });
    return r;
  },
  obtener: (codigo) => api.get(`/v1/jams/${encodeURIComponent(codigo)}`, { auth: 'opcional' }),
  mias: async () => (await api.get('/v1/jams/mias')).items || [],
  unirse: (codigo, nombre) => api.post(`/v1/jams/${encodeURIComponent(codigo)}/unirse`, { nombre }),
  votar: (codigo, voto) => api.put(`/v1/jams/${encodeURIComponent(codigo)}/voto`, voto),
  salir: (codigo) => api.post(`/v1/jams/${encodeURIComponent(codigo)}/salir`, {}),
  cerrar: (codigo) => api.post(`/v1/jams/${encodeURIComponent(codigo)}/cerrar`, {}),
  cancelar: (codigo) => api.post(`/v1/jams/${encodeURIComponent(codigo)}/cancelar`, {}),
  /** Sala en directo (Server-Sent Events). Devuelve la función para cerrar la conexión. */
  enDirecto: (codigo, alCambiar, alError) => {
    const es = new EventSource(`${BASE_URL}/v1/jams/${encodeURIComponent(codigo)}/stream`);
    es.addEventListener('sala', (e) => {
      try { alCambiar(JSON.parse(e.data)); } catch { /* mensaje corrupto: se ignora */ }
    });
    es.onerror = () => alError?.();
    return () => es.close();
  },
};

export const metricasApi = {
  directo: (segundos = 300) => api.get(`/v1/metricas/directo?segundos=${segundos}`),
};
