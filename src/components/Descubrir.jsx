/**
 * View: «Descubrir». Ranking de los mejor valorados como una fila horizontal de
 * tarjetas que el scroll desliza (la central se enfoca y la foto tiene parallax)
 * + rejilla de destacados. Animación 100 % en DOM/CSS transform, sin vídeos.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '../i18n/index.jsx';
import { fetchRestaurants } from '../services/restaurantApi.js';
import { imagenParaRestaurante } from '../models/restaurantModel.js';
import RestaurantCard from './RestaurantCard.jsx';
import '../styles/descubrir.css';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';

const TRADS = { es, ca, en };

const NUM_VUELO = 7;        // restaurantes en el vuelo
const NUM_DESTACADOS = 12;  // tarjetas en la rejilla
const UMBRAL_DESTACADO = 4.7; // mismo criterio que la etiqueta «Recomendado» de RestaurantCard
const TRAMO_VH = 70;        // scroll (vh) para pasar de un restaurante al siguiente

/** Nota ponderada por nº de reseñas: un 5,0 con 2 reseñas no gana a un 4,8 con 900. */
function puntuacion(r) {
  const n = r.totalResenasYelp || 0;
  return ((r.valoracion || 0) * n + 4.2 * 25) / (n + 25);
}

/** Pide la foto en más resolución: en el vuelo se ve a pantalla completa y ampliada. */
function fotoGrande(url) {
  if (!url) return url;
  if (url.includes('images.unsplash.com')) {
    return url.replace(/([?&])w=\d+/, '$1w=1800').replace(/([?&])q=\d+/, '$1q=75');
  }
  if (url.includes('yelpcdn.com')) return url.replace(/\/[a-z0-9]+\.jpg$/i, '/o.jpg');
  return url;
}

