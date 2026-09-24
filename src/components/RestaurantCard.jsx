/**
 * View pura: ficha de restaurante estilo editorial con hover elevación + zoom.
 */
import { useT } from '../i18n/index.jsx';
import PromoBadge from './promotions/PromoBadge.jsx';
import { imagenParaRestaurante } from '../models/restaurantModel.js';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';

const TRADS = { es, ca, en };

function estrellas(valoracion) {
  const llenas = Math.round(valoracion);
  return '★'.repeat(llenas) + '☆'.repeat(Math.max(0, 5 - llenas));
}

function disponibilidadTexto(r, filtros, t){
  if (!filtros) return null;
  const { dia, franja, hora } = filtros;
  if (!dia && !franja && !hora) return null;
  if (dia === 'Lunes' && r.cocina === 'Asador') return t('card.cerradoLunes');
  if (dia === 'Martes' && r.cocina === 'Fusión') return t('card.cerradoMartes');
  if (franja === 'cena' && r.cocina === 'Vegana' && r.precio === '€') return t('card.soloDesayuno');
  return `${t('card.disponible')} ${dia ? dia : ''} ${franja ? `· ${franja}` : ''} ${hora ? hora : ''}`.trim();
}

export default function RestaurantCard({ restaurant, filtros, esFavorito, onToggleFavorito, onVerCarta, onSelect, children }) {
  const t = useT(TRADS);
  const {
    nombre,
    cocina,
    precio,
    distanciaKm,
    valoracion,
    totalResenasYelp,
    imagen,
    descripcion,
    ciudad,
    promoActiva,
  } = restaurant;
  const destacado = valoracion >= 4.7;
  const disp = disponibilidadTexto(restaurant, filtros, t);

  return (
    <article className="card">
      <div className="card-media">
        <img
          className="card-foto"
          src={imagen}
          alt={`${nombre} — cocina ${cocina}`}
          loading="lazy"
          onError={(e) => {
            const el = e.currentTarget;
            if (el.dataset.fallback === '1') return;
            el.dataset.fallback = '1';
            el.src = imagenParaRestaurante(cocina, restaurant.id);
          }}
        />
        {destacado && <span className="card-top">{t('card.recomendado')}</span>}
        <span className="card-precio-badge">{precio}</span>
        {promoActiva && <PromoBadge promoActiva={promoActiva} />}
        {onToggleFavorito && (
          <button
            type="button"
            className={`card-fav${esFavorito ? ' card-fav-activo' : ''}`}
            aria-pressed={Boolean(esFavorito)}
            aria-label={esFavorito ? `${t('card.quitarFavoritos')} ${nombre}` : `${t('card.guardarFavoritos')} ${nombre}`}
            title={esFavorito ? t('card.quitarFavoritos') : t('card.guardarFavoritos')}
            onClick={() => onToggleFavorito(restaurant.id)}
          >
            ♥
          </button>
        )}
      </div>
      <div className="card-cuerpo">
        <h3 className="card-titulo">{nombre}</h3>
        <p className="card-nota">
          {valoracion > 0 ? (
            <>
              <span className="card-estrellas" aria-label={`${t('busqueda.valoracion')} ${valoracion} ${t('lista.de')} 5`}>
                {estrellas(valoracion)} {valoracion.toLocaleString(t('modelos.locale'))}
              </span>{' '}
              <span className="card-opiniones">
                ({(totalResenasYelp ?? 0).toLocaleString(t('modelos.locale'))} {t('card.opiniones')})
              </span>
            </>
          ) : (
            <span className="card-nuevo">{t('card.nuevo')}</span>
          )}
        </p>
        <p className="card-gris">
          {cocina} · {ciudad}
          {restaurant.accesoDiscapacidad === true && (
            <span className="card-accesible" title={t('card.accesible')}>
              {' '}{t('card.accesible')}
            </span>
          )}
        </p>
        <p className="card-gris" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--gris)" strokeWidth="2"><path d="M12 21s7-6.5 7-11a7 7 0 10-14 0c0 4.5 7 11 7 11z" /><circle cx="12" cy="10" r="3" /></svg>
          {distanciaKm == null ? t('card.centroNoDisponible') : t('card.kmCentro', { km: distanciaKm.toLocaleString(t('modelos.locale'), { maximumFractionDigits: 1 }) })}
        </p>
        {disp && <p className="card-disponibilidad" style={{ fontSize: '0.78rem', color: disp.includes(t('card.cerradoLunes')) || disp.includes(t('card.cerradoMartes')) ? 'var(--rojo)' : 'var(--primary-container)', fontWeight: 600, margin: '0.1rem 0 0' }}>{disp}</p>}
        <p className="card-descripcion">{descripcion}</p>
        {children}
        <p className="card-acciones">
          <button type="button" className="btn-reservar" onClick={() => onSelect(restaurant)}>
            {t('card.verMas')}
          </button>
          {onVerCarta && (
            <button type="button" className="btn-secundario" onClick={() => onVerCarta(restaurant)}>
              {t('card.verCarta')}
            </button>
          )}
        </p>
      </div>
    </article>
  );
}
