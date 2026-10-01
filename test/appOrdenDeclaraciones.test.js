/**
 * Guard de orden de declaraciones en App.jsx.
 *
 * `vite build` NO detecta un uso antes de declarar (TDZ): solo falla al
 * ejecutar en el navegador con
 *   "Cannot access 'x' before initialization".
 * Este test congela el orden de los identificadores que introduce el
 * agente MIRA, que es donde ya nos ha pasado una vez.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const FUENTE = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const LINEAS = FUENTE.split(/\r?\n/);

/** Línea (1-based) en la que `nombre` queda disponible para usarse. */
function lineaDeDeclaracion(nombre) {
  const reSencillo = new RegExp(`^\\s*const\\s+${nombre}\\b`);
  const reArray = new RegExp(`^\\s*const\\s*\\[\\s*${nombre}\\b`);
  // Entrada de un destructuring multilinea: "  seleccionado,"
  const reDestructuring = new RegExp(`^\\s{2,}${nombre},?\\s*$`);

  for (let i = 0; i < LINEAS.length; i += 1) {
    const l = LINEAS[i];
    if (reSencillo.test(l) || reArray.test(l) || reDestructuring.test(l)) return i + 1;
  }
  return null;
}

/** Primera línea (1-based) donde `nombre` se menciona como valor usado. */
function primeraUso(nombre, desde = 0) {
  const re = new RegExp(`(?<![.\\w'"])${nombre}\\b`);
  for (let i = desde; i < LINEAS.length; i += 1) {
    const l = LINEAS[i];
    // Ignora su propia declaración y las menciones dentro de comentarios.
    if (/^\s*\/\//.test(l)) continue;
    if (new RegExp(`^\\s*const\\s+\\[?\\s*${nombre}\\b`).test(l)) continue;
    if (new RegExp(`^\\s*const\\s*\\[[^\\]]*\\b${nombre}\\b`).test(l)) continue;
    if (new RegExp(`^\\s*${nombre}\\s*[,=]`).test(l)) continue;
    if (re.test(l)) return i + 1;
  }
  return null;
}

const CASOS = [
  ['sheetVisible', 'el estado de la hoja de reserva'],
  ['seleccionado', 'el restaurante abierto en detalle'],
  ['libro', 'el libro de carta abierto'],
  ['showStreakPopup', 'el popup de racha'],
  ['showWheel', 'el modal de la ruleta'],
  ['miraAbierta', 'el estado del chat de MIRA'],
  ['abrirMira', 'la accion de abrir el chat'],
  ['hayOverlayEncima', 'el booleano que oculta el launcher'],
];

for (const [nombre, descripcion] of CASOS) {
  test(`${nombre} (${descripcion}) se declara antes de usarse`, () => {
    const decl = lineaDeDeclaracion(nombre);
    assert.ok(decl, `no encuentro la declaración de ${nombre} en App.jsx`);

    const uso = primeraUso(nombre);
    if (uso === null) return; // no se usa: nada que comprobar

    assert.ok(
      decl < uso,
      `${nombre} se declara en la línea ${decl} pero se usa en la ${uso}: TDZ en App.jsx`,
    );
  });
}

test('el launcher se monta despues de declarar hayOverlayEncima', () => {
  const decl = lineaDeDeclaracion('hayOverlayEncima');
  const uso = LINEAS.findIndex((l) => l.includes('oculto={hayOverlayEncima')) + 1;
  assert.ok(decl, 'hayOverlayEncima no esta declarado');
  assert.ok(uso > 0, 'el launcher no pasa hayOverlayEncima');
  assert.ok(decl < uso, `hayOverlayEncima (${decl}) se usa en el JSX antes (${uso})`);
});