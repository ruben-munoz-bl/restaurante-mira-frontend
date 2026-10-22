/**
 * Landing (M07): cinco secciones curadas + bloque final. Cada sección se pinta
 * solo si tiene datos; si una carga falla, desaparece sin romper el resto ni
 * bloquear el Hero.
 */
import { useEffect, useMemo, useState } from 'react';
import RestaurantCard from './RestaurantCard.jsx';
import { topBarcelona, nuevosRestaurantes } from '../models/landingModel.js';
import { fetchRestaurants } from '../services/restaurantApi.js';
import { fetchPromocionesActivas, fetchMasReservados, fetchPlatosDestacados } from '../services/landingApi.js';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';
import '../styles/landing.css';

const TRADS = { es, ca, en };
const LIMITE_PLATOS = 8;

/** Mismo formato que la carta: 12,50 €. */
function formatoPrecio(precio) {
  const n = Number(precio);
  return Number.isFinite(n) ? `${n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : '—';
}

export default function LandingSecciones({ todos = [], onSelect, esFavorito, onToggleFavorito, onVerCarta }) {
  const t = useT(TRADS);
  const [promos, setPromos] = useState([]);
  const [reservados, setReservados] = useState([]);
  const [platos, setPlatos] = useState([]);
  const [catalogoApi, setCatalogoApi] = useState([]);

  useEffect(() => {
    let vivo = true;
    Promise.allSettled([fetchPromocionesActivas(), fetchMasReservados(), fetchRestaurants()])
      .then(async ([promo, reserva, catalogo]) => {
        const lista = catalogo.status === 'fulfilled' && Array.isArray(catalogo.value) ? catalogo.value : [];
        if (!vivo) return;
        if (promo.status === 'fulfilled') setPromos(promo.value || []);
        if (reserva.status === 'fulfilled') setReservados(reserva.value || []);
        setCatalogoApi(lista);
        if (!lista.length) return;
        // Los platos van después: no retrasan a las demás secciones.
        const conPlato = await fetchPlatosDestacados(lista, LIMITE_PLATOS).catch(() => []);
        if (vivo) setPlatos((conPlato || []).filter((p) => p?.plato?.foto));
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  // El catálogo cacheado manda; si falla o viene vacío, la lista que ya tenía la app.
  const catalogo = catalogoApi.length ? catalogoApi : todos;
  const porId = useMemo(() => new Map(catalogo.map((r) => [String(r.id), r])), [catalogo]);

  const conPromo = useMemo(
    () => promos
      .map((promo) => ({ promo, restaurante: porId.get(String(promo.restauranteId)) }))
      .filter((x) => x.restaurante),
    [promos, porId],
  );
  const masReservados = useMemo(
    () => reservados.map((x) => porId.get(String(x.id))).filter(Boolean),
    [reservados, porId],
  );
  const top = useMemo(() => topBarcelona(catalogo), [catalogo]);
  const nuevos = useMemo(() => nuevosRestaurantes(catalogo), [catalogo]);

  return (
    <div className="landing-secciones">
      {conPromo.length > 0 && (
        <Seccion id="landing-promociones" titulo={t('landing.promociones')} sub={t('landing.promocionesSub')}>
          <ul className="landing-fila" aria-label={t('landing.promociones')}>
            {conPromo.map(({ promo, restaurante }) => (
              <li key={promo.id}>
                <RestaurantCard
                  restaurant={{ ...restaurante, promoActiva: promo }}
                  esFavorito={esFavorito ? esFavorito(restaurante.id) : false}
                  onToggleFavorito={onToggleFavorito}
                  onVerCarta={onVerCarta}
                  onSelect={onSelect}
                />
              </li>
            ))}
          </ul>
        </Seccion>
      )}

      {platos.length > 0 && (
        <Seccion id="landing-platos" titulo={t('landing.platos')} sub={t('landing.platosSub')}>
          <ul className="landing-fila" aria-label={t('landing.platos')}>
            {platos.map(({ restaurante, plato }, i) => (
              <li key={`${restaurante.id}-${i}`}>
                <button type="button" className="landing-plato" onClick={() => onSelect?.(restaurante)}>
                  <img src={plato.foto} alt={plato.nombre} loading="lazy" />
                  <span className="landing-plato-texto">
                    <span className="landing-plato-nombre">{plato.nombre}</span>
                    <span className="landing-plato-rest">{restaurante.nombre}</span>
                    <span className="landing-plato-precio">{formatoPrecio(plato.precio)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Seccion>
      )}

      {masReservados.length > 0 && (
        <Seccion id="landing-reservados" titulo={t('landing.reservados')} sub={t('landing.reservadosSub')}>
          <FilaRestaurantes
            restaurants={masReservados}
            etiqueta={t('landing.reservados')}
            onSelect={onSelect}
            esFavorito={esFavorito}
            onToggleFavorito={onToggleFavorito}
            onVerCarta={onVerCarta}
          />
        </Seccion>
      )}

      {top.length > 0 && (
        <Seccion id="landing-top-barcelona" titulo={t('landing.topBarcelona')} sub={t('landing.topBarcelonaSub')}>
          <FilaRestaurantes
            restaurants={top}
            etiqueta={t('landing.topBarcelona')}
            onSelect={onSelect}
            esFavorito={esFavorito}
            onToggleFavorito={onToggleFavorito}
            onVerCarta={onVerCarta}
          />
        </Seccion>
      )}

      {nuevos.length > 0 && (
        <Seccion id="landing-nuevos" titulo={t('landing.nuevos')} sub={t('landing.nuevosSub')}>
          <FilaRestaurantes
            restaurants={nuevos}
            etiqueta={t('landing.nuevos')}
            onSelect={onSelect}
            esFavorito={esFavorito}
            onToggleFavorito={onToggleFavorito}
            onVerCarta={onVerCarta}
          />
        </Seccion>
      )}

      <section className="landing-final" aria-labelledby="landing-ver-todos">
        <h2 id="landing-ver-todos" className="landing-titulo">{t('landing.verTodos')}</h2>
        <p className="landing-sub">{t('landing.verTodosSub')}</p>
        <a className="btn-cta btn-grande" href="#/descubrir?lista=1">{t('landing.verTodos')}</a>
      </section>
    </div>
  );
}

function Seccion({ id, titulo, sub, children }) {
  return (
    <section className="landing-seccion" aria-labelledby={id}>
      <header className="landing-cabecera">
        <h2 id={id} className="landing-titulo">{titulo}</h2>
        {sub && <p className="landing-sub">{sub}</p>}
      </header>
      {children}
    </section>
  );
}

function FilaRestaurantes({ restaurants, etiqueta, onSelect, esFavorito, onToggleFavorito, onVerCarta }) {
  return (
    <ul className="landing-fila" aria-label={etiqueta}>
      {restaurants.map((r) => (
        <li key={r.id}>
          <RestaurantCard
            restaurant={r}
            esFavorito={esFavorito ? esFavorito(r.id) : false}
            onToggleFavorito={onToggleFavorito}
            onVerCarta={onVerCarta}
            onSelect={onSelect}
          />
        </li>
      ))}
    </ul>
  );
}
