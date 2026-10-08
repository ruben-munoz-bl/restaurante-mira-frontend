import { api } from './httpClient.js';
import { conAuditoria } from './auditoria.js';

/* ────────────── POINTS ────────────── */

const WHEEL_PRIZES = [
  { puntos: 20, label: '20 MIRA', peso: 475 },
  { puntos: 25, label: '25 MIRA', peso: 200 },
  { puntos: 30, label: '30 MIRA', peso: 150 },
  { puntos: 50, label: '50 MIRA', peso: 120 },
  { puntos: 100, label: '100 MIRA', peso: 5 },
];

/** Descuentos canjeables (GET /v1/points/discounts). Cae a 5/10/20 € si falla. */
const DESCUENTOS_POR_DEFECTO = [5, 10, 20].map((e) => ({ id: String(e), puntos: e * 100, euros: e, etiqueta: `${e} €` }));
async function listarDescuentos() {
  try {
    const d = await api.get('/v1/points/discounts');
    const lista = d?.descuentos;
    return Array.isArray(lista) && lista.length ? lista : DESCUENTOS_POR_DEFECTO;
  } catch {
    return DESCUENTOS_POR_DEFECTO;
  }
}

/** POST /v1/points/discount/claim con el descuentoId que corresponde a esos euros. */
async function reclamarDescuento(euros) {
  const lista = await listarDescuentos();
  const d = lista.find((x) => Number(x.euros) === Number(euros));
  const r = await api.post('/v1/points/discount/claim', { descuentoId: String(d?.id ?? euros) });
  // Normaliza el cupón al formato que ya usa la UI (descuentoPendiente).
  const cupon = r?.cupon || null;
  return {
    ...r,
    descuentoPendiente: cupon ? { ...cupon, puntos: d?.puntos ?? Number(euros) * 100 } : r?.descuentoPendiente || null,
  };
}

export const pointsApi = {
  isNewUser: async () => {
    const d = await api.get('/v1/points/is-new-user');
    return Boolean(d.isNew);
  },

  getBalance: async () => api.get('/v1/points/balance'),

  getLedger: async (params = {}) => {
    const q = new URLSearchParams();
    if (params.tipo) q.set('tipo', params.tipo);
    if (params.limit) q.set('limit', String(params.limit));
    if (params.page) q.set('page', String(params.page));
    const qs = q.toString();
    return api.get(`/v1/points/ledger${qs ? `?${qs}` : ''}`);
  },

  dailyLogin: async () => {
    const r = await api.post('/v1/points/daily-login');
    if (r?.puntos) conAuditoria('puntos_ganados', { accion: 'login_diario', meta: { cantidad: r.puntos } }, Promise.resolve());
    return r;
  },

  claimWheelReward: async () => conAuditoria('rueda_girada', { pagina: 'puntos' }, api.post('/v1/points/wheel')),

  getWheelPrizes: async () => {
    try {
      const d = await api.get('/v1/points/wheel/prizes');
      const prizes = d.prizes || d.data || d;
      return Array.isArray(prizes) ? prizes : WHEEL_PRIZES.map((p) => ({ puntos: p.puntos, label: p.label }));
    } catch {
      return WHEEL_PRIZES.map((p) => ({ puntos: p.puntos, label: p.label }));
    }
  },

  redeem: async (puntos) => conAuditoria('puntos_canjeados', { meta: { cantidad: puntos } }, api.post('/v1/points/redeem', { puntos })),

  discounts: listarDescuentos,

  claimDiscount: async (euros) => conAuditoria('puntos_canjeados', { accion: 'descuento', meta: { valor: euros } }, reclamarDescuento(euros)),

  review: async () => api.post('/v1/points/review', {}),
};

/* ────────────── RESERVATIONS (legacy api.js) ────────────── */

export const reservationsApi = {
  create: async (data) => {
    const rId = String(data.restauranteId || data.restaurante?.id || '');
    return api.post('/v1/reservations', {
      restauranteId: rId,
      restaurantId: rId,
      nombreRestaurante: data.restaurante?.nombre || data.nombreRestaurante,
      fecha: data.fecha,
      hora: data.hora,
      comensales: Number(data.comensales),
      comentarios: data.comentarios || '',
      usuarioNombre: data.usuarioNombre || '',
      usuarioEmail: data.usuarioEmail || '',
    });
  },

  list: async (params = {}) => {
    const q = params.estado ? `?estado=${encodeURIComponent(params.estado)}` : '';
    const d = await api.get(`/v1/reservations${q}`);
    return d.data || d;
  },

  cancel: async (id) => {
    await conAuditoria('reserva_cancelada', { entidadTipo: 'reserva', entidadId: String(id) }, api.put(`/v1/reservations/${id}/cancel`));
    return { ok: true };
  },

  complete: async (id, precioBase) => {
    await conAuditoria('reserva_completada', { entidadTipo: 'reserva', entidadId: String(id) }, api.put(`/v1/reservations/${id}/complete`, { precioBase }));
    return { ok: true };
  },
};

/* ────────────── TICKETS ────────────── */

