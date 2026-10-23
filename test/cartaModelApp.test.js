/**
 * La app usa una copia de src/models/cartaModel.js (M09): misma validación que la web.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sinCabecera = (ruta) => readFileSync(new URL(ruta, import.meta.url), 'utf8').split('\n').slice(3).join('\n');

test('cartaModel de la app es igual al de la web (salvo la cabecera)', () => {
  assert.equal(sinCabecera('../mobile/src/models/cartaModel.js'), sinCabecera('../src/models/cartaModel.js'));
});
