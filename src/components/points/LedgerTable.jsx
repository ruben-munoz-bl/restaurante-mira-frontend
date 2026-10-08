import { useEffect, useState } from 'react';
import usePointsStore from '../../stores/usePointsStore.js';
import { useT } from '../../i18n/index.jsx';
import es from '../../i18n/es.js';
import ca from '../../i18n/ca.js';
import en from '../../i18n/en.js';

const TRADS = { es, ca, en };

const TIPO_LABELS = {
  reserva: 'points.types.reserva',
  login_diario: 'points.types.login_diario',
  racha_reserva_bonus: 'points.types.racha_reserva_bonus',
  resena: 'points.types.resena',
  promo_view: 'points.types.promo_view',
  promo_click: 'points.types.promo_click',
  invitacion: 'points.types.invitacion',
  canje_descuento: 'points.types.canje_descuento',
  ajuste_admin: 'points.types.ajuste_admin',
  ajuste_admin_negativo: 'points.types.ajuste_admin',
  wheel: 'points.types.ruleta_dia7',
};

const TIPO_COLORS = {
  reserva: '#2e7d32',
  login_diario: '#1565c0',
  racha_reserva_bonus: '#e65100',
  resena: '#6a1b9a',
  promo_view: '#00838f',
  promo_click: '#00838f',
  invitacion: '#f57f17',
  canje_descuento: '#c62828',
  ajuste_admin: '#616161',
  ajuste_admin_negativo: '#616161',
  wheel: '#ff6f00',
};

function puntosDe(mov) {
  // La API guarda el importe en `puntos` (no `cantidad`).
  if (typeof mov.puntos === 'number') return mov.puntos;
  if (typeof mov.cantidad === 'number') return mov.cantidad;
  return 0;
}

export default function LedgerTable({ limit = 10, showFilters = false, usuario }) {
  const t = useT(TRADS);
  const { ledger, fetchLedger, ledgerLoading } = usePointsStore();
  const [filtro, setFiltro] = useState('');

  useEffect(() => {
    // Solo con sesión: `usuario === null` (deslogueado) u `undefined` sin sesión no debe llamar a la API.
    if (usuario) fetchLedger({ tipo: filtro || undefined, limit });
    else if (usuario === undefined) fetchLedger({ tipo: filtro || undefined, limit });
  }, [usuario, filtro, limit]);

  if (ledgerLoading) {
    return <div className="ledger-loading">{t('points.loading')}</div>;
  }

  return (
    <div className="ledger-table">
      {showFilters && (
        <div className="ledger-filters">
          <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="">{t('points.all')}</option>
            <option value="reserva">{t('points.reservas')}</option>
            <option value="login_diario">{t('points.dailyLogin')}</option>
            <option value="resena">{t('points.reviews')}</option>
            <option value="invitacion">{t('points.invitations')}</option>
            <option value="promo_view">{t('points.promoViews')}</option>
            <option value="promo_click">{t('points.promoClicks')}</option>
            <option value="canje_descuento">{t('points.redeems')}</option>
            <option value="ajuste_admin">{t('points.adminAdjustments')}</option>
          </select>
        </div>
      )}
      <table className="ledger-table__table">
        <thead>
          <tr>
            <th>{t('points.colConcepto')}</th>
            <th>{t('points.colPuntos')}</th>
            <th>{t('points.colFecha')}</th>
          </tr>
        </thead>
        <tbody>
          {ledger.map((mov) => {
            const pts = puntosDe(mov);
            return (
              <tr key={mov.id}>
                <td>
                  <span
                    className="ledger-badge"
                    style={{ backgroundColor: TIPO_COLORS[mov.tipo] || '#666' }}
                  >
                    {TIPO_LABELS[mov.tipo] ? t(TIPO_LABELS[mov.tipo]) : mov.tipo}
                  </span>
                  {mov.descripcion ? (
                    <div className="ledger-desc">{mov.descripcion}</div>
                  ) : null}
                </td>
                <td className={`ledger-puntos ${pts >= 0 ? 'positivo' : 'negativo'}`}>
                  {pts >= 0 ? '+' : ''}{pts}
                </td>
                <td>
                  {new Date(
                    mov.createdAt?.seconds
                      ? mov.createdAt.seconds * 1000
                      : mov.createdAt,
                  ).toLocaleDateString(t('modelos.locale'))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {ledger.length === 0 && (
        <div className="ledger-empty">{t('points.noMovements')}</div>
      )}
    </div>
  );
}
