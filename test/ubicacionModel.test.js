import test from 'node:test';
import assert from 'node:assert/strict';
import { leerConsentimiento, guardarConsentimiento, claveErrorUbicacion, posicionVisible, CLAVE_UBICACION, VERSION_CONSENTIMIENTO } from '../src/models/ubicacionModel.js';

function almacen(inicial = {}) {
  const m = new Map(Object.entries(inicial));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m };
}

test('sin decisión, con dato corrupto o con una versión antigua del texto: pendiente', () => {
  assert.equal(leerConsentimiento(almacen()).estado, 'pendiente');
  assert.equal(leerConsentimiento(almacen({ [CLAVE_UBICACION]: '{no json' })).estado, 'pendiente');
  assert.equal(leerConsentimiento(almacen({ [CLAVE_UBICACION]: JSON.stringify({ estado: 'aceptado', version: 0 }) })).estado, 'pendiente');
  assert.equal(leerConsentimiento(null).estado, 'pendiente');
});

test('guardar aceptado o rechazado y volver a leerlo; solo guarda estado, versión y fecha', () => {
  const s = almacen();
  guardarConsentimiento(s, 'aceptado', new Date('2026-10-15T10:00:00Z'));
  assert.deepEqual(leerConsentimiento(s), { estado: 'aceptado', fecha: '2026-10-15T10:00:00.000Z' });
  assert.deepEqual(Object.keys(JSON.parse(s.m.get(CLAVE_UBICACION))).sort(), ['estado', 'fecha', 'version']);
  assert.equal(JSON.parse(s.m.get(CLAVE_UBICACION)).version, VERSION_CONSENTIMIENTO);
  guardarConsentimiento(s, 'rechazado');
  assert.equal(leerConsentimiento(s).estado, 'rechazado');
  assert.throws(() => guardarConsentimiento(s, 'quizas'));
});

test('si el almacenamiento falla, guardar no rompe', () => {
  const roto = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('lleno'); } };
  assert.equal(guardarConsentimiento(roto, 'aceptado').estado, 'aceptado');
  assert.equal(leerConsentimiento(roto).estado, 'pendiente');
});

test('errores de geolocalización y posición visible', () => {
  assert.equal(claveErrorUbicacion(1), 'errorPermiso');
  assert.equal(claveErrorUbicacion(2), 'errorNoDisponible');
  assert.equal(claveErrorUbicacion(3), 'errorTiempo');
  assert.equal(claveErrorUbicacion(9), 'errorDesconocido');
  assert.deepEqual(posicionVisible({ latitude: 41.387412345, longitude: 2.168654321, accuracy: 12.6 }), { lat: 41.38741, lng: 2.16865, precisionM: 13 });
  assert.equal(posicionVisible({ latitude: NaN, longitude: 2 }), null);
});
