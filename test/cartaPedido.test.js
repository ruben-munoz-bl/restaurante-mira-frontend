import test from 'node:test';
import assert from 'node:assert/strict';
import { pedidoDesde, totalPedido } from '../src/services/cartaApi.js';

const carta = { categorias: [{ id: 'c1', nombre: 'Entrantes', platos: [
  { id: 'p1', nombre: 'Croquetas', precio: 6.5 },
  { id: 'p2', nombre: 'Bravas', precio: 4.95 },
] }] };

test('pedidoDesde: quita cantidades a 0 y devuelve null si queda vacío', () => {
  assert.deepEqual(pedidoDesde({ p1: 2, p2: 0 }), { lineas: [{ platoId: 'p1', cantidad: 2 }] });
  assert.equal(pedidoDesde({ p1: 0 }), null);
  assert.equal(pedidoDesde(null), null);
});

test('totalPedido: suma con 2 decimales e ignora platos sin cantidad', () => {
  assert.equal(totalPedido(carta, { p1: 2, p2: 3 }), 27.85);
  assert.equal(totalPedido(carta, {}), 0);
  assert.equal(totalPedido(null, { p1: 1 }), 0);
});
