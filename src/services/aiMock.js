/**
 * Respuestas mock de POST /v1/ai/agent para desarrollar la UI sin backend.
 * Reproduce la forma EXACTA del contrato real, incluido el flujo de dos
 * pasos y los errores de negocio que llegan dentro de actions[].result
 * con HTTP 200.
 *
 * Módulo PURO: cero imports, testeable con `node --test`.
 */

const delay = (ms = 700) => new Promise((r) => setTimeout(r, ms));

function abortado() {
  return Object.assign(new Error('aborted'), { name: 'AbortError' });
}

const normaliza = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');

function uuid() {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return '00000000-0000-4000-8000-000000000000';
}

/** Error HTTP sintético con la forma que produce httpClient. */
function httpError(status, codigo, message, headers = {}) {
  return Object.assign(new Error(message || codigo), {
    status,
    retryAfter: headers['Retry-After'],
    data: { error: codigo, message },
  });
}

// ── Datos de ejemplo ────────────────────────────────────────────────────
const RESTAURANTE = {
  id: 'casa-lucio',
  nombre: 'Casa Lucio',
  valoracion: 4.5,
  totalResenasYelp: 120,
  precio: '€€',
  categorias: ['Española', 'Marisco'],
  ciudad: 'Madrid',
  zona_busqueda: 'Centro',
  direccion_completa: 'Cava Baja 35, Madrid',
  telefono: '+34 913 000 000',
  descripcion: 'Cocina española de autor en La Cava Baja.',
  terraza: false,
  menuInfantil: true,
  alergenos: 'gluten, marisco',
  maxReservasPorHora: 8,
};

const SALDO = {
  saldoActual: 340,
  totalAcumulado: 1820,
  totalCanjeado: 400,
  rachaLogin: { dias: 3, ultimoLogin: null, graceUsados: 0 },
  rachaReservas: { semanasConsecutivas: 2, multiplicador: 1.2 },
};

/** Confirmaciones pendientes durante la sesión de mock. */
const pendientes = [];

const ok = (tool, args, data) => ({ tool, args, result: { ok: true, data } });
const pendienteDe = (tool, args) => ({ tool, args, result: { pending: true } });
const fallo = (tool, args, error, message) => ({
  tool,
  args,
  result: { ok: false, error, message },
});

/**
 * Responde como el backend.
 * @throws Error con `status` para simular 4xx/5xx (los trata httpClient).
 */
