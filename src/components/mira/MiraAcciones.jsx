/**
 * View pura — tarjetas de las acciones del agente.
 *
 * Clave: el resultado va DENTRO de result (`result.ok` / `result.pending` /
 * `result.ok === false`), NO en el action. Y los datos están en result.data.
 * Cada tarjeta pinta solo lo que dejó pasar la allowlist de aiPayload.
 *
 * Nunca se parsea `reply`: según el backend, los datos salen de actions[].data.
 */
import { useT } from '../../i18n/index.jsx';
import es from '../../i18n/es.js';
import ca from '../../i18n/ca.js';
import en from '../../i18n/en.js';
import { desdeResultado } from '../../services/aiErrors.js';
import { ESTADO_OK, ESTADO_ERROR } from '../../services/aiPayload.js';

const TRADS = { es, ca, en };

const ESTADOS_RESERVA = ['pendiente', 'confirmada', 'completada', 'cancelada', 'no-show'];

function Linea({ etiqueta, valor }) {
  if (valor === undefined || valor === null || valor === '') return null;
  return (
    <p className="mira-tarjeta-linea">
      <span>{etiqueta}</span>
      <span>{valor}</span>
    </p>
  );
}

function Pastilla({ estado }) {
  if (!estado) return null;
  const clase = ESTADOS_RESERVA.includes(estado) ? ` mira-estado--${estado}` : '';
  return <span className={`mira-estado${clase}`}>{estado}</span>;
}

// ── Tarjetas por tool ───────────────────────────────────────────────────

function TarjetaRestaurante({ d, alSugerir, t }) {
  const cocina = d.cocina || (Array.isArray(d.categorias) ? d.categorias[0] : '');
  return (
    <div className="mira-tarjeta">
      <p className="mira-tarjeta-titulo">{d.nombre}</p>
      <Linea etiqueta={t('mira.card.valoracion')} valor={d.valoracion ? `${d.valoracion}★` : '—'} />
      <Linea etiqueta={t('mira.card.resenas')} valor={d.totalResenasYelp ?? '—'} />
      <Linea etiqueta={t('mira.card.precio')} valor={d.precio} />
      <Linea etiqueta={t('mira.card.cocina')} valor={cocina} />
      <Linea etiqueta={t('mira.card.zona')} valor={[d.ciudad, d.zona].filter(Boolean).join(' · ')} />
      <div className="mira-tarjeta-acciones">
        <button
          type="button"
          className="btn-cta btn-peq"
          onClick={() => alSugerir(t('mira.card.quiereReservar', { nombre: d.nombre || '' }))}
          disabled={!d.nombre}
        >
          {t('mira.card.reservar')}
        </button>
      </div>
    </div>
  );
}

/** Lista reutilizable (búsquedas, reservas, reseñas…). */
function TarjetaLista({ titulo, items, total, campo, sufijo, alSugerir, t, accion }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <div className="mira-tarjeta">
      <p className="mira-tarjeta-titulo">
        {titulo}
        {typeof total === 'number' && total > items.length ? ` (${total})` : ''}
      </p>
      {items.map((it, i) => (
        <p key={it.id || `${campo}-${i}`} className="mira-tarjeta-linea">
          <span>{it[campo] ?? '—'}</span>
          <span>{sufijo(it)}</span>
        </p>
      ))}
      {accion && alSugerir && (
        <div className="mira-tarjeta-acciones">
          <button type="button" className="btn-cta btn-peq" onClick={() => alSugerir(items[0][campo])}>
            {accion}
          </button>
        </div>
      )}
    </div>
  );
}

function TarjetaReserva({ d, cancelada, t }) {
  return (
    <div className="mira-tarjeta">
      <p className="mira-tarjeta-titulo">{cancelada ? t('mira.card.reservaCancelada') : t('mira.card.reserva')}</p>
      <Linea etiqueta={t('mira.card.local')} valor={d.restauranteNombre} />
      <Linea etiqueta={t('mira.card.cuando')} valor={[d.fecha, d.hora].filter(Boolean).join(' · ')} />
      <Linea etiqueta={t('mira.card.personas')} valor={d.comensales} />
      <Linea etiqueta={t('mira.card.estado')} valor={<Pastilla estado={d.estado} />} />
      {d.codigo && <code className="mira-tarjeta-codigo">{d.codigo}</code>}
      <div className="mira-tarjeta-acciones">
        <a className="btn-texto" href="#/reservas">
          {t('mira.card.verReservas')}
        </a>
      </div>
    </div>
  );
}

function TarjetaDisponibilidad({ d, t }) {
  return (
    <div className="mira-tarjeta">
      <p className="mira-tarjeta-titulo">{t('mira.card.disponibilidad')}</p>
      <Linea etiqueta={t('mira.card.cuando')} valor={[d.fecha, d.hora].filter(Boolean).join(' · ')} />
      <Linea etiqueta={t('mira.card.libres')} valor={`${d.libres ?? 0} / ${d.limite ?? 0}`} />
    </div>
  );
}

