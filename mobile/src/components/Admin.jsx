/** View pura: panel admin — incidencias + locales propuestos. */
import { useEffect, useState } from 'react';
import { listarPendientes, resolverIncidencia } from '../services/incidenciaApi.js';
import { listarNegociosPendientes, aprobarNegocio, rechazarNegocio } from '../services/negocioApi.js';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';

const TRADS = { es, ca, en };

export default function Admin({ usuario, esAdmin }) {
  const t = useT(TRADS);
  const [lista, setLista] = useState([]);
  const [negocios, setNegocios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!usuario?.uid) {
      window.location.hash = '#/login';
      return;
    }
    if (!esAdmin) {
      setCargando(false);
      return;
    }
    let vivo = true;
    Promise.all([listarPendientes(), listarNegociosPendientes()])
      .then(([l, n]) => {
        if (vivo) {
          setLista(l);
          setNegocios(n);
          setCargando(false);
        }
      })
      .catch((e) => {
        if (vivo) {
          setError(e.message);
          setCargando(false);
        }
      });
    return () => {
      vivo = false;
    };
  }, [usuario, esAdmin]);

  if (!usuario) return null;

  async function handleResolver(id) {
    setError('');
    try {
      await resolverIncidencia(id);
      setLista((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleAprobar(id) {
    setError('');
    try {
      await aprobarNegocio(id);
      setNegocios((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleRechazar(id) {
    setError('');
    try {
      await rechazarNegocio(id);
      setNegocios((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <section className="auth-pagina pagina-ancha" aria-labelledby="admin-titulo">
      <div className="auth-tarjeta tarjeta-ancha">
        <h1 id="admin-titulo">{t('admin.titulo')}</h1>
        {esAdmin && <h2 className="cuenta-sub">{t('admin.incidenciasPendientes')}</h2>}
        {cargando && <p>{t('otros.cargando')}</p>}
        {!cargando && !esAdmin && (
          <p className="auth-error" role="alert">
            {t('admin.sinAcceso')}
          </p>
        )}
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        {!cargando && esAdmin && lista.length === 0 && !error && (
          <p className="vacio-texto">{t('admin.noIncidencias')}</p>
        )}
        {!cargando && esAdmin && lista.length > 0 && (
          <ul className="lista-registros">
            {lista.map((r) => (
              <li key={r.id} className="registro">
                <div>
                  <strong>{r.motivo}</strong> · {r.nombre} ({r.email})
                  <div className="registro-detalle">{r.mensaje}</div>
                </div>
                <button type="button" className="btn-cta btn-peq" onClick={() => handleResolver(r.id)}>
                  {t('admin.resolver')}
                </button>
              </li>
            ))}
          </ul>
        )}

        {esAdmin && <h2 className="cuenta-sub">{t('admin.localesPropuestos')}</h2>}
        {!cargando && esAdmin && negocios.length === 0 && !error && (
          <p className="vacio-texto">{t('admin.noPropuestas')}</p>
        )}
        {!cargando && esAdmin && negocios.length > 0 && (
          <ul className="lista-registros">
            {negocios.map((n) => (
              <li key={n.id} className="registro">
                <div>
                  <strong>{n.nombre}</strong> · {n.ciudad} ({(n.categorias || []).join(', ')})
                  <div className="registro-detalle">
                    {n.direccion} · {n.precio} · {n.email}
                    {n.descripcion ? ` — ${n.descripcion}` : ''}
                  </div>
                  <div className="registro-detalle">
                    {t('detalle.accesoAdaptado')}: {n.accesoDiscapacidad == null ? t('admin.noInfo') : n.accesoDiscapacidad ? t('admin.si') : t('admin.no')}
                    {' '}· {t('detalle.menuInfantil')}: {n.menuInfantil == null ? t('admin.noInfo') : n.menuInfantil ? t('admin.si') : t('admin.no')}
                    {' '}· {t('detalle.tronas')}: {n.tronas == null ? t('admin.noInfo') : n.tronas ? t('admin.si') : t('admin.no')}
                    {' '}· {t('detalle.entornoTranquilo')}: {n.entornoTranquilo == null ? t('admin.noInfo') : n.entornoTranquilo ? t('admin.si') : t('admin.no')}
                    {' '}· {t('detalle.terraza')}: {n.terraza == null ? t('admin.noInfo') : n.terraza ? t('admin.si') : t('admin.no')}
                    {n.alergenos ? ` · ${t('detalle.alergenos')}: ${n.alergenos}` : ''}
                  </div>
                </div>
                <span style={{ display: 'flex', gap: '0.4rem' }}>
                  <button type="button" className="btn-cta btn-peq" onClick={() => handleAprobar(n.id)}>
                    {t('admin.aprobar')}
                  </button>
                  <button type="button" className="btn-secundario btn-peq" onClick={() => handleRechazar(n.id)}>
                    {t('admin.rechazar')}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
