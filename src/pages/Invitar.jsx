import { useState, useEffect } from 'react';
import InvitePanel from '../components/points/InvitePanel';
import useInviteStore from '../stores/useInviteStore';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';

const TRADS = { es, ca, en };

export default function Invitar() {
  const t = useT(TRADS);
  const { fetchMyInvites } = useInviteStore();

  useEffect(() => {
    fetchMyInvites();
  }, []);

  return (
    <div className="puntos-page">
      <div className="puntos-page__header">
        <h1>{t('points.invite') || 'Invita amigos'}</h1>
        <p>{t('points.inviteDesc') || 'Gana 200 puntos por cada amigo que haga 2 reservas'}</p>
      </div>
      <InvitePanel />
    </div>
  );
}
