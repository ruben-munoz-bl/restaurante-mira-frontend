/**
 * View pura — burbuja de texto de MIRA.
 * Texto plano a propósito: el repo no usa dangerouslySetInnerHTML en
 * ningún sitio y el `reply` es contenido no confiable. La negrita del
 * markdown se resuelve con MiraTexto, que monta nodos React.
 */
import MiraTexto from './MiraTexto.jsx';

export default function MiraBurbuja({ rol, children }) {
  return (
    <div className={`mira-burbuja mira-burbuja--${rol === 'user' ? 'user' : 'model'}`}>
      <MiraTexto>{children}</MiraTexto>
    </div>
  );
}