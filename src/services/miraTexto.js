/**
 * Particionado del `reply` en trozos con formato.
 *
 * Módulo PURO (sin JSX ni imports) para poder testearlo con `node --test`.
 * MiraTexto.jsx solo monta estos trozos como nodos React, que escapan el
 * texto: nunca dangerouslySetInnerHTML.
 *
 * El agente escribe markdown ligero: **negrita** y _cursiva_.
 */

const NEGRITA = /\*\*(.+?)\*\*/g;
const CURSIVA = /(^|[\s(])_(.+?)_(?=$|[\s.,;:!?)\]])/g;

/**
 * @returns {Array<{negrita?:boolean, cursiva?:boolean, texto:string}>}
 */
export function partes(texto) {
  const bruto = String(texto ?? '');
  if (!bruto) return [];

  const out = [];
  let ultimo = 0;
  NEGRITA.lastIndex = 0;
  let m;
  while ((m = NEGRITA.exec(bruto)) !== null) {
    if (m.index > ultimo) out.push({ negrita: false, texto: bruto.slice(ultimo, m.index) });
    out.push({ negrita: true, texto: m[1] });
    ultimo = m.index + m[0].length;
  }
  if (ultimo < bruto.length) out.push({ negrita: false, texto: bruto.slice(ultimo) });

  // La cursiva solo se aplica dentro de los trozos que no son negrita.
  return out.flatMap((p) => (p.negrita ? [p] : partirCursiva(p.texto)));
}

function partirCursiva(texto) {
  if (!texto.includes('_')) return [{ negrita: false, texto }];
  const out = [];
  CURSIVA.lastIndex = 0;
  let ultimo = 0;
  let m;
  while ((m = CURSIVA.exec(texto)) !== null) {
    const inicio = m.index + m[1].length;
    const fin = m.index + m[0].length;
    if (inicio > ultimo) out.push({ negrita: false, texto: texto.slice(ultimo, inicio) });
    out.push({ cursiva: true, texto: m[2] });
    // se salta el "_" de cierre: fin es el indice tras el underscore final
    ultimo = fin;
  }
  if (ultimo < texto.length) out.push({ negrita: false, texto: texto.slice(ultimo) });
  return out.length ? out : [{ negrita: false, texto }];
}