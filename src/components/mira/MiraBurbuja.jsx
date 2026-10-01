/**
 * View pura — burbuja de texto de MIRA.
 * Texto plano a propósito: el repo no usa dangerouslySetInnerHTML en
 * ningún sitio y el `reply` del agente es contenido no confiable.
 */
export default function MiraBurbuja({ rol, children }) {
  return (
    <div className={`mira-burbuja mira-burbuja--${rol === 'user' ? 'user' : 'model'}`}>
      {children}
    </div>
  );
}