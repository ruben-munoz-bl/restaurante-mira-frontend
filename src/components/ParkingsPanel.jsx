/**
 * Panel lateral de parkings cercanos.
 * - Desktop: al lado del mapa (grid 1fr 320px)
 * - Móvil: debajo del mapa
 * - Click en tarjeta → centrar mapa (onSeleccionarParking)
 */

import { formatoDistancia, mapsLink } from '../services/parkingApi.js';
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

export default function ParkingsPanel({ parkings, cargando, seleccionado, onSeleccionarParking }) {
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
            <li key={p.id} className={`parking-item${seleccionado === i ? ' activo' : ''}`} style={{ '--i': i }}>
              <button
                type="button"
                className="parking-card"
                onClick={() => onSeleccionarParking?.(i)}
                aria-pressed={seleccionado === i}
                aria-label={`Ir a ${p.nombre}, ${formatoDistancia(p.distanciaMetros)}`}
              >
                <span className="parking-card-icono" aria-hidden="true">P</span>
                <span className="parking-card-info">
                  <span className="parking-card-nombre">{p.nombre}</span>
                  <span className="parking-card-chips">
                    {p.distanciaMetros != null && <span className="parking-chip parking-chip--dist">{formatoDistancia(p.distanciaMetros)}</span>}
                    <span className={`parking-chip${p.gratuito === 'yes' ? ' parking-chip--gratis' : ''}`}>{p.gratuito === 'yes' ? t('parkings.gratis') : t('parkings.pago')}</span>
                    {p.accesible === 'Sí' && <span className="parking-chip">♿ {t('parkings.accesible')}</span>}
                    {p.tipo && p.tipo !== '—' && <span className="parking-chip">{p.tipo}</span>}
                  </span>
                </span>
              </button>
              <a className="parking-ir" href={mapsLink(p.lat, p.lon)} target="_blank" rel="noreferrer" aria-label={`${t('parkings.comoLlegar')}: ${p.nombre}`}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l19-9-9 19-2-8-8-2z" /></svg>
              </a>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
