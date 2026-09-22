/**
 * Controller-orquestador: monta la landing y la sección del buscador,
 * más las rutas '#/login' y '#/registro' (hash routing sin dependencias).
 * Es el único que habla con los Controllers (hooks); las Views reciben props.
 */
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRestaurantController } from './controllers/useRestaurantController.js';
import { useAuth } from './controllers/useAuth.js';
import { useI18n, useT } from './i18n/index.jsx';
import { PRECIOS, DISTANCIAS, ORDENES } from './models/restaurantModel.js';
import usePointsStore from './stores/usePointsStore.js';
import es from './i18n/es.js';
import ca from './i18n/ca.js';
import en from './i18n/en.js';
import Header from './components/Header.jsx';
import Hero from './components/Hero.jsx';
import SearchBar from './components/SearchBar.jsx';
import RestaurantList from './components/RestaurantList.jsx';
import RestaurantDetail from './components/RestaurantDetail.jsx';
import Login from './components/Login.jsx';
import Recuperar from './components/Recuperar.jsx';
import Restablecer from './components/Restablecer.jsx';
import Registro from './components/Registro.jsx';
import Cuenta from './components/Cuenta.jsx';
import Contacto from './components/Contacto.jsx';
import Reservas from './components/Reservas.jsx';
import Admin from './components/Admin.jsx';
import OpsPanel from './components/ops/OpsPanel.jsx';
import Negocio from './components/Negocio.jsx';
import Favoritos from './components/Favoritos.jsx';
import Mensajes from './components/Mensajes.jsx';
import Mapa from './components/Mapa.jsx';
import Privacidad from './components/Privacidad.jsx';
import LibroCarta from './components/LibroCarta.jsx';
import PromoBanner from './components/PromoBanner.jsx';
import RestaurantSkeleton from './components/RestaurantSkeleton.jsx';
import CookieBanner from './components/CookieBanner.jsx';
import Footer from './components/Footer.jsx';
import BottomNav from './components/BottomNav.jsx';
import FloatingReservation from './components/FloatingReservation.jsx';
import DailyStreakPopup from './components/DailyStreakPopup.jsx';
import WheelModal from './components/WheelModal.jsx';
import PuntosDashboard from './pages/PuntosDashboard.jsx';
import HistorialPuntos from './pages/HistorialPuntos.jsx';
import Invitar from './pages/Invitar.jsx';
import TicketPage from './pages/TicketPage.jsx';
import Dashboard from './components/dashboard/Dashboard.jsx';
import { enviarContacto } from './services/contactoApi.js';
import { proponerNegocio } from './services/negocioApi.js';
import useDailyLogin from './hooks/useDailyLogin.js';
import './App.css';
import { I18nProvider } from './i18n/index.jsx';

function baseHash() {
  const h = window.location.hash || '';
  const q = h.indexOf('?');
  return q === -1 ? h : h.slice(0, q);
}

function rutaActual() {
  const h = baseHash();
  if (h === '#/login') return 'login';
  if (h === '#/recuperar') return 'recuperar';
  if (h === '#/restablecer') return 'restablecer';
  if (h === '#/registro') return 'registro';
  if (h === '#/cuenta') return 'cuenta';
  if (h === '#/contacto') return 'contacto';
  if (h === '#/reservas') return 'reservas';
  if (h === '#/admin') return 'admin';
  if (h === '#/negocio') return 'negocio';
  if (h === '#/favoritos') return 'favoritos';
  if (h === '#/mensajes') return 'mensajes';
  if (h === '#/mapa') return 'mapa';
  if (h === '#/privacidad') return 'privacidad';
  if (h === '#/puntos') return 'puntos';
  if (h === '#/puntos/historial') return 'historialPuntos';
  if (h === '#/invitar') return 'invitar';
  if (h.startsWith('#/ticket/')) return 'ticket';
  if (h === '#/dashboard') return 'dashboard';
  return 'home';
}

