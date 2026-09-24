export default function PromoBadge({ promoActiva }) {
  if (!promoActiva) return null;

  return (
    <div className="promo-badge">
      <span className="promo-badge__icon">⭐</span>
      <span className="promo-badge__text">Promocionado</span>
      {promoActiva.puntosExtraPorReserva > 0 && (
        <span className="promo-badge__pts">+{promoActiva.puntosExtraPorReserva} pts</span>
      )}
    </div>
  );
}
