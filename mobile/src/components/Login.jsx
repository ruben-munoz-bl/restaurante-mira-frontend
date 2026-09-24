/** View pura: inicio de sesión + enlace a recuperación por email + Google Sign-In. */
import { useState } from 'react';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';

const TRADS = { es, ca, en };
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function avisoResetDesdeHash() {
  try {
    const h = window.location.hash || '';
    if (h.includes('reset=ok')) return 'ok';
    if (h.includes('reset=enviado')) return 'enviado';
  } catch {
    /* sin aviso */
  }
  return '';
}

export default function Login({ onLogin, onLoginGoogle, yaTieneSesion }) {
  const t = useT(TRADS);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [avisoReset] = useState(avisoResetDesdeHash);
  const [cargandoGoogle, setCargandoGoogle] = useState(false);

  async function manejarEnvio(e) {
    e.preventDefault();
    if (!EMAIL_OK.test(email.trim())) return setError(t('auth.correoInvalido'));
    if (password.length < 6) return setError(t('auth.contrasenaCorta'));
    setError('');
    setEnviando(true);
    try {
      await onLogin({ email, password });
      window.location.hash = '#/';
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  async function manejarGoogle() {
    setCargandoGoogle(true);
    setError('');
    try {
      await onLoginGoogle();
      window.location.hash = '#/';
    } catch (err) {
      setError(err.message);
    } finally {
      setCargandoGoogle(false);
    }
  }

  if (yaTieneSesion) {
    window.location.hash = '#/';
    return null;
  }

  return (
    <section className="auth-pagina" aria-labelledby="login-titulo">
      <form className="auth-tarjeta" onSubmit={manejarEnvio} noValidate>
        <h1 id="login-titulo">{t('auth.iniciarSesion')}</h1>
        <p className="auth-sub">{t('auth.entraParaGuardar')}</p>
        {avisoReset === 'ok' && (
          <p className="auth-sub" role="status" aria-live="polite" style={{ color: 'var(--verde)', fontWeight: 600 }}>
            {t('auth.contrasenaCambiada')}
          </p>
        )}
        {avisoReset === 'enviado' && (
          <p className="auth-sub" role="status" aria-live="polite" style={{ color: 'var(--verde)', fontWeight: 600 }}>
            {t('auth.revisaSpam')}
          </p>
        )}
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        <div className="campo">
          <label htmlFor="login-email">{t('auth.correo')}</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="campo">
          <label htmlFor="login-pass">{t('auth.contrasena')}</label>
          <input
            id="login-pass"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit" className="btn-cta btn-grande auth-boton" disabled={enviando}>
          {enviando ? t('auth.entrando') : t('auth.entrar')}
        </button>

        <button
          type="button"
          className="btn-google auth-boton"
          onClick={manejarGoogle}
          disabled={cargandoGoogle}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.7rem',
            background: '#fff',
            color: '#333',
            border: '1px solid #ccc',
            borderRadius: '999px',
            padding: '0.7rem 1.5rem',
            fontWeight: 600,
            cursor: cargandoGoogle ? 'not-allowed' : 'pointer',
            fontSize: '0.95rem',
            opacity: cargandoGoogle ? 0.7 : 1,
            transition: 'opacity 0.2s',
            marginTop: '0.5rem',
            width: '100%',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          {cargandoGoogle ? t('auth.googleEntrando') : t('auth.googleContinuar')}
        </button>

        <p className="auth-alt" style={{ margin: '0.6rem 0 0' }}>
          <a href="#/recuperar">{t('auth.olvidasteContrasena')}</a>
        </p>

        <p className="auth-alt">
          {t('auth.noTienesCuenta')} <a href="#/registro">{t('auth.creaUnaGratis')}</a>
        </p>
      </form>
    </section>
  );
}