export async function responderMock({ message, history = [], confirmId = null, signal = null } = {}) {
  const q = normaliza(message);

  if (signal?.aborted) throw abortado();
  await delay(600 + Math.floor(Math.random() * 300));
  if (signal?.aborted) throw abortado();

  const responder = (reply, actions = [], needsConfirm = null) => ({
    reply,
    actions,
    needsConfirm,
    provider: 'mock',
    model: 'mock-1',
  });

  // ── Paso 2: confirmId presente → se ejecuta la mutación ───────────────
  if (confirmId) {
    const i = pendientes.findIndex((p) => p.confirmId === confirmId);
    if (i === -1) {
      throw httpError(404, 'NOT_FOUND', 'Esa confirmación ya no está disponible.');
    }
    const [pedido] = pendientes.splice(i, 1);
    const creada = {
      id: `res-${pedido.seq}`,
      codigo: 'MIRA-001-MOCK',
      restauranteNombre: pedido.restauranteNombre,
      fecha: pedido.fecha,
      hora: pedido.hora,
      comensales: pedido.comensales,
      estado: 'pendiente',
      comentarios: '',
    };
    return responder(
      `Reserva creada en ${creada.restauranteNombre} (${creada.fecha} a las ${creada.hora}, ${creada.comensales} pax). Estado: pendiente.`,
      [ok('createReservation', pedido.args, creada)],
    );
  }

  // ── Errores HTTP provocados, para probar la UI ────────────────────────
  if (/bomb/.test(q)) throw httpError(429, 'RATE_LIMITED', 'Demasiadas peticiones.', { 'Retry-After': 12 });
  if (/roto|fallo/.test(q)) throw httpError(500, 'INTERNAL_ERROR', 'Error interno.', { requestId: 'req_mock' });
  if (/largo/.test(q)) throw httpError(400, 'VALIDATION_ERROR', 'El mensaje es demasiado largo.');
  if (/ruta/.test(q)) throw httpError(404, 'NOT_FOUND', 'Ruta no encontrada.');

  // ── Sin datos que dar: el agente no inventa ──────────────────────────
  if (/secreto|password|dni|api.?key|token/.test(q)) {
    return responder('No puedo ayudarte con eso. Solo consulto restaurantes, reservas y tus puntos.');
  }

  // ── Lecturas que contienen "reserva": van ANTES de la mutación genérica ─
  if (/mis reservas|misreservas|listar reservas/.test(q)) {
    return responder('Tienes 2 reservas.', [
      ok('listMyReservations', {}, {
        items: [
          { id: 'res-1', codigo: 'MIRA-001', restauranteNombre: 'Casa Lucio', fecha: '2030-01-01', hora: '13:00', comensales: 4, estado: 'confirmada' },
          { id: 'res-2', codigo: 'MIRA-002', restauranteNombre: 'Casa Lucio', fecha: '2030-02-05', hora: '21:00', comensales: 2, estado: 'pendiente' },
        ],
        total: 2,
      }),
    ]);
  }

  // ── Cancelar (mutante: siempre 2 pasos) ───────────────────────────────
  if (/cancel/.test(q)) {
    return responder('¿Confirmo la cancelación?', [pendienteDe('cancelReservation', { reservaId: 'res-1' })], {
      confirmId: uuid(),
      summary: 'Cancelar reserva MIRA-001-MOCK',
      payload: { tool: 'cancelReservation', args: { reservaId: 'res-1' } },
    });
  }

  // ── Mutación que pide confirmación ───────────────────────────────────
  if (/reserv|mesa|cita/.test(q)) {
    const fecha = (q.match(/(\d{4}-\d{2}-\d{2})/) || [])[1] || '2030-01-01';
    const hora = (q.match(/(\d{1,2}:\d{2})/) || [])[1] || '13:00';
    const pax =
      Number(
        (q.match(/(\d{1,2})\s*(pax|personas|comensales)/) || q.match(/para\s+(\d{1,2})\b/) || [])[1],
      ) || 2;
    const args = { restauranteId: RESTAURANTE.id, fecha, hora, comensales: Math.min(Math.max(pax, 1), 20) };
    const confirmId = uuid();
    const pedido = { seq: pendientes.length + 1, args, confirmId, ...args, restauranteNombre: RESTAURANTE.nombre };
    pendientes.push(pedido);

    return responder(
      `¿Confirmas la reserva en ${RESTAURANTE.nombre} para ${fecha} a las ${hora}, ${pedido.comensales} pax?`,
      [pendienteDe('createReservation', args)],
      {
        confirmId,
        summary: `${RESTAURANTE.nombre} · ${fecha} ${hora} · ${pedido.comensales} pax`,
        payload: { tool: 'createReservation', args },
      },
    );
  }

  // ── Errores de negocio (HTTP 200, dentro de result) ──────────────────
  if (/ruleta|gira/.test(q)) {
    return responder(
      'La ruleta se abre con una racha de 7 días; ahora llevas 3.',
      [fallo('spinWheel', {}, 'WHEEL_LOCKED', 'La ruleta se abre con una racha de 7 días.')],
    );
  }
  if (/admin|facturacion|fiscalizacion|listAllUsers/.test(q)) {
    return responder('Ese panel es para cuentas de empresa.', [
      fallo('listAllUsers', {}, 'FORBIDDEN', 'Ese panel es para cuentas de empresa o admin.'),
    ]);
  }
  if (/saldo|puntos/.test(q)) {
    if (/canj/.test(q)) {
      return responder('No tienes saldo suficiente para canjear eso.', [
        fallo('redeemPoints', { puntos: 5000 }, 'INSUFFICIENT', 'Necesitas 5000 pts y tienes 340.'),
      ]);
    }
    return responder(
      'Tienes 340 puntos MIRA disponibles. Tu racha de login va por 3 días.',
      [ok('getBalance', {}, SALDO)],
    );
  }
  if (/invita/.test(q) && /mismo|yo/.test(q)) {
    return responder('No puedes invitarte a ti mismo.', [
      fallo('createInvite', { email: 'yo@ejemplo.com' }, 'SELF_INVITE', 'No puedes invitarte a ti mismo.'),
    ]);
  }

  // ── Lecturas ─────────────────────────────────────────────────────────
  if (/disponib|huecos|libre/.test(q)) {
    return responder('Hay 8 plazas a las 13:00. Según la API.', [
      ok('checkAvailability', { restauranteId: RESTAURANTE.id }, {
        fecha: '2030-01-01',
        hora: '13:00',
        limite: 8,
        ocupadas: 0,
        libres: 8,
      }),
    ]);
  }
  if (/busca|recomienda|italiana|pizza|barcelona/.test(q)) {
    return responder('Te encontré restaurantes que encajan. Según la API.', [
      ok('searchRestaurants', { q: message }, { items: [RESTAURANTE], total: 1 }),
    ]);
  }
  if (/casa lucio|lucio|que tal/.test(q)) {
    return responder('Casa Lucio, 4.5★ (120 reseñas), €€, Española en Madrid Centro. Según la API.', [
      ok('getRestaurant', { id: RESTAURANTE.id }, RESTAURANTE),
    ]);
  }

  return responder(
    'Puedo buscar restaurantes, mirar fichas, comprobar disponibilidad y gestionar tus reservas o tus puntos. ¿Qué buscas?',
  );
}

/** Vacía el estado interno (tests / botón "nueva conversación"). */
export function reiniciarMock() {
  pendientes.length = 0;
}