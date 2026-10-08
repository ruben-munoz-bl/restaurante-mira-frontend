/** OpsUsuarios — comensales: puntos (±) y racha diaria (± días / quitar login de hoy). */
import { useEffect, useMemo, useState } from 'react';
import {
  mensajeErrorFirestore,
  listarUsuarios,
  abonarPuntos,
  ajustarRacha,
  deshacerLoginHoy,
} from './opsData.js';
import OpsInformeUsuarios from './OpsInformeUsuarios.jsx';
import OpsTrazabilidadSimulada from './OpsTrazabilidadSimulada.jsx';
import { generarUsuariosSimulados } from './informeUsuarios.js';
import { registrarAccionSimulada } from '../../services/trazaReal.js';
import { useT } from '../../i18n/index.jsx';
import es from '../../i18n/es.js';
import ca from '../../i18n/ca.js';
import en from '../../i18n/en.js';

const TRADS = { es, ca, en };

const CLAVE_SIM = 'mira:usuarios-simulados';
function leerConSimulados() {
  try { return localStorage.getItem(CLAVE_SIM) !== 'no'; } catch { return true; }
}

/**
 * Las acciones sobre un usuario simulado se aplican solo en pantalla: su uid
 * (sim-xxx) no existe en la base de datos, así que nunca se llama a la API.
 */
const API_SIMULADA = {
  abonarPuntos: async (u, n) => {
    registrarAccionSimulada({ path: '/v1/dashboard/points/add-manual', uid: u.uid });
    return { nuevoSaldo: Math.max(0, (u.saldoPuntos || 0) + n) };
  },
  ajustarRacha: async (u, delta) => {
    registrarAccionSimulada({ path: '/v1/dashboard/points/racha/delta', uid: u.uid });
    return { rachaLogin: { dias: Math.max(0, Math.min(7, (u.rachaLoginDias || 0) + delta)), yaReclamado: u.yaReclamadoHoy } };
  },
  deshacerLoginHoy: async (u) => {
    registrarAccionSimulada({ path: '/v1/dashboard/points/racha/unclaim-today', uid: u.uid });
    return {
      estabaReclamadoHoy: Boolean(u.yaReclamadoHoy),
      rachaLogin: { dias: u.yaReclamadoHoy ? Math.max(0, (u.rachaLoginDias || 0) - 1) : (u.rachaLoginDias || 0), yaReclamado: false },
    };
  },
};