function estrellas(v) {
  const llenas = Math.round(v);
  return '★'.repeat(llenas) + '☆'.repeat(Math.max(0, 5 - llenas));
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const suave = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

export default function Descubrir({ todos = [], onSelect, esFavorito, onToggleFavorito, onVerCarta }) {
  const t = useT(TRADS);
  const [catalogo, setCatalogo] = useState(todos);
  const [estado, setEstado] = useState(todos.length ? 'listo' : 'cargando');
  const reducido = useMemo(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, []);

  // El portal solo trae una página: para un ranking justo se pide el catálogo completo.
  useEffect(() => {
    let vivo = true;
    fetchRestaurants()
      .then((lista) => {
        if (vivo && lista.length) setCatalogo(lista);
        if (vivo) setEstado('listo');
      })
      .catch(() => {
        if (vivo) setEstado(todos.length ? 'listo' : 'error');
      });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ranking = useMemo(
    () => catalogo.filter((r) => r.valoracion > 0).sort((a, b) => puntuacion(b) - puntuacion(a)),
    [catalogo],
  );
  const vuelo = ranking.slice(0, NUM_VUELO);
  const destacados = useMemo(
    () => ranking.filter((r) => r.valoracion >= UMBRAL_DESTACADO).slice(0, NUM_DESTACADOS),
    [ranking],
  );

  return (
    <div className="descubrir">
      {estado === 'cargando' && (
        <div className="dsc-cargando" role="status">
          <span className="dsc-cargando-anillo" aria-hidden="true" />
          {t('descubrir.cargando')}
        </div>
      )}
      {estado === 'error' && (
        <div className="dsc-cargando" role="alert">{t('descubrir.error')}</div>
      )}
      {estado === 'listo' && vuelo.length > 0 &&
        (reducido ? (
          <VueloEstatico vuelo={vuelo} t={t} onSelect={onSelect} />
        ) : (
          <Vuelo vuelo={vuelo} t={t} onSelect={onSelect} />
        ))}

      {estado === 'listo' && destacados.length > 0 && (
        <section className="dsc-destacados" aria-labelledby="dsc-destacados-titulo">
          <p className="dsc-eyebrow">{t('descubrir.destacadosEyebrow')}</p>
          <h2 id="dsc-destacados-titulo" className="dsc-destacados-titulo">
            {t('descubrir.destacadosTitulo')}
          </h2>
          <p className="dsc-destacados-sub">{t('descubrir.destacadosSub', { nota: UMBRAL_DESTACADO.toLocaleString() })}</p>
          <div className="grid">
            {destacados.map((r) => (
              <RestaurantCard
                key={r.id}
                restaurant={r}
                esFavorito={esFavorito?.(r.id)}
                onToggleFavorito={onToggleFavorito}
                onVerCarta={onVerCarta}
                onSelect={onSelect}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Foto({ r, className }) {
  return (
    <img
      className={className}
      src={fotoGrande(r.imagen)}
      alt=""
      draggable="false"
      onError={(e) => {
        const el = e.currentTarget;
        if (el.dataset.fallback === '1') return;
        el.dataset.fallback = '1';
        el.src = fotoGrande(imagenParaRestaurante(r.cocina, r.id));
      }}
    />
  );
}

function Vuelo({ vuelo, t, onSelect }) {
  const N = vuelo.length;
  const seccion = useRef(null);
  const pistaTarjetas = useRef(null);
  const tarjetas = useRef([]);
  const fotos = useRef([]);
  const barra = useRef(null);
  const pista = useRef(null);
  const [activo, setActivo] = useState(0);

  useEffect(() => {
    let objetivo = 0;
    let actual = 0;
    let raf = 0;
    let ultimoActivo = -1;
    let paso = 0; // distancia entre centros de tarjetas (px)
    let ancho = 0; // ancho de una tarjeta (px)

    function medir() {
      const primera = tarjetas.current[0];
      const segunda = tarjetas.current[1];
      if (!primera) return;
      ancho = primera.offsetWidth;
      paso = segunda ? segunda.offsetLeft - primera.offsetLeft : ancho;
    }

    function leerScroll() {
      const el = seccion.current;
      if (!el) return;
      const tramo = (window.innerHeight * TRAMO_VH) / 100;
      objetivo = clamp(-el.getBoundingClientRect().top / tramo, 0, N - 1);
    }

    function pintar() {
      // Inercia suave: la fila persigue al scroll en lugar de saltar.
      actual += (objetivo - actual) * 0.12;
      if (Math.abs(objetivo - actual) < 0.0005) actual = objetivo;

      // La tarjeta «actual» queda centrada en pantalla.
      const centro = window.innerWidth / 2 - ancho / 2;
      if (pistaTarjetas.current) {
        pistaTarjetas.current.style.transform = `translate3d(${centro - actual * paso}px,0,0)`;
      }
      tarjetas.current.forEach((card, j) => {
        if (!card) return;
        const d = j - actual; // -1 izquierda · 0 centro · 1 derecha
        const cerca = 1 - clamp(Math.abs(d), 0, 1);
        card.style.transform = `scale(${0.86 + 0.14 * cerca})`;
        card.style.opacity = 0.45 + 0.55 * cerca;
        card.style.setProperty('--foco', cerca.toFixed(3));
        card.classList.toggle('es-activa', cerca > 0.6);
        // Parallax: la foto se mueve más despacio que la tarjeta.
        const foto = fotos.current[j];
        if (foto) foto.style.transform = `translate3d(${clamp(d, -1.5, 1.5) * -9}%,0,0) scale(1.18)`;
      });

      const cercano = Math.round(actual);
      if (cercano !== ultimoActivo) {
        ultimoActivo = cercano;
        setActivo(cercano);
      }
      if (barra.current) barra.current.style.transform = `scaleX(${N > 1 ? actual / (N - 1) : 1})`;
      if (pista.current) pista.current.style.opacity = 1 - suave(0.05, 0.3, actual);

      raf = actual !== objetivo ? requestAnimationFrame(pintar) : 0;
    }

    function alScroll() {
      leerScroll();
      if (!raf) raf = requestAnimationFrame(pintar);
    }
    function alRedimensionar() {
      medir();
      alScroll();
    }

    medir();
    leerScroll();
    actual = objetivo;
    pintar();
    window.addEventListener('scroll', alScroll, { passive: true });
    window.addEventListener('resize', alRedimensionar);
    return () => {
      window.removeEventListener('scroll', alScroll);
      window.removeEventListener('resize', alRedimensionar);
      cancelAnimationFrame(raf);
    };
  }, [N]);

  function irA(j) {
    const el = seccion.current;
    if (!el) return;
    const tramo = (window.innerHeight * TRAMO_VH) / 100;
    window.scrollTo({ top: el.offsetTop + j * tramo + 2, behavior: 'smooth' });
  }

  return (
    <section
      ref={seccion}
      className="dsc-vuelo"
      style={{ height: `calc(${(N - 1) * TRAMO_VH}vh + 100vh)` }}
      aria-label={t('descubrir.vueloAria')}
    >
      <div className="dsc-escenario">
        <header className="dsc-cabecera">
          <p className="dsc-eyebrow">{t('descubrir.eyebrowSeccion')}</p>
          <h1 className="dsc-titulo">{t('descubrir.titulo')}</h1>
          <p className="dsc-contador" aria-live="polite">
            <b>{String(activo + 1).padStart(2, '0')}</b> / {String(N).padStart(2, '0')}
          </p>
        </header>

        <div ref={pistaTarjetas} className="dsc-fila">
          {vuelo.map((r, j) => (
            <article
              key={r.id}
              ref={(el) => (tarjetas.current[j] = el)}
              className="dsc-tarjeta"
              aria-hidden={j !== activo}
            >
              <div className="dsc-tarjeta-media">
                <span ref={(el) => (fotos.current[j] = el)} className="dsc-tarjeta-foto">
                  <Foto r={r} className="dsc-foto" />
                </span>
                <div className="dsc-velo" />
                <span className="dsc-puesto" aria-hidden="true">{String(j + 1).padStart(2, '0')}</span>
              </div>
              <div className="dsc-texto">
                <p className="dsc-eyebrow">{t('descubrir.puesto', { n: j + 1 })}</p>
                <h2 className="dsc-nombre">{r.nombre}</h2>
                <p className="dsc-meta">
                  <span className="dsc-estrellas" aria-label={`${r.valoracion} / 5`}>{estrellas(r.valoracion)}</span>
                  <b>{r.valoracion.toFixed(1)}</b>
                  {r.totalResenasYelp > 0 && <span>· {r.totalResenasYelp} {t('card.opiniones')}</span>}
                </p>
                <p className="dsc-chips">
                  <span>{r.cocina}</span>
                  <span>{r.precio}</span>
                  {r.ciudad && <span>{r.ciudad}</span>}
                </p>
                <button
                  type="button"
                  className="dsc-cta"
                  tabIndex={j === activo ? 0 : -1}
                  onClick={() => onSelect?.(r)}
                >
                  {t('descubrir.verFicha')}
                </button>
              </div>
            </article>
          ))}
        </div>

        <div ref={pista} className="dsc-pista" aria-hidden="true">
          <span className="dsc-raton" />
          {t('descubrir.pista')}
        </div>

        <nav className="dsc-rail" aria-label={t('descubrir.ranking')}>
          {vuelo.map((r, j) => (
            <button
              key={r.id}
              type="button"
              className={`dsc-rail-punto${j === activo ? ' activo' : ''}`}
              onClick={() => irA(j)}
              aria-label={`${j + 1}. ${r.nombre}`}
              aria-current={j === activo ? 'true' : undefined}
            >
              <span className="dsc-rail-num">{String(j + 1).padStart(2, '0')}</span>
              <span className="dsc-rail-nombre">{r.nombre}</span>
            </button>
          ))}
        </nav>

        <div className="dsc-progreso" aria-hidden="true">
          <div ref={barra} className="dsc-progreso-barra" />
        </div>
      </div>
    </section>
  );
}

/** Sin animaciones (prefers-reduced-motion): las mismas escenas, una debajo de otra. */
function VueloEstatico({ vuelo, t, onSelect }) {
  return (
    <section className="dsc-estatico" aria-label={t('descubrir.vueloAria')}>
      {vuelo.map((r, j) => (
        <article key={r.id} className="dsc-estatico-escena">
          <Foto r={r} className="dsc-foto" />
          <div className="dsc-velo" />
          <div className="dsc-texto" style={{ opacity: 1, position: 'relative' }}>
            <p className="dsc-eyebrow">{j === 0 ? t('descubrir.eyebrow') : t('descubrir.puesto', { n: j + 1 })}</p>
            <h2 className="dsc-nombre">{r.nombre}</h2>
            <p className="dsc-meta">
              <span className="dsc-estrellas">{estrellas(r.valoracion)}</span> <b>{r.valoracion.toFixed(1)}</b>
            </p>
            <button type="button" className="dsc-cta" onClick={() => onSelect?.(r)}>
              {t('descubrir.verFicha')}
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}
