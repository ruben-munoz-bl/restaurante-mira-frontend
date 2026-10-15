import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Ejecuta el manejador real de Reservas.jsx con dobles de la API y del estado.
const fuente = fs.readFileSync(new URL('../src/components/Reservas.jsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const cuerpo = fuente.match(/async function handleSalirEspera\(e\) \{([\s\S]*?)\n {2}\}\n/)[1];
const handleSalirEspera = new Function('esperaApi', 'setEnEspera', 'setError', `return async (e) => {${cuerpo}}`);

function montar(salir) {
  let lista = [{ id: 'lista-1' }];
  let error = '';
  const fn = handleSalirEspera({ salir }, (f) => { lista = f(lista); }, (m) => { error = m; });
  return { fn, estado: () => ({ lista, error }) };
}

test('lista de espera: si el servidor falla, la fila se queda y se muestra el error', async () => {
  const m = montar(async () => { throw new Error('500'); });
  await m.fn({ id: 'lista-1' });
  assert.deepEqual(m.estado(), { lista: [{ id: 'lista-1' }], error: '500' });
});

test('lista de espera: si el servidor confirma, la fila desaparece', async () => {
  const m = montar(async () => {});
  await m.fn({ id: 'lista-1' });
  assert.deepEqual(m.estado(), { lista: [], error: '' });
});
