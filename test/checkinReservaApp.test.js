import test from 'node:test';
import assert from 'node:assert/strict';
import { esQrReserva, validarQrLlegada, mensajeErrorReserva } from '../mobile/src/models/checkinReservaModel.js';

test('app M11: r1 usa check-in con su contrato completo y v1 conserva visitas', async () => {
  const llamadas = [];
  const respuesta = { reserva: { id: 'r', codigo: 'MIRA-r', fecha: '2026-10-23', hora: '13:00', comensales: 2,
    presentadaEn: '2026-10-23T11:00:00Z', pedido: { lineas: [{ platoId: 'p', nombre: 'Pan', cantidad: 2, precio: 2, subtotal: 4 }], total: 4, moneda: 'EUR' } },
  cliente: { nombre: 'Ana' }, puntosPedido: 50 };
  const api = { post: async (...args) => { llamadas.push(args); return respuesta; } };
  assert.equal(esQrReserva('r1.reserva.firma'), true);
  assert.equal(esQrReserva('v1.visita.firma'), false);
  assert.equal(await validarQrLlegada(api, 'r1.reserva.firma'), respuesta);
  await validarQrLlegada(api, 'v1.visita.firma');
  assert.deepEqual(llamadas, [
    ['/v1/reservations/checkin', { qr: 'r1.reserva.firma' }],
    ['/v1/visitas/validar', { qr: 'v1.visita.firma' }],
  ]);
});

test('app M11: distingue todos los errores oficiales, incluidos los tres 409', () => {
  const codigos = ['QR_INVALIDO', 'OTRO_RESTAURANTE', 'NOT_FOUND', 'QR_USADO', 'RESERVA_CANCELADA', 'FUERA_DE_FECHA'];
  const mensajes = codigos.map((error) => mensajeErrorReserva({ status: 409, data: { error } }));
  assert.equal(new Set(mensajes).size, codigos.length);
  assert.match(mensajes[3], /ya se ha presentado/);
  assert.match(mensajes[4], /cancelada/);
  assert.match(mensajes[5], /día de la reserva/);
  assert.match(mensajeErrorReserva({ status: 401 }), /iniciar sesión/);
  assert.match(mensajeErrorReserva(new Error('offline')), /Reintenta/);
  assert.match(mensajeErrorReserva({ status: 503, data: { error: 'RESERVAS_QR_NO_CONFIGURADO' } }), /responsable/);
});
