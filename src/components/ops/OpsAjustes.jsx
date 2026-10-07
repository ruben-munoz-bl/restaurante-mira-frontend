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
  return (
    <>
    <AjustesAuditoria />
    <div className="ops-card">
      <div className="ops-card-head">
        <div>
          <h2>Ajustes del Sistema</h2>
          <p className="ops-card-sub">Preferencias del panel y accesos rápidos</p>
        </div>
      </div>
      <div className="ops-list">
        <div className="ops-list-item">
          <div>
            <strong>Modo visual</strong>
            <div className="ops-muted">Claro / oscuro (igual que la app, se guarda en este navegador)</div>
          </div>
          <button type="button" className="ops-btn soft sm" onClick={onCambiarTema}>
            <span className="material-symbols-outlined">{tema === 'oscuro' ? 'dark_mode' : 'light_mode'}</span>
            {tema === 'oscuro' ? 'Oscuro' : 'Claro'}
          </button>
        </div>
        <div className="ops-list-item">
          <div>
            <strong>Sesión</strong>
            <div className="ops-muted">{usuario?.email} · rol operador (allowlist <code className="ops-code">admins</code>)</div>
          </div>
          <a className="ops-btn soft sm" href="#/cuenta">Mi cuenta</a>
        </div>
        <div className="ops-list-item">
          <div>
            <strong>Reglas de Firestore</strong>
            <div className="ops-muted">Reservas, aforo, contactos, reseñas y mensajes: solo dueño o admin</div>
          </div>
          <a className="ops-btn soft sm" href="https://console.firebase.google.com/" target="_blank" rel="noreferrer">Abrir consola</a>
        </div>
        <div className="ops-list-item">
          <div>
            <strong>Volver a la web</strong>
            <div className="ops-muted">Salir del panel operativo sin cerrar sesión</div>
          </div>
          <a className="ops-btn soft sm" href="#/">Ir a MIRA</a>
        </div>
      </div>
    </div>
    </>
  );
}
