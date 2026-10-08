/** OpsAjustes — tema, sesión y referencias operativas. */
import { useT } from '../../i18n/index.jsx';
import es from '../../i18n/es.js';
import ca from '../../i18n/ca.js';
import en from '../../i18n/en.js';

const TRADS = { es, ca, en };

export default function OpsAjustes({ usuario, tema, onCambiarTema }) {
  const t = useT(TRADS);
  return (
    <div className="ops-card">
      <div className="ops-card-head">
        <div>
          <h2>{t('ops.seccAjustes')}</h2>
          <p className="ops-card-sub">{t('ops.ajustesSub')}</p>
        </div>
      </div>
      <div className="ops-list">
        <div className="ops-list-item">
          <div>
            <strong>{t('ops.modoVisual')}</strong>
            <div className="ops-muted">{t('ops.temaAyuda')}</div>
          </div>
          <button type="button" className="ops-btn soft sm" onClick={onCambiarTema}>
            <span className="material-symbols-outlined">{tema === 'oscuro' ? 'dark_mode' : 'light_mode'}</span>
            {tema === 'oscuro' ? t('ops.oscuro') : t('ops.claro')}
          </button>
        </div>
        <div className="ops-list-item">
          <div>
            <strong>{t('ops.sesion')}</strong>
            <div className="ops-muted">{usuario?.email} · {t('ops.rolOperador')} <code className="ops-code">admins</code>)</div>
          </div>
          <a className="ops-btn soft sm" href="#/cuenta">{t('ops.miCuenta')}</a>
        </div>
        <div className="ops-list-item">
          <div>
            <strong>{t('ops.reglasFirestore')}</strong>
            <div className="ops-muted">{t('ops.reglasAyuda')}</div>
          </div>
          <a className="ops-btn soft sm" href="https://console.firebase.google.com/" target="_blank" rel="noreferrer">{t('ops.abrirConsola')}</a>
        </div>
        <div className="ops-list-item">
          <div>
            <strong>{t('ops.volverWeb')}</strong>
            <div className="ops-muted">{t('ops.volverWebAyuda')}</div>
          </div>
          <a className="ops-btn soft sm" href="#/">{t('ops.irMira')}</a>
        </div>
      </div>
    </div>
  );
}
