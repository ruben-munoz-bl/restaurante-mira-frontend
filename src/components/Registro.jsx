/** View pura: página de creación de cuenta con dieta/accesibilidad/idioma en el formulario. */
import { useState } from 'react';
import { ALERGENOS } from '../models/restaurantModel.js';
import { useT, useI18n } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';

const TRADS = { es, ca, en };

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Registro({ onRegistro, yaTieneSesion }) {
  const t = useT(TRADS);
  const { lang, setLang, available } = useI18n();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [esEmpresa, setEsEmpresa] = useState(false);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [paso, setPaso] = useState(1); // 1 = datos, 2 = dieta/accesibilidad

  const [vegano, setVegano] = useState(false);
  const [vegetariano, setVegetariano] = useState(false);
  const [sinGluten, setSinGluten] = useState(false);
  const [alergias, setAlergias] = useState([]);
  const [sillaRuedas, setSillaRuedas] = useState(false);
  const [tea, setTea] = useState(false);

  const [inviteCodigo, setInviteCodigo] = useState(() => {
    try { return new URLSearchParams(window.location.hash.split('?')[1]).get('invite') || null; } catch { return null; }
  });

  function toggleAlergia(key) {
    setAlergias((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]));
  }

  async function manejarEnvio(e) {
    e.preventDefault();
    if (paso === 1) {
      if (nombre.trim().length < 2) return setError(t('registro.errorNombre'));
      if (!EMAIL_OK.test(email.trim())) return setError(t('registro.errorCorreo'));
      if (password.length < 6) return setError(t('registro.errorPass'));
      setError('');
      setPaso(2);
      return;
    }
    setError('');
    setEnviando(true);
    try {
      const preferencias = { vegano, vegetariano, sinGluten, alergias };
      const accesibilidad = { sillaRuedas, tea };
      await onRegistro({
        nombre,
        email,
        password,
        tipo: esEmpresa ? 'empresa' : 'cliente',
        preferencias,
        accesibilidad,
        lang,
      });
      if (inviteCodigo) {
        import('../services/api.js').then(({ invitationsApi }) => {
          invitationsApi.accept(inviteCodigo).catch(() => {});
        });
      }
      window.location.hash = '#/';
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  if (yaTieneSesion) {
    window.location.hash = '#/';
    return null;
  }

  return (
    <section className="auth-pagina" aria-labelledby="registro-titulo">
      <form className="auth-tarjeta" onSubmit={manejarEnvio} noValidate>
        <h1 id="registro-titulo">{t('registro.crearCuenta')}</h1>
        <p className="auth-sub">{t('registro.gratis')}</p>
        {inviteCodigo && (
          <div style={{ background: 'var(--primary-container)', color: 'var(--primary)', padding: '0.8rem 1rem', borderRadius: 'var(--radio-peq)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '1rem', textAlign: 'center' }}>
            🎉 Te invitaron a MIRA Points
          </div>
        )}
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}

        {paso === 1 && (
          <>
            <div className="campo">
              <label htmlFor="reg-nombre">{t('registro.nombre')}</label>
              <input
                id="reg-nombre"
                type="text"
                autoComplete="name"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>
            <div className="campo">
              <label htmlFor="reg-email">{t('registro.correo')}</label>
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="campo">
              <label htmlFor="reg-pass">{t('registro.contrasena')}</label>
              <input
                id="reg-pass"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="campo campo-check">
              <label htmlFor="reg-empresa">
                <input
                  id="reg-empresa"
                  type="checkbox"
                  checked={esEmpresa}
                  onChange={(e) => setEsEmpresa(e.target.checked)}
                />
                {t('auth.soyEmpresa')}
              </label>
            </div>
            <button type="submit" className="btn-cta btn-grande auth-boton">
              {t('registro.siguiente')}
            </button>
          </>
        )}

        {paso === 2 && (
          <>
            <h2 className="cuenta-sub" style={{ fontSize: '1.05rem', margin: '1rem 0 0.5rem' }}>{t('registro.miDieta')}</h2>
            <label className="campo-check" htmlFor="reg-vegano">
              <input id="reg-vegano" type="checkbox" checked={vegano} onChange={() => setVegano(!vegano)} />
              {t('registro.vegano')}: {t('registro.veganoDesc')}
            </label>
            <label className="campo-check" htmlFor="reg-vegetariano">
              <input id="reg-vegetariano" type="checkbox" checked={vegetariano} onChange={() => setVegetariano(!vegetariano)} />
              {t('registro.vegetariano')}: {t('registro.vegetarianoDesc')}
            </label>
            <label className="campo-check" htmlFor="reg-sinGluten">
              <input id="reg-sinGluten" type="checkbox" checked={sinGluten} onChange={() => setSinGluten(!sinGluten)} />
              {t('registro.sinGluten')}
            </label>
<fieldset className="prefs-alergias" style={{ border: 'none', padding: 0 }}>
               <legend style={{ fontWeight: 600, fontSize: '0.95rem' }}>{t('registro.misAlergias')}</legend>
               {ALERGENOS.filter((a) => a.key !== 'gluten').map(({ key, label }) => (
                <label key={key} className="campo-check" htmlFor={`reg-alerg-${key}`}>
                  <input
                    id={`reg-alerg-${key}`}
                    type="checkbox"
                    checked={alergias.includes(key)}
                    onChange={() => toggleAlergia(key)}
                  />
                  {label}
                </label>
              ))}
            </fieldset>

            <h2 className="cuenta-sub" style={{ fontSize: '1.05rem', margin: '1rem 0 0.5rem' }}>{t('registro.miAccesibilidad')}</h2>
            <label className="campo-check" htmlFor="reg-silla">
              <input id="reg-silla" type="checkbox" checked={sillaRuedas} onChange={() => setSillaRuedas(!sillaRuedas)} />
              {t('registro.sillaRuedas')}
            </label>
            <label className="campo-check" htmlFor="reg-tea">
              <input id="reg-tea" type="checkbox" checked={tea} onChange={() => setTea(!tea)} />
              {t('registro.espectroAutista')}
            </label>

            <h2 className="cuenta-sub" style={{ fontSize: '1.05rem', margin: '1rem 0 0.5rem' }}>{t('registro.idioma')}</h2>
            <select
              className="search-select"
              value={lang}
              onChange={(e) => setLang(e.target.value)}
            >
              {Object.entries(available).map(([code, label]) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>

            <p style={{ fontSize: '0.82rem', color: 'var(--gris)', margin: '0.8rem 0 0.5rem' }}>
              {t('registro.cambiarDespues')}.
            </p>

            <button type="submit" className="btn-cta btn-grande auth-boton" disabled={enviando}>
              {enviando ? t('registro.creando') : t('registro.crear')}
            </button>
            <button
              type="button"
              className="btn-secundario btn-peq"
              style={{ width: '100%', marginTop: '0.5rem' }}
              onClick={() => { setPaso(1); setError(''); }}
            >
              ← {t('registro.volver')}
            </button>
          </>
        )}

        <p className="auth-alt">
          {t('registro.yaTienesCuenta')} <a href="#/login">{t('registro.iniciaSesion')}</a>
        </p>
      </form>
    </section>
  );
}