export default function App() {
  const { usuario, crearCuenta, iniciarSesion, iniciarSesionGoogle, cerrarSesion, esAdmin, perfil, recargarPerfil, dieta, guardarDieta, accesibilidad, guardarAccesibilidad, favoritos, toggleFavorito, noLeidos, recargarMensajes, enviarVerificacionEmail, recargarEmailVerified } = useAuth();
  const [tema, setTema] = useState(() => {
    try {
      const guardado = localStorage.getItem('mira:tema');
      if (guardado === 'claro' || guardado === 'oscuro') return guardado;
    } catch {
      /* sin almacenamiento: se usa el sistema */
    }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro';
  });

  useEffect(() => {
    if (tema === 'oscuro') {
      document.documentElement.dataset.theme = 'dark';
    } else {
      delete document.documentElement.dataset.theme;
    }
    try {
      localStorage.setItem('mira:tema', tema);
    } catch {
      /* sin almacenamiento: solo sesión */
    }
  }, [tema]);

  return (
    <I18nProvider onLangChange={perfil?.guardarLang}>
      <AppContent auth={{ usuario, crearCuenta, iniciarSesion, iniciarSesionGoogle, cerrarSesion, esAdmin, perfil, recargarPerfil, dieta, guardarDieta, accesibilidad, guardarAccesibilidad, favoritos, toggleFavorito, noLeidos, recargarMensajes, enviarVerificacion: enviarVerificacionEmail, enviarVerificacionEmail, recargarEmailVerified, guardarLang: perfil?.guardarLang }} tema={tema} setTema={setTema} />
    </I18nProvider>
  );
}

