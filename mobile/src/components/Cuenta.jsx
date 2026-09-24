/** Página "Mi cuenta": datos + preferencias + idioma + dieta + accesibilidad + 2FA + cookies + negocio + reservas + incidencias + reseñas + puntos. */
import { useEffect, useState } from 'react';
import { listarMisReservas } from '../services/reservaApi.js';
import { obtenerEmblemasUsuario } from '../services/emblemasApi.js';
import EmblemaAvatar from './EmblemaAvatar.jsx';
import { listarMisIncidencias } from '../services/incidenciaApi.js';
import { listarResenasDeUsuario } from '../services/resenasApi.js';
import { listarMisNegocios } from '../services/negocioApi.js';
import { ALERGENOS, normalizarDieta, normalizarAccesibilidad } from '../models/restaurantModel.js';
import { COOKIE_CATEGORIAS, COOKIE_DEFAULT, leerCookies, guardarCookies } from '../services/cookieService.js';
import { useI18n } from '../i18n/index.jsx';
import usePointsStore from '../stores/usePointsStore.js';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';

const TRADS = { es, ca, en };

function hoyISO() {
  const h = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${h.getFullYear()}-${p(h.getMonth() + 1)}-${p(h.getDate())}`;
}

export default function Cuenta({ usuario, esAdmin, perfil, dieta, guardarDieta, accesibilidad, guardarAccesibilidad, onSalir, onEnviarVerificacion, onRecargarEmailVerified }) {
  const { lang, setLang, available } = useI18n();
  const { saldoActual, rachaLogin, rachaReservas, fetchBalance } = usePointsStore();
  function t(key, params) {
    const dict = TRADS[lang] || TRADS.es;
    let val = key.split('.').reduce((o, k) => (o && o[k] != null ? o[k] : key), dict);
    if (params && typeof val === 'string') {
      val = val.replace(/\{\{(\w+)\}\}/g, (_, k) => (params[k] != null ? params[k] : `{{${k}}}`));
    }
    return val;
  }
  const [proximas, setProximas] = useState([]);
  const [emblemaEstado, setEmblemaEstado] = useState({
    totalReservas: 0,
    desbloqueados: [],
    emblema: null,
    multi: 1,
    multiTexto: 'x1.00',
    siguiente: null,
    faltan: 0,
  });
  const [incidencias, setIncidencias] = useState([]);
  const [misResenas, setMisResenas] = useState([]);
  const [misNegocios, setMisNegocios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [borrador, setBorrador] = useState(() => normalizarDieta(dieta));
  const [guardandoPrefs, setGuardandoPrefs] = useState(false);
  const [prefsOk, setPrefsOk] = useState('');

  useEffect(() => {
    if (!usuario?.uid) {
      window.location.hash = '#/login';
      return;
    }
    fetchBalance();
    let vivo = true;
    (async () => {
      const [todasRes, incRes, resRes, negRes] = await Promise.allSettled([
        listarMisReservas(usuario.uid),
        listarMisIncidencias({ uid: usuario.uid, email: usuario.email }),
        listarResenasDeUsuario(usuario.uid),
        listarMisNegocios(usuario.uid),
      ]);
      if (!vivo) return;
      const todas = todasRes.status === 'fulfilled' ? todasRes.value : [];
      const inc = incRes.status === 'fulfilled' ? incRes.value : [];
      const res = resRes.status === 'fulfilled' ? resRes.value : [];
      const neg = negRes.status === 'fulfilled' ? negRes.value : [];
      const hoy = hoyISO();
      setProximas(todas.filter((r) => String(r.estado || '').toLowerCase() !== 'cancelada' && r.fecha >= hoy).slice(0, 3));
      setIncidencias(inc.slice(0, 5));
      setMisResenas(res.slice(0, 5));
      setMisNegocios(neg.slice(0, 5));
      setCargando(false);
      if (todasRes.status !== 'fulfilled') return;
      try {
        const emb = await obtenerEmblemasUsuario(usuario.uid, todas);
        if (vivo) setEmblemaEstado(emb);
      } catch {
        /* emblemas opcionales */
      }
    })();
    return () => { vivo = false; };
  }, [usuario, fetchBalance]);

  const [borradorAcc, setBorradorAcc] = useState(() => normalizarAccesibilidad(accesibilidad));
  const [guardandoAcc, setGuardandoAcc] = useState(false);
  const [accOk, setAccOk] = useState('');

  useEffect(() => { setBorrador(normalizarDieta(dieta)); }, [dieta]);
  useEffect(() => { setBorradorAcc(normalizarAccesibilidad(accesibilidad)); }, [accesibilidad]);

  function toggleDieta(campo) { setBorrador((prev) => ({ ...prev, [campo]: !prev[campo] })); setPrefsOk(''); }
  function toggleAlergia(key) { setBorrador((prev) => ({ ...prev, alergias: prev.alergias.includes(key) ? prev.alergias.filter((x) => x !== key) : [...prev.alergias, key] })); setPrefsOk(''); }

  async function guardarPrefs(e) {
    e.preventDefault(); setGuardandoPrefs(true); setPrefsOk('');
    try { await guardarDieta(borrador); setPrefsOk(t('cuenta.dietaGuardada')); }
    catch { setPrefsOk(t('cuenta.dietaError')); }
    finally { setGuardandoPrefs(false); }
  }

  function toggleAcc(campo) { setBorradorAcc((prev) => ({ ...prev, [campo]: !prev[campo] })); setAccOk(''); }
  async function guardarAcc(e) {
    e.preventDefault(); setGuardandoAcc(true); setAccOk('');
    try { await guardarAccesibilidad(borradorAcc); setAccOk(t('cuenta.accesibilidadGuardada')); }
    catch { setAccOk(t('cuenta.accesibilidadError')); }
    finally { setGuardandoAcc(false); }
  }

  const [verificando, setVerificando] = useState(false);
  const [verOk, setVerOk] = useState('');
  const [verError, setVerError] = useState('');

  async function enviarVerificacion() {
    setVerError(''); setVerOk(''); setVerificando(true);
    try {
      await onEnviarVerificacion();
      setVerOk(t('cuenta.correoEnviado'));
    } catch (err) {
      setVerError(err.message || t('cuenta.correoError'));
    } finally {
      setVerificando(false);
    }
  }

  async function recargarVerificacion() {
    setVerError(''); setVerOk('');
    try {
      const verificado = await onRecargarEmailVerified();
      if (verificado) {
        setVerOk(t('cuenta.correoVerificadoOk'));
      } else {
        setVerError(t('cuenta.correoNoCambiado'));
      }
    } catch {
      setVerError(t('cuenta.comprobarError'));
    }
  }

  const [cookiesPrefs, setCookiesPrefs] = useState({ ...COOKIE_DEFAULT });
  const [cookiesOk, setCookiesOk] = useState('');
  useEffect(() => {
    if (!usuario?.uid) return;
    leerCookies(usuario.uid).then(setCookiesPrefs);
  }, [usuario]);

  async function guardarCookiesCuenta() {
    setCookiesOk('');
    await guardarCookies(cookiesPrefs, usuario?.uid);
    setCookiesOk(t('cuenta.cookiesGuardadas'));
  }

  if (!usuario) return null;

  const inicial = (usuario.nombre || usuario.email || '?').trim().charAt(0).toUpperCase();
  const miembroDesde = usuario.creado
    ? new Date(usuario.creado).toLocaleDateString(t('modelos.locale'), { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

  const { totalReservas, emblema, multiTexto, siguiente, faltan } = emblemaEstado;
  const nombreEmblema = emblema ? t(`emblemas.${emblema.id}`) : '';
  const nombreSiguiente = siguiente ? t(`emblemas.${siguiente.id}`) : '';

  let textoProgreso;
  if (totalReservas === 0) {
    textoProgreso = t('emblemas.sinEmblema');
  } else if (siguiente && faltan > 0) {
    textoProgreso = faltan === 1
      ? t('emblemas.faltaUna', { siguiente: nombreSiguiente })
      : t('emblemas.faltan', { n: faltan, siguiente: nombreSiguiente });
  } else {
    textoProgreso = t('emblemas.maximo');
  }

  return (
    <section className="auth-pagina" aria-labelledby="cuenta-titulo">
      <div className="auth-tarjeta">
        <div className="emblema-progreso" aria-live="polite">
          <p className="emblema-progreso-label">{t('emblemas.tituloProgreso')}</p>
          <p className={`emblema-progreso-titulo${emblema ? ` emblema-progreso-titulo--activo emblema-progreso-titulo--${emblema.id}` : ''}`}>
            {emblema ? t('emblemas.tituloNivel', { nombre: nombreEmblema }) : ' '}
          </p>
          <EmblemaAvatar inicial={inicial} emblema={emblema} size="lg" />
          <p className="emblema-progreso-texto">{textoProgreso}</p>
          <p className="emblema-progreso-racha" title={t('emblemas.multiplicador', { multi: multiTexto })}>
            <span className="emblema-progreso-racha-icono" aria-hidden="true">🔥</span>
            <span className="emblema-progreso-racha-nombre">{t('emblemas.multiplicador')}</span>
            <strong className="emblema-progreso-racha-valor">{multiTexto}</strong>
          </p>
        </div>
        <h1 id="cuenta-titulo">{usuario.nombre || t('cuenta.miCuenta')}</h1>
        <dl className="cuenta-datos">
          <div><dt>{t('cuenta.email')}</dt><dd>{usuario.email}</dd></div>
          <div><dt>{t('cuenta.verificado')}</dt><dd style={{ color: usuario.emailVerified ? 'var(--verde)' : 'var(--naranja)' }}>{usuario.emailVerified ? `✓ ${t('cuenta.si')}` : t('cuenta.noVerificado')}</dd></div>
          <div><dt>{t('cuenta.miembroDesde')}</dt><dd>{miembroDesde}</dd></div>
        </dl>
        <p className="cuenta-acciones">
          <a href="#buscar" className="btn-cta">{t('cuenta.buscarRestaurantes')}</a>
          <button type="button" className="btn-secundario" onClick={onSalir}>{t('cuenta.cerrarSesion')}</button>
        </p>

        {/* --- DASHBOARD PANEL --- */}
        {(esAdmin || perfil?.tipo === 'empresa') && (
          <div className="cuenta-dashboard-banner">
            <h2 className="cuenta-sub">{esAdmin ? 'Panel de Administración' : 'Panel de Restaurante'}</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.8rem' }}>
              {esAdmin
                ? 'Gestiona usuarios, restaurantes, reservas, comisiones y analytics de la plataforma.'
                : 'Gestiona tu restaurante: información, reservas, facturación y tickets.'}
            </p>
            <a href={esAdmin ? '#/admin' : '#/dashboard'} className="btn-cta">
              {esAdmin ? 'Abrir Panel Admin' : 'Abrir Mi Panel'}
            </a>
          </div>
        )}

        {/* --- MIRA POINTS --- */}
        <h2 className="cuenta-sub">{t('points.title')}</h2>
        <div className="cuenta-points">
          <div className="cuenta-points__saldo">
            <span className="cuenta-points__amount">{saldoActual}</span>
            <span className="cuenta-points__label">{t('points.balance')}</span>
          </div>
          {rachaLogin?.dias > 0 && (
            <p style={{ fontSize: '0.9rem', color: 'var(--gris)', marginBottom: '0.5rem' }}>
              🔥 {rachaLogin.dias} {t('points.days')} {t('points.streak')} — +{Math.min(5 + 3 * Math.max(0, rachaLogin.dias - 1), 15)} pts/día
            </p>
          )}
          {rachaReservas?.semanasConsecutivas > 0 && (
            <p style={{ fontSize: '0.9rem', color: 'var(--dorado)', marginBottom: '0.5rem' }}>
              ⭐ x{rachaReservas.multiplicador} multiplicador activo
            </p>
          )}
          <div className="cuenta-points__actions">
            <a href="#/puntos" className="btn-cta btn-peq">{t('points.history')}</a>
            <a href="#/puntos/historial" className="btn-secundario btn-peq">{t('points.redeem')}</a>
            <a href="#/invitar" className="btn-secundario btn-peq">{t('points.invite')}</a>
          </div>
          <div className="cuenta-redemption">
            💰 100 pts = 1,00 € · Sin caducidad
          </div>
        </div>

        {/* --- DIETA --- */}
        <h2 className="cuenta-sub">{t('cuenta.miDieta')}</h2>
        <form onSubmit={guardarPrefs} className="prefs-form">
          {[['vegano', t('cuenta.vegano')], ['vegetariano', t('cuenta.vegetariano')]].map(([campo, etiqueta]) => (
            <label key={campo} className="campo-check" htmlFor={`pref-${campo}`}>
              <input id={`pref-${campo}`} type="checkbox" checked={Boolean(borrador[campo])} onChange={() => toggleDieta(campo)} />
              {etiqueta}
            </label>
          ))}
          <fieldset className="prefs-alergias">
            <legend>{t('cuenta.misAlergias')}</legend>
            {ALERGENOS.map(({ key, label }) => (
              <label key={key} className="campo-check" htmlFor={`alerg-${key}`}>
                <input id={`alerg-${key}`} type="checkbox" checked={borrador.alergias.includes(key)} onChange={() => toggleAlergia(key)} />
                {label}
              </label>
            ))}
          </fieldset>
          <button type="submit" className="btn-secundario btn-peq" disabled={guardandoPrefs}>
            {guardandoPrefs ? t('cuenta.guardando') : t('cuenta.guardarDieta')}
          </button>
          {prefsOk && <p className="vacio-texto" role="status">{prefsOk}</p>}
        </form>

        {/* --- ACCESIBILIDAD --- */}
        <h2 className="cuenta-sub">{t('cuenta.miAccesibilidad')}</h2>
        <form onSubmit={guardarAcc} className="prefs-form">
          <p className="vacio-texto">{t('cuenta.soloAccesibilidad')}</p>
          <label className="campo-check" htmlFor="acc-silla">
            <input id="acc-silla" type="checkbox" checked={Boolean(borradorAcc.sillaRuedas)} onChange={() => toggleAcc('sillaRuedas')} />
            {t('cuenta.sillaRuedas')}
          </label>
          <label className="campo-check" htmlFor="acc-tea">
            <input id="acc-tea" type="checkbox" checked={Boolean(borradorAcc.tea)} onChange={() => toggleAcc('tea')} />
            {t('cuenta.espectroAutista')}
          </label>
          <button type="submit" className="btn-secundario btn-peq" disabled={guardandoAcc}>
            {guardandoAcc ? t('cuenta.guardando') : t('cuenta.guardarAccesibilidad')}
          </button>
          {accOk && <p className="vacio-texto" role="status">{accOk}</p>}
        </form>

        {/* --- IDIOMA --- */}
        <h2 className="cuenta-sub">{t('cuenta.idioma')}</h2>
        <div className="lang-selector">
          {Object.entries(available).map(([code, label]) => (
            <button
              key={code}
              type="button"
              className={`lang-option${lang === code ? ' lang-activo' : ''}`}
              onClick={() => setLang(code)}
              aria-pressed={lang === code}
              title={label}
            >
              {code.toUpperCase()}
            </button>
          ))}
        </div>

        {/* --- Verificación de email --- */}
        <h2 className="cuenta-sub">{t('cuenta.verificacionCorreo')}</h2>
        <div className="prefs-form">
          {usuario.emailVerified ? (
            <div style={{ padding: '0.8rem', background: 'var(--fondo-suave)', borderRadius: 'var(--radio-peq)' }}>
              <p style={{ color: 'var(--verde)', fontWeight: 600 }}>✓ {t('cuenta.correoVerificado')}</p>
            </div>
          ) : (
            <>
              <p className="vacio-texto">{t('cuenta.correoNoVerificado')}</p>
              {verError && <p className="reserva-error" role="alert">{verError}</p>}
              {verOk && <p className="vacio-texto" role="status" style={{ color: 'var(--verde)' }}>{verOk}</p>}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button type="button" className="btn-secundario btn-peq" onClick={enviarVerificacion} disabled={verificando}>
                  {verificando ? t('cuenta.enviando') : t('cuenta.enviarVerificacion')}
                </button>
                <button type="button" className="btn-texto" onClick={recargarVerificacion}>
                  {t('cuenta.yaVerifique')}
                </button>
              </div>
            </>
          )}
        </div>

        {/* --- COOKIES --- */}
        <h2 className="cuenta-sub">{t('cuenta.preferenciasCookies')}</h2>
        <div className="prefs-form">
          <p className="vacio-texto">{t('cuenta.cookiesDescripcion')}</p>
          {COOKIE_CATEGORIAS.filter((c) => !c.requerida).map((cat) => (
            <div key={cat.key} className="cookie-item">
              <label className="campo-check" htmlFor={`cookie-${cat.key}`}>
                <input
                  id={`cookie-${cat.key}`}
                  type="checkbox"
                  checked={Boolean(cookiesPrefs[cat.key])}
                  onChange={() => setCookiesPrefs((p) => ({ ...p, [cat.key]: !p[cat.key] }))}
                />
                {t(`cookie.${cat.key}`)}
              </label>
              <span className="cookie-desc">{t(`cookie.${cat.key}Desc`)}</span>
            </div>
          ))}
          <button type="button" className="btn-secundario btn-peq" onClick={guardarCookiesCuenta}>
            {t('cuenta.guardarCookies')}
          </button>
          {cookiesOk && <p className="vacio-texto" role="status">{cookiesOk}</p>}
        </div>

        {/* --- NEGOCIO --- */}
        {(perfil?.tipo === 'empresa' || esAdmin) && (
          <>
            <h2 className="cuenta-sub">{t('cuenta.miNegocio')}</h2>
            {perfil?.tipo === 'empresa' && (
              <p><a
                href="#/dashboard"
                className="btn-cta"
                onClick={() => { try { sessionStorage.setItem('mira_abrir_crear', '1'); } catch { /* ignore */ } }}
              >{t('cuenta.anadirRestaurante')}</a></p>
            )}
            {esAdmin && (
              <p><a href="#/admin" className="btn-cta">Panel de Administracion</a></p>
            )}
            {!cargando && misNegocios.length > 0 && (
              <ul className="lista-registros">
                {misNegocios.map((n) => (
                  <li key={n.id} className="registro">
                    <div>
                      <strong>{n.nombre}</strong>
                      <div className="registro-detalle">
                        {n.ciudad} · {n.estado === 'aprobada' ? t('cuenta.publicado') : n.estado === 'rechazada' ? t('cuenta.rechazado') : t('cuenta.enRevision')}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {/* --- RESERVAS --- */}
        <h2 className="cuenta-sub">{t('cuenta.proximasReservas')}</h2>
        {cargando && <p>{t('otros.cargando')}</p>}
        {!cargando && proximas.length === 0 && <p className="vacio-texto">{t('cuenta.sinReservas')}</p>}
        {!cargando && proximas.length > 0 && (
          <ul className="lista-registros">
            {proximas.map((r) => (
              <li key={r.id} className="registro">
                <div>
                  <strong>{r.nombreRestaurante}</strong>
                  <div className="registro-detalle">
                    {r.fecha} · {r.hora} · {r.comensales} {Number(r.comensales) === 1 ? t('modelos.persona') : t('modelos.personas')} · <code>{r.codigo}</code>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p><a href="#/reservas">{t('cuenta.verTodasReservas')}</a></p>

        {/* --- INCIDENCIAS --- */}
        <h2 className="cuenta-sub">{t('cuenta.misIncidencias')}</h2>
        {!cargando && incidencias.length === 0 && <p className="vacio-texto">{t('cuenta.sinIncidencias')}</p>}
        {!cargando && incidencias.length > 0 && (
          <ul className="lista-registros">
            {incidencias.map((r) => (
              <li key={r.id} className="registro">
                <div>
                  <strong>{r.motivo}</strong> · {r.estado === 'resuelta' ? t('cuenta.resuelta') : t('cuenta.pendiente')}
                  <div className="registro-detalle">{r.mensaje}</div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* --- RESEÑAS --- */}
        <h2 className="cuenta-sub">{t('cuenta.misResenas')}</h2>
        {!cargando && misResenas.length === 0 && <p className="vacio-texto">{t('cuenta.sinResenas')}</p>}
        {!cargando && misResenas.length > 0 && (
          <ul className="lista-registros">
            {misResenas.map((r) => (
              <li key={r.id} className="registro">
                <div>
                  <strong>★ {r.puntuacion}</strong>
                  <span className="registro-detalle"> · {r.fecha || ''} · {r.likes || 0} likes</span>
                  <div className="registro-detalle">{r.comentario}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
