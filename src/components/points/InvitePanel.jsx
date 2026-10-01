import { useState } from 'react';
import useInviteStore from '../../stores/useInviteStore.js';

export default function InvitePanel() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const { enviadas, aceptadas, puntosTotales, createInvite } = useInviteStore();

  async function handleInvite(e) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError('');
    try {
      await createInvite(email);
      setEmail('');
    } catch (err) {
      setError(err.message || 'Error al enviar invitación');
    } finally {
      setLoading(false);
    }
  }

  function copyLink(link) {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="invite-panel">
      <h3>Invita amigos</h3>
      <p className="invite-panel__info">
        Gana <strong>200 pts</strong> cuando tu amigo haga 2 reservas.
        Máximo 5 invitaciones por mes.
      </p>

      <form className="invite-form" onSubmit={handleInvite}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email del amigo"
          required
        />
        <button type="submit" className="btn-cta" disabled={loading}>
          {loading ? 'Enviando...' : 'Invitar'}
        </button>
      </form>

      {error && <p className="invite-error">{error}</p>}

      <div className="invite-stats">
        <div className="invite-stat">
          <span className="invite-stat__value">{enviadas.length}</span>
          <span className="invite-stat__label">Enviadas</span>
        </div>
        <div className="invite-stat">
          <span className="invite-stat__value">{aceptadas}</span>
          <span className="invite-stat__label">Aceptadas</span>
        </div>
        <div className="invite-stat">
          <span className="invite-stat__value">{puntosTotales}</span>
          <span className="invite-stat__label">Puntos ganados</span>
        </div>
      </div>

      {enviadas.length > 0 && (
        <div className="invite-list">
          {enviadas.map((inv) => (
            <div key={inv.id} className="invite-item">
              <span className="invite-item__email">{inv.emailInvitado || inv.invitadoEmail}</span>
              <span className={`invite-item__status invite-item__status--${inv.estado}`}>
                {inv.estado === 'aceptada'
                  ? '✅'
                  : inv.estado === 'esperando_2_reservas' || inv.estado === 'pendiente'
                    ? '⏳'
                    : '❌'}
              </span>
              {inv.link && (
                <button className="btn-texto" onClick={() => copyLink(inv.link)}>
                  {copied ? 'Copiado' : 'Copiar link'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
