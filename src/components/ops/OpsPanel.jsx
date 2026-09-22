/**
 * OpsPanel — Panel de Control Operativo & Revenue (solo admin).
 * Shell: sidebar + header + secciones. Los datos los carga cada sección.
 * Sin cambios: si no hay sesión -> login; si no es admin -> aviso.
 */
import { useEffect, useState } from 'react';
import OpsDashboard from './OpsDashboard.jsx';
import OpsReservas from './OpsReservas.jsx';
import OpsIncidencias from './OpsIncidencias.jsx';
import OpsRestaurantes from './OpsRestaurantes.jsx';
import OpsFinanzas from './OpsFinanzas.jsx';
import OpsUsuarios from './OpsUsuarios.jsx';
import OpsAjustes from './OpsAjustes.jsx';
import '../../styles/ops.css';

const SECCIONES = [
  { id: 'dashboard', nombre: 'Dashboard General', icono: 'dashboard' },
  { id: 'restaurantes', nombre: 'Gestión Restaurantes', icono: 'restaurant', badge: '+14' },
  { id: 'reservas', nombre: 'Reservas Globales', icono: 'calendar_month', live: true },
  { id: 'finanzas', nombre: 'Finanzas & Comisiones', icono: 'payments' },
  { id: 'incidencias', nombre: 'Incidencias & Soporte', icono: 'report_problem', badgeCrit: true },
  { id: 'usuarios', nombre: 'Usuarios & Comensales', icono: 'group' },
  { id: 'ajustes', nombre: 'Ajustes & Auditoría', icono: 'settings' },
];

