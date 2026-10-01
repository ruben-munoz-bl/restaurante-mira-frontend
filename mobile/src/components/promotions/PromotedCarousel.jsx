import { useEffect, useState } from 'react';
import { promotionsApi } from '../../services/api.js';
import PromoBadge from './PromoBadge';

export default function PromotedCarousel() {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    promotionsApi.list({ estado: 'activa' })
      .then((res) => setPromos(res.data || []))
      .catch(() => setPromos([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading || promos.length === 0) return null;

  return (
    <div className="promoted-carousel">
      <h3 className="promoted-carousel__title">Restaurantes destacados</h3>
      <div className="promoted-carousel__track">
        {promos.slice(0, 5).map((promo) => (
          <div key={promo.id} className="promoted-carousel__card">
            <PromoBadge promoActiva={promo} />
            <span className="promoted-carousel__name">{promo.restauranteId}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
