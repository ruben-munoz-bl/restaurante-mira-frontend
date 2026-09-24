/** View pura: franja de ventajas con diseño editorial. */
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';

const TRADS = { es, ca, en };

const VENTAJAS = [
  { key: 'notaReal', keyDesc: 'notaDesc' },
  { key: 'cerca', keyDesc: 'cercaDesc' },
  { key: 'gratisTitulo', keyDesc: 'gratisDesc' },
];

export default function PromoBanner() {
  const t = useT(TRADS);

  return (
    <section className="promo" aria-label={t('promo.titulo')}>
      <ul className="promo-lista">
        {VENTAJAS.map((v) => (
          <li key={v.key} className="promo-item">
            <span className="promo-check" aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
            </span>
            <div>
              <strong>{t(`promo.${v.key}`)}.</strong> {t(`promo.${v.keyDesc}`)}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
