/**
 * Render del `reply` con soporte de **negrita** y _cursiva_.
 *
 * El agente escribe markdown ligero. No usamos dangerouslySetInnerHTML a
 * propósito: el `reply` es texto generado y el repo no lo usa en ningún
 * sitio. Aquí se trocea el string (miraTexto.js, puro y testeado) y se
 * monta con nodos React, que escapan el contenido.
 *
 * Sin `<br>`: la burbuja ya usa `white-space: pre-wrap`, así que los
 * saltos de línea del agente se respetan solos.
 */
import { partes } from '../../services/miraTexto.js';

export default function MiraTexto({ children }) {
  const trozos = partes(children);
  if (trozos.length === 0) return null;
  return (
    <>
      {trozos.map((p, i) => {
        if (p.negrita) return <strong key={i}>{p.texto}</strong>;
        if (p.cursiva) return <em key={i}>{p.texto}</em>;
        return <span key={i}>{p.texto}</span>;
      })}
    </>
  );
}