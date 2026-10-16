/** OpsIncidencias — contactos pendientes (resolver) + negocios propuestos (aprobar/rechazar). */
import { useEffect, useState } from 'react';
import { listarPendientes, listarResueltas, resolverIncidencia, EVENTO_INCIDENCIAS } from '../../services/incidenciaApi.js';
import { listarNegociosPendientes, aprobarNegocio, rechazarNegocio } from '../../services/negocioApi.js';
import { useT } from '../../i18n/index.jsx';
import es from '../../i18n/es.js';
import ca from '../../i18n/ca.js';
import en from '../../i18n/en.js';

import IncidenciasResueltas from '../IncidenciasResueltas.jsx';
import ResolverIncidenciaModal from '../ResolverIncidenciaModal.jsx';

const TRADS = { es, ca, en };

export default function OpsIncidencias() {
  const t = useT(TRADS);
  const [contactos, setContactos] = useState([]);
  const [resueltas, setResueltas] = useState([]);
  const [vista, setVista] = useState('pendientes');
  const [negocios, setNegocios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [actuando, setActuando] = useState('');
  const [incidencia, setIncidencia] = useState(null);

  useEffect(() => {
    let vivo = true;
    Promise.all([listarPendientes().catch(() => []), listarNegociosPendientes().catch(() => []), listarResueltas().catch(() => [])])
      .then(([c, n, r]) => { if (vivo) { setResueltas(r); setContactos(c); setNegocios(n); setCargando(false); } })
      .catch((e) => { if (vivo) { setError(e.message); setCargando(false); } });
    // Al resolver (aquí, en el dashboard o desde otra pestaña de este panel) se
    // vuelven a pedir pendientes y resueltas a la API (BUG-133). Si falla, se
    // conserva lo que ya había.
    const recargar = () => {
      listarPendientes().then((c) => vivo && setContactos(c)).catch(() => {});
      listarResueltas().then((r) => vivo && setResueltas(r)).catch(() => {});
    };
    window.addEventListener(EVENTO_INCIDENCIAS, recargar);
    return () => { vivo = false; window.removeEventListener(EVENTO_INCIDENCIAS, recargar); };
  }, []);

  async function accionar(fn, id, quitarDe) {
    setError('');
    setActuando(id);
    try {
      await fn(id);
      if (quitarDe === 'c') setContactos((p) => p.filter((x) => x.id !== id));
      else setNegocios((p) => p.filter((x) => x.id !== id));
    } catch (e) {
      setError(e.message);
    } finally {
      setActuando('');
    }
  }

  return (
    <>
      {incidencia && <ResolverIncidenciaModal
        onConfirmar={async (datos) => {
          const resuelta = await resolverIncidencia(incidencia.id, datos);
          setResueltas((p) => [resuelta, ...p.filter((x) => x.id !== incidencia.id)]);
          setContactos((p) => p.filter((x) => x.id !== incidencia.id));
        }}
        onCancelar={() => setIncidencia(null)} />}
      <div className="ops-card">
        <div className="ops-card-head">
          <div>
            <h2>{t('ops.seccIncidencias')}</h2>
            <p className="ops-card-sub">{t('ops.incidenciasSub')}</p>
          </div>
        </div>
        <div className="incidencias-vistas">
          <button type="button" className="ops-btn soft" aria-pressed={vista === 'pendientes'} onClick={() => setVista('pendientes')}>{t('admin.incidenciasPendientes')} ({contactos.length})</button>
          <button type="button" className="ops-btn soft" aria-pressed={vista === 'resueltas'} onClick={() => setVista('resueltas')}>{t('admin.incidenciasResueltas')} ({resueltas.length})</button>
        </div>
        {!cargando && vista === 'resueltas' && <IncidenciasResueltas lista={resueltas} />}
        {error && <p className="ops-error" role="alert">{error}</p>}
        {cargando && <p className="ops-empty" role="status">{t('otros.cargando')}</p>}
        {!cargando && vista === 'pendientes' && contactos.length === 0 && <p className="ops-empty">{t('ops.sinIncidencias')}</p>}
        {vista === 'pendientes' && <ul className="ops-list">
          {contactos.map((c) => (
            <li key={c.id} className="ops-list-item">
              <div style={{ minWidth: 0 }}>
                <strong>{c.motivo || t('ops.incidencia')}</strong> · {c.nombre} ({c.email})
                <div className="ops-muted">{(c.mensaje || '').slice(0, 220)}</div>
              </div>
              <button type="button" className="ops-btn primary sm" disabled={actuando === c.id}
                onClick={() => setIncidencia(c)}>
                {t('ops.resolver')}
              </button>
            </li>
          ))}
        </ul>}
      </div>

      <div className="ops-card">
        <div className="ops-card-head">
          <div>
            <h2>{t('ops.localesPropuestos')} ({negocios.length})</h2>
            <p className="ops-card-sub">{t('ops.localesPropuestosSub')}</p>
          </div>
        </div>
        {!cargando && negocios.length === 0 && <p className="ops-empty">{t('ops.sinPropuestas')}</p>}
        <ul className="ops-list">
          {negocios.map((n) => (
            <li key={n.id} className="ops-list-item">
              <div style={{ minWidth: 0 }}>
                <strong>{n.nombre}</strong> · {n.ciudad} ({(n.categorias || []).join(', ')})
                <div className="ops-muted">{n.direccion} · {n.precio} · {n.email}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" className="ops-btn primary sm" disabled={actuando === n.id}
                  onClick={() => accionar(aprobarNegocio, n.id, 'n')}>
                  {t('ops.aprobar')}
                </button>
                <button type="button" className="ops-btn soft sm" disabled={actuando === n.id}
                  onClick={() => accionar(rechazarNegocio, n.id, 'n')}>
                  {t('ops.rechazar')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
