/**
 * View pura: #/favoritos — guardados + recomendaciones + comparador.
 * Resuelve los ids contra lo ya cargado y solo lee de Firestore los que falten.
 * La selección a comparar vive aquí (se pierde al salir, vale).
 */
import { useEffect, useMemo, useState } from 'react';
import RestaurantCard from './RestaurantCard.jsx';
import Comparador from './Comparador.jsx';
import { recomendarPara } from '../models/restaurantModel.js';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';

const TRADS = { es, ca, en };
const MAX_COMPARAR = 3;
const MAX_RECOMENDADOS = 6;

export default function Favoritos({
  ids,
  todos,
  dieta,
  onObtenerRestaurante,
  onVerCarta,
  onReservar,
  onToggleFavorito,
}) {
  const t = useT(TRADS);
  const [locales, setLocales] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [comparar, setComparar] = useState([]);
  const [comparando, setComparando] = useState(false);
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    let vivo = true;
    setCargando(true);
    setComparar((prev) => prev.filter((id) => (ids || []).includes(id)));
    Promise.all((ids || []).map((id) => onObtenerRestaurante(id)))
      .then((list) => {
        if (vivo) {
          setLocales(list.filter(Boolean));
          setCargando(false);
        }
      })
      .catch(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
  }, [ids, onObtenerRestaurante]);

  function toggleComparar(id) {
    if (comparar.includes(id)) {
      setComparar(comparar.filter((x) => x !== id));
      setAviso('');
    } else if (comparar.length >= MAX_COMPARAR) {
      setAviso(t('favoritos.compararMaximo', { max: MAX_COMPARAR }));
    } else {
      setComparar([...comparar, id]);
      setAviso('');
    }
  }

  const seleccionados = comparar
    .map((id) => locales.find((r) => String(r.id) === String(id)))
    .filter(Boolean);

  // Modo comparar: solo los elegidos, juntos; la rejilla individual se oculta.
  const enComparativa = comparando && seleccionados.length >= 2;

  function empezarComparar() {
    setComparando(true);
    requestAnimationFrame(() => {
      document.getElementById('comparador')?.scrollIntoView({ behavior: 'smooth' });
    });
  }

  function volverAFavoritos() {
    setComparando(false);
  }

  const recomendados = useMemo(
    () => recomendarPara(locales, todos, MAX_RECOMENDADOS),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locales, todos],
  );

  return (
    <section className="auth-pagina pagina-ancha" aria-labelledby="favoritos-titulo">
      <div className="auth-tarjeta tarjeta-ancha">
        <h1 id="favoritos-titulo">{t('favoritos.misFavoritos', { count: locales.length })}</h1>
        {cargando && <p>{t('favoritos.cargando')}</p>}
        {!cargando && locales.length === 0 && (
          <div role="status">
            <p className="vacio-texto">{t('favoritos.vacio')}</p>
            <p>
              <a href="#buscar" className="btn-cta btn-peq">
                {t('favoritos.buscarRestaurantes')}
              </a>
            </p>
          </div>
        )}
        {!cargando && locales.length > 0 && !enComparativa && (
          <>
            <ul className="grid">
              {locales.map((r) => (
                <li key={r.id}>
                  <label className="comparar-check">
                    <input
                      type="checkbox"
                      checked={comparar.includes(r.id)}
                      onChange={() => toggleComparar(r.id)}
                    />
                    {t('favoritos.anadirComparar')}
                  </label>
                  <RestaurantCard
                    restaurant={r}
                    esFavorito={() => true}
                    onToggleFavorito={onToggleFavorito}
                    onVerCarta={onVerCarta}
                    onSelect={onReservar}
                  />
                </li>
              ))}
            </ul>
            {aviso && (
              <p className="auth-error" role="alert">
                {aviso}
              </p>
            )}
            <p className="comparar-acciones">
              <button
                type="button"
                className="btn-cta"
                disabled={seleccionados.length < 2}
                title={seleccionados.length < 2 ? t('favoritos.compararMinimo') : undefined}
                onClick={empezarComparar}
              >
                {t('favoritos.comparar', { count: seleccionados.length })}
              </button>
            </p>
          </>
        )}
        {!cargando && enComparativa && (
          <>
            <p>
              <button type="button" className="btn-secundario btn-peq" onClick={volverAFavoritos}>
                {t('favoritos.volverFavoritos')}
              </button>
            </p>
            <div id="comparador">
                <Comparador
                  restaurantes={seleccionados}
                  dieta={dieta}
                  onQuitar={(id) => toggleComparar(id)}
                />
            </div>
          </>
        )}
        {!cargando && !enComparativa && locales.length > 0 && recomendados.length === 0 && (
          <p className="vacio-texto">
            {t('favoritos.sinRecomendaciones')}
          </p>
        )}
        {!cargando && !enComparativa && recomendados.length > 0 && (
          <section aria-labelledby="reco-titulo">
                <h2 id="reco-titulo" className="cuenta-sub">
                  {t('favoritos.recomendados')}
                </h2>
                <p className="vacio-texto">{t('favoritos.deTuCocina')}</p>
                <ul className="grid">
                  {recomendados.map(({ restaurante: r, motivo }) => (
                    <li key={r.id}>
                      <RestaurantCard
                        restaurant={r}
                        esFavorito={() => false}
                        onToggleFavorito={onToggleFavorito}
                        onVerCarta={onVerCarta}
                        onSelect={onReservar}
                      >
                        <p className="card-motivo">{motivo}</p>
                      </RestaurantCard>
                    </li>
                  ))}
                </ul>
              </section>
        )}
      </div>
    </section>
  );
}
