/** View pura: página de creación de cuenta con dieta/accesibilidad/idioma en el formulario. */
import { useEffect, useState } from 'react';
import { ALERGENOS } from '../models/restaurantModel.js';
import { useT, useI18n } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';
import { track } from '../services/auditoria.js';

const TRADS = { es, ca, en };

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 0-3: longitud + variedad de caracteres. Solo orientativo para el usuario. */
function fuerzaPassword(p) {
  if (!p) return 0;
  if (p.length < 8) return 1;
  const variedad = [/[a-z]/i, /\d/, /[^a-z\d]/i].filter((re) => re.test(p)).length;
  if (variedad === 3 || (variedad === 2 && p.length >= 12)) return 3;
  return variedad >= 2 ? 2 : 1;
}

function Chip({ id, checked, onChange, children }) {
  return (
    <label className={`chip-check${checked ? ' chip-check--on' : ''}`} htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} onChange={onChange} />
      <span>{children}</span>
    </label>
  );
}

export default function Registro({ onRegistro, yaTieneSesion }) {
  const t = useT(TRADS);
  const { lang, setLang, available } = useI18n();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [esEmpresa, setEsEmpresa] = useState(false);
  useEffect(() => { if (!yaTieneSesion) track('registro_iniciado'); }, [yaTieneSesion]);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [paso, setPaso] = useState(1); // 1 = datos, 2 = dieta/accesibilidad
  const [verPass, setVerPass] = useState(false);
  const fuerza = fuerzaPassword(password);

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
      if (password.length < 8) return setError(t('registro.errorPass'));
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

  const etiquetasFuerza = ['', t('registro.fuerzaDebil'), t('registro.fuerzaMedia'), t('registro.fuerzaFuerte')];

  return (
    <section className="auth-pagina" aria-labelledby="registro-titulo">
      <form className="auth-tarjeta registro-tarjeta" onSubmit={manejarEnvio} noValidate>
        <ol className="registro-pasos" aria-label={t('registro.crearCuenta')}>
          {[t('registro.pasoDatos'), t('registro.pasoPrefs')].map((nombrePaso, i) => (
            <li
              key={nombrePaso}
              className={`registro-paso${paso === i + 1 ? ' registro-paso--activo' : ''}${paso > i + 1 ? ' registro-paso--hecho' : ''}`}
              aria-current={paso === i + 1 ? 'step' : undefined}
            >
              <span className="registro-paso-num">{paso > i + 1 ? '✓' : i + 1}</span>
              {nombrePaso}
            </li>
          ))}
        </ol>
        <h1 id="registro-titulo">{t('registro.crearCuenta')}</h1>
        <p className="auth-sub">{t('registro.gratis')}</p>
        {inviteCodigo && <div className="registro-invite">🎉 {t('registro.invitado')}</div>}
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}

        {paso === 1 && (
          <>
            <fieldset className="tipo-cuenta">
              <legend>{t('registro.tipoCuenta')}</legend>
              {[
                [false, '🍽️', t('registro.tipoCliente'), t('registro.tipoClienteDesc')],
                [true, '🏪', t('registro.tipoEmpresa'), t('registro.tipoEmpresaDesc')],
              ].map(([valor, icono, titulo, desc]) => (
                <label key={String(valor)} className={`tipo-cuenta-opcion${esEmpresa === valor ? ' tipo-cuenta-opcion--on' : ''}`}>
                  <input type="radio" name="tipo-cuenta" checked={esEmpresa === valor} onChange={() => setEsEmpresa(valor)} />
                  <span className="tipo-cuenta-icono" aria-hidden="true">{icono}</span>
                  <strong>{titulo}</strong>
                  <small>{desc}</small>
                </label>
              ))}
            </fieldset>
            <div className="campo">
              <label htmlFor="reg-nombre">{t('registro.nombre')}</label>
              <input id="reg-nombre" type="text" autoComplete="name" maxLength={80} required value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </div>
            <div className="campo">
              <label htmlFor="reg-email">{t('registro.correo')}</label>
              <input id="reg-email" type="email" autoComplete="email" inputMode="email" maxLength={254} required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="campo">
              <label htmlFor="reg-pass">{t('registro.contrasena')}</label>
              <div className="campo-pass">
                <input
                  id="reg-pass"
                  type={verPass ? 'text' : 'password'}
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  required
                  aria-describedby="reg-pass-ayuda"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="campo-pass-toggle"
                  onClick={() => setVerPass((v) => !v)}
                  aria-label={verPass ? t('registro.ocultar') : t('registro.mostrar')}
                  aria-pressed={verPass}
                >
                  {verPass ? '🙈' : '👁️'}
                </button>
              </div>
              {password && (
                <div className={`pass-fuerza pass-fuerza--${fuerza}`} aria-live="polite">
                  <span className="pass-fuerza-barra"><span /></span>
                  <span className="pass-fuerza-texto">{etiquetasFuerza[fuerza]}</span>
                </div>
              )}
              <small id="reg-pass-ayuda" className="campo-ayuda">{t('registro.passAyuda')}</small>
            </div>
            <button type="submit" className="btn-cta btn-grande auth-boton">
              {t('registro.siguiente')} →
            </button>
          </>
        )}

        {paso === 2 && (
          <>
            <section className="registro-bloque">
              <h2>{t('registro.miDieta')}</h2>
              <div className="chip-grid">
                <Chip id="reg-vegano" checked={vegano} onChange={() => setVegano(!vegano)}>🌱 {t('registro.vegano')}</Chip>
                <Chip id="reg-vegetariano" checked={vegetariano} onChange={() => setVegetariano(!vegetariano)}>🥕 {t('registro.vegetariano')}</Chip>
                <Chip id="reg-sinGluten" checked={sinGluten} onChange={() => setSinGluten(!sinGluten)}>🌾 {t('registro.sinGluten')}</Chip>
              </div>
            </section>
            <section className="registro-bloque">
              <h2>{t('registro.misAlergias')}</h2>
              <div className="chip-grid">
                {ALERGENOS.filter((a) => a.key !== 'gluten').map(({ key, label }) => (
                  <Chip key={key} id={`reg-alerg-${key}`} checked={alergias.includes(key)} onChange={() => toggleAlergia(key)}>{label}</Chip>
                ))}
              </div>
            </section>
            <section className="registro-bloque">
              <h2>{t('registro.miAccesibilidad')}</h2>
              <div className="chip-grid">
                <Chip id="reg-silla" checked={sillaRuedas} onChange={() => setSillaRuedas(!sillaRuedas)}>♿ {t('registro.sillaRuedas')}</Chip>
                <Chip id="reg-tea" checked={tea} onChange={() => setTea(!tea)}>🧩 {t('registro.espectroAutista')}</Chip>
              </div>
            </section>
            <section className="registro-bloque">
              <h2>{t('registro.idioma')}</h2>
              <div className="lang-selector" role="group" aria-label={t('registro.idioma')}>
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
            </section>

            <p className="campo-ayuda">{t('registro.cambiarDespues')}.</p>

            <div className="registro-acciones">
              <button type="button" className="btn-secundario" onClick={() => { setPaso(1); setError(''); }}>
                ← {t('registro.volver')}
              </button>
              <button type="submit" className="btn-cta btn-grande auth-boton" disabled={enviando}>
                {enviando ? t('registro.creando') : t('registro.crear')}
              </button>
            </div>
          </>
        )}

        <p className="auth-alt">
          {t('registro.yaTienesCuenta')} <a href="#/login">{t('registro.iniciaSesion')}</a>
        </p>
      </form>
    </section>
  );
}
