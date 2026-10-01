/**
 * View pura — tarjetas de las acciones del agente.
 *
 * Cada tarjeta pinta SOLO los campos que dejó pasar la whitelist de
 * aiPayload.camposVisibles(): nunca se hace JSON.stringify(result).
 * Un `ok:false` no lleva botón de reintento (guardrail del backend:
 * 403 → explicar y parar).
 */
import { useT } from '../../i18n/index.jsx';
import es from '../../i18n/es.js';
import ca from '../../i18n/ca.js';
import en from '../../i18n/en.js';
import { desdeCodigo } from '../../services/aiErrors.js';

const TRADS = { es, ca, en };

const ESTADOS = ['pendiente', 'confirmada', 'completada', 'cancelada', 'no-show'];

function Linea({ etiqueta, valor }) {
  if (valor === undefined || valor === null || valor === '') return null;
  return (
    <p className="mira-tarjeta-linea">
      <span>{etiqueta}</span>
      <span>{valor}</span>
    </p>
  );
}

function EstadoReserva({ estado }) {
  if (!estado) return null;
  const clase = ESTADOS.includes(estado) ? ` mira-estado--${estado}` : '';
  return <span className={`mira-estado${clase}`}>{estado}</span>;
}

/** Tarjeta de la ficha de un restaurante. */
function TarjetaRestaurante({ r, alSugerir, t }) {
  return (
    <div className="mira-tarjeta">
      <p className="mira-tarjeta-titulo">{r.nombre}</p>
      <Linea etiqueta={t('mira.card.valoracion')} valor={r.valoracion ? `${r.valoracion}★` : '—'} />
      <Linea etiqueta={t('mira.card.resenas')} valor={r.totalResenasYelp ?? '—'} />
      <Linea etiqueta={t('mira.card.precio')} valor={r.precio} />
      <Linea etiqueta={t('mira.card.cocina')} valor={r.cocina} />
      <Linea etiqueta={t('mira.card.zona')} valor={[r.ciudad, r.zona].filter(Boolean).join(' · ')} />
      {r.direccion && (
        <div className="mira-tarjeta-acciones">
          <button type="button" className="btn-cta btn-peq" onClick={() => alSugerir(t('mira.card.quiereReservar', { nombre: r.nombre }))}>
            {t('mira.card.reservar')}
          </button>
        </div>
      )}
    </div>
  );
}

/** Lista de resultados de búsqueda. */
function TarjetaBusqueda({ items, alSugerir, t }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="mira-tarjeta">
      <p className="mira-tarjeta-titulo">{t('mira.card.resultados', { n: items.length })}</p>
      {items.map((r) => (
        <p key={r.id || r.nombre} className="mira-tarjeta-linea">
          <span>{r.nombre}</span>
          <span>
            {r.valoracion ? `${r.valoracion}★` : '—'}
            {r.cocina ? ` · ${r.cocina}` : ''}
          </span>
        </p>
      ))}
      <div className="mira-tarjeta-acciones">
        <button type="button" className="btn-cta btn-peq" onClick={() => alSugerir(items[0].nombre)}>
          {t('mira.card.verFicha')}
        </button>
      </div>
    </div>
  );
}

/** Reserva creada o cancelada. */
function TarjetaReserva({ r, tool, t }) {
  const cancelada = tool === 'cancelReservation';
  return (
    <div className="mira-tarjeta">
      <p className="mira-tarjeta-titulo">
        {cancelada ? t('mira.card.reservaCancelada') : t('mira.card.reserva')}
      </p>
      <Linea etiqueta={t('mira.card.local')} valor={r.restauranteNombre} />
      <Linea etiqueta={t('mira.card.cuando')} valor={[r.fecha, r.hora].filter(Boolean).join(' · ')} />
      <Linea etiqueta={t('mira.card.personas')} valor={r.comensales} />
      {r.estado && <Linea etiqueta={t('mira.card.estado')} valor={<EstadoReserva estado={r.estado} />} />}
      {r.codigo && <code className="mira-tarjeta-codigo">{r.codigo}</code>}
      <div className="mira-tarjeta-acciones">
        <a className="btn-texto" href="#/reservas">
          {t('mira.card.verReservas')}
        </a>
      </div>
    </div>
  );
}

