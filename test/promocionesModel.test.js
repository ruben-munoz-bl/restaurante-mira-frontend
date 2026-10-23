import test from 'node:test';
import assert from 'node:assert/strict';
import {
  promocionVacia, validarPromocion, validarEdicion, paraGuardar, paraActualizar,
  estadoPromocion, bloqueaNueva, aMs, fechaCorta, fechaInput, hoyMadrid, sumarDias,
  erroresDeApi, claveErrorApi, claveErrorEdicion,
} from '../src/models/promocionesModel.js';

const buenos = () => ({
  tipo: 'boost_visibilidad',
  fechaInicio: '2026-10-23',
  fechaFin: '2026-11-22',
  presupuestoTotal: '300',
  cpc: '0.2',
  puntosExtraPorReserva: '0',
});

test('promocionVacia trae los defaults del backend y 30 días de vigencia', () => {
  const f = promocionVacia();
  assert.equal(f.tipo, 'boost_visibilidad');
  assert.equal(f.presupuestoTotal, '300');
  assert.equal(f.cpc, '0.2');
  assert.equal(f.puntosExtraPorReserva, '0');
  assert.match(f.fechaInicio, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(f.fechaFin, sumarDias(f.fechaInicio, 30));
});

test('validarPromocion acepta el formulario por defecto', () => {
  assert.equal(validarPromocion(promocionVacia()), null);
  assert.equal(validarPromocion(buenos()), null);
});

test('validarPromocion marca cada campo con su clave i18n', () => {
  assert.deepEqual(validarPromocion({ ...buenos(), tipo: ' ' }).tipo, ['errTipo']);
  assert.deepEqual(validarPromocion({ ...buenos(), fechaInicio: '23/10/2026' }).fechaInicio, ['errFechaInicio']);
  assert.deepEqual(validarPromocion({ ...buenos(), fechaFin: '' }).fechaFin, ['errFechaFin']);
  assert.deepEqual(validarPromocion({ ...buenos(), fechaFin: '2026-10-01' }).fechaFin, ['errFechaPosterior']);
  assert.deepEqual(validarPromocion({ ...buenos(), presupuestoTotal: '0' }).presupuestoTotal, ['errPresupuesto']);
  assert.deepEqual(validarPromocion({ ...buenos(), presupuestoTotal: '1000001' }).presupuestoTotal, ['errPresupuesto']);
  assert.deepEqual(validarPromocion({ ...buenos(), cpc: '0' }).cpc, ['errCpc']);
  assert.deepEqual(validarPromocion({ ...buenos(), cpc: '101' }).cpc, ['errCpc']);
  assert.deepEqual(validarPromocion({ ...buenos(), puntosExtraPorReserva: '1.5' }).puntosExtraPorReserva, ['errPuntos']);
  assert.deepEqual(validarPromocion({ ...buenos(), puntosExtraPorReserva: '-1' }).puntosExtraPorReserva, ['errPuntos']);
});

test('paraGuardar convierte números y añade restauranteId', () => {
  const p = paraGuardar({ ...buenos(), tipo: '  boost  ', presupuestoTotal: ' 99.5 ' }, 'r1');
  assert.equal(p.restauranteId, 'r1');
  assert.equal(p.tipo, 'boost');
  assert.equal(p.presupuestoTotal, 99.5);
  assert.equal(p.cpc, 0.2);
  assert.equal(p.puntosExtraPorReserva, 0);
  assert.equal('estado' in p, false);
});

test('validarEdicion solo mira fin y presupuesto', () => {
  assert.equal(validarEdicion({ fechaFin: '2026-11-22', presupuestoTotal: '300' }, '2026-10-23'), null);
  assert.deepEqual(validarEdicion({ fechaFin: '', presupuestoTotal: '300' }, '2026-10-23').fechaFin, ['errFechaFin']);
  assert.deepEqual(validarEdicion({ fechaFin: '2026-10-01', presupuestoTotal: '300' }, '2026-10-23').fechaFin, ['errFechaPosterior']);
  assert.deepEqual(validarEdicion({ fechaFin: '2026-11-22', presupuestoTotal: '0' }, '2026-10-23').presupuestoTotal, ['errPresupuesto']);
});

test('paraActualizar envía solo los campos editables', () => {
  assert.deepEqual(paraActualizar({ fechaFin: '2026-12-01', presupuestoTotal: ' 450.5 ', tipo: 'x' }), {
    fechaFin: '2026-12-01', presupuestoTotal: 450.5,
  });
});

test('claveErrorEdicion distingue la campaña que ya no existe', () => {
  assert.equal(claveErrorEdicion({ status: 404 }), 'errPromoNoExiste');
  assert.equal(claveErrorEdicion({ status: 403 }), 'errPermiso');
  assert.equal(claveErrorEdicion({}), 'errRed');
});
test('estadoPromocion distingue activa, programada, caducada y finalizada', () => {
  const ahora = Date.parse('2026-10-23T12:00:00Z');
  assert.equal(estadoPromocion({ estado: 'activa', fechaInicio: '2026-10-01', fechaFin: '2026-10-31' }, ahora), 'activa');
  assert.equal(estadoPromocion({ estado: 'activa', fechaInicio: '2026-11-01', fechaFin: '2026-11-30' }, ahora), 'programada');
  assert.equal(estadoPromocion({ estado: 'activa', fechaInicio: '2026-09-01', fechaFin: '2026-09-30' }, ahora), 'caducada');
  assert.equal(estadoPromocion({ estado: 'finalizada', fechaInicio: '2026-10-01', fechaFin: '2026-10-31' }, ahora), 'finalizada');
});

test('una campaña caducada sigue bloqueando porque el backend solo mira estado', () => {
  const caducada = { estado: 'activa', fechaInicio: '2026-09-01', fechaFin: '2026-09-30' };
  assert.equal(estadoPromocion(caducada, Date.parse('2026-10-23T12:00:00Z')), 'caducada');
  assert.equal(bloqueaNueva(caducada), true);
  assert.equal(bloqueaNueva({ ...caducada, estado: 'finalizada' }), false);
  assert.equal(bloqueaNueva(null), false);
});

test('fechas: ISO, segundos y Timestamp serializado se leen igual', () => {
  const iso = '2026-10-23T10:00:00.000Z';
  const ms = Date.parse(iso);
  assert.equal(aMs(iso), ms);
  assert.equal(aMs({ _seconds: ms / 1000, _nanoseconds: 0 }), ms);
  assert.equal(fechaInput(iso), '2026-10-23');
  assert.match(fechaCorta(iso, 'es-ES'), /2026/);
  assert.equal(aMs('no es fecha'), null);
  assert.equal(fechaInput(null), '');
});

test('hoyMadrid y sumarDias no se desvían con el huso horario', () => {
  assert.equal(hoyMadrid(new Date('2026-10-15T23:30:00Z')), '2026-10-16');
  assert.equal(sumarDias('2026-10-31', 1), '2026-11-01');
  assert.equal(sumarDias('2026-12-31', 1), '2027-01-01');
});

test('erroresDeApi y claveErrorApi traducen el error del backend', () => {
  assert.deepEqual(erroresDeApi({ data: { details: { presupuestoTotal: ['mala'] } } }), { presupuestoTotal: ['errPresupuesto'] });
  assert.deepEqual(erroresDeApi({ data: { details: { otro: ['x'] } } }), { otro: ['errValidacion'] });
  assert.equal(erroresDeApi({ data: {} }), null);
  assert.equal(claveErrorApi({ status: 409 }), 'errActivaExistente');
  assert.equal(claveErrorApi({ status: 403 }), 'errPermiso');
  assert.equal(claveErrorApi({ status: 404 }), 'errRestaurante');
  assert.equal(claveErrorApi({ status: 400 }), 'errValidacion');
  assert.equal(claveErrorApi({}), 'errRed');
});
