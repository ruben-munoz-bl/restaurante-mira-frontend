/**
 * Test de contrato: comprueba el formato EXACTO de la petición que sale
 * hacia POST /v1/ai/agent, y cómo se digiere la respuesta.
 *
 * Intercepta fetch global, así que no necesita backend ni red.
 * Esto es lo que hay que revisar si el backend cambia el contrato.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

/** Captura la última petición y devuelve la respuesta que se le inyecta. */
function capturaFetch(respuesta = {}) {
  const llamadas = [];
  globalThis.fetch = async (url, opts) => {
    llamadas.push({ url, ...opts });
    return {
      ok: true,
      status: 200,
      headers: { get: () => null },
      text: async () => JSON.stringify(respuesta),
    };
  };
  return llamadas;
}

function capturaError(status, body, headers = {}) {
  const llamadas = [];
  globalThis.fetch = async (url, opts) => {
    llamadas.push({ url, ...opts });
    return {
      ok: false,
      status,
      headers: { get: (k) => headers[k] ?? null },
      text: async () => JSON.stringify(body),
    };
  };
  return llamadas;
}

// aiApi decide mock vs real leyendo import.meta.env; en Node no hay env,
// asi que forzamos el camino real inyectando el flag.
const { apiFetch } = await import('../src/services/httpClient.js');
const { AI_HABILITADO, USA_MOCK } = await import('../src/services/aiApi.js');
const { construirBody, normalizarRespuesta } = await import('../src/services/aiPayload.js');
const { desdeError } = await import('../src/services/aiErrors.js');

const RUTA_AI = '/v1/ai/agent';

// ── Flags (congelan la decision "activo por defecto") ───────────────────

test('el chat viene activado por defecto (sin tocar variables de entorno)', () => {
  assert.equal(AI_HABILITADO, true, 'en Vercel no hay .env: debe funcionar igual');
  assert.equal(USA_MOCK, true, 'sin backend hay que responder con aiMock');
});

// ── Petición ────────────────────────────────────────────────────────────

test('la ruta y el metodo son los del contrato', async () => {
  const llamadas = capturaFetch({ reply: 'hola', actions: [] });
  await apiFetch(RUTA_AI, {
    method: 'POST',
    auth: 'opcional',
    body: construirBody({ message: 'hola' }),
    headers: { 'Idempotency-Key': 'clave-1' },
  });
  assert.equal(llamadas[0].method, 'POST');
  assert.ok(llamadas[0].url.endsWith(RUTA_AI), `url inesperada: ${llamadas[0].url}`);
});

test('sin sesion se llama igual, SIN cabecera Authorization', async () => {
  const llamadas = capturaFetch({ reply: 'hola' });
  await apiFetch(RUTA_AI, { method: 'POST', auth: 'opcional', body: { message: 'hola' } });
  assert.equal(llamadas[0].headers.Authorization, undefined);
});

test('auth:true sin sesion sigue lanzando 401 sintetico (no cambia el resto de la app)', async () => {
  await assert.rejects(
    () => apiFetch('/v1/points/balance', { auth: true }),
    (err) => err.status === 401 && err.noSession === true,
  );
});

test('auth:false no manda Authorization', async () => {
  const llamadas = capturaFetch({ reply: 'hola' });
  await apiFetch('/v1/restaurants?limit=27', { auth: false });
  assert.equal(llamadas[0].headers.Authorization, undefined);
});

