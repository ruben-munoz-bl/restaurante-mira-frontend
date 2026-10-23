import test from 'node:test';
import assert from 'node:assert/strict';
import { validarCarta, paraGuardar, aFormulario, mover, precioNum, platoVacio } from '../src/models/cartaModel.js';

const plato = (x = {}) => ({ ...platoVacio(), nombre: 'Pan', precio: '2,50', ...x });

test('carta válida no da errores', () => {
  assert.deepEqual(validarCarta([{ nombre: 'Entrantes', platos: [plato({ foto: 'https://x.es/a.jpg', alergenos: ['gluten'] })] }]), {});
});

test('límites: sin categorías, nombres, precio, foto, alérgenos', () => {
  assert.equal(validarCarta([]).carta, 'errSinCategorias');
  const e = validarCarta([{ nombre: ' ', platos: [
    plato({ nombre: 'x'.repeat(81), precio: '0', foto: 'http://x.es/a.jpg', alergenos: ['veneno'], descripcion: 'd'.repeat(301) }),
    plato({ precio: '1000' }), plato({ precio: '1.234' }),
  ] }]);
  assert.equal(e['c0.nombre'], 'errNombreCategoria');
  assert.equal(e['c0.p0.nombre'], 'errNombrePlato');
  assert.equal(e['c0.p0.precio'], 'errPrecio');
  assert.equal(e['c0.p0.foto'], 'errFoto');
  assert.equal(e['c0.p0.alergenos'], 'errAlergenos');
  assert.equal(e['c0.p0.descripcion'], 'errDescripcion');
  assert.equal(e['c0.p1.precio'], 'errPrecio');
  assert.equal(e['c0.p2.precio'], 'errPrecio');
});

test('máximos de categorías y platos', () => {
  assert.equal(validarCarta(Array.from({ length: 31 }, () => ({ nombre: 'a', platos: [] }))).carta, 'errMaxCategorias');
  assert.equal(validarCarta([{ nombre: 'a', platos: Array.from({ length: 61 }, () => plato()) }])['c0.platos'], 'errMaxPlatos');
  const cats = Array.from({ length: 6 }, () => ({ nombre: 'a', platos: Array.from({ length: 51 }, () => plato()) }));
  assert.equal(validarCarta(cats).carta, 'errMaxPlatosTotal');
});

test('paraGuardar: precio número, foto null, conserva ids válidos', () => {
  const [c] = paraGuardar([{ id: 'cat_1', nombre: ' Postres ', platos: [plato({ id: 'mal id!', foto: ' ' })] }]);
  assert.equal(c.id, 'cat_1');
  assert.equal(c.nombre, 'Postres');
  assert.equal(c.platos[0].precio, 2.5);
  assert.equal(c.platos[0].foto, null);
  assert.equal('id' in c.platos[0], false);
  assert.equal(aFormulario([{ nombre: 'a', platos: [{ nombre: 'b', precio: 3, foto: null }] }])[0].platos[0].precio, '3');
});

test('mover y precioNum', () => {
  assert.deepEqual(mover([1, 2, 3], 0, 1), [2, 1, 3]);
  assert.deepEqual(mover([1, 2], 0, -1), [1, 2]);
  assert.equal(precioNum('12,5'), 12.5);
  assert.ok(Number.isNaN(precioNum('abc')));
});
