/**
 * Platos que apetecen: cada nombre de plato con foto generada apunta a un
 * archivo que existe en public/platos.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { slugPlato, fotoRecortada } from '../src/services/landingApi.js';

test('slugPlato quita tildes, ñ y ç', () => {
  assert.equal(slugPlato('Lasaña'), 'lasana');
  assert.equal(slugPlato('Calçots'), 'calcots');
  assert.equal(slugPlato('Pulpo a la gallega'), 'pulpo-a-la-gallega');
});

test('las fotos recortadas existen y los platos sin foto devuelven null', () => {
  for (const n of ['Paella', 'Tortilla', 'Jamón ibérico', 'Café de especialidad', 'Entrana']) {
    const ruta = fotoRecortada(n);
    assert.ok(ruta && existsSync(new URL(`../public${ruta}`, import.meta.url)), n);
  }
  assert.equal(fotoRecortada('Biryani'), null);
});
