/** View pura: hero editorial con imagen del template y cifras. */
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';

const TRADS = { es, ca, en };

export default function Hero({ total, numZonas }) {
  const t = useT(TRADS);
  return (
    <section id="inicio" className="hero" aria-labelledby="hero-titulo">
      <div className="hero-contenido">
        <h1 id="hero-titulo">{t('hero.titulo')}</h1>
        <p className="hero-sub">
          {t('hero.subtitulo')}
        </p>
        <a href="#buscar" className="btn-cta btn-grande">
          {t('hero.buscar')}
        </a>
        {(total > 0 || numZonas > 0) && (
          <ul className="hero-stats" aria-label={t('hero.cifras')}>
            {total > 0 && (
              <li>
                <strong>{total.toLocaleString('es-ES')}</strong> {t('hero.restaurantes')}
              </li>
            )}
            {numZonas > 0 && (
              <li>
                <strong>{numZonas}</strong> {t('hero.zonas')}
              </li>
            )}
            <li>
              <strong>50</strong> {t('hero.resenasPorLocal')}
            </li>
          </ul>
        )}
      </div>
    </section>
  );
}
