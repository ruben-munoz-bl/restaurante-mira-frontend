/** OpsAjustes — tema, sesión, registro de auditoría y referencias operativas. */
import { useEffect, useState } from 'react';
import { auditoriaApi } from '../../services/auditoria.js';
import { useT } from '../../i18n/index.jsx';
import es from '../../i18n/es.js';
import ca from '../../i18n/ca.js';
import en from '../../i18n/en.js';

const TRADS = { es, ca, en };

/** Los ajustes viven en auditoria_estado (BD): el cambio se aplica a todos los admins y queda auditado. */
function AjustesAuditoria() {
  const t = useT(TRADS);
  const [ajustes, setAjustes] = useState(null);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    auditoriaApi.estado().then((e) => setAjustes(e.ajustes)).catch((e) => setError(e.message));
  }, []);

  async function cambiar(campo) {
    setGuardando(true);
    setError('');
    try {
      const r = await auditoriaApi.guardarAjustes({ [campo]: !ajustes[campo] });
      setAjustes(r.ajustes);
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  const fila = (campo, titulo, sub) => (
    <div className="ops-list-item" key={campo}>
      <div><strong>{titulo}</strong><div className="ops-muted">{sub}</div></div>
      <button type="button" role="switch" aria-checked={Boolean(ajustes?.[campo])} disabled={!ajustes || guardando}
        className={`ops-sim-switch${ajustes?.[campo] ? ' on' : ''}`} onClick={() => cambiar(campo)}>
        <span className="ops-sim-track"><i /></span>{ajustes ? (ajustes[campo] ? 'Sí' : 'No') : '—'}
      </button>
    </div>
  );

  return (
    <div className="ops-card">
      <div className="ops-card-head"><div><h2>{t('auditoria.ajustesTitulo')}</h2></div></div>
      {error && <p className="ops-error" role="alert">{error}</p>}
      <div className="ops-list">
        {fila('registroActivo', t('auditoria.registroActivo'), t('auditoria.registroActivoSub'))}
        {fila('excluirPropio', t('auditoria.excluirPropio'), t('auditoria.excluirPropioSub'))}
      </div>
    </div>
  );
}

export default function OpsAjustes({ usuario, tema, onCambiarTema }) {
  const t = useT(TRADS);
  return (
    <>
    <AjustesAuditoria />
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
    </>
  );
}
