import { useState } from 'react';
import useInviteStore from '../../stores/useInviteStore.js';
import { useT } from '../../i18n/index.jsx';
import es from '../../i18n/es.js';
import ca from '../../i18n/ca.js';
import en from '../../i18n/en.js';

const TRADS = { es, ca, en };

export default function InvitePanel() {
  const t = useT(TRADS);
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
      setError(err.message || t('points.inviteError'));
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
      <h3>{t('points.invite')}</h3>
      <p
        className="invite-panel__info"
        dangerouslySetInnerHTML={{ __html: t('points.inviteInfo') }}
      />

      <form className="invite-form" onSubmit={handleInvite}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('points.inviteEmailPlaceholder')}
          required
        />
        <button type="submit" className="btn-cta" disabled={loading}>
          {loading ? t('points.inviteSending') : t('points.inviteSend')}
        </button>
      </form>

      {error && <p className="invite-error">{error}</p>}

      <div className="invite-stats">
        <div className="invite-stat">
          <span className="invite-stat__value">{enviadas.length}</span>
          <span className="invite-stat__label">{t('points.inviteSent')}</span>
        </div>
        <div className="invite-stat">
          <span className="invite-stat__value">{aceptadas}</span>
          <span className="invite-stat__label">{t('points.inviteAccepted')}</span>
        </div>
        <div className="invite-stat">
          <span className="invite-stat__value">{puntosTotales}</span>
          <span className="invite-stat__label">{t('points.invitePointsEarned')}</span>
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
                  {copied ? t('points.inviteCopied') : t('points.inviteCopyLink')}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
