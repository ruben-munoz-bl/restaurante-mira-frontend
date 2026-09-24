/**
 * View pura: insignias de dieta/alérgenos + mini-leyenda.
 * Compartida entre el libro y la carta plana del detalle.
 * Los textos vienen del catálogo (leyendaSellos): nada hardcodeado.
 */
import { leyendaSellos, codigoAlergeno } from '../models/restaurantModel.js';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';

const TRADS = { es, ca, en };

export function Sellos({ plato }) {
  const t = useT(TRADS);
  return (
    <span className="plato-sellos">
      {plato.vegano && (
        <span className="sello sello-vegano" title={t('sellos.vegano')}>
          🌱<span className="sr-only">{t('sellos.vegano')}</span>
        </span>
      )}
      {!plato.vegano && plato.vegetariano && (
        <span className="sello sello-veg" title={t('sellos.vegetariano')}>
          VG<span className="sr-only">{t('sellos.vegetariano')}</span>
        </span>
      )}
      {plato.sinGluten && (
        <span className="sello sello-sg" title={t('sellos.sinGluten')}>
          SG<span className="sr-only">{t('sellos.sinGluten')}</span>
        </span>
      )}
    </span>
  );
}

export function ConflictosAlergenos({ alergenos }) {
  const lista = alergenos || [];
  if (!lista.length) return null;
  return (
    <span className="plato-conflictos">
      {lista.map((a) => (
        <span key={a} className="mini-sello" title={a}>
          {codigoAlergeno(a)}
          <span className="sr-only">{a}</span>
        </span>
      ))}
    </span>
  );
}

/** Mini-leyenda de una línea (sellos de dieta) para listas compactas. */
export function MiniLeyenda() {
  const t = useT(TRADS);
  const items = leyendaSellos().slice(0, 3);
  return (
    <p className="mini-leyenda" aria-label={t('sellos.leyendaSellos')}>
      {items.map((e, i) => (
        <span key={e.nombre}>
          {i > 0 && ' · '}
          <strong aria-hidden="true">{e.simbolo}</strong> {e.nombre}
        </span>
      ))}
    </p>
  );
}
