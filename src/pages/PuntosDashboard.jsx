import { useEffect } from 'react';
import BalanceCard from '../components/points/BalanceCard';
import StreakBadge from '../components/points/StreakBadge';
import LedgerTable from '../components/points/LedgerTable';
import InvitePanel from '../components/points/InvitePanel';
import DiscountPanel from '../components/points/DiscountPanel';
import usePointsStore from '../stores/usePointsStore';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';

const TRADS = { es, ca, en };

export default function PuntosDashboard({ fetchStreakData, onOpenStreak, usuario }) {
  const t = useT(TRADS);
  const { saldoActual, rachaLogin, rachaReservas, fetchBalance } = usePointsStore();

  useEffect(() => {
    if (usuario) fetchBalance();
  }, [usuario]);

  return (
    <div className="puntos-page">
      <div className="puntos-page__header">
        <h1>{t('points.title') || 'Mis Puntos MIRA'}</h1>
        <p>{t('points.subtitle') || 'Acumula puntos con cada acción y canjéalos por descuentos'}</p>
      </div>

      <div className="puntos-page__grid">
        <div className="puntos-page__main">
          <BalanceCard />
          <StreakBadge
            rachaLogin={rachaLogin}
            rachaReservas={rachaReservas}
            onOpenStreak={onOpenStreak}
            fetchStreakData={fetchStreakData}
          />
          <LedgerTable limit={5} usuario={usuario} />
        </div>
        <div className="puntos-page__sidebar">
          <DiscountPanel usuario={usuario} />
          <InvitePanel />
        </div>
      </div>
    </div>
  );
}
