/**
 * View pura — log de la conversación.
 * Lista semántica + región aria-live (patrón App.jsx:411).
 */
import MiraBurbuja from './MiraBurbuja.jsx';
import MiraAcciones from './MiraAcciones.jsx';
import { useT } from '../../i18n/index.jsx';
import es from '../../i18n/es.js';
import ca from '../../i18n/ca.js';
import en from '../../i18n/en.js';

const TRADS = { es, ca, en };

export default function MiraLog({ mensajes, escribiendo, alSugerir, onAbrirFicha }) {
  const t = useT(TRADS);
  const finRef = (nodo) => {
    if (nodo && escribiendo) nodo.scrollIntoView({ block: 'end' });
  };

  return (
    <div className="mira-log" role="log" aria-live="polite" aria-busy={escribiendo}>
      {mensajes.map((m) => (
        <div key={m.id} style={{ display: 'contents' }}>
          {m.content ? <MiraBurbuja rol={m.role}>{m.content}</MiraBurbuja> : null}
          {m.acciones ? (
            <MiraAcciones
              acciones={m.acciones}
              alSugerir={alSugerir}
              onAbrirFicha={onAbrirFicha}
            />
          ) : null}
        </div>
      ))}

      {escribiendo && (
        <div className="mira-burbuja mira-burbuja--model mira-escribiendo" ref={finRef}>
          <span />
          <span />
          <span />
          <span className="sr-only">{t('mira.escribiendo')}</span>
        </div>
      )}
    </div>
  );
}