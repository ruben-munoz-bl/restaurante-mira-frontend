import test from 'node:test';
import assert from 'node:assert/strict';
import { iniciarSeguimiento } from '../mobile/src/services/seguimientoUbicacion.js';

/** expo-location falso con cada espera controlable desde el test. */
function locationFalso() {
  const pend = {};
  const espera = (k) => new Promise((ok) => { pend[k] = ok; });
  const L = {
    Accuracy: { High: 4 },
    watches: 0, removes: 0, callbackPos: null,
    requestForegroundPermissionsAsync: () => espera('permiso'),
    hasServicesEnabledAsync: () => espera('servicios'),
    watchPositionAsync: (_o, cb) => { L.watches++; L.callbackPos = cb; return espera('sub'); },
  };
  return { L, pend, sub: () => ({ remove: () => { L.removes++; } }) };
}
const tic = () => new Promise((r) => setImmediate(r));

function arrancar(L) {
  const estado = { activa: true, posiciones: [], errores: [] };
  const parar = iniciarSeguimiento(L, {
    sigueActiva: () => estado.activa,
    onPosicion: (c) => estado.posiciones.push(c),
    onError: (e) => estado.errores.push(e),
  });
  return { estado, desactivar: () => { estado.activa = false; parar(); } };
}

test('flujo normal: permiso, servicios, suscripción y posiciones; al parar se elimina', async () => {
  const { L, pend, sub } = locationFalso();
  const { estado, desactivar } = arrancar(L);
  pend.permiso({ status: 'granted' }); await tic();
  pend.servicios(true); await tic();
  pend.sub(sub()); await tic();
  L.callbackPos({ coords: { latitude: 1, longitude: 2 } });
  assert.equal(estado.posiciones.length, 1);
  desactivar();
  assert.equal(L.removes, 1);
});

test('desactivar mientras se pide el permiso: no arranca ningún seguimiento', async () => {
  const { L, pend } = locationFalso();
  const { desactivar } = arrancar(L);
  desactivar();
  pend.permiso({ status: 'granted' }); await tic();
  assert.equal(L.watches, 0);
});

test('desactivar mientras se comprueban los servicios: no arranca (P2 de Codex)', async () => {
  const { L, pend } = locationFalso();
  const { estado, desactivar } = arrancar(L);
  pend.permiso({ status: 'granted' }); await tic();
  desactivar();
  pend.servicios(true); await tic();
  assert.equal(L.watches, 0);
  assert.deepEqual(estado.errores, []);
});

test('desactivar mientras se crea la suscripción: se elimina al llegar y los avisos tardíos se ignoran', async () => {
  const { L, pend, sub } = locationFalso();
  const { estado, desactivar } = arrancar(L);
  pend.permiso({ status: 'granted' }); await tic();
  pend.servicios(true); await tic();
  desactivar();
  L.callbackPos({ coords: { latitude: 40.4, longitude: -3.7 } }); // llega antes que la suscripción
  pend.sub(sub()); await tic();
  assert.equal(L.removes, 1);
  assert.deepEqual(estado.posiciones, [], 'no vuelve a guardar posición tras desactivar');
});

test('permiso denegado o servicios apagados: error y sin seguimiento', async () => {
  const a = locationFalso(); const ra = arrancar(a.L);
  a.pend.permiso({ status: 'denied' }); await tic();
  assert.deepEqual(ra.estado.errores, ['errorPermiso']);
  const b = locationFalso(); const rb = arrancar(b.L);
  b.pend.permiso({ status: 'granted' }); await tic(); b.pend.servicios(false); await tic();
  assert.deepEqual(rb.estado.errores, ['errorNoDisponible']);
  assert.equal(a.L.watches + b.L.watches, 0);
});
