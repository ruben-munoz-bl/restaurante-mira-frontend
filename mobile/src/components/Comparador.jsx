/**
 * View pura: SOLO la tabla comparativa conjunta (2-3 restaurantes).
 * Sin fichas individuales: cada columna se identifica por foto + nombre + Quitar.
 * En móvil la tabla desliza horizontal (nada de tarjetas sueltas).
 * Todo por props (resúmenes ya calculados); sin lecturas.
 */
import { resumenRestaurante, imagenParaRestaurante } from '../models/restaurantModel.js';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';

const TRADS = { es, ca, en };

function fmtDistancia(km, t) {
  if (km == null) return '—';
  return `${km.toLocaleString(t('modelos.locale'), { maximumFractionDigits: 1 })} ${t('comparador.km')}`;
}

function fmtNota(v, locale) {
  return v > 0 ? `★ ${v.toLocaleString(locale)}` : '—';
}

// Filas comparables: get numérico para el resaltado, fmt para pintar.
function filasDe(conAptos, t, locale) {
  const filas = [
    { label: t('comparador.notaYelp'), get: (s) => (s.notaYelp > 0 ? s.notaYelp : null), fmt: (s) => (<>{fmtNota(s.notaYelp, locale)} <span className="comparador-detalle">({s.totalYelp.toLocaleString(locale)})</span></>), mejor: 'max' },
    { label: t('comparador.notaMira'), get: (s) => (s.notaMira > 0 ? s.notaMira : null), fmt: (s) => fmtNota(s.notaMira, locale), mejor: 'max' },
    { label: t('comparador.mejorNota'), get: (s) => (s.mejorNota > 0 ? s.mejorNota : null), fmt: (s) => fmtNota(s.mejorNota, locale), mejor: 'max' },
    { label: t('comparador.precio'), get: (s) => s.precio.length, fmt: (s) => s.precio, mejor: 'min' },
    { label: t('comparador.distancia'), get: (s) => s.distanciaKm, fmt: (s) => fmtDistancia(s.distanciaKm, t), mejor: 'min' },
    { label: t('comparador.ciudad'), get: null, fmt: (s) => s.ciudad || '—', mejor: null },
  ];
  if (conAptos) {
    filas.push({ label: t('comparador.aptosParaTi'), get: (s) => s.aptos, fmt: (s) => (s.aptos ?? '—'), mejor: 'max' });
  }
  filas.push(
    { label: t('comparador.carta'), get: null, fmt: (s) => `${s.secciones} ${t('comparador.secciones')} · ${s.platos} ${t('comparador.platos')}`, mejor: null },
    { label: t('comparador.masBarato'), get: null, fmt: (s) => (s.barato ? `${s.barato.nombre} (${s.barato.precio} €)` : '—'), mejor: null },
    { label: t('comparador.masCaro'), get: null, fmt: (s) => (s.caro ? `${s.caro.nombre} (${s.caro.precio} €)` : '—'), mejor: null },
  );
  return filas;
}

export default function Comparador({ restaurantes, dieta, onQuitar }) {
  const t = useT(TRADS);
  const locale = t('modelos.locale');
  const datos = restaurantes.map((r) => ({ r, s: resumenRestaurante(r, dieta) }));
  if (datos.length < 2) return null;
  const conAptos = datos.some((d) => d.s.aptos != null);
  const filas = filasDe(conAptos, t, locale);

  function ganadores(fila) {
    if (!fila.mejor || !fila.get) return new Set();
    const vals = datos.map((d) => fila.get(d.s)).filter((v) => v != null);
    if (!vals.length) return new Set();
    const top = fila.mejor === 'min' ? Math.min(...vals) : Math.max(...vals);
    return new Set(datos.filter((d) => fila.get(d.s) === top).map((d) => d.s.id));
  }

  return (
    <section className="comparador" aria-labelledby="comparador-titulo">
      <h2 id="comparador-titulo" className="cuenta-sub">
        {t('comparador.comparando', { count: datos.length })}
      </h2>

      {/* Tabla conjunta con scroll horizontal en pantallas estrechas */}
      <div className="comparador-scroll">
        <table className="comparador-tabla">
          <thead>
            <tr>
              <th scope="col">
                <span className="comparador-etiqueta">{t('comparador.restaurante')}</span>
              </th>
              {datos.map(({ s }) => (
                <th key={s.id} scope="col" className="comparador-col-nombre">
                  <img
                    src={s.imagen}
                    alt=""
                    loading="lazy"
                    className="comparador-mini-foto"
                    onError={(e) => {
                      const el = e.currentTarget;
                      if (el.dataset.fallback === '1') return;
                      el.dataset.fallback = '1';
                      el.src = imagenParaRestaurante(s.cocina, s.id);
                    }}
                  />
                  {s.nombre}
                  <button type="button" className="btn-texto" onClick={() => onQuitar(s.id)}>
                    {t('comparador.quitar')}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => {
              const top = ganadores(fila);
              return (
                <tr key={fila.label}>
                  <th scope="row">{fila.label}</th>
                  {datos.map(({ s }) => (
                    <td key={s.id} className={top.has(s.id) ? 'comparador-mejor' : undefined}>
                      {fila.fmt(s)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
