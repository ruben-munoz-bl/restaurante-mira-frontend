import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildHistory,
  construirBody,
  nuevaIdempotencyKey,
  esUuid,
  camposVisibles,
  clasificarResultado,
  normalizarRespuesta,
  MAX_MENSAJE,
  MAX_CONTENT,
  MAX_RESULTADOS_BUSQUEDA,
  MAX_RESULTADOS_LISTA,
  ESTADO_OK,
  ESTADO_ERROR,
  ESTADO_PENDIENTE,
  ESTADO_DESCONOCIDO,
} from '../src/services/aiPayload.js';

const m = (role, content) => ({ role, content });

// ── buildHistory ────────────────────────────────────────────────────────

test('buildHistory devuelve como mucho 10 entradas (zod del backend)', () => {
  const muchos = Array.from({ length: 25 }, (_, i) => m(i % 2 === 0 ? 'user' : 'model', `msg ${i}`));
  const h = buildHistory(muchos);
  assert.equal(h.length, 10);
  assert.equal(h.at(-1).content, 'msg 24');
});

test('buildHistory descarta roles no permitidos y vacíos', () => {
  const h = buildHistory([m('user', 'hola'), m('system', 'prompt'), m('model', '  '), m('user', 'otra'), null]);
  assert.deepEqual(h, [
    { role: 'user', content: 'hola' },
    { role: 'user', content: 'otra' },
  ]);
});

test('buildHistory trunca content a 4000 chars', () => {
  assert.equal(buildHistory([m('user', 'x'.repeat(9000))])[0].content.length, MAX_CONTENT);
});

test('buildHistory no crashea con basura', () => {
  assert.deepEqual(buildHistory(null), []);
  assert.deepEqual(buildHistory('nope'), []);
});

// ── construirBody ───────────────────────────────────────────────────────

test('construirBody recorta el mensaje a 2000', () => {
  assert.equal(construirBody({ message: 'a'.repeat(5000) }).message.length, MAX_MENSAJE);
});

test('construirBody solo manda confirmId si es uuid', () => {
  assert.deepEqual(construirBody({ message: 'hola', history: [], confirmId: 'no-uuid' }), { message: 'hola' });
  const id = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
  assert.equal(construirBody({ message: 'sí', confirmId: id }).confirmId, id);
});

// ── Idempotencia ────────────────────────────────────────────────────────

test('nuevaIdempotencyKey: uuid válido y distinto cada vez', () => {
  const a = nuevaIdempotencyKey();
  assert.ok(esUuid(a));
  assert.notEqual(a, nuevaIdempotencyKey());
});

// ── clasificarResultado: el fallo real del diseño anterior ──────────────

test('result.ok === true → ok con los datos de result.data', () => {
  const r = clasificarResultado('getRestaurant', { ok: true, data: { nombre: 'Casa Lucio' } });
  assert.equal(r.estado, ESTADO_OK);
  assert.equal(r.data.nombre, 'Casa Lucio');
});

test('result.ok === false → error (HTTP 200): NUNCA una tarjeta de éxito', () => {
  const r = clasificarResultado('addManualPoints', { ok: false, error: 'FORBIDDEN', message: 'No eres admin.' });
  assert.equal(r.estado, ESTADO_ERROR);
  assert.equal(r.error, 'FORBIDDEN');
  assert.equal(r.message, 'No eres admin.');
  assert.deepEqual(r.data, {}, 'un error no arrastra datos');
});

test('result.pending === true → pendiente, NO ejecutado', () => {
  const r = clasificarResultado('createReservation', { pending: true });
  assert.equal(r.estado, ESTADO_PENDIENTE);
  assert.deepEqual(r.data, {});
});

test('sin ok ni pending → desconocido (no se inventa que fue bien)', () => {
  assert.equal(clasificarResultado('x', {}).estado, ESTADO_DESCONOCIDO);
  assert.equal(clasificarResultado('x', null).estado, ESTADO_DESCONOCIDO);
  assert.equal(clasificarResultado('x', undefined).estado, ESTADO_DESCONOCIDO);
});

test('ok:true sin data no rompe', () => {
  const r = clasificarResultado('getBalance', { ok: true });
  assert.equal(r.estado, ESTADO_OK);
  assert.deepEqual(r.data, {});
});

// ── Allowlist anti-PII ──────────────────────────────────────────────────

test('camposVisibles solo deja las claves permitidas', () => {
  const r = camposVisibles('getRestaurant', {
    nombre: 'Casa Lucio',
    valoracion: 4.5,
    uid: 'abc',
    email: 'x@y.com',
    GEMINI_API_KEY: 'secreto',
  });
  assert.equal(r.nombre, 'Casa Lucio');
  assert.deepEqual(Object.keys(r).sort(), ['nombre', 'valoracion']);
});