test('el cuerpo sale tal cual lo espera el zod del backend', async () => {
  const llamadas = capturaFetch({ reply: 'ok' });
  const confirmId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
  const body = construirBody({
    message: 'Mesa para 4',
    history: [
      { role: 'user', content: 'hola' },
      { role: 'model', content: '¿qué buscas?' },
    ],
    confirmId,
  });
  await apiFetch(RUTA_AI, { method: 'POST', auth: 'opcional', body, headers: { 'Idempotency-Key': confirmId } });

  const enviado = JSON.parse(llamadas[0].body);
  assert.deepEqual(Object.keys(enviado).sort(), ['confirmId', 'history', 'message']);
  assert.equal(enviado.message, 'Mesa para 4');
  assert.equal(enviado.confirmId, confirmId);
  assert.deepEqual(enviado.history, [
    { role: 'user', content: 'hola' },
    { role: 'model', content: '¿qué buscas?' },
  ]);
  assert.equal(llamadas[0].headers['Idempotency-Key'], confirmId);
  assert.equal(llamadas[0].headers['Content-Type'], 'application/json');
});

test('signal se propaga a fetch (boton Parar)', async () => {
  const llamadas = capturaFetch({ reply: 'ok' });
  const ctl = new AbortController();
  await apiFetch(RUTA_AI, { method: 'POST', auth: 'opcional', body: {}, signal: ctl.signal });
  assert.equal(llamadas[0].signal, ctl.signal);
});

// ── Errores del backend ─────────────────────────────────────────────────

test('el 429 del backend llega con retryAfter', async () => {
  capturaError(429, { error: 'RATE_LIMITED', message: 'Vas muy rápido.' }, { 'Retry-After': '12' });
  try {
    await apiFetch(RUTA_AI, { method: 'POST', auth: 'opcional', body: {} });
    assert.fail('debería lanzar');
  } catch (err) {
    assert.equal(err.status, 429);
    assert.equal(err.retryAfter, 12);
    const info = desdeError(err);
    assert.equal(info.retryAfter, 12);
    assert.equal(info.mensaje, 'Vas muy rápido.');
  }
});

test('un 403 del backend NO ofrece reintento', async () => {
  capturaError(403, { error: 'FORBIDDEN', message: 'Ese panel es para empresas.' });
  try {
    await apiFetch(RUTA_AI, { method: 'POST', auth: 'opcional', body: {} });
    assert.fail('debería lanzar');
  } catch (err) {
    const info = desdeError(err);
    assert.equal(info.reintentable, false);
    assert.equal(info.loginRequerido, false);
  }
});

test('un 401 del backend pide iniciar sesion', async () => {
  capturaError(401, { error: 'MISSING_TOKEN' });
  try {
    await apiFetch(RUTA_AI, { method: 'POST', auth: 'opcional', body: {} });
    assert.fail('debería lanzar');
  } catch (err) {
    assert.equal(desdeError(err).loginRequerido, true);
  }
});

// ── Respuesta del backend ───────────────────────────────────────────────

test('la respuesta real del backend se normaliza bien', async () => {
  capturaFetch({
    reply: 'Casa Lucio, 4.5★ (120 reseñas). Según la API.',
    actions: [
      { tool: 'getRestaurant', ok: true, args: { id: 'r1' }, result: { nombre: 'Casa Lucio', valoracion: 4.5, uid: 'secreto' } },
    ],
    needsConfirm: null,
    provider: 'gemini',
    model: 'gemini-2.0-flash',
  });
  const crudo = await apiFetch(RUTA_AI, { method: 'POST', auth: 'opcional', body: {} });
  const r = normalizarRespuesta(crudo);
  assert.equal(r.reply, 'Casa Lucio, 4.5★ (120 reseñas). Según la API.');
  assert.equal(r.actions[0].result.nombre, 'Casa Lucio');
  assert.ok(!('uid' in r.actions[0].result), 'el uid no debe llegar a la UI');
  assert.equal(r.model, 'gemini-2.0-flash');
});

test('si el backend devuelve 200 sin reply, la UI no se rompe', async () => {
  capturaFetch({});
  const r = normalizarRespuesta(await apiFetch(RUTA_AI, { method: 'POST', auth: 'opcional', body: {} }));
  assert.equal(r.reply, '');
  assert.deepEqual(r.actions, []);
  assert.equal(r.needsConfirm, null);
});