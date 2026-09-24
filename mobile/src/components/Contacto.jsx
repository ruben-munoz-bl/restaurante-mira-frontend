/** View pura: formulario de contacto (estado local + callback de envío). */
import { useEffect, useState } from 'react';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';

const TRADS = { es, ca, en };
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Contacto({ usuario, onEnviar }) {
  const t = useT(TRADS);
  const MOTIVOS = t('contacto.motivos');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [motivo, setMotivo] = useState(MOTIVOS[0]);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  // Si la sesión llega después, pre-rellena sin pisar lo escrito.
  useEffect(() => {
    if (!usuario) return;
    setNombre((v) => v || usuario.nombre || '');
    setEmail((v) => v || usuario.email || '');
  }, [usuario]);

  async function manejarEnvio(e) {
    e.preventDefault();
    if (nombre.trim().length < 2) return setError(t('contacto.errorNombre'));
    if (!EMAIL_OK.test(email.trim())) return setError(t('contacto.errorEmail'));
    if (mensaje.trim().length < 10) return setError(t('contacto.errorMensajeCorto'));
    if (mensaje.trim().length > 2000) return setError(t('contacto.errorMensajeLargo'));
    setError('');
    setEnviando(true);
    try {
      await onEnviar({ nombre, email, motivo, mensaje });
      setEnviado(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  function otroMensaje() {
    setMensaje('');
    setMotivo(t('contacto.motivos')[0]);
    setEnviado(false);
    setError('');
  }

  if (enviado) {
    return (
      <section className="auth-pagina" aria-labelledby="contacto-ok">
        <div className="auth-tarjeta" role="status">
          <h1 id="contacto-ok">{t('contacto.enviado')}</h1>
          <p className="auth-sub">{t('contacto.agradecimiento', { nombre: nombre.trim(), email: email.trim() })}</p>
          <p className="cuenta-acciones">
            <button type="button" className="btn-secundario" onClick={otroMensaje}>
              {t('contacto.otroMensaje')}
            </button>
            <a href="#buscar" className="btn-cta">
              {t('contacto.volverBuscador')}
            </a>
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="auth-pagina" aria-labelledby="contacto-titulo">
      <form className="auth-tarjeta" onSubmit={manejarEnvio} noValidate>
        <h1 id="contacto-titulo">{t('contacto.titulo')}</h1>
        <p className="auth-sub">{t('contacto.sub')}</p>
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        <div className="campo">
          <label htmlFor="ct-nombre">{t('contacto.nombre')}</label>
          <input id="ct-nombre" type="text" autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="ct-email">{t('contacto.correo')}</label>
          <input id="ct-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="ct-motivo">{t('contacto.motivo')}</label>
          <select id="ct-motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)}>
            {MOTIVOS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="ct-mensaje">{t('contacto.mensaje')}</label>
          <textarea
            id="ct-mensaje"
            rows="5"
            maxLength="2000"
            placeholder={t('contacto.placeholder')}
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
          />
        </div>
        <button type="submit" className="btn-cta btn-grande auth-boton" disabled={enviando}>
          {enviando ? t('contacto.enviando') : t('contacto.enviarMensaje')}
        </button>
      </form>
    </section>
  );
}
