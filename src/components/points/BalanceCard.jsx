import usePointsStore from '../../stores/usePointsStore.js';

// El balance lo carga el padre (PuntosDashboard/Cuenta) cuando hay sesión.
export default function BalanceCard() {
  const { saldoActual, rachaLogin, rachaReservas, balanceLoading } = usePointsStore();

  if (balanceLoading) {
    return (
      <div className="balance-card balance-card--loading">
        <div className="balance-skeleton" />
      </div>
    );
  }

  return (
    <div className="balance-card">
      <div className="balance-card__header">
        <h3>Mis Puntos MIRA</h3>
        <img src="/moneda-mira.png" alt="MIRA Points" className="balance-card__coin" />
      </div>
      <div className="balance-card__saldo">
        <span className="balance-card__amount">{saldoActual}</span>
        <span className="balance-card__label">puntos disponibles</span>
      </div>
      <div className="balance-card__details">
        <div className="balance-card__detail">
          <span className="detail-label">Racha login</span>
          <span className="detail-value">{rachaLogin.dias || 0} días</span>
        </div>
        {rachaReservas.semanasConsecutivas > 0 && (
          <div className="balance-card__detail">
            <span className="detail-label">Multiplicador</span>
            <span className="detail-value detail-value--highlight">x{rachaReservas.multiplicador}</span>
          </div>
        )}
      </div>
      <div className="balance-card__footer">
        <span className="balance-card__rate">100 pts = 1,00 €</span>
      </div>
    </div>
  );
}
