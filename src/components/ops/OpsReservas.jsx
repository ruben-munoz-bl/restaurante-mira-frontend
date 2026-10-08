/** OpsReservas — reservas globales: buscar, filtrar y cambiar estado. */
import { useEffect, useState } from 'react';
import { getReservasGlobales, nombreRestauranteDe, descargarCSV, csvReservas, mensajeErrorFirestore, updateReservationStatus } from './opsData.js';
import { useT } from '../../i18n/index.jsx';
import es from '../../i18n/es.js';
import ca from '../../i18n/ca.js';
import en from '../../i18n/en.js';

const TRADS = { es, ca, en };
const ESTADOS = ['', 'pendiente', 'confirmada', 'completada', 'cancelada', 'no_show'];
const CLAVE_ESTADO = {
  pendiente: 'ops.estadoPendiente',
  confirmada: 'ops.estadoConfirmada',
  completada: 'ops.estadoCompletada',
  cancelada: 'ops.estadoCancelada',
  no_show: 'ops.estadoNoShow',
};

export default function OpsReservas({ busquedaInicial = '' }) {
  const t = useT(TRADS);
  const [q, setQ] = useState(busquedaInicial);
  const [estado, setEstado] = useState('');
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [actuando, setActuando] = useState('');

  async function cargar() {
    setCargando(true);
    setError('');
    try {
      setLista(await getReservasGlobales({ q, estado }));
    } catch (e) {
      setError(mensajeErrorFirestore(e, 'reservas'));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); /* solo al montar */ }, []);
  useEffect(() => { setQ(busquedaInicial); }, [busquedaInicial]);

  async function cambiar(id, nuevo) {
    setError('');
    setActuando(id);
    try {
      await updateReservationStatus(id, nuevo);
      setLista((prev) => prev.map((r) => (r.id === id ? { ...r, estado: nuevo } : r)));
    } catch (e) {
      setError(e.message);
    } finally {
      setActuando('');
    }
  }

  return (
    <div className="ops-card">
      <div className="ops-card-head">
        <div>
          <h2>{t('ops.seccReservas')}</h2>
          <p className="ops-card-sub">{t('ops.reservasGlobalesSub', { n: lista.length })}</p>
        </div>
        <button type="button" className="ops-btn soft sm" onClick={() => { const c = csvReservas(lista); descargarCSV('reservas.csv', c.cabeceras, c.filas); }}>
          <span className="material-symbols-outlined">download</span>{t('ops.exportarCsv')}
        </button>
      </div>
      <div className="ops-toolbar" role="search">
        <input className="ops-input" type="search" placeholder={t('ops.phCodigoCliente')} value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') cargar(); }} style={{ flex: 1, minWidth: 220 }} />
        <select className="ops-selectbox" value={estado} onChange={(e) => setEstado(e.target.value)} aria-label={t('ops.filtrarEstado')}>
          <option value="">{t('ops.todosEstados')}</option>
          {ESTADOS.slice(1).map((e) => <option key={e} value={e}>{t(CLAVE_ESTADO[e])}</option>)}
        </select>
        <button type="button" className="ops-btn primary sm" onClick={cargar}>{t('ops.buscar')}</button>
      </div>
      {error && <p className="ops-error" role="alert">{error}</p>}
      {cargando && <p className="ops-empty" role="status">{t('ops.cargandoReservas')}</p>}
      {!cargando && lista.length === 0 && <p className="ops-empty">{t('ops.sinResultados')}</p>}
      {!cargando && lista.length > 0 && (
        <div className="ops-table-wrap">
          <table className="ops-table">
            <thead>
              <tr><th>{t('ops.colCodigo')}</th><th>{t('ops.colCliente')}</th><th>{t('ops.colRestaurante')}</th><th>{t('ops.colFecha')}</th><th>{t('ops.colPax')}</th><th>{t('ops.colEstado')}</th><th>{t('ops.colAcciones')}</th></tr>
            </thead>
            <tbody>
              {lista.map((r) => (
                <tr key={r.id}>
                  <td><code className="ops-code">{r.codigo || r.id.slice(0, 8)}</code></td>
                  <td>{r.usuarioNombre || r.usuarioEmail || '—'}<br /><span className="ops-muted">{r.usuarioEmail || ''}</span></td>
                  <td>{nombreRestauranteDe(r)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{r.fecha} {r.hora}</td>
                  <td className="num">{r.comensales}</td>
                  <td>
                    <span className={`ops-status-pill ${(r.estado === 'cancelada' || r.estado === 'no_show') ? 'danger' : (r.estado === 'pendiente' ? 'info' : '')}`}>
                      {t(CLAVE_ESTADO[r.estado] || 'ops.estadoPendiente')}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <button type="button" className="ops-btn soft sm" disabled={actuando === r.id} onClick={() => cambiar(r.id, 'confirmada')}>{t('ops.confirmar')}</button>
                      <button type="button" className="ops-btn soft sm" disabled={actuando === r.id} onClick={() => cambiar(r.id, 'completada')}>{t('ops.completar')}</button>
                      <button type="button" className="ops-btn soft sm" disabled={actuando === r.id} onClick={() => cambiar(r.id, 'no_show')}>No-show</button>
                      <button type="button" className="ops-btn soft sm" disabled={actuando === r.id} onClick={() => cambiar(r.id, 'cancelada')}>{t('ops.cancelar')}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
