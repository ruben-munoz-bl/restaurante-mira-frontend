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
  assert.equal(desdeError({ status: 500 }).mensaje, 'Ahora no puedo consultarlo. Prueba en un momento.');
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