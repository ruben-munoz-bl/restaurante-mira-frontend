/** OpsUsuarios — comensales: buscar y abonar puntos manuales. */
import { useEffect, useState } from 'react';
import { mensajeErrorFirestore, listarUsuarios, abonarPuntos } from './opsData.js';

export default function OpsUsuarios() {
  const [lista, setLista] = useState([]);
  const [q, setQ] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [cant, setCant] = useState('');
  const [motivo, setMotivo] = useState('');

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

  async function abonar() {
    if (!modal || !cant || !motivo.trim()) return;
    setError('');
    try {
      await abonarPuntos(modal.uid, Number(cant), motivo.trim());
      setLista((prev) => prev.map((u) => (u.uid === modal.uid ? { ...u, saldoPuntos: (u.saldoPuntos || 0) + Number(cant) } : u)));
      setModal(null);
      setCant('');
      setMotivo('');
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="ops-card">
      <div className="ops-card-head">
        <div>
          <h2>Usuarios &amp; Comensales ({filtrados.length})</h2>
          <p className="ops-card-sub">Buscar y abonar puntos MIRA manualmente</p>
        </div>
      </div>
      {error && <p className="ops-error" role="alert">{error}</p>}
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
              <div className="ops-muted">{u.email} · {u.saldoPuntos || 0} pts · {u.tipo || 'cliente'}</div>
            </div>
            <button type="button" className="ops-btn primary sm" onClick={() => setModal(u)}>
              + Abonar puntos
            </button>
          </li>
        ))}
      </ul>

      {modal && (
        <div className="ops-modal-overlay" onClick={() => setModal(null)}>
          <div className="ops-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="ops-abono-t">
            <h3 id="ops-abono-t">Abonar a {modal.nombre || modal.email}</h3>
            <div className="ops-field">
              <label htmlFor="ops-cant">Cantidad de puntos</label>
              <input id="ops-cant" type="number" className="ops-input" value={cant} onChange={(e) => setCant(e.target.value)} />
            </div>
            <div className="ops-field">
              <label htmlFor="ops-mot">Motivo</label>
              <input id="ops-mot" type="text" className="ops-input" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Compensación, promo…" />
            </div>
            <div className="ops-modal-actions">
              <button type="button" className="ops-btn primary sm" onClick={abonar}>Confirmar</button>
              <button type="button" className="ops-btn soft sm" onClick={() => setModal(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
