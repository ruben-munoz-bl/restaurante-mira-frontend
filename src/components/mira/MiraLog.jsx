/**
 * View pura — log de la conversación.
 * Lista semántica + región aria-live (patrón App.jsx:411).
 */
import MiraBurbuja from './MiraBurbuja.jsx';
import MiraAcciones from './MiraAcciones.jsx';

export default function MiraLog({ mensajes, escribiendo, alSugerir }) {
  const finRef = (nodo) => {
    if (nodo && escribiendo) nodo.scrollIntoView({ block: 'end' });
  };

  return (
    <div className="mira-log" role="log" aria-live="polite" aria-busy={escribiendo}>
      {mensajes.map((m) => (
        <div key={m.id} style={{ display: 'contents' }}>
          {m.content ? <MiraBurbuja rol={m.role}>{m.content}</MiraBurbuja> : null}
          {m.acciones ? <MiraAcciones acciones={m.acciones} alSugerir={alSugerir} /> : null}
        </div>
      ))}

      {escribiendo && (
        <div className="mira-burbuja mira-burbuja--model mira-escribiendo" ref={finRef}>
          <span />
          <span />
          <span />
          <span className="sr-only">MIRA está escribiendo</span>
        </div>
      )}
    </div>
  );
}