/**
 * Página pública #/restablecer — confirmar nueva contraseña con oobCode del email.
 * Firebase gestiona el token (oobCode). Esta página solo lo valida y aplica.
 */
import { useState, useEffect } from 'react';
import { verificarCodigoReset, confirmarNuevaContrasena, enmascararEmail, extraerOobCode } from '../services/authApi.js';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';

const TRADS = { es, ca, en };

export default function Restablecer() {
  const t = useT(TRADS);
  const [paso, setPaso] = useState('cargando'); // cargando | formulario | error | exito
  const [email, setEmail] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetir, setRepetir] = useState('');
  const [mostrarPass, setMostrarPass] = useState(false);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const oobCode = extraerOobCode();

  useEffect(() => {
    if (!oobCode) {
      setPaso('error');
      setError(t('restablecer.enlaceInvalido'));
      return;
    }
    let vivo = true;
    verificarCodigoReset(oobCode)
      .then((emailRecuperado) => {
        if (!vivo) return;
        setEmail(emailRecuperado);
        setPaso('formulario');
      })
      .catch((err) => {
        if (!vivo) return;
        setError(err.message);
        setPaso('error');
      });
    return () => { vivo = false; };
  }, [oobCode, t]);

  async function manejarEnvio(e) {
    e.preventDefault();
    if (!nueva) { setError(t('restablecer.errorVacio')); return; }
    if (nueva.length < 6) { setError(t('restablecer.errorCorto')); return; }
    if (nueva !== repetir) { setError(t('restablecer.errorNoCoinciden')); return; }
    setError('');
    setGuardando(true);
    try {
      await confirmarNuevaContrasena(oobCode, nueva);
      setPaso('exito');
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="auth-pagina" aria-labelledby="restablecer-titulo">
      <div className="auth-tarjeta">
        <h1 id="restablecer-titulo">{t('restablecer.titulo')}</h1>

        {paso === 'cargando' && <p className="cargando" role="status">{t('restablecer.verificando')}</p>}

        {paso === 'error' && (
          <div role="alert">
            <p style={{ margin: '0 0 0.8rem' }}>{error}</p>
            <p>
              <a href="#/recuperar" className="btn-cta btn-peq">{t('restablecer.pedirNuevo')}</a>
            </p>
          </div>
        )}

        {paso === 'formulario' && (
          <form onSubmit={manejarEnvio}>
            <p style={{ margin: '0 0 0.8rem' }}>
              {t('restablecer.restablecerAcceso')} <strong>{enmascararEmail(email)}</strong>
            </p>
            <div className="campo">
              <label htmlFor="nueva-pass">{t('restablecer.nuevaPass')}</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="nueva-pass"
                  type={mostrarPass ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={nueva}
                  onChange={(e) => { setNueva(e.target.value); setError(''); }}
                  placeholder={t('restablecer.placeholderMin')}
                  minLength={6}
                  required
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  aria-label={mostrarPass ? t('restablecer.ocultarPass') : t('restablecer.mostrarPass')}
                  onClick={() => setMostrarPass((v) => !v)}
                  style={{
                    position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', padding: '0.2rem',
                  }}
                >
                  {mostrarPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>
            <div className="campo">
              <label htmlFor="repetir-pass">{t('restablecer.repetirPass')}</label>
              <input
                id="repetir-pass"
                type={mostrarPass ? 'text' : 'password'}
                autoComplete="new-password"
                value={repetir}
                onChange={(e) => { setRepetir(e.target.value); setError(''); }}
                placeholder={t('restablecer.placeholderIgual')}
                minLength={6}
                required
              />
            </div>
            {error && <p className="auth-error" role="alert" style={{ margin: '0.4rem 0' }}>{error}</p>}
            <button type="submit" className="btn-cta" disabled={guardando} style={{ width: '100%', marginTop: '0.6rem' }}>
              {guardando ? t('restablecer.guardando') : t('restablecer.cambiarPass')}
            </button>
          </form>
        )}

        {paso === 'exito' && (
          <div role="status">
            <p style={{ margin: '0 0 0.8rem', color: 'var(--verde)', fontWeight: 600 }}>
              {t('restablecer.exito')}
            </p>
            <p style={{ margin: '0 0 0.8rem' }}>
              {t('restablecer.yaPuedes')}
            </p>
            <p>
              <a href="#/login" className="btn-cta btn-peq">{t('restablecer.iniciarSesion')}</a>
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
