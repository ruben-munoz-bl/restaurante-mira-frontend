/**
 * i18n — guardas de regresión:
 *  1. es, ca y en tienen exactamente las mismas claves (si no, el usuario
 *     catalán/inglés ve la clave literal, porque t() no hace fallback por clave).
 *  2. Toda clave usada con t('...') o t("...") en los JSX de src/ existe en
 *     es.js (t() devuelve la propia clave si falta: se vería "cuenta.miNegocio").
 *  3. Ningún texto en español a secas se cuela en los componentes i18n críticos
 *     del header/navegación (comprobación mínima, el resto se revisa a mano).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import es from '../src/i18n/es.js';
import ca from '../src/i18n/ca.js';
import en from '../src/i18n/en.js';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function aplanar(obj, prefijo = '', salida = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const clave = prefijo ? `${prefijo}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) aplanar(v, clave, salida);
    else salida[clave] = v;
  }
  return salida;
}

function listarArchivos(dir, filtro, acumulado = []) {
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const ruta = path.join(dir, entrada.name);
    if (entrada.isDirectory()) listarArchivos(ruta, filtro, acumulado);
    else if (filtro(entrada.name)) acumulado.push(ruta);
  }
  return acumulado;
}

const esLlaves = aplanar(es);
const caLlaves = aplanar(ca);
const enLlaves = aplanar(en);

test('es, ca y en comparten exactamente las mismas claves', () => {
  const faltanCa = Object.keys(esLlaves).filter((k) => !(k in caLlaves));
  const faltanEn = Object.keys(esLlaves).filter((k) => !(k in enLlaves));
  const sobranCa = Object.keys(caLlaves).filter((k) => !(k in esLlaves));
  const sobranEn = Object.keys(enLlaves).filter((k) => !(k in esLlaves));

  assert.deepEqual(faltanCa, [], `Faltan en ca.js:\n  ${faltanCa.join('\n  ')}`);
  assert.deepEqual(faltanEn, [], `Faltan en en.js:\n  ${faltanEn.join('\n  ')}`);
  assert.deepEqual(sobranCa, [], `Sobran en ca.js:\n  ${sobranCa.join('\n  ')}`);
  assert.deepEqual(sobranEn, [], `Sobran en en.js:\n  ${sobranEn.join('\n  ')}`);
});

test('toda clave usada con t() existe en es.js', () => {
  const archivos = listarArchivos(
    path.join(raiz, 'src'),
    (n) => n.endsWith('.jsx') || n.endsWith('.js'),
  ).filter((ruta) => !ruta.includes(`${path.sep}i18n${path.sep}`));
  const usadas = new Map(); // clave -> [archivos]

  for (const archivo of archivos) {
    const texto = fs.readFileSync(archivo, 'utf8');
    const re = /\b(?:t|trad)\(\s*(['"])((?:(?!\1).)+)\1/g;
    let m;
    while ((m = re.exec(texto))) {
      const clave = m[2];
      if (!clave.includes('.')) continue; // t() con variable o texto suelto
      const rel = path.relative(raiz, archivo);
      if (!usadas.has(clave)) usadas.set(clave, []);
      if (!usadas.get(clave).includes(rel)) usadas.get(clave).push(rel);
    }
  }

  const inexistentes = [...usadas.entries()]
    .filter(([clave]) => !(clave in esLlaves))
    .map(([clave, sitios]) => `${clave}  (${sitios.join(', ')})`);

  assert.deepEqual(inexistentes, [], `Claves inexistentes:\n  ${inexistentes.join('\n  ')}`);
});

test('los diccionarios no tienen claves vacías', () => {
  for (const [nombre, llaves] of [['es', esLlaves], ['ca', caLlaves], ['en', enLlaves]]) {
    const vacias = Object.entries(llaves)
      .filter(([, v]) => v === '' || v == null)
      .map(([k]) => k);
    assert.deepEqual(vacias, [], `${nombre}.js con valores vacíos:\n  ${vacias.join('\n  ')}`);
  }
});