function AppContent({ auth, tema, setTema }) {
  const TRADS = useMemo(() => ({ es, ca, en }), []);
  const t = useT(TRADS);
  const { lang, setLang } = useI18n();
  const { usuario, crearCuenta, iniciarSesion, iniciarSesionGoogle, cerrarSesion, esAdmin, perfil, recargarPerfil, dieta, guardarDieta, accesibilidad, guardarAccesibilidad, favoritos, toggleFavorito, noLeidos, recargarMensajes, enviarVerificacion, enviarVerificacionEmail, recargarEmailVerified, guardarLang } = auth;
  const syncBalance = usePointsStore((s) => s.fetchBalance);

  const [puntosSaldo, setPuntosSaldo] = useState(0);
  const [inviteCodigo, setInviteCodigo] = useState(() => {
    try { return new URLSearchParams(window.location.hash.split('?')[1]).get('invite') || null; } catch { return null; }
  });

  // ── Streak popup state ──
  const [showStreakPopup, setShowStreakPopup] = useState(false);
  const [streakData, setStreakData] = useState(null);
  const [showWheel, setShowWheel] = useState(false);
  const { claim: claimDaily, claimWheel } = useDailyLogin();
  const claimedTodayKey = `dailyLogin_shown_${new Date().toISOString().split('T')[0]}`;
  const newUserKey = `streak_newuser_shown_${usuario?.uid}`;


  useEffect(() => {
    if (perfil?.lang && perfil.lang !== lang) {
      setLang(perfil.lang);
    }
  }, [perfil?.lang]);

  useEffect(() => {
    if (!usuario) return;
    import('./services/api.js').then(({ pointsApi }) => {
      Promise.all([
        pointsApi.getBalance(),
        pointsApi.isNewUser(),
      ]).then(([d, isNew]) => {
        setPuntosSaldo(d.saldoActual || 0);
        if (isNew && !sessionStorage.getItem(newUserKey)) {
          openStreakPopup({
            racha: { dias: 0 },
            puntos: 0,
            yaReclamado: false,
            nuevoSaldo: d.saldoActual,
          });
          sessionStorage.setItem(newUserKey, 'true');
        }
      }).catch(() => {});
    });
  }, [usuario]);

  async function fetchStreakData() {
    if (!usuario) return { racha: { dias: 0 }, puntos: 0, yaReclamado: true };
    try {
      const { pointsApi } = await import('./services/api.js');
      const bal = await pointsApi.getBalance();
      return {
        racha: bal.rachaLogin || { dias: 0 },
        puntos: 0,
        yaReclamado: bal.rachaLogin?.yaReclamado ?? false,
        nuevoSaldo: bal.saldoActual,
      };
    } catch {
      return { racha: { dias: 0 }, puntos: 0, yaReclamado: true };
    }
  }

  function openStreakPopup(data) {
    setStreakData(data);
    setShowStreakPopup(true);
  }

  async function handleClaimDaily() {
    console.log('[App] handleClaimDaily called');
    const result = await claimDaily();
    console.log('[App] claimDaily result:', result);
    if (result && result.nuevoSaldo) setPuntosSaldo(result.nuevoSaldo);
    if (result && result.racha) {
      setStreakData((prev) => ({
        ...prev,
        racha: result.racha,
        yaReclamado: true,
        puntos: result.puntos,
      }));
    }
    syncBalance().catch(() => {});
    return result;
  }

  function handleOpenWheel() {
    setShowStreakPopup(false);
    setShowWheel(true);
  }

  async function handleWheelSpin() {
    const result = await claimWheel();
    return result;
  }

  function handleCloseWheel(finalResult) {
    setShowWheel(false);
    sessionStorage.setItem(claimedTodayKey, 'true');
    if (finalResult && finalResult.nuevoSaldo) {
      setPuntosSaldo(finalResult.nuevoSaldo);
    }
    syncBalance().catch(() => {});
    import('./services/api.js').then(({ pointsApi }) => {
      pointsApi.getBalance().then((d) => setPuntosSaldo(d.saldoActual || 0)).catch(() => {});
    });
  }

  function handleCloseStreakPopup() {
    setShowStreakPopup(false);
    sessionStorage.setItem(claimedTodayKey, 'true');
    syncBalance().catch(() => {});
    import('./services/api.js').then(({ pointsApi }) => {
      pointsApi.getBalance().then((d) => setPuntosSaldo(d.saldoActual || 0)).catch(() => {});
    });
  }


  const {
    filtros,
    filtrados,
    todos,
    total,
    modo,
    hayMas,
    cargandoMas,
    cargarMas,
    estado,
    error,
    cocinasDisponibles,
    zonasDisponibles,
    seleccionado,
    libro,
    ocultosDieta,
    ignorarDieta,
    hayFiltrosActivos,
    actualizarFiltro,
    limpiarFiltros,
    recargar,
    abrirDetalle,
    cerrarDetalle,
    abrirCarta,
    cerrarCarta,
    verTodosIgual,
    obtenerRestaurante,
    elegirCocina,
  } = useRestaurantController({ dieta, accesibilidad });
  const [ruta, setRuta] = useState(rutaActual);

  const opciones = useMemo(() => ({
    cocinas: cocinasDisponibles,
    zonas: zonasDisponibles,
    precios: PRECIOS,
    distancias: DISTANCIAS,
    ordenes: ORDENES,
  }), [cocinasDisponibles, zonasDisponibles]);

  const esFavorito = useCallback((id) => favoritos.includes(id), [favoritos]);

  // Floating reservation sheet state
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetRestaurante, setSheetRestaurante] = useState(null);
  const [sheetReserva, setSheetReserva] = useState({ fecha: '', hora: '', comensales: '2', ahorro: 0 });

  useEffect(() => {
    function alCambiarHash() {
      setRuta(rutaActual());
      window.scrollTo(0, 0);
    }
    window.addEventListener('hashchange', alCambiarHash);
    return () => window.removeEventListener('hashchange', alCambiarHash);
  }, []);

  async function salir() {
    await cerrarSesion();
    window.location.hash = '#/';
  }

  function openFloatingSheet(restaurant, hora, comensales) {
    setSheetRestaurante(restaurant);
    setSheetReserva({ fecha: sheetReserva.fecha, hora, comensales, ahorro: Math.round(parseInt(comensales, 10) * 18 * 0.15) });
    setSheetVisible(true);
  }

  function closeFloatingSheet() {
    setSheetVisible(false);
    setTimeout(() => {
      setSheetRestaurante(null);
      setSheetReserva({ fecha: '', hora: '', comensales: '2', ahorro: 0 });
    }, 350);
  }

  function handleFloatingConfirm() {
    if (sheetRestaurante) {
      abrirDetalle(sheetRestaurante);
    }
    closeFloatingSheet();
  }

  // Google login handler
  async function handleLoginGoogle() {
    await iniciarSesionGoogle();
    window.location.hash = '#/';
  }

  return (
    <>
      <a className="skip-link" href="#buscar">
        Saltar al buscador
      </a>
      <Header usuario={usuario} esAdmin={esAdmin} perfil={perfil} numFavoritos={favoritos.length} noLeidos={noLeidos} puntosSaldo={puntosSaldo} tema={tema} onCambiarTema={() => setTema((t) => (t === 'oscuro' ? 'claro' : 'oscuro'))} onSalir={salir} onStreakClick={openStreakPopup} fetchStreakData={fetchStreakData} />
      <main>
        {usuario && !usuario.emailVerified && ruta !== 'login' && ruta !== 'registro' && ruta !== 'recuperar' && ruta !== 'restablecer' && (
          <div className="aviso-email" role="alert" style={{ background: 'var(--naranja)', color: '#fff', padding: '0.7rem 1rem', textAlign: 'center', fontSize: '0.9rem', fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <span>Tu correo no está verificado.</span>
            <a href="#/cuenta" style={{ color: '#fff', textDecoration: 'underline' }}>Verificar ahora</a>
          </div>
        )}
        {ruta === 'login' && <Login onLogin={iniciarSesion} onLoginGoogle={handleLoginGoogle} yaTieneSesion={Boolean(usuario)} />}
        {ruta === 'recuperar' && <Recuperar yaTieneSesion={Boolean(usuario)} />}
        {ruta === 'restablecer' && <Restablecer yaTieneSesion={Boolean(usuario)} />}
        {ruta === 'registro' && (
          <Registro onRegistro={crearCuenta} yaTieneSesion={Boolean(usuario)} />
        )}
        {ruta === 'cuenta' && <Cuenta usuario={usuario} esAdmin={esAdmin} perfil={perfil} dieta={dieta} guardarDieta={guardarDieta} accesibilidad={accesibilidad} guardarAccesibilidad={guardarAccesibilidad} onSalir={salir} onEnviarVerificacion={enviarVerificacionEmail} onRecargarEmailVerified={recargarEmailVerified} />}
        {ruta === 'contacto' && <Contacto usuario={usuario} onEnviar={enviarContacto} />}
        {ruta === 'reservas' && <Reservas usuario={usuario} esAdmin={esAdmin} />}
        {ruta === 'admin' && <OpsPanel usuario={usuario} esAdmin={esAdmin} perfil={perfil} tema={tema} onCambiarTema={() => setTema((v) => (v === 'oscuro' ? 'claro' : 'oscuro'))} todos={todos} />}
        {ruta === 'dashboard' && <Dashboard usuario={usuario} esAdmin={esAdmin} perfil={perfil} />}
        {ruta === 'negocio' && <Negocio usuario={usuario} perfil={perfil} onProponer={proponerNegocio} />}
        {ruta === 'favoritos' && (
          <Favoritos
            ids={favoritos}
            todos={todos}
            dieta={dieta}
            onObtenerRestaurante={obtenerRestaurante}
            onVerCarta={abrirCarta}
            onReservar={abrirDetalle}
            onToggleFavorito={toggleFavorito}
          />
        )}
        {ruta === 'mensajes' && <Mensajes usuario={usuario} onLeidos={recargarMensajes} />}
        {ruta === 'privacidad' && <Privacidad />}
        {ruta === 'puntos' && <PuntosDashboard fetchStreakData={fetchStreakData} onOpenStreak={openStreakPopup} usuario={usuario} />}
        {ruta === 'historialPuntos' && <HistorialPuntos />}
        {ruta === 'invitar' && <Invitar />}
        {ruta === 'ticket' && <TicketPage />}
        {ruta === 'mapa' && <Mapa todos={todos} total={total} onVerDetalle={abrirDetalle} />}
        {ruta === 'home' && (
          <>
            <Hero total={total} numZonas={zonasDisponibles.length} />
            <section id="buscar" className="buscar" aria-labelledby="buscar-titulo">
               <h2 id="buscar-titulo" className="buscar-titulo">
                 {t('busqueda.titulo')}
               </h2>

              {estado === 'cargando' && (
                <div className="grid" role="status" aria-label={t('otros.cargando')}>
                  {Array.from({ length: 8 }, (_, i) => (
                    <RestaurantSkeleton key={`skel-${i}`} />
                  ))}
                </div>
              )}

              {estado === 'error' && (
                <div className="error-panel" role="alert">
                  <p className="vacio-titulo">{t('otros.error')}</p>
                  <p>{error}</p>
                  <button type="button" className="btn-cta" onClick={recargar}>
                    {t('otros.reintentar')}
                  </button>
                </div>
              )}

              {estado === 'listo' && (
                <>
                  <SearchBar
                    filtros={filtros}
                    opciones={opciones}
                    hayFiltrosActivos={hayFiltrosActivos}
                    onChange={actualizarFiltro}
                    onClear={limpiarFiltros}
                  />

                    <p aria-live="polite" className="contador">
                      {modo === 'pagina'
                        ? t('lista.mostrando', { n: filtrados.length, total })
                        : `${filtrados.length} ${t('lista.de')} ${total} ${filtrados.length === 1 ? t('lista.restaurante') : t('lista.restaurantesPlural')}`}
                      {filtros.q && ` ${t('lista.de')} "${filtros.q}"`}
                    </p>
                    {ocultosDieta > 0 && !ignorarDieta && (
                      <p className="aviso">
                        {ocultosDieta} {ocultosDieta === 1 ? t('lista.localOculto') : t('lista.localesOcultos')} {t('lista.porTuDieta')}{' '}
                        <a href="#/cuenta">{t('lista.cambiarCuenta')}</a> ·{' '}
                        <button type="button" className="btn-texto" onClick={verTodosIgual}>
                          {t('lista.verTodos')}
                        </button>
                      </p>
                    )}
                  <RestaurantList
                    restaurants={filtrados}
                    filtros={filtros}
                    onClear={limpiarFiltros}
                    onSelect={abrirDetalle}
                    hayMas={modo === 'pagina' && hayMas}
                    cargandoMas={cargandoMas}
                    onLoadMore={cargarMas}
                    esFavorito={esFavorito}
                    onToggleFavorito={toggleFavorito}
                    onVerCarta={abrirCarta}
                  />
                </>
              )}
            </section>
            <PromoBanner />
          </>
        )}
      </main>
      <Footer />
      <CookieBanner usuario={usuario} />
      {seleccionado && <RestaurantDetail restaurant={seleccionado} usuario={usuario} onClose={cerrarDetalle} onVerCarta={abrirCarta} />}
      {libro && <LibroCarta restaurant={libro} dieta={dieta} onClose={cerrarCarta} />}
      <BottomNav ruta={ruta} numFavoritos={favoritos.length} numReservas={0} puntosSaldo={puntosSaldo} esAdmin={esAdmin} perfil={perfil} usuario={usuario} onStreakClick={openStreakPopup} fetchStreakData={fetchStreakData} />
      <FloatingReservation
        visible={sheetVisible}
        restaurant={sheetRestaurante}
        reserva={sheetReserva}
        onConfirm={handleFloatingConfirm}
        onClose={closeFloatingSheet}
      />
      {showStreakPopup && streakData && (
        <DailyStreakPopup
          racha={streakData.racha}
          saldo={puntosSaldo}
          yaReclamado={streakData.yaReclamado}
          onClaim={handleClaimDaily}
          onWheel={handleOpenWheel}
          onClose={handleCloseStreakPopup}
        />
      )}
      {showWheel && (
        <WheelModal
          onSpin={handleWheelSpin}
          onClose={handleCloseWheel}
        />
      )}
    </>
  );
}
