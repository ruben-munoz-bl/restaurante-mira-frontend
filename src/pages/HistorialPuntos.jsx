import LedgerTable from '../components/points/LedgerTable';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';

const TRADS = { es, ca, en };

export default function HistorialPuntos({ usuario }) {
  const t = useT(TRADS);

  return (
    <div className="puntos-page">
      <div className="puntos-page__header">
        <h1>{t('points.history') || 'Historial de puntos'}</h1>
      </div>
      <LedgerTable limit={50} showFilters usuario={usuario} />
    </div>
  );
}
