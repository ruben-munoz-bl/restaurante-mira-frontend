/**
 * View pura — botón flotante para abrir el chat de MIRA.
 * Solo desktop (≥768px): en móvil el acceso es el tab de BottomNav.
 */
import { useT } from '../../i18n/index.jsx';
import es from '../../i18n/es.js';
import ca from '../../i18n/ca.js';
import en from '../../i18n/en.js';

const TRADS = { es, ca, en };

export default function MiraLauncher({ alAbrir, oculto, hayConfirmacion }) {
  const t = useT(TRADS);
  const etiqueta = t('mira.abrir');

  return (
    <button
      type="button"
      className={`mira-launcher${oculto ? ' mira-launcher--oculto' : ''}`}
      onClick={alAbrir}
      aria-label={etiqueta}
      aria-expanded="false"
      title={etiqueta}
    >
      <img src="/mochi.gif" alt="" className="mira-launcher-img" />
      {hayConfirmacion && <span className="mira-launcher-dot" aria-hidden="true" />}
    </button>
  );
}