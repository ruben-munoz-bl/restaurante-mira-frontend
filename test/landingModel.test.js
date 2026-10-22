import test from 'node:test';
import assert from 'node:assert/strict';
import { topBarcelona, nuevosRestaurantes, primerPlatoLocal } from '../src/models/landingModel.js';

const r = (id, ciudad, valoracion, totalResenasYelp = 0, creado = null) => ({ id, ciudad, valoracion, totalResenasYelp, creado });

test('topBarcelona: solo Barcelona (mayúsculas y espacios incluidos) y con nota', () => {
  const lista = [
    r('si', '  BARCELONA ', 4.8, 10),
    r('otra', 'Madrid', 4.9, 10),
    r('sinNota', 'Barcelona', 0, 10),
    r('vecina', 'Barcelonès', 4.9, 10),
  ];
  assert.deepEqual(topBarcelona(lista).map((x) => x.id), ['si']);
});

test('topBarcelona ordena por nota ponderada: muchas reseñas mandan', () => {
  const lista = [r('pocas', 'Barcelona', 4.9, 1), r('muchas', 'Barcelona', 4.5, 500)];
  assert.deepEqual(topBarcelona(lista).map((x) => x.id), ['muchas', 'pocas']);
  // No muta la lista recibida.
  assert.deepEqual(lista.map((x) => x.id), ['pocas', 'muchas']);
});

test('topBarcelona respeta el límite', () => {
  const lista = [r('a', 'Barcelona', 4.4, 100), r('b', 'Barcelona', 4.6, 100)];
  assert.deepEqual(topBarcelona(lista, 1).map((x) => x.id), ['b']);
});

test('primerPlatoLocal: usa la carta simulada y aguanta restaurantes sin id', () => {
  const plato = primerPlatoLocal({ id: 'abc123', nombre: 'Pizzeria Roma', precio: '??' });
  assert.equal(typeof plato.nombre, 'string');
  assert.equal(typeof plato.precio, 'number');
  assert.equal(primerPlatoLocal({}), null);
});

test('nuevosRestaurantes: fechas válidas de más nuevo a más viejo, sin nulos', () => {
  const lista = [
    r('viejo', 'Madrid', 4, 1, '2026-01-10T00:00:00.000Z'),
    r('sinFecha', 'Madrid', 4, 1, null),
    r('roto', 'Madrid', 4, 1, 'no-es-fecha'),
    r('nuevo', 'Madrid', 4, 1, '2026-05-02T10:00:00.000Z'),
  ];
  assert.deepEqual(nuevosRestaurantes(lista).map((x) => x.id), ['nuevo', 'viejo']);
  assert.deepEqual(nuevosRestaurantes(lista, 1).map((x) => x.id), ['nuevo']);
});
