import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchRestaurants, fetchRestaurantePorId, invalidarCatalogo } from '../src/services/restaurantApi.js';

const DOCS = [
  { id: 'a', nombre: 'Uno', categorias: ['Tapas'], rating_yelp: 4.5 },
  { id: 'b', nombre: 'Dos', categorias: ['Sushi'], rating_yelp: 4.8 },
];

function simularApi({ falla = false } = {}) {
  const llamadas = [];
  globalThis.fetch = async (url) => {
    llamadas.push(String(url));
    await new Promise((r) => setTimeout(r, 5));
    if (falla) return new Response(JSON.stringify({ error: 8 }), { status: 500 });
    return new Response(JSON.stringify({ items: DOCS }), { status: 200 });
  };
  return llamadas;
}

test('el catálogo completo se descarga una sola vez y se reutiliza', async () => {
  invalidarCatalogo();
  const llamadas = simularApi();
  const a = await fetchRestaurants();
  const b = await fetchRestaurants();
  assert.equal(llamadas.length, 1);
  assert.equal(a.length, 2);
  assert.deepEqual(a, b);
  assert.notEqual(a, b, 'devuelve copias para que nadie mute la caché');
});

test('peticiones simultáneas comparten la misma descarga', async () => {
  invalidarCatalogo();
  const llamadas = simularApi();
  await Promise.all([fetchRestaurants(), fetchRestaurants(), fetchRestaurants()]);
  assert.equal(llamadas.length, 1);
});

test('forzar ignora la caché', async () => {
  invalidarCatalogo();
  const llamadas = simularApi();
  await fetchRestaurants();
  await fetchRestaurants({ forzar: true });
  assert.equal(llamadas.length, 2);
});

test('los errores no se cachean', async () => {
  invalidarCatalogo();
  simularApi({ falla: true });
  await assert.rejects(fetchRestaurants());
  const llamadas = simularApi();
  const items = await fetchRestaurants();
  assert.equal(items.length, 2);
  assert.equal(llamadas.length, 1);
});

test('la ficha por id usa el catálogo cacheado sin pedir nada', async () => {
  invalidarCatalogo();
  const llamadas = simularApi();
  await fetchRestaurants();
  const r = await fetchRestaurantePorId('b');
  assert.equal(r.nombre, 'Dos');
  assert.equal(llamadas.length, 1);
});
