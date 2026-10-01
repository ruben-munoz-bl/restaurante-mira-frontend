/**
 * Respuestas mock de /v1/ai/agent para desarrollar la UI sin backend.
 *
 * Módulo PURO: cero imports, testeable con `node --test`.
 * Reproduce la forma exacta de §1 del contrato, incluido el flujo de
 * dos pasos (petición → needsConfirm → confirmación) y los errores.
 */

const RESPUESTA_VACIA = {
  reply: '',
  actions: [],
  needsConfirm: null,
  provider: 'mock',
  model: 'mock-1',
};

/** Delay humano, para que se vea el estado "escribiendo". */
function delay(ms = 700) {
  return new Promise((r) => setTimeout(r, ms));
}

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

const RESTAURANTE = {
  id: 'casa-lucio',
  nombre: 'Casa Lucio',
  valoracion: 4.5,
  totalResenasYelp: 120,
  precio: '€€',
  cocina: 'Española',
  categorias: ['Española', 'Marisco'],
  ciudad: 'Madrid',
  zona: 'Centro',
  direccion: 'Cava Baja 35, Madrid',
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

// ── Errores provocados, para poder probar los caminos de la UI ──────────
const ERRORES = [
  {
    prueba: /bomb|429/,
    error: Object.assign(new Error('rate limited'), {
      status: 429,
      retryAfter: 9,
      data: { error: 'RATE_LIMITED', message: 'Demasiadas peticiones.' },
    }),
  },
  {
    prueba: /admin|facturacion|fiscalizacion/,
    error: Object.assign(new Error('forbidden'), {
      status: 403,
      data: { error: 'FORBIDDEN', message: 'Ese panel es para cuentas de empresa.' },
    }),
  },
];

/**
 * Responde como el backend. Lanza objetos Error con `status`/`data` para
 * simular 4xx (el store y aiErrors los tratan igual que en producción).
 */
export async function responderMock({ message, history = [], confirmId = null, signal = null } = {}) {
  const q = normaliza(message);

  if (signal?.aborted) throw abortado();
  await delay(600 + Math.floor(Math.random() * 300));
  if (signal?.aborted) throw abortado();

  // ── Paso 2: confirmId presente → se ejecuta la mutación ───────────────
  // Va primero: la confirmación nunca debe caer en otra rama del mock.
  if (confirmId) {
    const i = pendientes.findIndex((p) => p.confirmId === confirmId);
    if (i === -1) {
      throw Object.assign(new Error('not found'), {
        status: 404,
        data: { error: 'NOT_FOUND', message: 'Esa confirmación ya no está disponible.' },
      });
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
    return {
      reply: `Reserva creada en ${creada.restauranteNombre} (${creada.fecha} a las ${creada.hora}, ${creada.comensales} pax). Estado: pendiente.`,
      actions: [{ tool: 'createReservation', ok: true, args: pedido, result: creada }],
      provider: 'mock',
      model: 'mock-1',
    };
  }

  // ── Errores provocados ───────────────────────────────────────────────
  for (const { prueba, error } of ERRORES) {
    if (prueba.test(q)) throw error;
  }

  if (/secreto|password|dni|api.?key/.test(q)) {
    // El agente no debe filtrar nada: respuesta sin datos sensibles.
    return {
      ...RESPUESTA_VACIA,
      reply: 'No puedo ayudarte con eso. Solo puedo consultar datos de restaurantes, reservas y puntos.',
    };
  }

  // ── Mutación que pide confirmación (antes que las lecturas) ───────────
  if (/reserv|mesa|cita/.test(q)) {
    const fecha = (q.match(/(\d{4}-\d{2}-\d{2})/) || [])[1] || '2026-10-10';
    const hora = (q.match(/(\d{1,2}:\d{2})/) || [])[1] || '13:00';
    const pax =
      Number(
        (q.match(/(\d{1,2})\s*(pax|personas|comensales)/) || q.match(/para\s+(\d{1,2})\b/) || [])[1],
      ) || 2;
    const pedido = {
      seq: pendientes.length + 1,
      restauranteNombre: RESTAURANTE.nombre,
      restauranteId: RESTAURANTE.id,
      fecha,
      hora,
      comensales: Math.min(Math.max(pax, 1), 20),
    };
    const confirmId = uuid();
    pendientes.push({ ...pedido, confirmId });

    return {
      reply: `¿Confirmo la reserva en ${RESTAURANTE.nombre} para ${fecha} a las ${hora}, ${pedido.comensales} pax?`,
      actions: [{ tool: 'createReservation', ok: true, args: pedido, result: { pending: true } }],
      needsConfirm: {
        confirmId,
        summary: `${RESTAURANTE.nombre} · ${fecha} ${hora} · ${pedido.comensales} pax`,
        payload: { tool: 'createReservation', args: pedido },
      },
      provider: 'mock',
      model: 'mock-1',
    };
  }

  // ── Puntos ───────────────────────────────────────────────────────────
  if (/saldo|puntos|queda/.test(q)) {
    return {
      reply: 'Tienes 340 puntos MIRA disponibles. Tu racha de login va por 3 días.',
      actions: [{ tool: 'getBalance', ok: true, args: {}, result: SALDO }],
      provider: 'mock',
      model: 'mock-1',
    };
  }

  // ── Ruleta bloqueada (WHEEL_LOCKED) ──────────────────────────────────
  if (/ruleta|gira/.test(q)) {
    return {
      reply: 'La ruleta se abre con una racha de 7 días; ahora llevas 3.',
      actions: [{ tool: 'spinWheel', ok: false, args: {}, error: 'WHEEL_LOCKED' }],
      provider: 'mock',
      model: 'mock-1',
    };
  }

  // ── Disponibilidad ───────────────────────────────────────────────────
  if (/disponib|huecos|libre/.test(q)) {
    return {
      reply: 'Hay 8 plazas a las 13:00. Según la API.',
      actions: [
        {
          tool: 'checkAvailability',
          ok: true,
          args: { restauranteId: RESTAURANTE.id, fecha: '2026-10-10', hora: '13:00' },
          result: { fecha: '2026-10-10', hora: '13:00', limite: 8, ocupadas: 0, libres: 8 },
        },
      ],
      provider: 'mock',
      model: 'mock-1',
    };
  }

  // ── Búsqueda ─────────────────────────────────────────────────────────
  if (/busca|recomienda|italiana|pizza|barcelona/.test(q)) {
    return {
      reply: 'Te encontré restaurantes que encajan. Según la API.',
      actions: [
        { tool: 'searchRestaurants', ok: true, args: { q: message }, result: { items: [RESTAURANTE] } },
      ],
      provider: 'mock',
      model: 'mock-1',
    };
  }

  // ── Ficha puntual ─────────────────────────────────────────────────────
  if (/casa lucio|lucio|que tal/.test(q)) {
    return {
      reply: 'Casa Lucio, 4.5★ (120 reseñas), €€, Española en Madrid Centro. Según la API.',
      actions: [{ tool: 'getRestaurant', ok: true, args: { id: RESTAURANTE.id }, result: RESTAURANTE }],
      provider: 'mock',
      model: 'mock-1',
    };
  }

  // ── Fallback ─────────────────────────────────────────────────────────
  return {
    reply:
      'Puedo buscar restaurantes, mirar fichas, comprobar disponibilidad y gestionar tus reservas o tus puntos. ¿Qué buscas?',
    provider: 'mock',
    model: 'mock-1',
  };
}

/** Vacía el estado interno (tests / botón "nueva conversación"). */
export function reiniciarMock() {
  pendientes.length = 0;
}
