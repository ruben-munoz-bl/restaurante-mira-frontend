import test from 'node:test';
import assert from 'node:assert/strict';
import { opcionesCocina, COCINAS, familiaCocina, recomendarPara } from '../src/models/restaurantModel.js';
import { filterRestaurants } from '../src/services/filterService.js';

test('opcionesCocina no repite tipos entre español, Yelp y mayúsculas', () => {
  const op = opcionesCocina([...COCINAS, 'Japanese', 'Sushi Bars', 'japonesa', 'Italian', 'Pizza', 'Mexican', 'Spanish', 'Vegan', 'Vegetarian', 'Barbeque', 'Fusion']);
  assert.equal(new Set(op).size, op.length);
  assert.equal(op.filter((c) => c === 'Japonesa').length, 1);
  assert.ok(op.includes('Fusión') && op.includes('Vegana') && !op.includes('Vegan') && !op.includes('Barbeque'));
  assert.ok(!op.includes('Japanese') && !op.includes('Sushi Bars') && !op.includes('Italian'));
});

test('filtrar por cocina encuentra la familia aunque la categoría venga en inglés', () => {
  const lista = [
    { id: 1, cocina: 'Sushi Bars', categorias: ['Sushi Bars', 'Japanese'] },
    { id: 2, cocina: 'Italian', categorias: ['Italian'] },
  ];
  assert.deepEqual(filterRestaurants(lista, { cocina: 'Japonesa' }).map((r) => r.id), [1]);
});

test('filtrar por zona agrupa cada local en su provincia', () => {
  const lista = [
    { id: 1, zona: 'Tarragona, Spain' },
    { id: 2, zona: 'Salou, Spain', coords: { lat: 41.077, lng: 1.131 } },
    { id: 3, zona: 'Barcelona, Spain' },
  ];
  assert.deepEqual(filterRestaurants(lista, { zona: 'Tarragona, Spain' }).map((r) => r.id), [1, 2]);
});

test('«Barbacoa» cuenta como brasa en opciones, filtro y recomendaciones', () => {
  assert.equal(familiaCocina('Barbacoa'), 'brasa');
  assert.deepEqual(opcionesCocina(['Asador', 'Brasa', 'Barbacoa', 'Barbeque']), ['Brasa']);
  const lista = [{ id: 1, cocina: 'Barbacoa', categorias: ['Barbacoa'] }, { id: 2, cocina: 'Italian', categorias: ['Italian'] }];
  assert.deepEqual(filterRestaurants(lista, { cocina: 'Brasa' }).map((r) => r.id), [1]);
  const recs = recomendarPara([{ id: 9, cocina: 'Asador' }], lista);
  assert.deepEqual(recs.map((r) => r.restaurante.id), [1]);
});

test('el texto busca por nombre con o sin tilde', () => {
  const lista = [
    { id: 1, nombre: 'Can Pistraus', cocina: 'Catalana' },
    { id: 2, nombre: 'La Màgica', cocina: 'Italiana' },
  ];
  assert.deepEqual(filterRestaurants(lista, { q: 'magica' }).map((r) => r.id), [2]);
  assert.deepEqual(filterRestaurants(lista, { q: 'Màgica' }).map((r) => r.id), [2]);
});

test('el texto no busca por cocina, solo por nombre', () => {
  const lista = [
    { id: 1, nombre: 'Mira Blava', cocina: 'Italiana' },
    { id: 2, nombre: 'La Italiana', cocina: 'Italiana' },
  ];
  assert.deepEqual(filterRestaurants(lista, { q: 'Italiana' }).map((r) => r.id), [2]);
});

test('el texto acepta palabras parciales del nombre', () => {
  const lista = [
    { id: 1, nombre: 'Can Rovira del Mar', cocina: 'Marisco' },
    { id: 2, nombre: 'Can Riera', cocina: 'Catalana' },
  ];
  assert.deepEqual(filterRestaurants(lista, { q: 'can rov' }).map((r) => r.id), [1]);
  assert.deepEqual(filterRestaurants(lista, { q: 'del mar' }).map((r) => r.id), [1]);
});
