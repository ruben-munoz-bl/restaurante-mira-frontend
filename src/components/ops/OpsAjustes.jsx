/** OpsAjustes — tema, sesión y referencias operativas. */
export default function OpsAjustes({ usuario, tema, onCambiarTema }) {
  return (
    <div className="ops-card">
      <div className="ops-card-head">
        <div>
          <h2>Ajustes &amp; Auditoría</h2>
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
  );
}
