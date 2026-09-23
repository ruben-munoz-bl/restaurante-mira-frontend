import { api } from './httpClient.js';

/* ────────────── POINTS ────────────── */

const WHEEL_PRIZES = [
  { puntos: 20, label: '20 MIRA', peso: 475 },
  { puntos: 25, label: '25 MIRA', peso: 200 },
  { puntos: 30, label: '30 MIRA', peso: 150 },
  { puntos: 50, label: '50 MIRA', peso: 120 },
  { puntos: 100, label: '100 MIRA', peso: 5 },
];

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

  dailyLogin: async () => api.post('/v1/points/daily-login'),

  claimWheelReward: async () => api.post('/v1/points/wheel'),

  getWheelPrizes: async () => {
    try {
      const d = await api.get('/v1/points/wheel/prizes');
      const prizes = d.prizes || d.data || d;
      return Array.isArray(prizes) ? prizes : WHEEL_PRIZES.map((p) => ({ puntos: p.puntos, label: p.label }));
    } catch {
      return WHEEL_PRIZES.map((p) => ({ puntos: p.puntos, label: p.label }));
    }
  },

  redeem: async (puntos) => api.post('/v1/points/redeem', { puntos }),

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
    await api.put(`/v1/reservations/${id}/cancel`);
    return { ok: true };
  },

  complete: async (id, precioBase) => {
    await api.put(`/v1/reservations/${id}/complete`, { precioBase });
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
  create: async (email) => api.post('/v1/invite', { email }),

  accept: async (codigo) => api.post('/v1/invite/accept', { codigo }),

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
  updateRestaurant: async (restaurantId, data) => api.put(`/v1/dashboard/restaurant/${restaurantId}`, data),
  updateReservationStatus: async (reservaId, status) =>
    api.put(`/v1/dashboard/reservations/${reservaId}/status`, { status }),
  subirTicket: async (reservaId, payload = {}) =>
    api.post(`/v1/dashboard/reservations/${reservaId}/ticket`, payload),
  confirmAttendance: async (reservaId, data = {}) =>
    api.post(`/v1/dashboard/reservations/${reservaId}/confirm-attendance`, data),
  markNoShow: async (reservaId) =>
    api.post(`/v1/dashboard/reservations/${reservaId}/mark-no-show`, {}),
  addPointsManual: async (uid, cantidad, motivo) =>
    api.post('/v1/dashboard/points/add-manual', { uid, cantidad, motivo }),
};
