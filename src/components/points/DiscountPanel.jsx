import { useState } from 'react';
import usePointsStore from '../../stores/usePointsStore.js';
import { useT } from '../../i18n/index.jsx';
import es from '../../i18n/es.js';
import ca from '../../i18n/ca.js';
import en from '../../i18n/en.js';

const TRADS = { es, ca, en };
const OPTIONS = [5, 10, 20];

export default function DiscountPanel({ usuario }) {
  const t = useT(TRADS);
  const { saldoActual, descuentoPendiente, claimDiscount, balanceLoading } = usePointsStore();
  const [loadingEuros, setLoadingEuros] = useState(null);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(null);

  if (!usuario) return null;

  async function handleClaim(euros) {
    setError('');
    setOk(null);
    setLoadingEuros(euros);
    try {
      const result = await claimDiscount(euros);
      setOk(result.descuentoPendiente || { euros });
    } catch (err) {
      setError(err?.data?.message || err?.message || t('points.discountError') || 'Error al reclamar');
    } finally {
      setLoadingEuros(null);
    }
  }

  return (
    <div className="discount-panel">
      <h3>{t('points.discountTitle') || 'Reclamar descuento'}</h3>
      <p className="discount-panel__info">
        {t('points.discountInfo') || 'Canjea puntos por un descuento que se aplicará a tu próxima reserva'}
      </p>

      {descuentoPendiente ? (
        <div className="discount-panel__pending">
          <strong>
            {descuentoPendiente.euros} € {t('points.discountPending') || 'pendientes'}
          </strong>
          <span>{t('points.discountPendingHint') || 'Se aplicará en tu próxima reserva'}</span>
        </div>
      ) : (
        <div className="discount-panel__options">
          {OPTIONS.map((euros) => {
            const pts = euros * 100;
            const insufficient = !balanceLoading && saldoActual < pts;
            const busy = loadingEuros !== null;
            return (
              <button
                key={euros}
                type="button"
                className="discount-option"
                disabled={busy || insufficient}
                onClick={() => handleClaim(euros)}
              >
                <span className="discount-option__euros">{euros} €</span>
                <span className="discount-option__pts">{pts} pts</span>
              </button>
            );
          })}
        </div>
      )}

      {error && <p className="discount-panel__error">{error}</p>}
      {ok && (
        <p className="discount-panel__success">
          {t('points.discountClaimed') || 'Descuento reclamado. Se aplicará a tu próxima reserva.'}
        </p>
      )}
    </div>
  );
}
