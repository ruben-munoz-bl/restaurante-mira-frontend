import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildHistory,
  construirBody,
  nuevaIdempotencyKey,
  esUuid,
  camposVisibles,
  normalizarRespuesta,
  MAX_MENSAJE,
  MAX_CONTENT,
  MAX_RESULTADOS_BUSQUEDA,
} from '../src/services/aiPayload.js';

const m = (role, content) => ({ role, content });

// ── buildHistory ────────────────────────────────────────────────────────

test('buildHistory devuelve como mucho 10 mensajes', () => {
  const muchos = Array.from({ length: 25 }, (_, i) =>
    m(i % 2 === 0 ? 'user' : 'model', `msg ${i}`),
  );
  const h = buildHistory(muchos);
  assert.equal(h.length, 10);
  assert.equal(h.at(-1).content, 'msg 24');
});

test('buildHistory descarta vacíos y roles no permitidos', () => {
  const h = buildHistory([
    m('user', 'hola'),
    m('system', 'prompt interno'),
    m('model', '   '),
    m('user', 'otra cosa'),
    null,
    { role: 'user' },
  ]);
  assert.deepEqual(h, [
    { role: 'user', content: 'hola' },
    { role: 'user', content: 'otra cosa' },
  ]);
});

test('buildHistory trunca content a 4000 chars', () => {
  const h = buildHistory([m('user', 'x'.repeat(9000))]);
  assert.equal(h[0].content.length, MAX_CONTENT);
});

test('buildHistory no crashea con basura', () => {
  assert.deepEqual(buildHistory(null), []);
  assert.deepEqual(buildHistory(undefined), []);
  assert.deepEqual(buildHistory('nope'), []);
});

// ── construirBody ───────────────────────────────────────────────────────

test('construirBody recorta el mensaje a 2000 chars', () => {
  const body = construirBody({ message: 'a'.repeat(5000) });
  assert.equal(body.message.length, MAX_MENSAJE);
});

test('construirBody omite history vacío y confirmId inválido', () => {
  const body = construirBody({ message: 'hola', history: [], confirmId: 'no-es-uuid' });
  assert.deepEqual(body, { message: 'hola' });
});

test('construirBody incluye confirmId si es uuid', () => {
  const id = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
  const body = construirBody({ message: 'sí', confirmId: id });
  assert.equal(body.confirmId, id);
});

// ── Idempotencia ────────────────────────────────────────────────────────

test('nuevaIdempotencyKey devuelve un uuid válido y distinto cada vez', () => {
  const a = nuevaIdempotencyKey();
  const b = nuevaIdempotencyKey();
  assert.ok(esUuid(a), `no es uuid: ${a}`);
  assert.ok(esUuid(b));
  assert.notEqual(a, b);
});

test('esUuid rechaza basura', () => {
  assert.equal(esUuid(''), false);
  assert.equal(esUuid('123'), false);
  assert.equal(esUuid(null), false);
  assert.equal(esUuid(undefined), false);
});

// ── Whitelist anti-PII ──────────────────────────────────────────────────

test('camposVisibles deja solo los campos permitidos de la tool', () => {
  const r = camposVisibles('getRestaurant', {
    nombre: 'Casa Lucio',
    valoracion: 4.5,
    totalResenasYelp: 120,
    precio: '€€',
    // campos prohibidos:
    uid: 'abc123',
    email: 'alguien@ejemplo.com',
    GEMINI_API_KEY: 'secreto',
  });
  assert.equal(r.nombre, 'Casa Lucio');
  assert.equal(r.valoracion, 4.5);
  assert.ok(!('uid' in r));
  assert.ok(!('email' in r));
  assert.ok(!('GEMINI_API_KEY' in r));
  assert.deepEqual(Object.keys(r).sort(), ['nombre', 'precio', 'totalResenasYelp', 'valoracion']);
});

