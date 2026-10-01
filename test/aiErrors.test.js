import test from 'node:test';
import assert from 'node:assert/strict';
import { desdeError, desdeCodigo, CODIGOS } from '../src/services/aiErrors.js';

test('mapea los 9 códigos del contrato a un mensaje en español', () => {
  assert.equal(CODIGOS.length, 9);
  for (const codigo of CODIGOS) {
    const r = desdeCodigo(codigo);
    assert.ok(r.mensaje.length > 0, `${codigo} sin mensaje`);
    assert.equal(r.codigo, codigo);
    assert.ok(!r.abortado);
  }
});

test('401 y MISSING_TOKEN marcan loginRequerido', () => {
  assert.equal(desdeError({ status: 401 }).loginRequerido, true);
  assert.equal(desdeError({ data: { error: 'MISSING_TOKEN' } }).loginRequerido, true);
  assert.equal(desdeError({ data: { error: 'INVALID_TOKEN' } }).loginRequerido, true);
});

test('403 NO es reintentable (guardrail: explicar y parar)', () => {
  assert.equal(desdeCodigo('FORBIDDEN').reintentable, false);
  assert.equal(desdeError({ status: 403 }).reintentable, false);
});

test('el resto de errores sí son reintentables', () => {
  for (const status of [400, 404, 409, 429, 500, 503]) {
    assert.equal(desdeError({ status }).reintentable, true, `status ${status}`);
  }
});

test('precedencia: el mensaje del servidor gana a la tabla local', () => {
  const r = desdeError({
    status: 400,
    data: { error: 'VALIDATION_ERROR', message: 'Hora 13:15 no está en los SLOTS.' },
  });
  assert.equal(r.mensaje, 'Hora 13:15 no está en los SLOTS.');
  assert.equal(r.codigo, 'VALIDATION_ERROR');
});

test('precedencia: la tabla local gana al genérico por status', () => {
  const r = desdeError({ status: 429, data: { error: 'RATE_LIMITED' } });
  assert.equal(r.mensaje, 'Voy muy rápido. Prueba en unos segundos.');
});

test('cae al genérico por status cuando no hay código', () => {
  assert.equal(desdeError({ status: 400 }).mensaje, 'No pude entender el mensaje. Prueba a reformularlo.');
  assert.equal(desdeError({ status: 503 }).mensaje, 'Ahora no puedo consultarlo. Prueba en un momento.');
});

test('sin status ni código tampoco hay crasheo', () => {
  const r = desdeError(new Error('boom'));
  assert.ok(r.mensaje.length > 0);
  assert.equal(r.status, null);
  assert.equal(r.codigo, null);
});

test('AbortError no es un error: mensaje vacío y no reintentable', () => {
  const r = desdeError(Object.assign(new Error('aborted'), { name: 'AbortError' }));
  assert.equal(r.abortado, true);
  assert.equal(r.mensaje, '');
  assert.equal(r.reintentable, false);
  assert.equal(r.loginRequerido, false);
});

test('lee retryAfter del 429', () => {
  assert.equal(desdeError({ status: 429, retryAfter: 7 }).retryAfter, 7);
  assert.equal(desdeError({ status: 429 }).retryAfter, null);
  assert.equal(desdeError({ status: 429, retryAfter: 0 }).retryAfter, null);
});