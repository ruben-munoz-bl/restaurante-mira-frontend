import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { create } from 'zustand';

// Carga el store real de MIRA con dobles de sus dependencias (misma técnica que docs/bugs/reproducciones/usuario.mjs).
function cargarStore(enviarTurno) {
  const fuente = fs.readFileSync(new URL('../src/stores/useMiraStore.js', import.meta.url), 'utf8')
    .replace(/\r\n/g, '\n')
    .replace(/import[\s\S]*?from ['"][^'"]+['"];\n/g, '')
    .replace('export const useMiraStore', 'const useMiraStore')
    .replace('export default useMiraStore;', 'return useMiraStore;');
  const deps = {
    create, enviarTurno,
    buildHistory: (x) => x, nuevaIdempotencyKey: () => 'k', normalizarRespuesta: (x) => x, MAX_MENSAJE: 4000,
    desdeError: (e) => ({ abortado: e?.name === 'AbortError', mensaje: String(e?.message) }),
    usePointsStore: { getState: () => ({ fetchBalance: async () => {} }) }, track: () => {},
  };
  return new Function(...Object.keys(deps), fuente)(...Object.values(deps));
}

test('Nuevo chat: aborta el turno en curso y su respuesta no aparece en la conversación nueva', async () => {
  let resolver;
  let senal;
  const store = cargarStore(({ signal }) => { senal = signal; return new Promise((r) => { resolver = r; }); });
  const peticion = store.getState().enviar('Busca restaurante');
  store.getState().limpiar();
  assert.equal(senal.aborted, true, 'la petición anterior se aborta');
  resolver({ reply: 'Respuesta del chat anterior', actions: [], needsConfirm: null });
  await peticion;
  assert.deepEqual(store.getState().mensajes.map((m) => m.id), ['m-saludo']);
  assert.equal(store.getState().enviando, false);
});

test('Nuevo chat: un error tardío del turno anterior tampoco se pinta', async () => {
  let rechazar;
  const store = cargarStore(() => new Promise((_, r) => { rechazar = r; }));
  const peticion = store.getState().enviar('hola');
  store.getState().limpiar();
  rechazar(new Error('500'));
  await peticion;
  assert.equal(store.getState().error, null);
});

test('sin Nuevo chat, la respuesta llega normal', async () => {
  const store = cargarStore(async () => ({ reply: 'ok', actions: [], needsConfirm: null }));
  await store.getState().enviar('hola');
  assert.equal(store.getState().mensajes.at(-1).content, 'ok');
});
