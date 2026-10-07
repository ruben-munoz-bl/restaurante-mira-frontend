/**
 * Informe de usuarios: filtros, agregados, CSV y simulación.
 * Todo puro: sin red ni BD.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generarUsuariosSimulados, filtrarUsuarios, agregados, csvUsuarios,
  enmascararEmail, ordenarUsuarios, PASOS_FLUJO, FILTROS_DEFECTO,
} from '../src/components/ops/informeUsuarios.js';

const HOY = new Date('2026-10-07T12:00:00Z');
const sim = generarUsuariosSimulados(100, 2026, HOY);

test('simula 100 usuarios deterministas con flujo ordenado', () => {
  assert.equal(sim.length, 100);
  assert.deepEqual(generarUsuariosSimulados(100, 2026, HOY), sim);
  assert.equal(new Set(sim.map((u) => u.uid)).size, 100);
  for (const u of sim) {
    assert.equal(u.eventos[0].paso, 'registro');
    const idx = u.eventos.map((e) => PASOS_FLUJO.findIndex((p) => p.id === e.paso));
    idx.forEach((v, i) => assert.equal(v, i));
    const fechas = u.eventos.map((e) => e.fecha);
    assert.deepEqual([...fechas].sort(), fechas);
    assert.ok(new Date(fechas.at(-1)) <= HOY);
  }
});

test('el embudo nunca crece y empieza en el total', () => {
  const { embudo, total } = agregados(sim);
  assert.equal(embudo[0].valor, total);
  for (let i = 1; i < embudo.length; i++) assert.ok(embudo[i].valor <= embudo[i - 1].valor);
});

test('filtros por plataforma, tipo y texto', () => {
  const android = filtrarUsuarios(sim, { ...FILTROS_DEFECTO, plataforma: 'android' });
  assert.ok(android.length > 0 && android.every((u) => u.plataforma === 'android'));
  const q = filtrarUsuarios(sim, { ...FILTROS_DEFECTO, q: sim[0].email });
  assert.equal(q[0].uid, sim[0].uid);
  const suma = agregados(sim).porPlataforma.reduce((s, p) => s + p.valor, 0);
  assert.equal(suma, 100);
});

test('orden numérico descendente', () => {
  const o = ordenarUsuarios(sim, 'saldoPuntos', false);
  for (let i = 1; i < o.length; i++) assert.ok(o[i].saldoPuntos <= o[i - 1].saldoPuntos);
});

test('CSV respeta columnas y enmascara emails', () => {
  const { cabeceras, filas } = csvUsuarios(sim.slice(0, 3), ['nombre', 'email'], { enmascarar: true });
  assert.deepEqual(cabeceras, ['Nombre', 'Email']);
  assert.match(filas[0][1], /^.\*\*\*@ejemplo\.test$/);
  assert.equal(enmascararEmail('ana@x.com'), 'a***@x.com');
});
