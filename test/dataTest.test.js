import test from 'node:test';
import assert from 'node:assert/strict';
import { crearReserva } from '../src/services/reservaApi.js';
import { slotDe, listaDias, esPasada, importeTicket, GASTO_POR_PAX, isoLocal } from '../src/controllers/dataTestPlan.js';

const RESTAURANTE = { id: 'r1', nombre: 'Ari\'s Restaurant', precio: '€€' };
const USUARIO = { uid: 'u1', email: 'ana.garcia1234@demo-mira.es', displayName: 'Ana García' };

function haceDias(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoLocal(d);
}

function simularApi() {
  const cuerpos = [];
  globalThis.fetch = async (url, opts = {}) => {
    if (String(url).includes('/v1/reservations')) {
      cuerpos.push(JSON.parse(opts.body || '{}'));
      return new Response(JSON.stringify({ id: 'res1', codigo: 'MIRA-TEST' }), { status: 201 });
    }
    return new Response('{}', { status: 200 });
  };
  return cuerpos;
}

/* ───────── Fechas pasadas ───────── */

test('el data test puede reservar en una fecha pasada (permitirPasado)', async () => {
  const cuerpos = simularApi();
  const fecha = haceDias(30);
  const r = await crearReserva({
    restaurante: RESTAURANTE, usuario: USUARIO, fecha, hora: '21:00', comensales: 2,
    token: 'tok-test', permitirPasado: true,
  });
  assert.equal(r.codigo, 'MIRA-TEST');
  assert.equal(cuerpos.at(-1).fecha, fecha, 'la fecha pasada llega tal cual a la API');
});

test('el flujo normal sigue rechazando fechas pasadas', async () => {
  simularApi();
  await assert.rejects(
    crearReserva({ restaurante: RESTAURANTE, usuario: USUARIO, fecha: haceDias(1), hora: '21:00', comensales: 2 }),
    /hoy o futura/,
  );
});

test('un rango en el pasado genera solo fechas de ese rango', () => {
  const desde = haceDias(60);
  const hasta = haceDias(10);
  const dias = listaDias(desde, hasta);
  assert.equal(dias.length, 51);
  for (let i = 1; i <= 40; i += 1) {
    const { fecha } = slotDe(i, { desde, hasta });
    assert.ok(fecha >= desde && fecha <= hasta, `${fecha} fuera del rango`);
    assert.ok(esPasada(fecha));
  }
});

test('un día concreto pasado se respeta', () => {
  const dia = haceDias(90);
  assert.equal(slotDe(3, dia).fecha, dia);
  assert.ok(esPasada(dia));
  assert.ok(!esPasada(isoLocal(new Date())), 'hoy no cuenta como pasado');
});

/* ───────── Importes lógicos ───────── */

test('el importe del ticket cae en el rango del tramo de precio por comensal', () => {
  for (const [precio, [min, max]] of Object.entries(GASTO_POR_PAX)) {
    for (let pax = 1; pax <= 6; pax += 1) {
      for (let k = 0; k < 50; k += 1) {
        const total = importeTicket({ precio }, pax, '13:00');
        assert.ok(total >= min * pax - 0.05 && total <= max * pax + 0.05, `${precio} ${pax}pax → ${total}`);
      }
    }
  }
});

test('el importe es aleatorio, crece con los comensales y la cena sale más cara', () => {
  const r = { precio: '€€' };
  const valores = new Set(Array.from({ length: 20 }, () => importeTicket(r, 2)));
  assert.ok(valores.size > 1, 'no debe repetir siempre el mismo importe');
  const fijo = () => 0.5;
  assert.ok(importeTicket(r, 4, '14:00', fijo) > importeTicket(r, 2, '14:00', fijo));
  assert.ok(importeTicket(r, 2, '21:00', fijo) > importeTicket(r, 2, '14:00', fijo));
  assert.ok(importeTicket({ precio: '€€€' }, 2, '14:00', fijo) > importeTicket({ precio: '€' }, 2, '14:00', fijo));
});

test('sin tramo conocido se usa el de €€ y se redondea a 0,10 €', () => {
  const total = importeTicket({}, 3, '14:00', () => 0.37);
  assert.equal(total, importeTicket({ precio: '€€' }, 3, '14:00', () => 0.37));
  assert.equal(Math.round(total * 10) / 10, total);
});
