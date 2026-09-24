/**
 * Panel lateral de parkings cercanos.
 * - Desktop: al lado del mapa (grid 1fr 320px)
 * - Móvil: debajo del mapa
 * - Click en tarjeta → centrar mapa (onSeleccionarParking)
 */

import { formatoDistancia } from '../services/parkingApi.js';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';

const TRADS = { es, ca, en };

function SkeletonCard() {
  return (
    <div className="parking-skeleton" aria-hidden="true">
      <div className="parking-skeleton-bar parking-skeleton-nombre" />
      <div className="parking-skeleton-bar parking-skeleton-detalle" />
      <div className="parking-skeleton-bar parking-skeleton-detalle2" />
    </div>
  );
}

export default function ParkingsPanel({ parkings, cargando, onSeleccionarParking }) {
  const t = useT(TRADS);
  return (
    <aside className="parkings-panel" aria-label={t('parkings.titulo')}>
      <h3 className="parkings-panel-titulo">
        {t('parkings.titulo')}
        {!cargando && <span className="parkings-panel-cuenta">{parkings.length}</span>}
      </h3>

      {cargando && (
        <div className="parkings-panel-lista">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {!cargando && parkings.length === 0 && (
        <p className="parkings-panel-vacio">{t('parkings.sinParkings')}</p>
      )}

      {!cargando && parkings.length > 0 && (
        <ul className="parkings-panel-lista">
          {parkings.map((p, i) => (
            <li key={p.id}>
              <button
                type="button"
                className="parking-card"
                onClick={() => onSeleccionarParking?.(i)}
                aria-label={`Ir a ${p.nombre}, ${formatoDistancia(p.distanciaMetros)}`}
              >
                <div className="parking-card-nombre">{p.nombre}</div>
                <div className="parking-card-meta">
                  <span className="parking-card-distancia">{formatoDistancia(p.distanciaMetros)}</span>
                  <span className="parking-card-sep">·</span>
                  <span>{p.gratuito === 'yes' ? `💰 ${t('parkings.gratis')}` : `💰 ${t('parkings.pago')}`}</span>
                  <span className="parking-card-sep">·</span>
                  <span>{p.accesible === 'Sí' ? `♿ ${t('otros.si')}` : '♿ —'}</span>
                  <span className="parking-card-sep">·</span>
                  <span>{p.tipo !== '—' ? `🏢 ${p.tipo}` : '🏢 —'}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
