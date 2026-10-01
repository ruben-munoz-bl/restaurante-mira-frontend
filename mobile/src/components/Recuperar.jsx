/**
 * Página pública #/recuperar — solicitar enlace de recuperación de contraseña.
 * Mensaje SIEMPRE genérico (no revela si el email existe).
 */
import { useState } from 'react';
import { recuperarContrasena } from '../services/authApi.js';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';

const TRADS = { es, ca, en };
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Recuperar() {
  const t = useT(TRADS);
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);
  const [error, setError] = useState('');

  async function manejarEnvio(e) {
    e.preventDefault();
    const val = email.trim();
    if (!val) { setError(t('recuperar.errorVacio')); return; }
    if (!EMAIL_OK.test(val)) { setError(t('recuperar.errorNoValido')); return; }
    setError('');
    setEnviando(true);
    try {
      await recuperarContrasena(val);
      setExito(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="auth-pagina" aria-labelledby="recuperar-titulo">
      <div className="auth-tarjeta">
        <h1 id="recuperar-titulo">{t('recuperar.titulo')}</h1>

        {exito ? (
          <div role="status">
            <p style={{ margin: '0 0 0.8rem' }}>
              {t('recuperar.exito')}
            </p>
            <p>
              <a href="#/login" className="btn-cta btn-peq">{t('recuperar.volverLogin')}</a>
            </p>
          </div>
        ) : (
          <form onSubmit={manejarEnvio}>
            <p className="vacio-texto" style={{ margin: '0 0 0.8rem' }}>
              {t('recuperar.intro')}
            </p>
            <div className="campo">
              <label htmlFor="rec-email">{t('recuperar.correoElectronico')}</label>
              <input
                id="rec-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                placeholder="tu@correo.com"
              />
            </div>
            {error && <p className="auth-error" role="alert" style={{ margin: '0.4rem 0' }}>{error}</p>}
            <button type="submit" className="btn-cta" disabled={enviando} style={{ width: '100%', marginTop: '0.6rem' }}>
              {enviando ? t('recuperar.enviando') : t('recuperar.enviarEnlace')}
            </button>
          </form>
        )}

        <p className="auth-alt" style={{ marginTop: '1rem' }}>
          <a href="#/login">← {t('recuperar.volverLogin')}</a>
        </p>
      </div>
    </section>
  );
}
