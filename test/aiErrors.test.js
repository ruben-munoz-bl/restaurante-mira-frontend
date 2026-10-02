import test from 'node:test';
import assert from 'node:assert/strict';
import {
  desdeError,
  desdeResultado,
  desdeCodigo,
  CODIGOS_HTTP,
  CODIGOS_ACCION,
} from '../src/services/aiErrors.js';

// ── Errores HTTP ────────────────────────────────────────────────────────

test('cubre los 4 códigos HTTP del contrato', () => {
  assert.deepEqual([...CODIGOS_HTTP], ['VALIDATION_ERROR', 'NOT_FOUND', 'RATE_LIMITED', 'INTERNAL_ERROR']);
  for (const c of CODIGOS_HTTP) {
    const r = desdeError({ status: 500, data: { error: c } });
    assert.ok(r.mensaje.length > 0, `${c} sin mensaje`);
    assert.equal(r.codigo, c);
  }
});

test('cubre los 9 códigos de actions[].result', () => {
  assert.equal(CODIGOS_ACCION.length, 9);
  for (const c of CODIGOS_ACCION) {
    const r = desdeCodigo(c);
    assert.ok(r.mensaje.length > 0, `${c} sin mensaje`);
    assert.equal(r.codigo, c);
  }
});

test('MISSING_TOKEN dentro de result pide iniciar sesión', () => {
  const r = desdeResultado({ ok: false, error: 'MISSING_TOKEN' });
  assert.equal(r.loginRequerido, true);
  assert.match(r.mensaje, /sesión/i);
});

test('FORBIDDEN no es reintentable (explicar y parar)', () => {
  assert.equal(desdeCodigo('FORBIDDEN').reintentable, false);
});

test('un 401 HTTP pide iniciar sesión; el resto no', () => {
  assert.equal(desdeError({ status: 401 }).loginRequerido, true);
  for (const s of [400, 404, 429, 500]) {
    assert.equal(desdeError({ status: s }).loginRequerido, false, `status ${s}`);
  }
});

test('token inválido ya NO da 401: es el backend quien lo trata como anónimo', () => {
  // El backend responde 200, así que desdeError nunca ve INVALID_TOKEN.
  const r = desdeResultado({ ok: false, error: 'INVALID_TOKEN' });
  assert.equal(r.loginRequerido, false, 'solo MISSING_TOKEN invita a iniciar sesión');
  assert.equal(r.mensaje, 'Ahora no puedo consultarlo. Prueba en un momento.');
});

test('precedencia: el mensaje del servidor gana a la tabla', () => {
  const r = desdeResultado({ ok: false, error: 'CONFLICT', message: 'Ya tienes mesa ese día.' });
  assert.equal(r.mensaje, 'Ya tienes mesa ese día.');
});

test('precedencia en HTTP: data.message > tabla > genérico', () => {
  assert.equal(
    desdeError({ status: 400, data: { error: 'VALIDATION_ERROR', message: 'history admite 10 entradas.' } }).mensaje,
    'history admite 10 entradas.',
  );
  assert.equal(desdeError({ status: 429, data: { error: 'RATE_LIMITED' } }).mensaje, 'Voy muy rápido. Espera un momento y reintenta.');
  assert.match(desdeError({ status: 500 }).mensaje, /servicio/i);
});

test('SELF_INVITE e INSUFFICIENT tienen su propio texto', () => {
  assert.match(desdeCodigo('SELF_INVITE').mensaje, /ti mismo/i);
  assert.match(desdeCodigo('INSUFFICIENT').mensaje, /saldo/i);
});

test('sin status ni código tampoco hay crasheo', () => {
  const r = desdeError(new Error('boom'));
  assert.ok(r.mensaje.length > 0);
  assert.equal(r.status, null);
});

// ── Abort / timeout ─────────────────────────────────────────────────────

test('AbortError no es un error: la UI lo descarta', () => {
  const r = desdeError(Object.assign(new Error('abortado'), { name: 'AbortError' }));
  assert.equal(r.abortado, true);
  assert.equal(r.mensaje, '');
  assert.equal(r.reintentable, false);
});

test('TimeoutError es "tarda", no "roto", y sí se puede reintentar', () => {
  const r = desdeError(Object.assign(new Error('t'), { name: 'TimeoutError' }));
  assert.equal(r.codigo, 'TIMEOUT');
  assert.equal(r.reintentable, true);
  assert.equal(r.abortado, false);
  assert.match(r.mensaje, /tardando/i);
});

// ── Retry-After ─────────────────────────────────────────────────────────

test('lee retryAfter del 429 del backend', () => {
  assert.equal(desdeError({ status: 429, retryAfter: 12 }).retryAfter, 12);
  assert.equal(desdeError({ status: 429 }).retryAfter, null);
  assert.equal(desdeError({ status: 429, retryAfter: 0 }).retryAfter, null);
});

// ── Fallo de red: el más común al pasar a la API real ──────────────────

test('un fetch fallido dice que mira-api no está accesible', () => {
  // Es lo que lanza el navegador si el servidor está caído o hay CORS.
  const r = desdeError(new TypeError('Failed to fetch'));
  assert.equal(r.codigo, 'SIN_SERVIDOR');
  assert.match(r.mensaje, /mira-api/i);
  assert.match(r.mensaje, /VITE_API_URL/);
  assert.equal(r.reintentable, true);
  assert.equal(r.loginRequerido, false);
});

test('un fallo de red no se confunde con un 401 ni con un abort', () => {
  const red = desdeError(new TypeError('Failed to fetch'));
  assert.equal(red.loginRequerido, false);
  assert.equal(red.abortado, false);
  const abort = desdeError(Object.assign(new Error('x'), { name: 'AbortError' }));
  assert.equal(abort.abortado, true);
});

test('un error con status sigue mandando sobre el mensaje genérico de red', () => {
  const r = desdeError({ status: 500, data: { error: 'INTERNAL_ERROR', message: 'requestId abc' } });
  assert.equal(r.codigo, 'INTERNAL_ERROR');
  assert.match(r.mensaje, /requestId abc/, 'conserva el texto del servidor');
});

// ── 5xx: "Error interno" no le dice nada a un usuario ───────────────────

test('un 5xx añade que es un problema del servicio', () => {
  const r = desdeError({ status: 500, data: { error: 'INTERNAL_ERROR', message: 'Error interno' } });
  assert.match(r.mensaje, /servicio/i, 'debe explicar que es cosa del servicio');
  assert.match(r.mensaje, /momento/i, 'debe sugerir reintentar');
});

test('un 5xx sin mensaje del servidor también se explica', () => {
  const r = desdeError({ status: 503 });
  assert.match(r.mensaje, /servicio/i);
  assert.ok(r.mensaje.length > 0);
});

test('un 5xx sigue siendo reintentable', () => {
  assert.equal(desdeError({ status: 500 }).reintentable, true);
  assert.equal(desdeError({ status: 503 }).reintentable, true);
});

test('un 4xx no se disfraza de problema del servicio', () => {
  const r = desdeError({ status: 400, data: { error: 'VALIDATION_ERROR', message: 'message muy largo' } });
  assert.equal(r.mensaje, 'message muy largo', 'un 400 es culpa del cliente, no del servicio');
});