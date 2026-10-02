/**
 * Stub de mira-api: implementa POST /v1/ai/agent tal y como lo documenta
 * el backend. Sirve para comprobar de verdad el camino real desde Node.
 *
 *   node test/stub-agente.mjs [puerto]   (por defecto 4310, para chocar con menos)
 */
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

const PUERTO = Number(process.argv[2]) || 4310;
const pedir = /(reserv|mesa|cita)/;

const RESTAURANTE = {
  id: 'casa-lucio',
  nombre: 'Casa Lucio',
  rating_yelp: 4.5,
  total_resenas_yelp: 120,
  precio: '€€',
  categorias: ['Española', 'Marisco'],
  ciudad: 'Madrid',
  zona_busqueda: 'Centro',
  direccion_completa: 'Cava Baja 35, Madrid',
  telefono: '+34 913 000 000',
  descripcion: 'Cocina española de autor.',
  terraza: false,
  menuInfantil: true,
  alergenos: 'gluten, marisco',
  maxReservasPorHora: 8,
  // campos que la UI NO debe pintar (prueba anti-PII)
  email: 'no-debe-salir@ejemplo.com',
  serviceAccount: 'nunca',
};

const SALDO = { saldoActual: 340, totalAcumulado: 1820, totalCanjeado: 400, rachaLogin: { dias: 3 } };
const pendientes = new Map();

const send = (res, status, body, headers = {}) => {
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
  res.end(JSON.stringify(body));
};

createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/v1/ai/agent') {
    return send(res, 404, { error: 'NOT_FOUND', message: 'Ruta no encontrada.' });
  }

  const auth = req.headers.authorization || '';
  const anonimo = !auth.startsWith('Bearer ');
  let crudo = '';
  req.on('data', (c) => { crudo += c; });
  req.on('end', () => {
    let b;
    try {
      b = JSON.parse(crudo || '{}');
    } catch {
      return send(res, 400, { error: 'VALIDATION_ERROR', message: 'JSON inválido.' });
    }

    if (typeof b.message !== 'string' || b.message.length < 1 || b.message.length > 2000) {
      return send(res, 400, { error: 'VALIDATION_ERROR', message: 'message debe tener entre 1 y 2000 caracteres.' });
    }
    if (b.history && b.history.length > 10) {
      return send(res, 400, { error: 'VALIDATION_ERROR', message: 'history admite 10 entradas como máximo.' });
    }

    console.log(`[stub] ${req.method} ${req.url} key=${req.headers['idempotency-key']} anonimo=${anonimo} msg="${b.message}" confirmId=${b.confirmId ?? '-'}`);

    const ocultar = (tool, args, result) => ({ tool, args, result });
    const cuerpo = { actions: [], provider: 'stub', model: 'stub-1' };
    const q = String(b.message || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

    // Paso 2 de confirmación
    if (b.confirmId) {
      const p = pendientes.get(b.confirmId);
      if (!p) return send(res, 404, { error: 'NOT_FOUND', message: 'Esa confirmación ya no está disponible.' });
      pendientes.delete(b.confirmId);
      return send(res, 200, {
        ...cuerpo,
        reply: `Reserva creada en ${p.nombre} (${p.fecha} ${p.hora}, ${p.pax} pax).`,
        actions: [ocultar('createReservation', {}, { ok: true, data: {
          id: 'res-99', codigo: 'MIRA-001-STUB', restauranteNombre: p.nombre,
          fecha: p.fecha, hora: p.hora, comensales: p.pax, estado: 'pendiente',
        } })],
      }, { 'X-Prompt-Hash': 'stub1234' });
    }

    // Herramientas de admin sin sesión → MISSING_TOKEN dentro de result (HTTP 200)
    if (/admin|facturacion/.test(q)) {
      return send(res, 200, {
        ...cuerpo,
        reply: anonimo ? 'Inicia sesión para que pueda ayudarte con tu cuenta.' : 'Ese panel es solo para admin.',
        actions: [ocultar('listAllUsers', {}, { ok: false, error: 'FORBIDDEN', message: 'Solo cuentas admin.' })],
      });
    }

    // Mutación → needsConfirm
    if (pedir.test(q)) {
      const confirmId = randomUUID();
      const fecha = (q.match(/(\d{4}-\d{2}-\d{2})/) || [])[1] || '2030-01-01';
      const hora = (q.match(/(\d{1,2}:\d{2})/) || [])[1] || '13:00';
      const pax = Number((q.match(/(\d{1,2})\s*(pax|personas|comensales)/) || q.match(/para\s+(\d{1,2})\b/) || [])[1]) || 2;
      pendientes.set(confirmId, { nombre: RESTAURANTE.nombre, fecha, hora, pax });
      return send(res, 200, {
        ...cuerpo,
        reply: `¿Confirmas la reserva en ${RESTAURANTE.nombre} para ${fecha} a las ${hora}, ${pax} pax?`,
        actions: [ocultar('createReservation', {}, { pending: true })],
        needsConfirm: { confirmId, summary: `${RESTAURANTE.nombre} · ${fecha} ${hora} · ${pax} pax`, payload: { tool: 'createReservation', args: {} } },
      });
    }

    if (/saldo|puntos/.test(q)) {
      return send(res, 200, { ...cuerpo, reply: 'Tienes 340 puntos MIRA disponibles.', actions: [ocultar('getBalance', {}, { ok: true, data: SALDO })] });
    }
    if (/busca|pizza|barcelona/.test(q)) {
      return send(res, 200, { ...cuerpo, reply: 'Te encontré 1 restaurante. Según la API.', actions: [ocultar('searchRestaurants', {}, { ok: true, data: { items: [RESTAURANTE], total: 1 } })] });
    }
    return send(res, 200, {
      ...cuerpo,
      reply: `Casa Lucio, 4.5★ (120 reseñas), €€, Española en Madrid Centro. Según la API.`,
      actions: [ocultar('getRestaurant', { id: RESTAURANTE.id }, { ok: true, data: RESTAURANTE })],
    });
  });
}).listen(PUERTO, () => console.log(`[stub] /v1/ai/agent escuchando en http://localhost:${PUERTO}`));