/**
 * View pura: rejilla de resultados + estado vacío + centinela de scroll infinito.
 * Cuando hay más portada por cargar, el centinela dispara onLoadMore al entrar en vista.
 */
import { useEffect, useRef } from 'react';
import RestaurantCard from './RestaurantCard.jsx';
import RestaurantSkeleton from './RestaurantSkeleton.jsx';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';

const TRADS = { es, ca, en };
const SKELETONS_CARGANDO_MAS = 3;

export default function RestaurantList({ restaurants, filtros, onClear, onSelect, hayMas, cargandoMas, onLoadMore, esFavorito, onToggleFavorito, onVerCarta, cargandoInicial }) {
  const t = useT(TRADS);
  const centinela = useRef(null);

  useEffect(() => {
    if (!hayMas || typeof onLoadMore !== 'function') return undefined;
    const el = centinela.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const obs = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) onLoadMore();
      },
      { rootMargin: '600px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
    // restaurants.length: al crecer la grilla hay que reobservar; si el
    // centinela sigue a la vista, el observer vuelve a notificar al montarse.
  }, [hayMas, onLoadMore, restaurants.length]);

  if (restaurants.length === 0 && !hayMas && !cargandoInicial) {
    const hayBusqueda = filtros?.q?.trim();
    return (
      <div className="vacio" role="status">
        <p className="vacio-titulo">{t('lista.noResultados')}</p>
        <p>{hayBusqueda ? t('lista.sinResultados', { q: filtros.q }) : t('lista.pruebaOtra')}</p>
        <button type="button" className="btn-cta" onClick={onClear}>
          {t('lista.limpiarFiltros')}
        </button>
      </div>
    );
  }

  return (
    <>
      <ul className="grid">
        {restaurants.map((r) => (
          <li key={r.id}>
            <RestaurantCard restaurant={r} filtros={filtros} onSelect={onSelect} esFavorito={esFavorito ? esFavorito(r.id) : false} onToggleFavorito={onToggleFavorito} onVerCarta={onVerCarta} />
          </li>
        ))}
        {cargandoMas && Array.from({ length: SKELETONS_CARGANDO_MAS }, (_, i) => (
          <li key={`skeleton-mas-${i}`}><RestaurantSkeleton /></li>
        ))}
      </ul>
      {hayMas && (
        <div ref={centinela} aria-hidden={!cargandoMas}>
          {cargandoMas && <span className="sr-only">{t('lista.cargando')}</span>}
        </div>
      )}
    </>
  );
}
