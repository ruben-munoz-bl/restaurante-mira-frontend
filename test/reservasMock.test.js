import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

let proceso, base;
test.before(async () => {
  proceso = spawn(process.execPath, ['scripts/mock-api.mjs'], {
    cwd: new URL('../', import.meta.url),
    env: { ...process.env, MOCK_PORT: '0', MOCK_RESTAURANTE_ID: '1', MOCK_RESERVAS_EJEMPLO: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  base = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('El mock no arrancó')), 10000);
    proceso.once('error', reject);
    proceso.once('exit', (code) => { clearTimeout(timeout); reject(new Error(`Mock terminó: ${code}`)); });
    proceso.stdout.on('data', (data) => {
      const url = /http:\/\/127\.0\.0\.1:\d+/.exec(String(data));
      if (url) { clearTimeout(timeout); resolve(url[0]); }
    });
  });
});
test.after(() => proceso?.kill());
async function api(path, method = 'GET', body, auth = true) {
  const res = await fetch(`${base}${path}`, { method,
    headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: 'Bearer mock' } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: res.status, body: await res.json() };
}
const scan = (id) => api('/v1/reservations/checkin', 'POST', { qr: `r1.${id}.mock` });
const hoy = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid' }).format(new Date());

test('mock M11: contrato exacto, 50/0 puntos, no duplica check-in y retira QR', async () => {
  const r = await scan('demo-pedido');
  assert.equal(r.status, 200);
  assert.deepEqual(Object.keys(r.body).sort(), ['cliente', 'puntosPedido', 'reserva']);
  assert.deepEqual(Object.keys(r.body.reserva).sort(), ['codigo', 'comensales', 'fecha', 'hora', 'id', 'pedido', 'presentadaEn']);
  assert.deepEqual(r.body.cliente, { nombre: 'Cliente de prueba' });
  assert.equal(r.body.reserva.pedido.total, 19);
  assert.ok(Date.parse(r.body.reserva.presentadaEn));
  assert.equal(r.body.puntosPedido, 50);
  assert.equal((await scan('demo-pedido')).body.error, 'QR_USADO');
  const sin = await scan('demo-sin-pedido');
  assert.equal(sin.body.puntosPedido, 0); assert.equal(sin.body.reserva.pedido, null);
  const lista = await api('/v1/reservations');
  assert.equal(lista.body.data.find((x) => x.id === 'demo-pedido').qr, null);
});

test('mock M11: todos los errores oficiales y sin sesión', async () => {
  assert.equal((await api('/v1/reservations/checkin', 'POST', { qr: 'r1.demo.mock' }, false)).status, 401);
  for (const qr of ['v1.demo.mock', 'r1.demo-pedido.falsa', null, 42, '']) {
    const r = await api('/v1/reservations/checkin', 'POST', { qr });
    assert.equal(r.status, 400); assert.equal(r.body.error, 'QR_INVALIDO');
  }
  for (const [id, status, error] of [
    ['no-existe', 404, 'NOT_FOUND'], ['demo-usada', 409, 'QR_USADO'],
    ['demo-cancelada', 409, 'RESERVA_CANCELADA'], ['demo-fuera-fecha', 409, 'FUERA_DE_FECHA'],
    ['demo-otro-restaurante', 403, 'OTRO_RESTAURANTE'],
  ]) { const r = await scan(id); assert.equal(r.status, status); assert.equal(r.body.error, error); }
});

test('mock M10: listado privado, rango inclusivo, orden y validación', async () => {
  const r = await api('/v1/reservations/restaurante?restauranteId=1');
  assert.equal(r.status, 200);
  assert.ok(r.body.data.length);
  for (const fila of r.body.data) {
    assert.equal(fila.fecha, hoy());
    assert.deepEqual(Object.keys(fila).sort(), ['cliente', 'codigo', 'comentarios', 'comensales', 'estado', 'fecha', 'hora', 'id', 'pedido', 'presentadaEn'].sort());
    assert.deepEqual(Object.keys(fila.cliente), ['nombre']);
  }
  const vieja = await api('/v1/reservations/restaurante?restauranteId=1&desde=2000-01-01');
  assert.deepEqual(vieja.body.data.map((x) => x.id), ['demo-fuera-fecha']);
  for (const q of ['', 'restauranteId=1&desde=2026-02-30', 'restauranteId=1&desde=2026-10-23&hasta=2026-10-22',
    'restauranteId=1&desde=2026-10-23&hasta=2026-11-24']) assert.equal((await api(`/v1/reservations/restaurante?${q}`)).status, 400);
  assert.equal((await api('/v1/reservations/restaurante?restauranteId=1&desde=2026-10-23&hasta=2026-11-23')).status, 200);
  assert.equal((await api('/v1/reservations/restaurante?restauranteId=2')).status, 403);
  assert.equal((await api('/v1/reservations/restaurante?restauranteId=ausente')).status, 404);
  assert.equal((await api('/v1/reservations/restaurante?restauranteId=1', 'GET', undefined, false)).status, 401);
});

test('mock: crear pedido → listar → escanear; cancelar y QR futuro/pasado', async () => {
  const nueva = await api('/v1/reservations', 'POST', {
    restauranteId: '1', fecha: hoy(), hora: '12:00', comensales: 3, usuarioNombre: 'Ana',
    usuarioEmail: 'privado@test.local', uid: 'privado', pedido: { lineas: [{ platoId: 'pl_bravas', cantidad: 2 }] },
  });
  assert.equal(nueva.status, 201);
  const lista = await api('/v1/reservations/restaurante?restauranteId=1');
  assert.equal(lista.body.data[0].id, nueva.body.id);
  assert.equal(/"(?:uid|email|usuarioEmail)":/.test(JSON.stringify(lista.body)), false);
  const llegada = await scan(nueva.body.id);
  assert.deepEqual(llegada.body.cliente, { nombre: 'Ana' });
  assert.equal(llegada.body.reserva.pedido.total, 12);
  const otra = await api('/v1/reservations', 'POST', { restauranteId: '1', fecha: hoy(), hora: '14:00', comensales: 2 });
  await api(`/v1/reservations/${otra.body.id}/cancel`, 'PUT');
  assert.equal((await scan(otra.body.id)).body.error, 'RESERVA_CANCELADA');
  for (const [fecha, qr] of [['2000-01-01', false], ['2099-01-01', true]]) {
    const r = await api('/v1/reservations', 'POST', { restauranteId: '1', fecha, hora: '14:00', comensales: 2 });
    assert.equal(Boolean(r.body.qr), qr);
    assert.equal((await scan(r.body.id)).body.error, 'FUERA_DE_FECHA');
  }
});
