/**
 * Ops data — agregados del panel operativo calculados con datos de la API mira-api.
 */
import { api } from '../../services/httpClient.js';
import { listarPendientes } from '../../services/incidenciaApi.js';
import { listarNegociosPendientes } from '../../services/negocioApi.js';
import { conAuditoria, trackPanel } from '../../services/auditoria.js';
import { diffCambios } from '../../services/auditoriaCore.js';

/** Comisión real si la reserva ya tiene ticket; si no, null (no inventar). */
export function comisionRealDeReserva(r) {
  if (r?.importeComision != null && r?.ticketId) return Number(r.importeComision) || 0;
  if (r?.importeComision != null && r?.totalPagado != null) return Number(r.importeComision) || 0;
  return null;
}

function fechaDeDoc(d) {
  if (d.createdAt instanceof Date) return d.createdAt;
  if (typeof d.createdAt === 'string') {
    const parsed = new Date(d.createdAt);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  if (d.createdAt?.toDate) return d.createdAt.toDate();
  if (d.createdAt?.seconds) return new Date(d.createdAt.seconds * 1000);
  const f = d.fecha ? new Date(`${d.fecha}T${d.hora || '12:00'}`) : null;
  return f && !Number.isNaN(f.getTime()) ? f : null;
}

function diaISO(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function nombreRestauranteDe(r) {
  return r.nombreRestaurante || r.restauranteNombre || r.restaurantName || '—';
}

export function idRestauranteDe(r) {
  return r.restaurantId || r.restauranteId || 'unknown';
}

function antiguedadCorta(ts) {
  if (!ts) return '—';
  const d = ts instanceof Date ? ts : ts?.toDate ? ts.toDate() : typeof ts === 'string' ? new Date(ts) : ts?.seconds ? new Date(ts.seconds * 1000) : null;
  if (!d || Number.isNaN(d.getTime())) return '—';
  const min = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
  if (min < 1) return 'ahora mismo';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} d`;
}

export async function updateReservationStatus(reservaId, estado, estadoAntes = null) {
  await conAuditoria('reserva_estado_cambiada', { entidadTipo: 'reserva', entidadId: String(reservaId), cambios: [{ campo: 'estado', antes: estadoAntes, despues: estado }] },
    api.put(`/v1/dashboard/reservations/${reservaId}/status`, { status: estado }), { panel: true });
  return { updated: true, estado };
}

export async function listarUsuarios() {
  const d = await api.get('/v1/dashboard/users');
  const list = Array.isArray(d) ? d : d.data || [];
  return list.map((u) => ({
    uid: u.uid,
    nombre: u.nombre,
    email: u.email,
    tipo: u.tipo,
    saldoPuntos: u.saldoPuntos || 0,
    rachaLoginDias: u.rachaLoginDias || 0,
    ultimoLoginDate: u.ultimoLoginDate || null,
    yaReclamadoHoy: Boolean(u.yaReclamadoHoy),
    // Para el informe: solo si ya vienen en la respuesta (no se piden aparte).
    plataforma: u.plataforma || u.origen || u.platform || null,
    creado: u.creado || u.createdAt || u.fechaAlta || null,
    preferencias: u.preferencias || null,
  }));
}

export async function abonarPuntos(uid, cantidad, motivo, saldoAntes = null) {
  const r = await api.post('/v1/dashboard/points/add-manual', { uid, cantidad, motivo });
  const despues = r?.nuevoSaldo ?? null;
  trackPanel(cantidad >= 0 ? 'puntos_abonados' : 'puntos_ajustados', {
    entidadTipo: 'usuario', entidadId: uid, meta: { cantidad },
    cambios: [{ campo: 'saldoPuntos', antes: saldoAntes ?? (despues != null ? despues - cantidad : null), despues }],
  });
  return r;
}

export async function setRacha(uid, dias) {
  return api.post('/v1/dashboard/points/racha/set', { uid, dias });
}

export async function ajustarRacha(uid, delta, diasAntes = null) {
  const r = await api.post('/v1/dashboard/points/racha/delta', { uid, delta });
  trackPanel('racha_modificada', { entidadTipo: 'usuario', entidadId: uid, meta: { cantidad: delta }, cambios: [{ campo: 'rachaLoginDias', antes: diasAntes, despues: r?.rachaLogin?.dias ?? null }] });
  return r;
}

export async function deshacerLoginHoy(uid, diasAntes = null) {
  const r = await api.post('/v1/dashboard/points/racha/unclaim-today', { uid });
  trackPanel('login_revertido', { entidadTipo: 'usuario', entidadId: uid, cambios: [{ campo: 'rachaLoginDias', antes: diasAntes, despues: r?.rachaLogin?.dias ?? null }, { campo: 'yaReclamadoHoy', antes: Boolean(r?.estabaReclamadoHoy), despues: false }] });
  return r;
}

export function mensajeErrorFirestore(e) {
  return String(e?.message || e || '');
}

export async function getOpsOverview() {
  return api.get('/v1/dashboard/ops/overview');
}

export async function getReservasGlobales({ q = '', estado = '', limite = 100 } = {}) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (estado) params.set('estado', estado);
  params.set('limite', String(limite));
  const d = await api.get(`/v1/dashboard/reservations?${params}`);
  return Array.isArray(d) ? d : d.data || [];
}

export async function listarRestaurantesAdmin({ q = '', cursor = null, limit = 27 } = {}) {
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  if (q) params.set('q', q);
  if (cursor) params.set('cursor', cursor);
  const d = await api.get(`/v1/dashboard/restaurants?${params}`);
  return {
    items: d.items || [],
    cursor: d.cursor ?? null,
    terminado: Boolean(d.terminado),
  };
}

export async function editarRestauranteAdmin(id, data, antes = {}) {
  return conAuditoria('restaurante_editado', { entidadTipo: 'restaurante', entidadId: String(id), entidadNombre: antes?.nombre, cambios: diffCambios(antes, data) },
    api.put(`/v1/dashboard/restaurant/${encodeURIComponent(id)}`, data), { panel: true });
}

export async function eliminarRestauranteAdmin(id, nombre = null) {
  return conAuditoria('restaurante_eliminado', { entidadTipo: 'restaurante', entidadId: String(id), entidadNombre: nombre },
    api.del(`/v1/dashboard/restaurant/${encodeURIComponent(id)}`), { panel: true });
}

export async function enviarMensajeDueno(id, { asunto, mensaje }) {
  // Solo se audita que hubo mensaje y su longitud, nunca el texto (puede llevar datos personales).
  return conAuditoria('mensaje_enviado_dueno', { entidadTipo: 'restaurante', entidadId: String(id), meta: { cantidad: String(mensaje || '').length } },
    api.post(`/v1/dashboard/restaurant/${encodeURIComponent(id)}/message`, { asunto, mensaje }), { panel: true });
}

function csvCell(v) {
  const s = String(v ?? '');
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function descargarCSV(nombre, cabeceras, filas) {
  const lineas = [cabeceras.map(csvCell).join(';'), ...filas.map((f) => f.map(csvCell).join(';'))];
  const blob = new Blob([`﻿${lineas.join('\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Descarga un texto ya generado (p. ej. el export de auditoría que produce el backend). */
export function descargarTexto(nombre, texto, tipo = 'text/plain;charset=utf-8') {
  const blob = new Blob([texto], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function csvReservas(list) {
  return {
    cabeceras: ['id', 'codigo', 'restaurante', 'cliente', 'email', 'fecha', 'hora', 'comensales', 'estado', 'comision'],
    filas: list.map((r) => {
      const real = comisionRealDeReserva(r);
      return [
        r.id, r.codigo || '', nombreRestauranteDe(r), r.usuarioNombre || r.usuarioEmail || '',
        r.email || '', r.fecha || '', r.hora || '', r.comensales ?? '', r.estado || '',
        real != null ? real : '',
      ];
    }),
  };
}

export { fechaDeDoc, diaISO, antiguedadCorta };
