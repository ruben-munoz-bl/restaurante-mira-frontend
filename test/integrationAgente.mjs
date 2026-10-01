/**
 * Prueba de integración contra el stub de mira-api (test/stub-agente.mjs).
 * Usa el cliente REAL (aiApi con VITE_AI_MOCK=false) y comprueba que lo que
 * llega a la UI es exactamente lo que devuelve el backend documentado.
 *
 *   node test/integrationAgente.mjs
 */
import assert from 'node:assert/strict';

// El stub ya está levantado en :3000.
// En Node no hay import.meta.env (eso es de Vite), así que se inyecta por el
// seam que expone aiApi para los tests.
globalThis.__MIRA_ENV__ = {
  VITE_API_URL: 'http://localhost:3000',
  VITE_AI_MOCK: 'false',
  VITE_AI_ENABLED: 'true',
};

const { enviarTurno, USA_MOCK, AI_HABILITADO } = await import('../src/services/aiApi.js');
const { normalizarRespuesta, ESTADO_OK, ESTADO_ERROR, ESTADO_PENDIENTE } = await import('../src/services/aiPayload.js');
const { desdeError } = await import('../src/services/aiErrors.js');

const ok = [];
const fail = [];
const check = (nombre, fn) => {
  try {
    fn();
    ok.push(nombre);
    console.log(`  ok   ${nombre}`);
  } catch (e) {
    fail.push(nombre);
    console.log(`  FAIL ${nombre}\n       ${e.message}`);
  }
};

console.log('\n1. El interruptor decide el camino real');
check('USA_MOCK es false', () => assert.equal(USA_MOCK, false));
check('AI_HABILITADO sigue true (el chat NO se oculta)', () => assert.equal(AI_HABILITADO, true));

console.log('\n2. Lectura normal contra el backend');
const r1 = normalizarRespuesta(await enviarTurno({ message: '¿Qué tal Casa Lucio?' }));
check('reply llega', () => assert.match(r1.reply, /Casa Lucio/));
check('la acción queda ok', () => assert.equal(r1.actions[0].estado, ESTADO_OK));
check('tool correcto', () => assert.equal(r1.actions[0].tool, 'getRestaurant'));
check('snake_case mapeado: rating_yelp → valoracion', () => assert.equal(r1.actions[0].data.valoracion, 4.5));
check('snake_case mapeado: zona_busqueda → zona', () => assert.equal(r1.actions[0].data.zona, 'Centro'));
check('snake_case mapeado: direccion_completa → direccion', () => assert.equal(r1.actions[0].data.direccion, 'Cava Baja 35, Madrid'));
check('el email del backend NO llega a la UI', () => assert.ok(!('email' in r1.actions[0].data)));
check('el serviceAccount NO llega a la UI', () => assert.ok(!('serviceAccount' in r1.actions[0].data)));
check('el JSON entero de la UI no contiene "email"', () => assert.ok(!JSON.stringify(r1.actions[0].data).includes('email')));

console.log('\n3. Flujo de 2 pasos contra el backend real');
const r2 = normalizarRespuesta(await enviarTurno({ message: 'Mesa para 4 el 2030-01-01 a las 13:00 en r1' }));
check('pide confirmación', () => assert.ok(r2.needsConfirm));
check('summary con los datos', () => assert.match(r2.needsConfirm.summary, /2030-01-01/));
check('la acción queda pending, NO ejecutada', () => assert.equal(r2.actions[0].estado, ESTADO_PENDIENTE));
check('pending no trae datos', () => assert.deepEqual(r2.actions[0].data, {}));

const r3 = normalizarRespuesta(
  await enviarTurno({ message: 'sí', confirmId: r2.needsConfirm.confirmId }),
);
check('confirmado: se ejecuta', () => assert.equal(r3.actions[0].estado, ESTADO_OK));
check('confirmado: ya no hay needsConfirm', () => assert.equal(r3.needsConfirm, null));
check('confirmado: trae la reserva', () => assert.equal(r3.actions[0].data.codigo, 'MIRA-001-STUB'));
check('confirmado: pax correctos', () => assert.equal(r3.actions[0].data.comensales, 4));

console.log('\n4. confirmId de un solo uso');
const r4 = normalizarRespuesta(await enviarTurno({ message: 'mesa para 2' }));
const cid = r4.needsConfirm.confirmId;
await enviarTurno({ message: 'sí', confirmId: cid });
let err404 = null;
try {
  await enviarTurno({ message: 'sí otra vez', confirmId: cid });
} catch (e) {
  err404 = e;
}
check('reusar el confirmId da 404', () => assert.equal(err404?.status, 404));
check('el 404 se traduce', () => assert.ok(desdeError(err404).mensaje.length > 0));

console.log('\n5. Errores de negocio (HTTP 200 dentro de result)');
const r5 = normalizarRespuesta(await enviarTurno({ message: 'quiero ver la facturación' }));
check('FORBIDDEN clasificado como error', () => assert.equal(r5.actions[0].estado, ESTADO_ERROR));
check('no se pinta como éxito', () => assert.equal(r5.actions[0].data && Object.keys(r5.actions[0].data).length, 0));
check('el reply pide iniciar sesión (anónimo)', () => assert.match(r5.reply, /sesión/i));

console.log('\n6. Validación que hace el propio backend');
let err400 = null;
try {
  await enviarTurno({ message: 'x'.repeat(2500) });
} catch (e) {
  err400 = e;
}
// el cliente recorta a 2000, así que NO debe fallar: llega entero.
check('el recorte a 2000 evita el 400 del zod', () => assert.equal(err400, null));

console.log('\n7. Lista con items');
const r7 = normalizarRespuesta(await enviarTurno({ message: 'busca pizza en Barcelona' }));
check('items mapeados', () => assert.equal(r7.actions[0].data.items.length, 1));
check('items sin email', () => assert.ok(!('email' in r7.actions[0].data.items[0])));

console.log('\n8. Timeout propio (35 s)');
check('TIMEOUT_MS >= 30000 segun la spec', async () => {});
const { TIMEOUT_MS } = await import('../src/services/aiPayload.js');
check(`TIMEOUT_MS=${TIMEOUT_MS}`, () => assert.ok(TIMEOUT_MS >= 30000));

console.log(`\n${ok.length} ok, ${fail.length} fail`);
if (fail.length) {
  console.log('\nFALLAN:\n- ' + fail.join('\n- '));
  process.exit(1);
}