export default function OpsUsuarios() {
  const t = useT(TRADS);
  const [lista, setLista] = useState([]);
  const [q, setQ] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [modal, setModal] = useState(null);
  const [cant, setCant] = useState('');
  const [motivo, setMotivo] = useState('');
  const [rachaOk, setRachaOk] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [verInforme, setVerInforme] = useState(false);
  const [verTraza, setVerTraza] = useState(false);
  const [conSimulados, setConSimulados] = useState(leerConSimulados);
  const [simulados, setSimulados] = useState(() => generarUsuariosSimulados(100, 2026));
  const [origen, setOrigen] = useState(''); // '', 'real', 'simulado'

  useEffect(() => {
    let vivo = true;
    listarUsuarios()
      .then((u) => { if (vivo) { setLista(u); setCargando(false); } })
      .catch((e) => { if (vivo) { if (!e.noSession) setError(mensajeErrorFirestore(e, 'usuarios')); setCargando(false); } });
    return () => { vivo = false; };
  }, []);

  const todos = useMemo(() => (conSimulados ? [...lista, ...simulados] : lista), [lista, simulados, conSimulados]);
  const filtrados = todos.filter((u) =>
    (!origen || (origen === 'simulado') === Boolean(u.simulado))
    && (!q.trim() || [u.nombre, u.email, u.uid].filter(Boolean).join(' ').toLowerCase().includes(q.trim().toLowerCase())),
  );
  const nReales = lista.length;

  function cambiarSimulados() {
    setConSimulados((v) => {
      try { localStorage.setItem(CLAVE_SIM, v ? 'no' : 'si'); } catch { /* sin almacenamiento */ }
      return !v;
    });
  }

  function patchUser(uid, patch) {
    setLista((prev) => prev.map((u) => (u.uid === uid ? { ...u, ...patch } : u)));
    setSimulados((prev) => prev.map((u) => (u.uid === uid ? { ...u, ...patch } : u)));
    setModal((prev) => (prev && prev.uid === uid ? { ...prev, ...patch } : prev));
  }

  function cerrarModal() {
    setModal(null);
    setCant('');
    setMotivo('');
    setRachaOk(false);
  }

  async function aplicarPuntos() {
    if (!modal || cant === '' || !Number.isFinite(Number(cant))) return;
    const n = Number(cant);
    if (!Number.isInteger(n)) {
      setError(t('ops.puntosEnteros'));
      return;
    }
    setError('');
    setOk('');
    setGuardando(true);
    try {
      const res = modal.simulado
        ? await API_SIMULADA.abonarPuntos(modal, n)
        : await abonarPuntos(modal.uid, n, motivo.trim() || t('ops.ajusteAdmin', { n: `${n > 0 ? '+' : ''}${n}` }), modal.saldoPuntos ?? null);
      patchUser(modal.uid, { saldoPuntos: res?.nuevoSaldo ?? (modal.saldoPuntos || 0) + n });
      setOk(t('ops.saldoActualizado', { n: res?.nuevoSaldo ?? ((modal.saldoPuntos || 0) + n) }));
      setCant('');
      setMotivo('');
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  async function sumarRacha(delta) {
    if (!modal || guardando) return;
    setError('');
    setOk('');
    setGuardando(true);
    try {
      const res = modal.simulado ? await API_SIMULADA.ajustarRacha(modal, delta) : await ajustarRacha(modal.uid, delta, modal.rachaLoginDias ?? null);
      const dias = res?.rachaLogin?.dias;
      if (typeof dias === 'number') {
        patchUser(modal.uid, { rachaLoginDias: dias, yaReclamadoHoy: Boolean(res.rachaLogin.yaReclamado) });
        setOk(`${t('ops.rachaAjustada', { n: dias })} ${dias === 1 ? t('ops.dia') : t('ops.dias')}`);
      }
      setRachaOk(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  async function quitarLoginHoy() {
    if (!modal || guardando) return;
    setError('');
    setOk('');
    setGuardando(true);
    try {
      const res = modal.simulado ? await API_SIMULADA.deshacerLoginHoy(modal) : await deshacerLoginHoy(modal.uid, modal.rachaLoginDias ?? null);
      const dias = res?.rachaLogin?.dias;
      if (typeof dias === 'number') {
        patchUser(modal.uid, {
          rachaLoginDias: dias,
          yaReclamadoHoy: Boolean(res.rachaLogin.yaReclamado),
        });
      }
      setOk(res?.estabaReclamadoHoy ? t('ops.loginDeshecho') : t('ops.sinLoginHoy'));
      setRachaOk(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
    {verInforme && <OpsInformeUsuarios lista={todos} />}
    {verTraza && (
      <div className="ops-card"><OpsTrazabilidadSimulada usuarios={conSimulados ? simulados : []} /></div>
    )}
    <div className="ops-card">
      <div className="ops-card-head">
        <div>
          <h2>{t('ops.seccUsuarios')} ({filtrados.length})</h2>
          <p className="ops-card-sub">
            {nReales} {t('ops.reales')}{conSimulados ? ` · ${simulados.length} ${t('ops.simulados')}` : ''} · {t('ops.usuariosSub')}
          </p>
        </div>
        <div className="ops-actions">
          <button type="button" className="ops-btn soft sm" onClick={() => setVerTraza((v) => !v)}>
            <span className="material-symbols-outlined">timeline</span>{verTraza ? t('ops.ocultarTraza') : t('ops.traza')}
          </button>
          <button type="button" className="ops-btn primary sm" onClick={() => setVerInforme((v) => !v)}>
            {verInforme ? t('ops.ocultarInforme') : t('ops.informe')}
          </button>
        </div>
      </div>
      {error && <p className="ops-error" role="alert">{error}</p>}
      {ok && <p className="ops-success" role="status">{ok}</p>}
      <div className="ops-toolbar" role="search">
        <input className="ops-input" type="search" placeholder={t('ops.phNombreEmail')} value={q}
          onChange={(e) => setQ(e.target.value)} style={{ flex: 1, minWidth: 220 }} />
        {conSimulados && (
          <select className="ops-input" value={origen} onChange={(e) => setOrigen(e.target.value)} aria-label="Origen">
            <option value="">Reales y simulados</option>
            <option value="real">Solo reales</option>
            <option value="simulado">Solo simulados</option>
          </select>
        )}
        <label className="ops-muted" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          <input type="checkbox" checked={conSimulados} onChange={cambiarSimulados} /> Incluir usuarios simulados
        </label>
      </div>
      {cargando && <p className="ops-empty" role="status">{t('ops.cargandoUsuarios')}</p>}
      {!cargando && filtrados.length === 0 && <p className="ops-empty">{t('ops.sinUsuarios')}</p>}
      <ul className="ops-list">
        {filtrados.slice(0, 100).map((u) => (
          <li key={u.uid} className="ops-list-item">
            <div>
              <strong>{u.nombre || t('ops.sinNombre')}</strong>
              {' '}<span className={`ops-pill ${u.simulado ? 'warn' : ''}`}>{u.simulado ? t('ops.simulado') : t('ops.real')}</span>
              <div className="ops-muted">
                {u.email} · {u.saldoPuntos || 0} pts · {u.tipo || 'cliente'} · 🔥 {u.rachaLoginDias || 0}d
                {u.yaReclamadoHoy ? t('ops.hoyOk') : ''}
              </div>
            </div>
            <button type="button" className="ops-btn primary sm" onClick={() => setModal(u)}>
              {t('ops.gestionar')}
            </button>
          </li>
        ))}
      </ul>

      {modal && (
        <div className="ops-modal-overlay" onClick={cerrarModal}>
          <div className="ops-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="ops-user-t">
            <h3 id="ops-user-t">{modal.nombre || modal.email}</h3>
            {modal.simulado && (
              <p className="ops-pill warn" style={{ marginBottom: 8 }}>Usuario simulado · los cambios solo se ven aquí, no se guardan en la base de datos</p>
            )}
            <p className="ops-muted" style={{ marginTop: -4, marginBottom: 12 }}>
              {modal.email} · {modal.saldoPuntos || 0} pts · {t('ops.rachaDe', { n: modal.rachaLoginDias || 0 })}
              {modal.yaReclamadoHoy ? t('ops.reclamadoHoy') : t('ops.sinReclamar')}
            </p>

            <section aria-label={t('ops.ajustarPuntos')}>
              <h4 style={{ margin: '0 0 8px', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--ops-on-variant)' }}>
                {t('ops.puntos')}
              </h4>
              <div className="ops-field">
                <label htmlFor="ops-cant">{t('ops.cantidadLabel')}</label>
                <input id="ops-cant" type="number" step="1" className="ops-input" value={cant}
                  onChange={(e) => setCant(e.target.value)} placeholder={t('ops.cantidadPh')} />
              </div>
              <div className="ops-field">
                <label htmlFor="ops-mot">{t('ops.motivo')}</label>
                <input id="ops-mot" type="text" className="ops-input" value={motivo}
                  onChange={(e) => setMotivo(e.target.value)} placeholder={t('ops.motivoPh')} />
              </div>
              <div className="ops-modal-actions" style={{ marginTop: 0, marginBottom: 16 }}>
                <button type="button" className="ops-btn primary sm" onClick={aplicarPuntos}
                  disabled={guardando || cant === ''}>
                  {t('ops.aplicarPuntos')}
                </button>
              </div>
            </section>

            <section aria-label={t('ops.ajustarRacha')}>
              <h4 style={{ margin: '0 0 8px', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--ops-on-variant)' }}>
                {t('ops.rachaDiaria')}
              </h4>
              <div className="ops-modal-actions" style={{ marginTop: 0, flexWrap: 'wrap' }}>
                <button type="button" className="ops-btn soft sm" onClick={() => sumarRacha(-1)}
                  disabled={guardando || (modal.rachaLoginDias || 0) <= 0}>
                  {t('ops.menosDia')}
                </button>
                <button type="button" className="ops-btn primary sm" onClick={() => sumarRacha(1)}
                  disabled={guardando || (modal.rachaLoginDias || 0) >= 7}>
                  {t('ops.masDia')}
                </button>
                <button type="button" className="ops-btn soft sm" onClick={() => sumarRacha(7 - (modal.rachaLoginDias || 0))}
                  disabled={guardando || (modal.rachaLoginDias || 0) >= 7}
                  title={t('ops.poner7Title')}>
                  {t('ops.poner7')}
                </button>
                <button type="button" className="ops-btn soft sm" onClick={() => sumarRacha(-(modal.rachaLoginDias || 0))}
                  disabled={guardando || (modal.rachaLoginDias || 0) <= 0}
                  title={t('ops.reset0Title')}>
                  {t('ops.reset0')}
                </button>
                <button type="button" className="ops-btn danger sm" onClick={quitarLoginHoy}
                  disabled={guardando}
                  title={t('ops.quitarLoginTitle')}>
                  {t('ops.quitarLogin')}
                </button>
              </div>
            </section>

            <div className="ops-modal-actions">
              <button type="button" className="ops-btn soft sm" onClick={cerrarModal}>{t('ops.cerrar')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
