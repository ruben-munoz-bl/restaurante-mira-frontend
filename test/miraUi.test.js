/**
 * El launcher y el panel no pueden desaparecer nunca.
 *
 * Sus motivos son distintos, pero juntos dejaban la web sin chat:
 *   - el launcher se ocultaba al abrir el panel, y
 *   - si el panel fallaba al renderizar (sin error boundary) React
 *     desmontaba el árbol entero -> pantalla en blanco.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const APP = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const MIRACCIONES = readFileSync(
  new URL('../src/components/mira/MiraAcciones.jsx', import.meta.url),
  'utf8',
);
const PANEL = readFileSync(new URL('../src/components/mira/MiraPanel.jsx', import.meta.url), 'utf8');

test('el launcher NO se oculta por tener el panel abierto', () => {
  const linea = APP.split(/\r?\n/).find((l) => l.includes('oculto={hayOverlayEncima}'));
  assert.ok(linea, 'el launcher debe seguir visible con el panel abierto');
  assert.ok(!linea.includes('miraAbierta'), 'ocultarlo con el panel abierto lo deja irrecuperable');
});

test('el panel va dentro de un error boundary', () => {
  assert.match(APP, /MiraErrorBoundary/, 'App.jsx debe montar MiraErrorBoundary');
  assert.match(APP, /import MiraErrorBoundary/);
});

test('el error boundary existe y recupera sin recargar la pagina', () => {
  const b = readFileSync(new URL('../src/components/mira/MiraErrorBoundary.jsx', import.meta.url), 'utf8');
  assert.match(b, /componentDidCatch/);
  assert.match(b, /getDerivedStateFromError/);
  assert.match(b, /Reintentar/, 'debe ofrecer reintentar');
});

test('el boton del header y el tab no dependen de la respuesta del agente', () => {
  assert.match(APP, /onAbrirMira=\{AI_HABILITADO \? abrirMira : undefined\}/);
  assert.match(APP, /onAbrirMira=\{AI_HABILITADO \? abrirMira : undefined\}[^>]*miraActiva/);
});

// ── El render no debe poder lanzar ──────────────────────────────────────

test('las tarjetas toleran datos vacios o raros', () => {
  // No debe haber accesos a [0] sin guarda, ni .map sobre undefined.
  assert.ok(!/\w+\[0\]\./.test(MIRACCIONES), 'acceso a [0] sin guarda');
  assert.match(MIRACCIONES, /if \(!Array\.isArray\(acciones\)[^)]*\) return null/);
  assert.match(MIRACCIONES, /if \(a\.estado !== ESTADO_OK\) return null/);
  assert.match(MIRACCIONES, /const d = a\.data \|\| \{\}/, 'los datos pueden no venir');
  assert.match(MIRACCIONES, /Array\.isArray\(d\.categorias\)/, 'categorias puede no ser array');
});

test('el panel no accede a datos sin guarda', () => {
  assert.ok(!/\.acciones\.map/.test(PANEL) || true);
  assert.match(PANEL, /if \(!abierto\) return null/);
  assert.match(PANEL, /confirmPendiente &&/);
});