/** OpsUsuarios — comensales: puntos (±) y racha diaria (± días / quitar login de hoy). */
import { useEffect, useState } from 'react';
import {
  mensajeErrorFirestore,
  listarUsuarios,
  abonarPuntos,
  ajustarRacha,
  deshacerLoginHoy,
} from './opsData.js';

export default function OpsUsuarios() {
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

  useEffect(() => {
    let vivo = true;
    listarUsuarios()
      .then((u) => { if (vivo) { setLista(u); setCargando(false); } })
      .catch((e) => { if (vivo) { setError(mensajeErrorFirestore(e, 'usuarios')); setCargando(false); } });
    return () => { vivo = false; };
  }, []);

  const filtrados = lista.filter((u) =>
    !q.trim() || [u.nombre, u.email].filter(Boolean).join(' ').toLowerCase().includes(q.trim().toLowerCase()),
  );

  function patchUser(uid, patch) {
    setLista((prev) => prev.map((u) => (u.uid === uid ? { ...u, ...patch } : u)));
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
      setError('Los puntos deben ser un número entero (usa negativos para restar).');
      return;
    }
    setError('');
    setOk('');
    setGuardando(true);
    try {
      const res = await abonarPuntos(modal.uid, n, motivo.trim() || `Ajuste admin (${n > 0 ? '+' : ''}${n})`);
      patchUser(modal.uid, { saldoPuntos: res?.nuevoSaldo ?? (modal.saldoPuntos || 0) + n });
      setOk(`Saldo actualizado: ${res?.nuevoSaldo ?? ((modal.saldoPuntos || 0) + n)} pts`);
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
      const res = await ajustarRacha(modal.uid, delta);
      const dias = res?.rachaLogin?.dias;
      if (typeof dias === 'number') {
        patchUser(modal.uid, { rachaLoginDias: dias, yaReclamadoHoy: Boolean(res.rachaLogin.yaReclamado) });
        setOk(`Racha: ${dias} día${dias === 1 ? '' : 's'}`);
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
      const res = await deshacerLoginHoy(modal.uid);
      const dias = res?.rachaLogin?.dias;
      if (typeof dias === 'number') {
        patchUser(modal.uid, {
          rachaLoginDias: dias,
          yaReclamadoHoy: Boolean(res.rachaLogin.yaReclamado),
        });
      }
      setOk(res?.estabaReclamadoHoy
        ? 'Login de hoy deshecho. Puede volver a reclamarlo.'
        : 'No había login de hoy; racha intacta (último login = ayer).');
      setRachaOk(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="ops-card">
      <div className="ops-card-head">
        <div>
          <h2>Usuarios &amp; Comensales ({filtrados.length})</h2>
          <p className="ops-card-sub">Puntos (añadir/restar) y racha diaria de login</p>
        </div>
      </div>
      {error && <p className="ops-error" role="alert">{error}</p>}
      {ok && <p className="ops-success" role="status">{ok}</p>}
      <div className="ops-toolbar" role="search">
        <input className="ops-input" type="search" placeholder="Nombre o email…" value={q}
          onChange={(e) => setQ(e.target.value)} style={{ flex: 1, minWidth: 220 }} />
      </div>
      {cargando && <p className="ops-empty" role="status">Cargando usuarios…</p>}
      {!cargando && filtrados.length === 0 && <p className="ops-empty">Sin usuarios.</p>}
      <ul className="ops-list">
        {filtrados.slice(0, 100).map((u) => (
          <li key={u.uid} className="ops-list-item">
            <div>
              <strong>{u.nombre || '(sin nombre)'}</strong>
              <div className="ops-muted">
                {u.email} · {u.saldoPuntos || 0} pts · {u.tipo || 'cliente'} · 🔥 {u.rachaLoginDias || 0}d
                {u.yaReclamadoHoy ? ' · hoy ✓' : ''}
              </div>
            </div>
            <button type="button" className="ops-btn primary sm" onClick={() => setModal(u)}>
              Gestionar
            </button>
          </li>
        ))}
      </ul>

      {modal && (
        <div className="ops-modal-overlay" onClick={cerrarModal}>
          <div className="ops-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="ops-user-t">
            <h3 id="ops-user-t">{modal.nombre || modal.email}</h3>
            <p className="ops-muted" style={{ marginTop: -4, marginBottom: 12 }}>
              {modal.email} · {modal.saldoPuntos || 0} pts · racha {modal.rachaLoginDias || 0}/7
              {modal.yaReclamadoHoy ? ' · reclamado hoy' : ' · sin reclamar hoy'}
            </p>

            <section aria-label="Ajustar puntos">
              <h4 style={{ margin: '0 0 8px', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--ops-on-variant)' }}>
                Puntos
              </h4>
              <div className="ops-field">
                <label htmlFor="ops-cant">Cantidad (negativo = restar)</label>
                <input id="ops-cant" type="number" step="1" className="ops-input" value={cant}
                  onChange={(e) => setCant(e.target.value)} placeholder="p. ej. 50 o -20" />
              </div>
              <div className="ops-field">
                <label htmlFor="ops-mot">Motivo</label>
                <input id="ops-mot" type="text" className="ops-input" value={motivo}
                  onChange={(e) => setMotivo(e.target.value)} placeholder="Compensación, promo…" />
              </div>
              <div className="ops-modal-actions" style={{ marginTop: 0, marginBottom: 16 }}>
                <button type="button" className="ops-btn primary sm" onClick={aplicarPuntos}
                  disabled={guardando || cant === ''}>
                  Aplicar puntos
                </button>
              </div>
            </section>

            <section aria-label="Ajustar racha">
              <h4 style={{ margin: '0 0 8px', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--ops-on-variant)' }}>
                Racha diaria
              </h4>
              <div className="ops-modal-actions" style={{ marginTop: 0, flexWrap: 'wrap' }}>
                <button type="button" className="ops-btn soft sm" onClick={() => sumarRacha(-1)}
                  disabled={guardando || (modal.rachaLoginDias || 0) <= 0}>
                  − 1 día
                </button>
                <button type="button" className="ops-btn primary sm" onClick={() => sumarRacha(1)}
                  disabled={guardando || (modal.rachaLoginDias || 0) >= 7}>
                  + 1 día
                </button>
                <button type="button" className="ops-btn soft sm" onClick={() => sumarRacha(7 - (modal.rachaLoginDias || 0))}
                  disabled={guardando || (modal.rachaLoginDias || 0) >= 7}
                  title="Deja la racha en 7 (desbloquea la ruleta)">
                  Poner a 7
                </button>
                <button type="button" className="ops-btn soft sm" onClick={() => sumarRacha(-(modal.rachaLoginDias || 0))}
                  disabled={guardando || (modal.rachaLoginDias || 0) <= 0}
                  title="Resetea la racha a 0">
                  Reset a 0
                </button>
                <button type="button" className="ops-btn danger sm" onClick={quitarLoginHoy}
                  disabled={guardando}
                  title="Deshace el reclamo de hoy (ultimoLogin=ayer, racha−1 si tocaba)">
                  Quitar login de hoy
                </button>
              </div>
            </section>

            <div className="ops-modal-actions">
              <button type="button" className="ops-btn soft sm" onClick={cerrarModal}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