/** Disponibilidad de una franja. */
function TarjetaDisponibilidad({ r, t }) {
  return (
    <div className="mira-tarjeta">
      <p className="mira-tarjeta-titulo">{t('mira.card.disponibilidad')}</p>
      <Linea etiqueta={t('mira.card.cuando')} valor={[r.fecha, r.hora].filter(Boolean).join(' · ')} />
      <Linea etiqueta={t('mira.card.libres')} valor={`${r.libres ?? 0} / ${r.limite ?? 0}`} />
    </div>
  );
}

/** Saldo de puntos. */
function TarjetaBalance({ r, t }) {
  const racha = r.rachaLogin?.dias;
  return (
    <div className="mira-tarjeta">
      <p className="mira-tarjeta-titulo">{t('mira.card.tusPuntos')}</p>
      <Linea etiqueta={t('mira.card.saldo')} valor={r.saldoActual ?? 0} />
      <Linea etiqueta={t('mira.card.acumulados')} valor={r.totalAcumulado} />
      {racha !== undefined && <Linea etiqueta={t('mira.card.racha')} valor={`${racha} ${t('mira.card.dias')}`} />}
    </div>
  );
}

/** Mutación de puntos: login diario, ruleta, canje. */
function TarjetaPuntos({ r, tool, t }) {
  const etiqueta =
    tool === 'spinWheel' ? t('mira.card.ruleta')
      : tool === 'redeemPoints' ? t('mira.card.canje')
        : t('mira.card.loginDiario');
  const delta = r.puntos;
  return (
    <div className="mira-tarjeta">
      <p className="mira-tarjeta-titulo">{etiqueta}</p>
      {delta !== undefined && <Linea etiqueta={t('mira.card.puntos')} valor={`+${delta}`} />}
      {r.premio && <Linea etiqueta={t('mira.card.premio')} valor={r.premio} />}
      <Linea etiqueta={t('mira.card.saldo')} valor={r.nuevoSaldo} />
      <div className="mira-tarjeta-acciones">
        <a className="btn-texto" href="#/puntos">
          {t('mira.card.verPuntos')}
        </a>
      </div>
    </div>
  );
}

/** Cualquier tool que no tenga tarjeta propia: fila plegable. */
function AccionPlegable({ tool, t }) {
  return (
    <details className="mira-accion-mini">
      <summary>{`✓ ${tool}`}</summary>
      <span>{t('mira.card.datosDeLaApi')}</span>
    </details>
  );
}

/** Error de negocio devuelto dentro de actions[] (WHEEL_LOCKED, FORBIDDEN…). */
function TarjetaError({ a, t }) {
  const info = desdeCodigo(a.error);
  return (
    <div className="mira-tarjeta mira-tarjeta--error">
      <p className="mira-tarjeta-titulo">{a.tool}</p>
      <p className="vacio-texto">{info.mensaje}</p>
    </div>
  );
}

function Tarjeta({ a, alSugerir, t }) {
  const r = a.result || {};
  switch (a.tool) {
    case 'getRestaurant': return <TarjetaRestaurante r={r} alSugerir={alSugerir} t={t} />;
    case 'searchRestaurants': return <TarjetaBusqueda items={r.items} alSugerir={alSugerir} t={t} />;
    case 'createReservation':
    case 'cancelReservation': return <TarjetaReserva r={r} tool={a.tool} t={t} />;
    case 'checkAvailability': return <TarjetaDisponibilidad r={r} t={t} />;
    case 'getBalance': return <TarjetaBalance r={r} t={t} />;
    case 'dailyLogin':
    case 'spinWheel':
    case 'redeemPoints': return <TarjetaPuntos r={r} tool={a.tool} t={t} />;
    default: return <AccionPlegable tool={a.tool} t={t} />;
  }
}

export default function MiraAcciones({ acciones, alSugerir }) {
  const t = useT(TRADS);
  if (!Array.isArray(acciones) || acciones.length === 0) return null;
  return (
    <>
      {acciones.map((a, i) =>
        a.ok === false ? (
          <TarjetaError key={`${a.tool}-${i}`} a={a} t={t} />
        ) : (
          <Tarjeta key={`${a.tool}-${i}`} a={a} alSugerir={alSugerir} t={t} />
        ),
      )}
    </>
  );
}