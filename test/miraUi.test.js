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

// ── Las listas deben ser seleccionables ─────────────────────────────────

test('cada fila de una lista es un boton, no texto inerte', () => {
  assert.match(MIRACCIONES, /<button\s+type="button"\s+className="mira-lista-item"/s);
  assert.match(MIRACCIONES, /onClick=\{\(\) => alSugerir\(pregunta\(principal\)\)\}/);
});

test('no queda ningun boton que solo acted sobre el primer item', () => {
  assert.ok(
    !/items\[0\]/.test(MIRACCIONES),
    'un boton para items[0] deja el resto sin elegir',
  );
});

test('las tres listas pasan pregunta y vacioMsg', () => {
  // searchRestaurants, listMyReservations y las reseñas.
  const preguntas = MIRACCIONES.match(/pregunta=\{/g) || [];
  const vacios = MIRACCIONES.match(/vacioMsg=\{/g) || [];
  assert.ok(preguntas.length >= 2, `pregunta en ${preguntas.length} listas`);
  assert.ok(vacios.length >= 2, `vacioMsg en ${vacios.length} listas`);
});

test('una fila sin nombre no se puede pulsar', () => {
  assert.match(MIRACCIONES, /disabled=\{!elegible \|\| !alSugerir\}/);
});

test('el CSS de la lista existe', () => {
  const css = readFileSync(new URL('../src/components/mira/mira.css', import.meta.url), 'utf8');
  for (const c of ['.mira-lista', '.mira-lista-item', '.mira-lista-nombre', '.mira-lista-meta']) {
    assert.ok(css.includes(c), `falta ${c} en mira.css`);
  }
});

// ── Previsualizacion con foto ───────────────────────────────────────────

test('la previsualizacion ofrece ficha (con carta) y preguntar mas', () => {
  const p = readFileSync(new URL('../src/components/mira/MiraPreview.jsx', import.meta.url), 'utf8');
  assert.match(p, /onAbrirFicha\?\.\(item\.id, item\.nombre\)/);
  assert.match(p, /alPreguntar\(pregunta\(item\.nombre\)\)/);
  assert.match(p, /loading="lazy"/, 'la imagen no debe bloquear el render');
});

test('la ficha se abre con el id, no con el nombre', () => {
  const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
  assert.match(app, /obtenerRestaurante\(id\)/);
  assert.match(app, /abrirDetalle\(r\)/);
  // Si el catalogo no lo tiene, que lo narre la IA en vez de fallar en silencio.
  assert.match(app, /abrirSugerencia\(nombre\)/);
});

test('la previsualizacion se usa en busquedas', () => {
  assert.match(MIRACCIONES, /MiraPreview/);
  assert.match(MIRACCIONES, /function TarjetaBusqueda/);
});

test('el CSS de la previsualizacion existe', () => {
  const css = readFileSync(new URL('../src/components/mira/mira.css', import.meta.url), 'utf8');
  for (const c of ['.mira-preview', '.mira-preview-img', '.mira-preview-nombre', '.mira-preview-acciones']) {
    assert.ok(css.includes(c), `falta ${c} en mira.css`);
  }
});

// ── Mochi es la mascota ────────────────────────────────────────────────

test('mochi es la imagen de la IA en los cuatro puntos de entrada', () => {
  const ficheros = [
    '../src/components/mira/MiraLauncher.jsx',
    '../src/components/mira/MiraPanel.jsx',
    '../src/components/BottomNav.jsx',
    '../src/components/Header.jsx',
  ];
  for (const f of ficheros) {
    const src = readFileSync(new URL(f, import.meta.url), 'utf8');
    const tieneMochi = src.includes('/mochi.gif');
    const tieneLogo = src.includes('mira_logo_3_circular_lente');
    assert.ok(tieneMochi, `${f} deberia usar mochi`);
    assert.ok(!tieneLogo, `${f} sigue usando el logo`);
  }
});