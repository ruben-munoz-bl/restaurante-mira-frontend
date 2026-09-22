/**
 * View pura: cabecera glassmorphic con sesión (todo por props, sin lógica de negocio).
 * En móvil el menú colapsa tras el botón hamburguesa (estado solo visual).
 */
import { useEffect, useState } from 'react';
import { useT, useI18n } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';

const TRADS = { es, ca, en };

export default function Header({ usuario, esAdmin, perfil, numFavoritos, noLeidos, puntosSaldo, tema, onCambiarTema, onSalir, onStreakClick, fetchStreakData }) {
  const t = useT(TRADS);
  const { lang, cycleLang, available } = useI18n();
  const [abierto, setAbierto] = useState(false);
  const [oculto, setOculto] = useState(false);
  const [loadingStreak, setLoadingStreak] = useState(false);

  useEffect(() => {
    if (!abierto) return undefined;
    function alTeclar(e) {
      if (e.key === 'Escape') setAbierto(false);
    }
    window.addEventListener('keydown', alTeclar);
    return () => window.removeEventListener('keydown', alTeclar);
  }, [abierto]);

  useEffect(() => {
    let ultimo = window.scrollY;
    let turno = false;
    function alDesplazar() {
      if (turno) return;
      turno = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        setOculto(y > 60);
        ultimo = y;
        turno = false;
      });
    }
    window.addEventListener('scroll', alDesplazar, { passive: true });
    return () => window.removeEventListener('scroll', alDesplazar);
  }, []);

  function cerrar() {
    setAbierto(false);
  }

  async function handleStreakTap() {
    if (loadingStreak || !usuario) return;
    setLoadingStreak(true);
    try {
      const data = await fetchStreakData?.();
      onStreakClick?.(data || { racha: { dias: 0 }, puntos: 0, yaReclamado: true });
    } catch {
      onStreakClick?.({ racha: { dias: 0 }, puntos: 0, yaReclamado: true });
    } finally {
      setLoadingStreak(false);
    }
  }

  function conmutarMensajes(e) {
    if (window.location.hash === '#/mensajes') {
      e.preventDefault();
      cerrar();
      window.location.hash = '#/';
    }
  }

  return (
    <header className={`site-header${oculto ? ' oculto' : ''}`}>
      <a href="#/" className="logo logo-imagen" aria-label="MIRA - inicio" onClick={cerrar}>
        <img src="/logo.png" alt="MIRA" />
      </a>
      <button
        type="button"
        className="tema-boton"
        onClick={onCambiarTema}
        aria-label={tema === 'oscuro' ? t('nav.modoClaro') : t('nav.modoOscuro')}
        aria-pressed={tema === 'oscuro'}
        title={tema === 'oscuro' ? t('nav.modoClaro') : t('nav.modoOscuro')}
      >
        ◐
      </button>
      <button
        type="button"
        className="lang-boton"
        onClick={cycleLang}
        aria-label={available[lang]}
        title={available[lang]}
      >
        {lang.toUpperCase()}
      </button>
      <button
        type="button"
        className="menu-boton"
        aria-expanded={abierto}
        aria-controls="menu-movil"
        aria-label={abierto ? t('nav.cerrarMenu') : t('nav.abrirMenu')}
        onClick={() => setAbierto((v) => !v)}
      >
        {abierto ? '✕' : '☰'}
      </button>
      <div id="menu-movil" className={`header-menu${abierto ? ' abierto' : ''}`}>
        <nav aria-label={t('nav.navegacion')} onClick={cerrar}>
          <ul className="nav-list">
            <li><a href="#inicio">{t('nav.descubrir')}</a></li>
            <li><a href="#/mapa">{t('nav.mapa')}</a></li>
            <li><a href="#/reservas">{t('nav.reservas')}</a></li>
            <li><a href="#/contacto">{t('nav.contacto')}</a></li>
          </ul>
        </nav>
        <div className="header-cuentas" onClick={cerrar}>
          {usuario ? (
            <>
              <a href="#/puntos" className="header-points-pill" title={t('points.title')}>
                <img src="/moneda-mira.png" alt="" className="header-points-pill-coin" />
                {puntosSaldo || 0}
              </a>
              <button
                type="button"
                className={`header-streak-btn${loadingStreak ? ' header-streak-btn--loading' : ''}`}
                onClick={handleStreakTap}
                aria-label="Abrir racha diaria"
                title="Racha diaria"
              >
                <img src="/racha-fuego.png" alt="" className="header-streak-btn-img" />
              </button>
              <a href="#/favoritos" className="btn-texto btn-fav" aria-label={`${t('nav.favoritos')} (${numFavoritos})`}>
                ♥{numFavoritos > 0 ? ` ${numFavoritos}` : ''}
              </a>
              <a href="#/mensajes" className="btn-texto btn-fav" onClick={conmutarMensajes} aria-label={`${t('mensajes.titulo')}${noLeidos > 0 ? `, ${noLeidos} ${t('mensajes.sinLeer')}` : ''}`}>
                ✉{noLeidos > 0 ? ` ${noLeidos}` : ''}
              </a>
              {esAdmin && (
                <a href="#/admin" className="header-dashboard-link header-dashboard-admin" title="Panel de Administracion">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                  </svg>
                  <span>Panel Admin</span>
                </a>
              )}
              {perfil?.tipo === 'empresa' && (
                <a href="#/dashboard" className="header-dashboard-link header-dashboard-restaurante" title="Mi Panel de Restaurante">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                  </svg>
                  <span>Mi Panel</span>
                </a>
              )}
              <a href="#/cuenta" className="header-cuenta-link" title={usuario.email}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M19 21v-2a4 4 0 00-4-4H9a4 4 0 00-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <span>{t('nav.miCuenta')}</span>
                <span className="header-cuenta-nombre">{usuario.nombre || usuario.email}</span>
              </a>
              <button type="button" className="btn-texto header-logout" onClick={onSalir} aria-label={t('nav.cerrarSesion')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                <span>{t('nav.cerrarSesion')}</span>
              </button>
            </>
          ) : (
            <>
              <a href="#/favoritos" className="btn-texto btn-fav" aria-label={`${t('nav.favoritos')} (${numFavoritos})`}>
                ♥{numFavoritos > 0 ? ` ${numFavoritos}` : ''}
              </a>
              <a href="#/login" className="header-login">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M19 21v-2a4 4 0 00-4-4H9a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                {t('nav.iniciarSesion')}
              </a>
              <a href="#/registro" className="btn-cta btn-peq header-registro">
                {t('nav.crearCuenta')}
              </a>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