function TarjetaBalance({ d, t }) {
  return (
    <div className="mira-tarjeta">
      <p className="mira-tarjeta-titulo">{t('mira.card.tusPuntos')}</p>
      <Linea etiqueta={t('mira.card.saldo')} valor={d.saldoActual ?? 0} />
      <Linea etiqueta={t('mira.card.acumulados')} valor={d.totalAcumulado} />
      {d.rachaLogin?.dias !== undefined && (
        <Linea etiqueta={t('mira.card.racha')} valor={`${d.rachaLogin.dias} ${t('mira.card.dias')}`} />
      )}
      <div className="mira-tarjeta-acciones">
        <a className="btn-texto" href="#/puntos">
          {t('mira.card.verPuntos')}
        </a>
      </div>
    </div>
  );
}

function TarjetaPuntos({ d, tool, t }) {
  const etiqueta =
    tool === 'spinWheel' ? t('mira.card.ruleta')
      : tool === 'redeemPoints' ? t('mira.card.canje')
        : t('mira.card.loginDiario');
  return (
    <div className="mira-tarjeta">
      <p className="mira-tarjeta-titulo">{etiqueta}</p>
      {d.puntos !== undefined && <Linea etiqueta={t('mira.card.puntos')} valor={`+${d.puntos}`} />}
      {d.premio && <Linea etiqueta={t('mira.card.premio')} valor={d.premio} />}
      {d.descuento !== undefined && <Linea etiqueta={t('mira.card.descuento')} valor={`${d.descuento} €`} />}
      <Linea etiqueta={t('mira.card.saldo')} valor={d.nuevoSaldo} />
      <div className="mira-tarjeta-acciones">
        <a className="btn-texto" href="#/puntos">
          {t('mira.card.verPuntos')}
        </a>
      </div>
    </div>
  );
}

/** Error de negocio: llega con HTTP 200 dentro de actions[].result. */
function TarjetaError({ a, t }) {
  const info = desdeResultado(a);
  return (
    <div className="mira-tarjeta mira-tarjeta--error" role="status">
      <p className="mira-tarjeta-titulo">{t('mira.card.noSePudo')}</p>
      <p className="vacio-texto">{info.mensaje}</p>
      {info.loginRequerido && (
        <div className="mira-tarjeta-acciones">
          <a className="btn-cta btn-peq" href="#/login">
            {t('mira.error.iniciarSesion')}
          </a>
        </div>
      )}
    </div>
  );
}

/** Herramienta sin tarjeta propia: fila plegable, sin datos. */
function AccionPlegable({ a, t }) {
  return (
    <details className="mira-accion-mini">
      <summary>{`${a.estado === ESTADO_OK ? '✓' : '•'} ${a.tool}`}</summary>
      <span>{t('mira.card.datosDeLaApi')}</span>
    </details>
  );
}

function Tarjeta({ a, alSugerir, t }) {
  if (a.estado === ESTADO_ERROR) return <TarjetaError a={a} t={t} />;
  // pending: la tarjeta de confirmación ya explica lo que va a pasar.
  if (a.estado !== ESTADO_OK) return null;

  const d = a.data || {};
  switch (a.tool) {
    case 'getRestaurant':
      return <TarjetaRestaurante d={d} alSugerir={alSugerir} t={t} />;
    case 'searchRestaurants':
      return (
        <TarjetaLista
          titulo={t('mira.card.resultados', { n: d.total ?? (d.items || []).length })}
          items={d.items}
          total={d.total}
          campo="nombre"
          sufijo={(it) => [it.valoracion ? `${it.valoracion}★` : null, it.cocina].filter(Boolean).join(' · ') || '—'}
          accion={t('mira.card.verFicha')}
          alSugerir={alSugerir}
          t={t}
        />
      );
    case 'createReservation':
    case 'completeReservation':
    case 'reservationTicket':
      return <TarjetaReserva d={d} t={t} />;
    case 'cancelReservation':
      return <TarjetaReserva d={d} cancelada t={t} />;
    case 'listMyReservations':
      return (
        <TarjetaLista
          titulo={t('mira.card.misReservas')}
          items={d.items}
          total={d.total}
          campo="restauranteNombre"
          sufijo={(it) => [it.fecha, it.hora, it.estado].filter(Boolean).join(' · ') || '—'}
          t={t}
        />
      );
    case 'checkAvailability':
      return <TarjetaDisponibilidad d={d} t={t} />;
    case 'getBalance':
      return <TarjetaBalance d={d} t={t} />;
    case 'dailyLogin':
    case 'spinWheel':
    case 'redeemPoints':
      return <TarjetaPuntos d={d} tool={a.tool} t={t} />;
    case 'listReviews':
    case 'getUserReviews':
      return (
        <TarjetaLista
          titulo={t('mira.card.resenas')}
          items={d.items}
          total={d.total}
          campo="comentario"
          sufijo={(it) => (it.puntuacion ? `${it.puntuacion}★` : '—')}
          t={t}
        />
      );
    default:
      return <AccionPlegable a={a} t={t} />;
  }
}

export default function MiraAcciones({ acciones, alSugerir }) {
  const t = useT(TRADS);
  if (!Array.isArray(acciones) || acciones.length === 0) return null;
  return (
    <>
      {acciones.map((a, i) => (
        <Tarjeta key={`${a.tool}-${i}`} a={a} alSugerir={alSugerir} t={t} />
      ))}
    </>
  );
}