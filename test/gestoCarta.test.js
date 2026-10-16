import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esPaseDePagina } from '../src/services/gestoCarta.js';

test('un deslizamiento horizontal pasa página', () => {
  assert.equal(esPaseDePagina(80, 10), true);
  assert.equal(esPaseDePagina(-80, -5), true);
});

test('el scroll vertical con deriva lateral no pasa página (BUG-135)', () => {
  assert.equal(esPaseDePagina(-60, 300), false);
  assert.equal(esPaseDePagina(50, -120), false);
});

test('un toque corto no pasa página', () => {
  assert.equal(esPaseDePagina(20, 0), false);
});
