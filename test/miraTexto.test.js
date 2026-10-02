import test from 'node:test';
import assert from 'node:assert/strict';
import { partes } from '../src/services/miraTexto.js';

test('detecta **negrita** del agente', () => {
  const p = partes('**1800** (Lleida) — Cafetería');
  assert.deepEqual(p, [
    { negrita: true, texto: '1800' },
    { negrita: false, texto: ' (Lleida) — Cafetería' },
  ]);
});

test('varias negritas en el mismo texto', () => {
  const p = partes('- **A** uno\n- **B** dos');
  assert.equal(p.filter((x) => x.negrita).map((x) => x.texto).join('|'), 'A|B');
});

test('negrita al principio y al final', () => {
  assert.deepEqual(partes('**uno**'), [{ negrita: true, texto: 'uno' }]);
  assert.deepEqual(partes('**uno** dos'), [
    { negrita: true, texto: 'uno' },
    { negrita: false, texto: ' dos' },
  ]);
});

test('texto sin markdown devuelve un solo trozo', () => {
  assert.deepEqual(partes('hola'), [{ negrita: false, texto: 'hola' }]);
});

test('asteriscos sueltos no rompen nada', () => {
  assert.equal(partes('2 * 3 = 6').length, 1);
  assert.equal(partes('sin cerrar **aqui').length, 1);
});

test('reconstruir el texto conserva todo el contenido', () => {
  const original = '**1800** (Lleida) — Cafetería · **5★**';
  const reconstruido = partes(original).map((p) => p.texto).join('');
  assert.equal(reconstruido, original.replace(/\*\*/g, ''), 'no se pierde ni un caracter');
});

test('cursiva con guion bajo', () => {
  const p = partes('un _termo_ suelto');
  assert.equal(p.some((x) => x.cursiva), true);
  assert.equal(p.map((x) => x.texto).join(''), 'un termo suelto');
});

// Este es el que habria cazado el "_" colgante: una cursiva cerrada debe
// perder solo sus dos "_". Un "_" sin pareja es texto normal y se conserva.
test('ida y vuelta con cursiva quita solo los delimitadores de un par', () => {
  for (const original of [
    'un _termo_ suelto',
    'antes _a_ entre _b_ despues',
    '_inicio_ y _fin_',
  ]) {
    const limpio = partes(original).map((x) => x.texto).join('');
    assert.equal(limpio, original.replace(/_/g, ''), `falla con: ${original}`);
  }
});

test('un guion bajo sin pareja se conserva tal cual', () => {
  const original = 'sin pareja _ suelta';
  assert.equal(partes(original).map((x) => x.texto).join(''), original);
});

test('guiones bajos de un nombre no se interpretan como cursiva', () => {
  const original = 'restaurante_las_flores';
  assert.equal(partes(original).map((x) => x.texto).join(''), original);
  assert.equal(partes(original).some((x) => x.cursiva), false);
});

test('entrada vacia o nula no rompe', () => {
  assert.deepEqual(partes(''), []);
  assert.deepEqual(partes(null), []);
  assert.deepEqual(partes(undefined), []);
});

test('no hay injeccion posible: se parte en trozos, no se interpreta HTML', () => {
  // El texto se devuelve tal cual troceado; MiraTexto lo monta como nodos React.
  const p = partes('<img src=x onerror=alert(1)>');
  assert.equal(p.map((x) => x.texto).join(''), '<img src=x onerror=alert(1)>');
});