export default function OpsPanel({ usuario, esAdmin, perfil, tema, onCambiarTema, todos }) {
  const [seccion, setSeccion] = useState('dashboard');
  const [menuMovil, setMenuMovil] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [criticas, setCriticas] = useState(0);
  const [sidebarFija, setSidebarFija] = useState(false);

  useEffect(() => {
    if (!esAdmin) return;
    let vivo = true;
    import('../../services/incidenciaApi.js').then(({ listarPendientes }) =>
      listarPendientes()
        .then((l) => {
          if (!vivo) return;
          setCriticas(l.filter((p) => /no-show|cargo|disputa|cobro/i.test(`${p.motivo || ''} ${p.mensaje || ''}`)).length);
        })
        .catch(() => {}),
    );
    return () => { vivo = false; };
  }, [esAdmin]);

  if (!usuario?.uid) {
    window.location.hash = '#/login';
    return null;
  }
  if (!esAdmin) {
    return (
      <div className="ops-shell">
        <div className="ops-content" style={{ maxWidth: 640 }}>
          <div className="ops-card" role="alert">
            <h2>Sin acceso</h2>
            <p className="ops-card-sub">Este panel es solo para operadores (allowlist de admins).</p>
            <p style={{ marginTop: 12 }}><a className="ops-btn primary" href="#/">Volver al inicio</a></p>
          </div>
        </div>
      </div>
    );
  }

  const nombre = perfil?.nombre || usuario.displayName || usuario.email || 'Operador';
  const inicial = (nombre.trim().charAt(0) || 'O').toUpperCase();

  function ir(id) {
    setSeccion(id);
    setMenuMovil(false);
  }

  return (
    <div className="ops-shell">
      <div className="ops-body">
          <div className="ops-sidebar-trigger" onMouseEnter={() => setSidebarFija(true)} />
          <aside className={`ops-sidebar${menuMovil ? ' open' : ''}${sidebarFija ? ' pinned' : ''}`}
            onMouseLeave={() => setSidebarFija(false)}
            aria-label="Navegación del panel">
          <div>
            <div className="ops-brand">
              <img src="/logo.png" alt="MIRA" onError={(e) => { e.currentTarget.src = '/logotipo.png'; }} />
              <div>
                <div className="ops-brand-name">MIRA</div>
                <div className="ops-brand-sub">Operator Hub</div>
              </div>
            </div>
            <div className="ops-nav-label">Plataforma Global</div>
            <nav className="ops-nav">
              {SECCIONES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => ir(s.id)}
                  aria-current={seccion === s.id ? 'page' : undefined}
                  className={`ops-nav-item${seccion === s.id ? ' active' : ''}`}
                >
                  <span className="ops-nav-item-left">
                    <span className="material-symbols-outlined">{s.icono}</span>
                    <span>{s.nombre}</span>
                  </span>
                  {s.badge && <span className="ops-badge">{s.badge}</span>}
                  {s.live && <span className="ops-dot-live" aria-label="En directo" />}
                  {s.badgeCrit && criticas > 0 && <span className="ops-badge crit">{criticas} críticas</span>}
                </button>
              ))}
            </nav>
          </div>
          <div className="ops-side-foot">
            <div className="ops-sys">
              <span>Sistemas 99.98% OK</span>
              <span className="ops-sys-live">Live</span>
            </div>
            <div className="ops-theme-row">
              <span>Modo visual</span>
              <button type="button" className="ops-theme-btn" onClick={onCambiarTema} aria-label="Cambiar tema">
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                  {tema === 'oscuro' ? 'dark_mode' : 'light_mode'}
                </span>
                {tema === 'oscuro' ? 'Oscuro' : 'Claro'}
              </button>
            </div>
            <div className="ops-userbox">
              <span className="ops-avatar" aria-hidden="true">{inicial}</span>
              <div style={{ minWidth: 0 }}>
                <div className="ops-userbox-name">{nombre}</div>
                <div className="ops-userbox-mail">{usuario.email}</div>
              </div>
            </div>
          </div>
        </aside>

        <div className="ops-main">
          <header className="ops-header">
            <button type="button" className="ops-icon-btn ops-menu-btn" onClick={() => setMenuMovil((v) => !v)} aria-label="Abrir menú">
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div className="ops-search">
              <span className="material-symbols-outlined">search</span>
              <input
                type="search"
                placeholder="Buscar restaurante, reserva #ID, comensal o ticket..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && busqueda.trim()) {
                    setSeccion('reservas');
                  }
                }}
                aria-label="Buscar en el panel"
              />
            </div>
            <div className="ops-header-spacer" />
            <div className="ops-select hide-m">
              <span className="material-symbols-outlined">calendar_today</span>
              <select aria-label="Periodo">
                <option>Hoy</option>
                <option>Esta semana</option>
                <option>Mes actual</option>
              </select>
            </div>
            <div className="ops-select hide-m">
              <span className="material-symbols-outlined">location_on</span>
              <select aria-label="Región">
                <option>Cataluña</option>
                <option>Todas las regiones</option>
              </select>
            </div>
            <button type="button" className="ops-icon-btn" aria-label="Notificaciones" onClick={() => ir('incidencias')}>
              <span className="material-symbols-outlined">notifications</span>
              {criticas > 0 && <span className="ops-ping-dot" />}
            </button>
            <div className="ops-profile">
              <span className="ops-avatar" aria-hidden="true">{inicial}</span>
              <div className="ops-profile-meta">
                <strong>{nombre}</strong>
                <span>Master Operator</span>
              </div>
            </div>
          </header>

          <main className="ops-content">
            {seccion === 'dashboard' && <OpsDashboard usuario={usuario} todos={todos} />}
            {seccion === 'restaurantes' && <OpsRestaurantes todos={todos} />}
            {seccion === 'reservas' && <OpsReservas busquedaInicial={busqueda} />}
            {seccion === 'finanzas' && <OpsFinanzas />}
            {seccion === 'incidencias' && <OpsIncidencias />}
            {seccion === 'usuarios' && <OpsUsuarios />}
            {seccion === 'ajustes' && <OpsAjustes usuario={usuario} tema={tema} onCambiarTema={onCambiarTema} />}
          </main>
        </div>
      </div>
    </div>
  );
}
