/**
 * Banner de cookies: aceptar todas, rechazar (solo necesarias) o configurar por categorías.
 * Guarda en localStorage (invitado) y Firestore (logueado) con timestamp.
 */
import { useState, useEffect } from 'react';
import { COOKIE_CATEGORIAS, COOKIE_DEFAULT, leerCookies, guardarCookies, tieneConsentimiento } from '../services/cookieService.js';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';

const TRADS = { es, ca, en };

export default function CookieBanner({ usuario }) {
  const t = useT(TRADS);
  const [visible, setVisible] = useState(false);
  const [configurando, setConfigurando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [prefs, setPrefs] = useState({ ...COOKIE_DEFAULT });

  useEffect(() => {
    let vivo = true;
    setCargando(true);
    leerCookies(usuario?.uid)
      .then((c) => {
        if (!vivo) return;
        if (tieneConsentimiento(c)) {
          setVisible(false);
        } else {
          setVisible(true);
          setPrefs({ ...COOKIE_DEFAULT, ...c });
        }
        setCargando(false);
      })
      .catch(() => { if (vivo) { setVisible(true); setCargando(false); } });
    return () => { vivo = false; };
  }, [usuario]);

  async function aceptarTodas() {
    const datos = { ...COOKIE_DEFAULT, necesarias: true, preferencias: true, analiticas: true, marketing: true };
    await guardarCookies(datos, usuario?.uid);
    setVisible(false);
  }

  async function rechazar() {
    await guardarCookies({ ...COOKIE_DEFAULT }, usuario?.uid);
    setVisible(false);
  }

  async function guardarConfig() {
    await guardarCookies({ ...prefs, necesarias: true }, usuario?.uid);
    setVisible(false);
    setConfigurando(false);
  }

  function toggle(key) {
    if (key === 'necesarias') return;
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  }

  if (cargando || !visible) return null;

  return (
    <div className="cookie-fondo" role="dialog" aria-label={t('cookie.aviso')} aria-modal="false">
      <div className="cookie-banner">
        {!configurando ? (
          <>
            <div className="cookie-texto">
              <h2 className="cookie-titulo">{t('cookie.titulo')}</h2>
              <p>
                {t('cookie.texto')}
              </p>
            </div>
            <div className="cookie-acciones">
              <button type="button" className="btn-cta btn-peq" onClick={aceptarTodas}>
                {t('cookie.aceptarTodas')}
              </button>
              <button type="button" className="btn-secundario btn-peq" onClick={rechazar}>
                {t('cookie.soloNecesarias')}
              </button>
              <button type="button" className="btn-texto" onClick={() => setConfigurando(true)}>
                {t('cookie.configurar')}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="cookie-texto">
              <h2 className="cookie-titulo">{t('cookie.configurarCookies')}</h2>
              {COOKIE_CATEGORIAS.map((cat) => (
                <label key={cat.key} className="campo-check cookie-cat">
                  <input
                    type="checkbox"
                    checked={Boolean(prefs[cat.key])}
                    onChange={() => toggle(cat.key)}
                    disabled={cat.requerida}
                  />
                  <span>
                    <strong>{t(`cookie.${cat.key}`)}</strong>
                    {cat.requerida && <span className="cookie-oblig"> ({t('cookie.obligatoria')})</span>}
                    <br />
                    <span className="cookie-desc">{t(`cookie.${cat.key}Desc`)}</span>
                  </span>
                </label>
              ))}
            </div>
            <div className="cookie-acciones">
              <button type="button" className="btn-cta btn-peq" onClick={guardarConfig}>
                {t('cookie.guardarPreferencias')}
              </button>
              <button type="button" className="btn-secundario btn-peq" onClick={() => setConfigurando(false)}>
                {t('cookie.volver')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