export const ticketsApi = {
  list: async () => {
    const d = await api.get('/v1/tickets');
    return d.data || d;
  },
  get: async (id) => api.get(`/v1/tickets/${id}`),
};

/* ────────────── INVITATIONS ────────────── */

export const invitationsApi = {
  // El email del invitado no se audita (PII): solo que hubo invitación.
  create: async (email) => conAuditoria('invitación_enviada', { pagina: 'invitar' }, api.post('/v1/invite', { email })),

  accept: async (codigo) => conAuditoria('invitación_aceptada', { pagina: 'invitar' }, api.post('/v1/invite/accept', { codigo })),

  getMy: async () => {
    const d = await api.get('/v1/invite/my');
    const enviadas = (d.enviadas || d.invitaciones || []).map((inv) => ({
      ...inv,
      emailInvitado: inv.emailInvitado || inv.invitadoEmail || '',
      link: inv.link || null,
    }));
    const aceptadas = d.aceptadas ?? 0;
    return {
      enviadas,
      aceptadas,
      invitaciones: enviadas,
      puntosTotales: typeof d.puntosTotales === 'number' ? d.puntosTotales : aceptadas * 200,
    };
  },
};

/* ────────────── PROMOTIONS ────────────── */

export const promotionsApi = {
  list: async (params = {}) => {
    const q = new URLSearchParams();
    if (params.estado) q.set('estado', params.estado);
    if (params.restauranteId) q.set('restauranteId', params.restauranteId);
    const qs = q.toString();
    const d = await api.get(`/v1/promotions${qs ? `?${qs}` : ''}`, { auth: false });
    return d.data || d;
  },
  getStats: async (id) => api.get(`/v1/promotions/${id}/stats`),
};

/* ────────────── INTERACTIONS ────────────── */

export const interactionsApi = {
  track: async (restauranteId, tipo) => {
    try {
      await api.post('/v1/interactions', { restauranteId, tipo });
    } catch { /* best-effort */ }
    return { ok: true };
  },
};

/* ────────────── ADMIN ────────────── */

export const adminApi = {
  getRevenue: async () => api.get('/v1/admin/revenue'),
  getFraudFlags: async () => {
    const d = await api.get('/v1/admin/fraud-flags');
    return d.data || d;
  },
};

/* ────────────── DASHBOARD ────────────── */

export const dashboardApi = {
  listMyRestaurants: async (currentId) => {
    const q = currentId ? `?currentId=${encodeURIComponent(currentId)}` : '';
    const d = await api.get(`/v1/dashboard/my-restaurants${q}`);
    return Array.isArray(d) ? d : d.data || [];
  },
  getMyRestaurant: async (restaurantIdOverride) => {
    const q = restaurantIdOverride ? `?id=${encodeURIComponent(restaurantIdOverride)}` : '';
    return api.get(`/v1/dashboard/my-restaurant${q}`);
  },
  getRestaurant: async (restaurantId) => api.get(`/v1/dashboard/restaurant/${restaurantId}`),
  getAdmin: async () => api.get('/v1/dashboard/admin'),
  getUsers: async () => {
    const d = await api.get('/v1/dashboard/users');
    return Array.isArray(d) ? d : d.data || d;
  },
  // Panel del restaurante (rol empresa): origen 'app'; el servidor marca actorTipo='empresa'.
  updateRestaurant: async (restaurantId, data) => conAuditoria(
    'aforoLimit' in data || 'maxReservasPorHora' in data ? 'franja_desbloqueada' : 'negocio_actualizado',
    { entidadTipo: 'restaurante', entidadId: String(restaurantId), cambios: Object.keys(data).slice(0, 30).map((campo) => ({ campo, antes: null, despues: data[campo] })) },
    api.put(`/v1/dashboard/restaurant/${restaurantId}`, data)),
  updateReservationStatus: async (reservaId, status) => conAuditoria('reserva_estado_cambiada',
    { entidadTipo: 'reserva', entidadId: String(reservaId), cambios: [{ campo: 'estado', antes: null, despues: status }] },
    api.put(`/v1/dashboard/reservations/${reservaId}/status`, { status })),
  subirTicket: async (reservaId, payload = {}) => conAuditoria('ticket_asignado',
    { entidadTipo: 'reserva', entidadId: String(reservaId), datos: { asistio: payload.asistio ?? null, importe: Number(payload.totalPagado) || null } },
    api.post(`/v1/dashboard/reservations/${reservaId}/ticket`, payload)),
  confirmAttendance: async (reservaId, data = {}) => conAuditoria('confirmacion_asistencia', { entidadTipo: 'reserva', entidadId: String(reservaId) },
    api.post(`/v1/dashboard/reservations/${reservaId}/confirm-attendance`, data)),
  markNoShow: async (reservaId) => conAuditoria('marcado_no_show', { entidadTipo: 'reserva', entidadId: String(reservaId) },
    api.post(`/v1/dashboard/reservations/${reservaId}/mark-no-show`, {})),
  addPointsManual: async (uid, cantidad, motivo) =>
    api.post('/v1/dashboard/points/add-manual', { uid, cantidad, motivo }),
};
