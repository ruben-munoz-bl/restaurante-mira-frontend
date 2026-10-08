import { useEffect, useState } from 'react';
import { promotionsApi } from '../../services/api.js';
import PromoBadge from './PromoBadge';
import { track } from '../../services/auditoria.js';

export default function PromotedCarousel() {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    promotionsApi.list({ estado: 'activa' })
      .then((res) => {
        const lista = res.data || [];
        setPromos(lista);
        lista.slice(0, 5).forEach((p) => track('promo_vista', { entidadTipo: 'promocion', entidadId: String(p.id), datos: { restauranteId: p.restauranteId } }));
      })
      .catch(() => setPromos([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading || promos.length === 0) return null;

  return (
    <div className="promoted-carousel">
      <h3 className="promoted-carousel__title">Restaurantes destacados</h3>
      <div className="promoted-carousel__track">
        {promos.slice(0, 5).map((promo) => (
          <div key={promo.id} className="promoted-carousel__card"
            onClick={() => track('promo_pulsada', { entidadTipo: 'promocion', entidadId: String(promo.id), datos: { restauranteId: promo.restauranteId } })}>
            <PromoBadge promoActiva={promo} />
            <span className="promoted-carousel__name">{promo.restauranteId}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
