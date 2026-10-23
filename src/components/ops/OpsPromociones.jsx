/** OpsPromociones — el admin elige un restaurante y gestiona sus campañas (M15). */
import { useState } from 'react';
import PromocionesPanel from '../dashboard/PromocionesPanel.jsx';
import '../dashboard/dashboard.css';
import RestaurantCard from '../RestaurantCard.jsx';
import { mapearDoc } from '../../services/restaurantApi.js';
import { completarRestaurante } from '../../models/restaurantModel.js';
import { listarRestaurantesAdmin, mensajeErrorFirestore } from './opsData.js';
import { useT } from '../../i18n/index.jsx';
import es from '../../i18n/es.js';
import ca from '../../i18n/ca.js';
import en from '../../i18n/en.js';

const TRADS = { es, ca, en };

export default function OpsPromociones() {
  const t = useT(TRADS);
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState('');
  const [rest, setRest] = useState(null);

  async function buscar() {
    if (!q.trim()) return;
    setBuscando(true);
    setError('');
    try {
      const r = await listarRestaurantesAdmin({ q: q.trim(), limit: 10 });
      setItems(r.items.map((d) => completarRestaurante(mapearDoc(d.id, d))));
    } catch (e) {
      setError(mensajeErrorFirestore(e));
    } finally {
      setBuscando(false);
    }
  }

  return (
    <div className="ops-card">
      <div className="ops-card-head">
        <div>
          <h2>{t('ops.seccPromociones')}</h2>
          <p className="ops-card-sub">{rest ? rest.nombre : t('ops.promosElige')}</p>
        </div>
        {rest && (
          <button type="button" className="ops-btn soft sm" onClick={() => setRest(null)}>{t('ops.promosCambiar')}</button>
        )}
      </div>
      {!rest && (
        <>
          <div className="ops-toolbar" role="search">
            <input className="ops-input ops-ofertas-buscar" type="search" placeholder={t('ops.phBuscarRestaurante')} value={q}
              onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') buscar(); }} />
            <button type="button" className="ops-btn primary sm" disabled={buscando} onClick={buscar}>{t('ops.buscar')}</button>
          </div>
          {error && <p role="alert">{error}</p>}
          <div className="grid ops-ofertas-lista">
            {items.map((r) => (
              <RestaurantCard key={r.id} restaurant={r} onSelect={setRest} />
            ))}
          </div>
        </>
      )}
      {rest && (
        <div className="op-hub">
          <PromocionesPanel restauranteId={rest.id} restauranteNombre={rest.nombre} />
        </div>
      )}
    </div>
  );
}
