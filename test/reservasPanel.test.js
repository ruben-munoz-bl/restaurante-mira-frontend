/**
 * Panel del restaurante (M10/M11): rango de fechas, agrupado de reservas,
 * marca de presentada y estados del check-in por QR de reserva.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { rangoPanel, agruparPorDia, marcarPresentada } from '../src/models/reservasPanelModel.js';
import { ESTADOS, esQrReserva, estadoCheckinDesdeError } from '../src/models/escanerModel.js';

test('rangoPanel: de hoy a hoy + 7, cruzando de mes', () => {
  assert.deepEqual(rangoPanel('2026-10-28'), { desde: '2026-10-28', hasta: '2026-11-04' });
});

test('agruparPorDia: ordena por fecha y hora y marca canceladas y presentadas', () => {
  const g = agruparPorDia([
    { id: 'b', fecha: '2026-10-24', hora: '21:00' },
    { id: 'a', fecha: '2026-10-23', hora: '22:00', estado: 'cancelada' },
    { id: 'c', fecha: '2026-10-23', hora: '13:30', presentadaEn: '2026-10-23T11:31:00Z', pedido: { lineas: [], total: 10 } },
  ]);
  assert.deepEqual(g.map((x) => [x.fecha, x.reservas.map((r) => r.id)]), [['2026-10-23', ['c', 'a']], ['2026-10-24', ['b']]]);
  assert.equal(g[0].reservas[0].presentada, true);
  assert.equal(g[0].reservas[1].cancelada, true);
  assert.deepEqual(agruparPorDia([{ id: 'b', fecha: '2026-10-24' }, { id: 'c', fecha: '2026-10-23', pedido: {} }], { soloPedido: true })[0].reservas.map((r) => r.id), ['c']);
});

test('marcarPresentada: solo cambia la reserva escaneada', () => {
  const l = marcarPresentada([{ id: 'a' }, { id: 'b' }], { id: 'b', presentadaEn: 'x' });
  assert.deepEqual(l, [{ id: 'a' }, { id: 'b', presentadaEn: 'x' }]);
});

test('check-in: QR de reserva y errores del contrato', () => {
  assert.equal(esQrReserva('r1.res1.firma'), true);
  assert.equal(esQrReserva('v1.vis1.1799.firma'), false);
  const e = (status, error) => ({ status, data: { error } });
  assert.equal(estadoCheckinDesdeError(e(409, 'QR_USADO')), ESTADOS.YA_USADO);
  assert.equal(estadoCheckinDesdeError(e(409, 'RESERVA_CANCELADA')), ESTADOS.CANCELADA);
  assert.equal(estadoCheckinDesdeError(e(409, 'FUERA_DE_FECHA')), ESTADOS.FUERA_DE_FECHA);
  assert.equal(estadoCheckinDesdeError(e(403, 'OTRO_RESTAURANTE')), ESTADOS.OTRO_RESTAURANTE);
  assert.equal(estadoCheckinDesdeError(e(400, 'QR_INVALIDO')), ESTADOS.INVALIDO);
  assert.equal(estadoCheckinDesdeError(new Error('red')), ESTADOS.ERROR_RED);
});