test('camposVisibles ignora tool desconocidas por completo', () => {
  const r = camposVisibles('addManualPoints', {
    uid: 'victima',
    email: 'victima@ejemplo.com',
    saldo: 9999,
  });
  assert.deepEqual(r, {});
});

test('camposVisibles no filtra emails ni tokens en la reserva', () => {
  const r = camposVisibles('createReservation', {
    codigo: 'MIRA-001-abc',
    estado: 'pendiente',
    fecha: '2026-10-10',
    usuarioEmail: 'yo@ejemplo.com',
    usuarioUid: 'mio',
  });
  assert.equal(r.codigo, 'MIRA-001-abc');
  assert.ok(!('usuarioEmail' in r));
  assert.ok(!('usuarioUid' in r));
});

test('camposVisibles limita la búsqueda a 5 resultados', () => {
  const items = Array.from({ length: 20 }, (_, i) => ({ id: `r${i}`, nombre: `L${i}` }));
  const r = camposVisibles('searchRestaurants', { items });
  assert.equal(r.items.length, MAX_RESULTADOS_BUSQUEDA);
});

test('camposVisibles no crashea con null ni primitivos', () => {
  assert.deepEqual(camposVisibles('getRestaurant', null), {});
  assert.deepEqual(camposVisibles('getRestaurant', 'texto'), {});
  assert.deepEqual(camposVisibles('getRestaurant', undefined), {});
});

// ── normalizarRespuesta ─────────────────────────────────────────────────

test('normalizarRespuesta sanea una respuesta completa', () => {
  const r = normalizarRespuesta({
    reply: '  Casa Lucio, 4.5★  ',
    actions: [
      { tool: 'getRestaurant', ok: true, args: { id: 'r1' }, result: { nombre: 'Casa Lucio', uid: 'x' } },
      { tool: 'spinWheel', ok: false, args: {}, result: { secreto: 1 } },
    ],
    needsConfirm: {
      confirmId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
      summary: 'Casa Lucio · 2026-10-10 13:00 · 4 pax',
      payload: { tool: 'createReservation', args: { uid: 'ajeno' } },
    },
    provider: 'gemini',
    model: 'gemini-2.0-flash',
  });

  assert.equal(r.reply, 'Casa Lucio, 4.5★');
  assert.equal(r.actions.length, 2);
  assert.equal(r.actions[0].result.nombre, 'Casa Lucio');
  assert.ok(!('uid' in r.actions[0].result));
  assert.equal(r.actions[1].ok, false);
  assert.equal(r.actions[1].error, null);
  assert.equal(r.actions[1].result, null, 'un action fallido no arrastra result');
  assert.equal(r.needsConfirm.confirmId, '3f2504e0-4f89-41d3-9a0c-0305e82c3301');
  assert.equal(r.needsConfirm.summary, 'Casa Lucio · 2026-10-10 13:00 · 4 pax');
  assert.ok(!('payload' in r.needsConfirm), 'needsConfirm no expone payload al cliente');
  assert.equal(r.provider, 'gemini');
  assert.equal(r.model, 'gemini-2.0-flash');
});

test('normalizarRespuesta descarta needsConfirm con confirmId no-uuid', () => {
  const r = normalizarRespuesta({ reply: 'ok', needsConfirm: { confirmId: 'hack', summary: 'x' } });
  assert.equal(r.needsConfirm, null);
});

test('normalizarRespuesta tolera respuestas vacías o basura', () => {
  const vacio = { reply: '', actions: [], needsConfirm: null, provider: null, model: null };
  assert.deepEqual(normalizarRespuesta(null), vacio);
  assert.deepEqual(normalizarRespuesta(undefined), vacio);
  assert.deepEqual(normalizarRespuesta('texto'), vacio);
});

test('normalizarRespuesta filtra actions sin tool', () => {
  const r = normalizarRespuesta({ actions: [{ ok: true }, null, { tool: 'getBalance', ok: true, result: { saldoActual: 40 } }] });
  assert.equal(r.actions.length, 1);
  assert.equal(r.actions[0].result.saldoActual, 40);
});