test('acepta los alias snake_case del backend', () => {
  const r = camposVisibles('getRestaurant', {
    nombre: 'Casa Lucio',
    rating_yelp: 4.5,
    total_resenas_yelp: 120,
    zona_busqueda: 'Centro',
    direccion_completa: 'Cava Baja 35',
  });
  assert.equal(r.valoracion, 4.5);
  assert.equal(r.totalResenasYelp, 120);
  assert.equal(r.zona, 'Centro');
  assert.equal(r.direccion, 'Cava Baja 35');
});

test('tool desconocida → cero datos', () => {
  assert.deepEqual(camposVisibles('listAllUsers', { uid: 'x', email: 'y@z.com', saldo: 1 }), {});
});

test('getMe NO filtra email ni uid', () => {
  const r = camposVisibles('getMe', { nombre: 'Ana', tipo: 'cliente', email: 'ana@x.com', uid: 'u1' });
  assert.equal(r.nombre, 'Ana');
  assert.ok(!('email' in r));
  assert.ok(!('uid' in r));
});

test('las listas se recortan y se limpian item a item', () => {
  const items = Array.from({ length: 30 }, (_, i) => ({ nombre: `L${i}`, uid: `u${i}`, email: `e${i}@x.com` }));
  const r = camposVisibles('searchRestaurants', { items, total: 30 });
  assert.equal(r.items.length, MAX_RESULTADOS_LISTA);
  assert.equal(r.total, 30);
  assert.ok(!('uid' in r.items[0]));
  assert.ok(!('email' in r.items[0]));
  assert.ok(MAX_RESULTADOS_LISTA <= MAX_RESULTADOS_BUSQUEDA + 5);
});

test('lista sin allowlist de item no deja pasar campos', () => {
  const r = camposVisibles('promoStats', { items: [{ secret: 1 }] });
  assert.deepEqual(r, {});
});

test('camposVisibles acepta data como array', () => {
  const r = camposVisibles('listMyReservations', [{ restauranteNombre: 'Casa Lucio', estado: 'pendiente', uid: 'u' }]);
  assert.equal(r.items.length, 1);
  assert.equal(r.items[0].estado, 'pendiente');
  assert.ok(!('uid' in r.items[0]));
});

test('camposVisibles no crashea con null ni primitivos', () => {
  assert.deepEqual(camposVisibles('getRestaurant', null), {});
  assert.deepEqual(camposVisibles('getRestaurant', 'texto'), {});
  assert.deepEqual(camposVisibles('getRestaurant', undefined), {});
});

// ── normalizarRespuesta ─────────────────────────────────────────────────

test('normaliza la respuesta real del backend', () => {
  const r = normalizarRespuesta({
    reply: '  Casa Lucio tiene 4.5 estrellas.  ',
    actions: [
      { tool: 'getRestaurant', args: { id: 'r1' }, result: { ok: true, data: { nombre: 'Casa Lucio', uid: 'x' } } },
      { tool: 'spinWheel', args: {}, result: { ok: false, error: 'WHEEL_LOCKED', message: 'Necesitas 7 días.' } },
      { tool: 'createReservation', args: {}, result: { pending: true } },
    ],
    needsConfirm: {
      confirmId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
      summary: 'r1 · 2030-01-01 13:00 · 4 pax',
      payload: { tool: 'createReservation', args: { uid: 'ajeno' } },
    },
    provider: 'gemini',
    model: 'gemini-3.5-flash-lite',
  });

  assert.equal(r.reply, 'Casa Lucio tiene 4.5 estrellas.');
  assert.equal(r.actions.length, 3);
  assert.equal(r.actions[0].estado, ESTADO_OK);
  assert.equal(r.actions[0].data.nombre, 'Casa Lucio');
  assert.equal(r.actions[1].estado, ESTADO_ERROR);
  assert.equal(r.actions[1].error, 'WHEEL_LOCKED');
  assert.equal(r.actions[2].estado, ESTADO_PENDIENTE);
  assert.ok(!('uid' in r.actions[0].data), 'el uid no sale');
  assert.equal(r.needsConfirm.summary, 'r1 · 2030-01-01 13:00 · 4 pax');
  assert.ok(!('payload' in r.needsConfirm), 'needsConfirm no expone payload al cliente');
  assert.equal(r.model, 'gemini-3.5-flash-lite');
});

test('descarta needsConfirm con confirmId no-uuid', () => {
  assert.equal(normalizarRespuesta({ reply: 'ok', needsConfirm: { confirmId: 'hack' } }).needsConfirm, null);
});

test('tolera respuestas vacías o basura', () => {
  const vacio = { reply: '', actions: [], needsConfirm: null, provider: null, model: null };
  assert.deepEqual(normalizarRespuesta(null), vacio);
  assert.deepEqual(normalizarRespuesta('texto'), vacio);
  assert.deepEqual(normalizarRespuesta({}), vacio);
});

test('filtra actions sin tool', () => {
  const r = normalizarRespuesta({ actions: [{ result: { ok: true } }, null, { tool: 'getBalance', result: { ok: true, data: { saldoActual: 40 } } }] });
  assert.equal(r.actions.length, 1);
  assert.equal(r.actions[0].data.saldoActual, 40);
});