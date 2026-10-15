/** Sección de «Mi cuenta»: consentimiento y estado de la ubicación para ofertas cercanas (G03). */
import { useEffect, useRef, useState } from 'react';
import useUbicacion from '../hooks/useUbicacion.js';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';

const TRADS = { es, ca, en };

function ModalConsentimiento({ t, onAceptar, onRechazar }) {
  const botonRef = useRef(null);
  useEffect(() => {
    botonRef.current?.focus();
    const alTeclar = (e) => e.key === 'Escape' && onRechazar();
    window.addEventListener('keydown', alTeclar);
    return () => window.removeEventListener('keydown', alTeclar);
  }, [onRechazar]);
  return (
    <div className="modal-fondo" onClick={(e) => e.target === e.currentTarget && onRechazar()}>
      <div className="modal ubicacion-modal" role="dialog" aria-modal="true" aria-labelledby="ubicacion-modal-titulo">
        <div className="modal-cuerpo">
          <h2 id="ubicacion-modal-titulo" className="modal-titulo">{t('ubicacion.modalTitulo')}</h2>
          <p>{t('ubicacion.modalIntro')}</p>
          <ul className="ubicacion-puntos">
            <li>{t('ubicacion.puntoUso')}</li>
            <li>{t('ubicacion.puntoRecorrido')}</li>
            <li>{t('ubicacion.puntoAbierta')}</li>
            <li>{t('ubicacion.puntoDesactivar')}</li>
          </ul>
          <div className="modal-acciones">
            <button ref={botonRef} type="button" className="btn-cta" onClick={onAceptar} data-test="ubicacion-aceptar">{t('ubicacion.aceptar')}</button>
            <button type="button" className="btn-secundario" onClick={onRechazar} data-test="ubicacion-rechazar">{t('ubicacion.ahoraNo')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UbicacionCuenta() {
  const t = useT(TRADS);
  const { consentimiento, activa, posicion, error, aceptar, rechazar } = useUbicacion();
  const [preguntando, setPreguntando] = useState(false);

  return (
    <>
      <h2 className="cuenta-sub">{t('ubicacion.titulo')}</h2>
      <div className="prefs-form prefs-card" data-test="ubicacion-cuenta">
        <p className="vacio-texto">{t('ubicacion.descripcion')}</p>
        <p role="status" data-test="ubicacion-estado">
          <strong>{t(activa ? 'ubicacion.estadoActiva' : 'ubicacion.estadoInactiva')}</strong>
        </p>
        {activa && !error && !posicion && <p className="vacio-texto">{t('ubicacion.buscando')}</p>}
        {activa && error && <p className="auth-error" role="alert">{t(`ubicacion.${error}`)}</p>}
        {activa && posicion && (
          <p className="vacio-texto" data-test="ubicacion-posicion">
            {t('ubicacion.posicionActual', { lat: posicion.lat, lng: posicion.lng })}
            {posicion.precisionM != null && ` · ${t('ubicacion.precision', { m: posicion.precisionM })}`}
            <br />
            <small>{t('ubicacion.noSeEnvia')}</small>
          </p>
        )}
        {activa ? (
          <button type="button" className="btn-secundario btn-peq" onClick={rechazar} data-test="ubicacion-desactivar">{t('ubicacion.desactivar')}</button>
        ) : (
          <button type="button" className="btn-cta btn-peq" onClick={() => setPreguntando(true)} data-test="ubicacion-activar">{t('ubicacion.activar')}</button>
        )}
        {consentimiento.estado === 'rechazado' && <p className="vacio-texto">{t('ubicacion.rechazadaNota')}</p>}
      </div>
      {preguntando && (
        <ModalConsentimiento
          t={t}
          onAceptar={() => { setPreguntando(false); aceptar(); }}
          onRechazar={() => { setPreguntando(false); rechazar(); }}
        />
      )}
    </>
  );
}
