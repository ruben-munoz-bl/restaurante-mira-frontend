/** OpsIncidencias — contactos pendientes (resolver) + negocios propuestos (aprobar/rechazar). */
import { useEffect, useState } from 'react';
import { listarPendientes, resolverIncidencia } from '../../services/incidenciaApi.js';
import { listarNegociosPendientes, aprobarNegocio, rechazarNegocio } from '../../services/negocioApi.js';

export default function OpsIncidencias() {
  const [contactos, setContactos] = useState([]);
  const [negocios, setNegocios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [actuando, setActuando] = useState('');

  useEffect(() => {
    let vivo = true;
    Promise.all([listarPendientes().catch(() => []), listarNegociosPendientes().catch(() => [])])
      .then(([c, n]) => { if (vivo) { setContactos(c); setNegocios(n); setCargando(false); } })
      .catch((e) => { if (vivo) { setError(e.message); setCargando(false); } });
    return () => { vivo = false; };
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
      <div className="ops-card">
        <div className="ops-card-head">
          <div>
            <h2>Incidencias &amp; Soporte ({contactos.length})</h2>
            <p className="ops-card-sub">Mensajes de contacto pendientes · resolver los marca como resueltos</p>
          </div>
        </div>
        {error && <p className="ops-error" role="alert">{error}</p>}
        {cargando && <p className="ops-empty" role="status">Cargando…</p>}
        {!cargando && contactos.length === 0 && <p className="ops-empty">Sin incidencias pendientes.</p>}
        <ul className="ops-list">
          {contactos.map((c) => (
            <li key={c.id} className="ops-list-item">
              <div style={{ minWidth: 0 }}>
                <strong>{c.motivo || 'Incidencia'}</strong> · {c.nombre} ({c.email})
                <div className="ops-muted">{(c.mensaje || '').slice(0, 220)}</div>
              </div>
              <button type="button" className="ops-btn primary sm" disabled={actuando === c.id}
                onClick={() => accionar(resolverIncidencia, c.id, 'c')}>
                Resolver
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="ops-card">
        <div className="ops-card-head">
          <div>
            <h2>Locales propuestos ({negocios.length})</h2>
            <p className="ops-card-sub">Aprobar copia el local a la red · rechazar lo archiva</p>
          </div>
        </div>
        {!cargando && negocios.length === 0 && <p className="ops-empty">Sin propuestas pendientes.</p>}
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
                  Aprobar
                </button>
                <button type="button" className="ops-btn soft sm" disabled={actuando === n.id}
                  onClick={() => accionar(rechazarNegocio, n.id, 'n')}>
                  Rechazar
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
