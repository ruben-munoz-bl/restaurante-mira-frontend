/**
 * Pantalla de llegada (G09), ruta #/llegada/<restauranteId>: oferta de llegada,
 * QR para enseñar al personal, cuenta atrás y estado (pendiente → aplicada /
 * caducada, con botón para pedir otro).
 */
import { useEffect, useMemo, useState } from 'react';
import useUbicacion from '../hooks/useUbicacion.js';
import useLlegada from '../hooks/useLlegada.js';
import { trazadoQR, segundosRestantes, formatoCuenta } from '../models/llegadaModel.js';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';
import '../styles/llegada.css';

const TRADS = { es, ca, en };

export function CodigoQR({ texto }) {
  const { size, d } = useMemo(() => trazadoQR(texto), [texto]);
  return (
    <svg className="llegada-qr" viewBox={`-2 -2 ${size + 4} ${size + 4}`} role="img" aria-label="QR" shapeRendering="crispEdges">
      <rect x="-2" y="-2" width={size + 4} height={size + 4} fill="#fff" />
      <path d={d} fill="#002218" />
    </svg>
  );
}

export default function Llegada({ restauranteId, obtenerRestaurante }) {
  const t = useT(TRADS);
  const { activa, posicion } = useUbicacion();
  const { fase, visita, qr, estado, distanciaM, ahora, pedir } = useLlegada(restauranteId, posicion);
  const [nombre, setNombre] = useState('');

  useEffect(() => {
    let vivo = true;
    obtenerRestaurante?.(restauranteId).then((r) => vivo && r && setNombre(r.nombre)).catch(() => {});
    return () => { vivo = false; };
  }, [restauranteId, obtenerRestaurante]);

  const restantes = visita ? segundosRestantes(visita.caducaEn, ahora) : 0;

  let cuerpo;
  if (!activa) {
    cuerpo = (
      <div className="llegada-aviso">
        <p>{t('llegada.activaUbicacion')}</p>
        <a className="llegada-boton" href="#/cuenta">{t('llegada.irACuenta')}</a>
      </div>
    );
  } else if (fase === 'esperandoUbicacion' || fase === 'creando') {
    cuerpo = <p className="llegada-estado" role="status">{t('llegada.buscando')}</p>;
  } else if (fase === 'lejos') {
    cuerpo = (
      <div className="llegada-aviso" role="alert">
        <p>{distanciaM != null ? t('llegada.lejos', { m: distanciaM }) : t('llegada.lejosSinDato')}</p>
        <button type="button" className="llegada-boton" onClick={pedir}>{t('llegada.reintentar')}</button>
      </div>
    );
  } else if (fase === 'sinSesion') {
    cuerpo = (
      <div className="llegada-aviso">
        <p>{t('llegada.sinSesion')}</p>
        <a className="llegada-boton" href="#/login">{t('nav.iniciarSesion')}</a>
      </div>
    );
  } else if (fase !== 'qr') {
    cuerpo = (
      <div className="llegada-aviso" role="alert">
        <p>{t(`llegada.${fase}`)}</p>
        <button type="button" className="llegada-boton" onClick={pedir}>{t('llegada.reintentar')}</button>
      </div>
    );
  } else {
    cuerpo = (
      <>
        <div className="llegada-oferta">
          <span>{t('llegada.tuOferta')}</span>
          <strong>{visita.nivel?.texto}</strong>
        </div>
        {estado === 'confirmada' ? (
          <div className="llegada-ok" role="status">
            <span aria-hidden="true">✓</span>
            <strong>{t('llegada.aplicada')}</strong>
            <p>{t('llegada.aplicadaTexto')}</p>
          </div>
        ) : (
          <div className={`llegada-qr-caja${estado === 'caducada' ? ' caducado' : ''}`}>
            <CodigoQR texto={qr} />
            {estado === 'pendiente' ? (
              <p className="llegada-estado" role="status">
                {t('llegada.ensenalo')} · {t('llegada.caducaEn', { t: formatoCuenta(restantes) })}
              </p>
            ) : (
              <div className="llegada-aviso" role="alert">
                <p>{t('llegada.caducado')}</p>
                <button type="button" className="llegada-boton" onClick={pedir}>{t('llegada.otroQR')}</button>
              </div>
            )}
          </div>
        )}
      </>
    );
  }

  return (
    <section className="llegada-pagina">
      <p className="llegada-ojo">📍 {nombre || 'MIRA'}</p>
      <h1>{fase === 'lejos' ? t('llegada.tituloLejos') : t('llegada.titulo')}</h1>
      {cuerpo}
    </section>
  );
}
