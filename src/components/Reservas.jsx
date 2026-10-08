/**
 * View pura: "Mis reservas" con estética de ticket.
 * - Ticket protagonista con la próxima reserva: cuenta atrás, meteo y acciones
 *   (cómo llegar, añadir al calendario con un .ics generado en el navegador).
 * - Calendario del mes con meteo + agenda del día seleccionado.
 * - Tickets por pestañas (próximas / pasadas / canceladas) con sello de estado.
 */
import { useEffect, useState } from 'react';
import { listarMisReservas, cancelarReserva } from '../services/reservaApi.js';
import { fetchRestaurantePorId } from '../services/restaurantApi.js';
import { esperaApi } from '../services/mejorasApi.js';
import { diasMes, pronosticoDia, alertaTerraza, resumenTexto } from '../services/meteoApi.js';
import { imagenParaRestaurante } from '../models/restaurantModel.js';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';
import '../styles/reservas.css';

const TRADS = { es, ca, en };
const DIA = 86400000;

function hoyISO() {
  const h = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${h.getFullYear()}-${p(h.getMonth() + 1)}-${p(h.getDate())}`;
}

const estadoDe = (r) => String(r.estado || 'pendiente').toLowerCase().replace('-', '_');

/** Días naturales entre hoy y la fecha de la reserva (0 = hoy). */
function diasHasta(fecha) {
  const a = new Date(`${hoyISO()}T00:00:00`);
  const b = new Date(`${fecha}T00:00:00`);
  return Math.round((b - a) / DIA);
}

/** Fichero .ics para añadir la reserva a cualquier calendario (se genera aquí, sin servicios externos). */
function descargarIcs(r) {
  const inicio = new Date(`${r.fecha}T${r.hora || '13:00'}:00`);
  const fin = new Date(inicio.getTime() + 2 * 3600000);
  const f = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const escapar = (s) => String(s || '').replace(/[,;\\]/g, (c) => `\\${c}`).replace(/\n/g, ' ');
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//MIRA//Reservas//ES', 'BEGIN:VEVENT',
    `UID:${r.id}@mira`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(inicio)}`, `DTEND:${f(fin)}`,
    `SUMMARY:${escapar(`Reserva en ${r.nombreRestaurante}`)}`,
    `DESCRIPTION:${escapar(`Código ${r.codigo || ''} · ${r.comensales} personas`)}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `reserva-${r.codigo || r.id}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function urlComoLlegar(r) {
  if (r.lat != null && r.lng != null) return `https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.nombreRestaurante || '')}`;
}

function Ticket({ r, t, locale, hoy, meteo, onCancelar, compacto = false }) {
  const estado = estadoDe(r);
  const fecha = new Date(`${r.fecha}T12:00:00`);
  const pasada = r.fecha < hoy;
  const m = meteo[r.fecha];
  const aviso = alertaTerraza(r.terraza, m, t);
  const n = Number(r.comensales) || 0;
  return (
    <li className={`tk${compacto ? ' tk--compacto' : ''} tk--${estado}${pasada ? ' tk--pasada' : ''}`}>
      <div className="tk-fecha" aria-hidden="true">
        <span className="tk-mes">{fecha.toLocaleDateString(locale, { month: 'short' }).replace('.', '')}</span>
        <span className="tk-dia">{fecha.getDate()}</span>
        <span className="tk-semana">{fecha.toLocaleDateString(locale, { weekday: 'short' }).replace('.', '')}</span>
      </div>
      <div className="tk-cuerpo">
        <strong className="tk-nombre">{r.nombreRestaurante}</strong>
        <p className="tk-meta">
          <span>{r.hora}</span>
          <span>{t('reservas.mesa', { n })}</span>
          {m && m.tempMax != null && <span title={resumenTexto(m.codigo, t)}>{Math.round(m.tempMax)}° · {resumenTexto(m.codigo, t)}</span>}
        </p>
        {r.comentarios && <p className="tk-nota">“{r.comentarios}”</p>}
        {aviso && <p className="tk-aviso" role="status">{aviso}</p>}
      </div>
      <div className="tk-talon">
        <span className="tk-codigo-label">{t('reservas.codigo')}</span>
        <code className="tk-codigo">{r.codigo || '—'}</code>
        {estado !== 'cancelada' && !pasada && onCancelar && (
          <button type="button" className="tk-cancelar" onClick={() => onCancelar(r)}>{t('reservas.cancelar')}</button>
        )}
      </div>
      <span className="tk-sello" aria-label={t(`reservas.estados.${estado}`) || estado}>{t(`reservas.estados.${estado}`) || estado}</span>
    </li>
  );
}

function TicketDestacado({ r, t, locale, meteo, onCancelar }) {
  const d = diasHasta(r.fecha);
  const cuenta = d <= 0 ? t('reservas.hoy') : d === 1 ? t('reservas.manana') : t('reservas.enDias', { n: d });
  const m = meteo[r.fecha];
  const aviso = alertaTerraza(r.terraza, m, t);
  const fecha = new Date(`${r.fecha}T12:00:00`);
  return (
    <article className="tkd" aria-labelledby="tkd-nombre">
      <div className="tkd-foto">
        <img src={imagenParaRestaurante('', r.restauranteId || r.restaurantId || r.id)} alt="" loading="lazy" />
        <span className="tkd-cuenta">{cuenta}</span>
      </div>
      <div className="tkd-info">
        <p className="tkd-eyebrow">{t('reservas.proxima')}</p>
        <h2 id="tkd-nombre">{r.nombreRestaurante}</h2>
        <dl className="tkd-datos">
          <div><dt>{fecha.toLocaleDateString(locale, { weekday: 'long' })}</dt><dd>{fecha.toLocaleDateString(locale, { day: 'numeric', month: 'long' })}</dd></div>
          <div><dt>{t('reservas.hora')}</dt><dd>{r.hora}</dd></div>
          <div><dt>{t('reservas.mesa', { n: '' }).replace(/\s+$/, '')}</dt><dd>{r.comensales}</dd></div>
          {m && m.tempMax != null && <div><dt>{resumenTexto(m.codigo, t)}</dt><dd>{Math.round(m.tempMax)}°</dd></div>}
        </dl>
        {aviso && <p className="tk-aviso" role="status">{aviso}</p>}
        <div className="tkd-acciones">
          <a className="btn-cta btn-peq" href={urlComoLlegar(r)} target="_blank" rel="noreferrer">{t('reservas.comoLlegar')}</a>
          <button type="button" className="btn-secundario btn-peq" onClick={() => descargarIcs(r)}>{t('reservas.anadirCalendario')}</button>
          <button type="button" className="tkd-cancelar" onClick={() => onCancelar(r)}>{t('reservas.cancelar')}</button>
        </div>
      </div>
      <div className="tkd-talon" aria-label={`${t('reservas.codigo')} ${r.codigo || ''}`}>
        <span className="tk-codigo-label">{t('reservas.codigo')}</span>
        <code className="tkd-codigo">{r.codigo || '—'}</code>
        <span className="tkd-barras" aria-hidden="true" />
      </div>
    </article>
  );
}

/**
 * Coordenadas del restaurante de una reserva, con caché por id.
 * Las reservas nuevas guardan lat/lng a null (la API no los recibe), así que
 * sin este paso Reservas.jsx nunca llegaba a pedir el pronóstico y desaparecían
 * la temperatura del calendario, el resumen del día y la alerta de terraza.
 */
const coordsPorRestaurante = new Map();
async function coordenadasReserva(r) {
  if (r.lat != null && r.lng != null) return { lat: r.lat, lng: r.lng };
  const id = r.restaurantId || r.restauranteId;
  if (!id) return null;
  if (coordsPorRestaurante.has(id)) return coordsPorRestaurante.get(id);
  let coords = null;
  try {
    const rest = await fetchRestaurantePorId(id);
    coords = rest?.coords || null;
  } catch {
    coords = null;
  }
  coordsPorRestaurante.set(id, coords);
  return coords;
}

export default function Reservas({ usuario, esAdmin }) {
  const t = useT(TRADS);
  const MESES = t('modelos.meses');
  const DIAS_SEMANA = t('modelos.diasSemana');
  const locale = t('modelos.locale');
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('proximas');
  const [mesVista, setMesVista] = useState(() => {
    const h = new Date();
    return { anio: h.getFullYear(), mes: h.getMonth() + 1 };
  });
  const [diaSel, setDiaSel] = useState(hoyISO());
  const [meteo, setMeteo] = useState({}); // fechaISO -> pronóstico | null
  const [enEspera, setEnEspera] = useState([]);

  useEffect(() => {
    if (!usuario?.uid) {
      window.location.hash = '#/login';
      return;
    }
    let vivo = true;
    setCargando(true);
    esperaApi.mias().then((l) => vivo && setEnEspera(l)).catch(() => {});
    listarMisReservas(usuario.uid)
      .then((l) => {
        if (vivo) {
          setLista(l);
          setCargando(false);
        }
      })
      .catch((e) => {
        if (vivo) {
          setError(e.message);
          setCargando(false);
        }
      });
    return () => {
      vivo = false;
    };
  }, [usuario]);

  // Meteo de los días con reserva del mes visible y de la próxima reserva (gratis, con caché).
  useEffect(() => {
    const prefijo = `${mesVista.anio}-${String(mesVista.mes).padStart(2, '0')}`;
    const hoy = hoyISO();
    const porDia = new Map();
    const sinCoords = [];
    const proxima = lista.filter((r) => estadoDe(r) !== 'cancelada' && r.fecha >= hoy).sort((a, b) => `${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`))[0];
    for (const r of [...lista.filter((x) => x.fecha?.startsWith(prefijo)), ...(proxima ? [proxima] : [])]) {
      if (r.lat != null && r.lng != null) {
        if (!porDia.has(r.fecha)) porDia.set(r.fecha, r);
      } else if (!porDia.has(r.fecha) && !sinCoords.some((s) => s.fecha === r.fecha)) {
        sinCoords.push(r);
      }
    }
    if (!porDia.size && !sinCoords.length) return undefined;
    let vivo = true;
    (async () => {
      // Reservas guardadas con lat/lng null: ubicación vía restaurantId (cacheada).
      await Promise.all(
        sinCoords.map(async (r) => {
          const c = await coordenadasReserva(r);
          if (c && !porDia.has(r.fecha)) porDia.set(r.fecha, { fecha: r.fecha, ...c });
        }),
      );
      if (!vivo || !porDia.size) return;
      try {
        const pares = await Promise.all(
          [...porDia.entries()].map(async ([fecha, r]) => [fecha, await pronosticoDia(r.lat, r.lng, fecha)]),
        );
        if (!vivo) return;
        setMeteo((prev) => {
          const next = { ...prev };
          pares.forEach(([f, p]) => {
            next[f] = p;
          });
          return next;
        });
      } catch {
        /* Sin red no hay pronóstico: el calendario sigue siendo usable. */
      }
    })();
    return () => {
      vivo = false;
    };
  }, [lista, mesVista]);

  if (!usuario) return null;

  async function handleCancelar(r) {
    if (!window.confirm(t('reservas.cancelarReserva', { fecha: r.fecha, hora: r.hora }))) return;
    setError('');
    try {
      await cancelarReserva(r.id, { uid: usuario.uid, esAdmin });
      setLista((prev) => prev.map((x) => (x.id === r.id ? { ...x, estado: 'cancelada' } : x)));
    } catch (e) {
      setError(e.message);
    }
  }

  const hoy = hoyISO();
  const orden = (a, b) => `${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`);
  const noCancelada = (r) => estadoDe(r) !== 'cancelada';
  const proximas = lista.filter((r) => noCancelada(r) && r.fecha >= hoy).sort(orden);
  const pasadas = lista.filter((r) => noCancelada(r) && r.fecha < hoy).sort((a, b) => orden(b, a));
  const canceladas = lista.filter((r) => !noCancelada(r)).sort((a, b) => orden(b, a));
  const [destacada, ...restoProximas] = proximas;
  const visibles = tab === 'proximas' ? restoProximas : tab === 'pasadas' ? pasadas : canceladas;

  const porDia = new Map();
  lista.forEach((r) => {
    if (!r.fecha || !noCancelada(r)) return;
    if (!porDia.has(r.fecha)) porDia.set(r.fecha, []);
    porDia.get(r.fecha).push(r);
  });
  const celdas = diasMes(mesVista.anio, mesVista.mes);
  const delDiaSel = (porDia.get(diaSel) || []).slice().sort(orden);

  function moverMes(dir) {
    setMesVista((m) => {
      let { anio, mes } = m;
      mes += dir;
      if (mes < 1) { mes = 12; anio -= 1; }
      if (mes > 12) { mes = 1; anio += 1; }
      return { anio, mes };
    });
  }

  return (
    <section className="rsv" aria-labelledby="reservas-titulo">
      <header className="rsv-cabecera">
        <div>
          <p className="rsv-eyebrow">MIRA</p>
          <h1 id="reservas-titulo">{t('reservas.misReservas')}</h1>
          {!cargando && <p className="rsv-sub">{t('reservas.resumen', { p: proximas.length, h: pasadas.length })}</p>}
        </div>
      </header>

      {cargando && (
        <div className="rsv-carga" role="status" aria-label={t('reservas.cargando')}>
          <span className="rsv-esq rsv-esq--grande" />
          <span className="rsv-esq" />
          <span className="rsv-esq" />
        </div>
      )}
      {error && <p className="auth-error" role="alert">{error}</p>}

      {!cargando && (
        destacada ? (
          <TicketDestacado r={destacada} t={t} locale={locale} meteo={meteo} onCancelar={handleCancelar} />
        ) : (
          <div className="rsv-vacio">
            <span aria-hidden="true">🍽️</span>
            <div>
              <strong>{t('reservas.sinProximas')}</strong>
              <p>{t('reservas.sinProximasSub')}</p>
            </div>
            <a className="btn-cta btn-peq" href="#/">{t('reservas.explorar')}</a>
          </div>
        )
      )}

      {!cargando && (
        <div className="rsv-extras">
          <a className="rsv-jam" href="#/jam">
            <span aria-hidden="true">👥</span>
            <span><strong>Reserva en grupo</strong> Votad dónde y cuándo; MIRA reserva la opción ganadora.</span>
          </a>
          {enEspera.length > 0 && (
            <section className="rsv-espera" aria-labelledby="espera-titulo">
              <h2 id="espera-titulo" className="rsv-h2">En lista de espera</h2>
              <ul>
                {enEspera.map((e) => (
                  <li key={e.id}>
                    <div>
                      <strong>{e.nombreRestaurante}</strong>
                      <span>{new Date(`${e.fecha}T12:00:00`).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })} · {e.hora} · {t('reservas.mesa', { n: e.comensales })}</span>
                    </div>
                    {e.estado === 'avisado' ? (
                      <a className="btn-cta btn-peq" href={`#/r/${encodeURIComponent(e.restauranteId)}?fecha=${e.fecha}&hora=${encodeURIComponent(e.hora)}&comensales=${e.comensales}`}>¡Mesa libre! Reservar</a>
                    ) : (
                      <span className="rsv-espera-estado">Esperando</span>
                    )}
                    <button type="button" className="tk-cancelar" onClick={async () => { await esperaApi.salir(e.id).catch(() => {}); setEnEspera((l) => l.filter((x) => x.id !== e.id)); }}>Quitar</button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {!cargando && (
        <div className="rsv-rejilla">
          <section className="rsv-panel" aria-labelledby="cal-titulo">
            <div className="rsv-cal-cab">
              <h2 id="cal-titulo">{MESES[mesVista.mes - 1]} <span>{mesVista.anio}</span></h2>
              <div className="rsv-cal-nav">
                <button type="button" onClick={() => moverMes(-1)} aria-label={t('reservas.mesAnterior')}>‹</button>
                <button type="button" onClick={() => moverMes(1)} aria-label={t('reservas.mesSiguiente')}>›</button>
              </div>
            </div>
            <div className="rsv-cal" role="grid" aria-label={`${t('reservas.misReservas')} ${MESES[mesVista.mes - 1]}`}>
              {DIAS_SEMANA.map((d) => <span key={d} className="rsv-cal-nombre" role="columnheader" title={d}>{String(d).slice(0, 3)}</span>)}
              {celdas.map((c, i) => {
                if (!c) return <span key={`v-${i}`} className="rsv-cal-dia is-vacio" />;
                const n = (porDia.get(c.fecha) || []).length;
                const m = meteo[c.fecha];
                return (
                  <button
                    key={c.fecha}
                    type="button"
                    role="gridcell"
                    aria-pressed={diaSel === c.fecha}
                    aria-label={t('reservas.ariaDia', { dia: c.dia, n })}
                    className={`rsv-cal-dia${c.fecha === hoy ? ' is-hoy' : ''}${diaSel === c.fecha ? ' is-sel' : ''}${n ? ' is-con' : ''}${c.fecha < hoy ? ' is-pasado' : ''}`}
                    onClick={() => setDiaSel(c.fecha)}
                  >
                    <span className="rsv-cal-num">{c.dia}</span>
                    {n > 0 && <span className="rsv-cal-marca" aria-hidden="true">{n > 1 ? n : ''}</span>}
                    {m && m.tempMax != null && <span className="rsv-cal-temp" title={resumenTexto(m.codigo, t)}>{Math.round(m.tempMax)}°</span>}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rsv-panel" aria-labelledby="agenda-titulo">
            <h2 id="agenda-titulo" className="rsv-h2">{t('reservas.agendaDia')}</h2>
            <p className="rsv-agenda-fecha">{new Date(`${diaSel}T12:00:00`).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            {delDiaSel.length === 0 ? (
              <p className="rsv-agenda-vacia">{t('reservas.nadaEsteDia')}</p>
            ) : (
              <ol className="rsv-agenda">
                {delDiaSel.map((r) => (
                  <li key={r.id}>
                    <span className="rsv-agenda-hora">{r.hora}</span>
                    <div>
                      <strong>{r.nombreRestaurante}</strong>
                      <span>{t('reservas.mesa', { n: Number(r.comensales) || 0 })} · {t(`reservas.estados.${estadoDe(r)}`)}</span>
                      {alertaTerraza(r.terraza, meteo[r.fecha], t) && <span className="tk-aviso">{alertaTerraza(r.terraza, meteo[r.fecha], t)}</span>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      )}

      {!cargando && (
        <section aria-label={t('reservas.misReservas')}>
          <div className="rsv-tabs" role="tablist" aria-label={t('reservas.misReservas')}>
            {[
              ['proximas', t('reservas.proximas'), restoProximas.length],
              ['pasadas', t('reservas.pasadas'), pasadas.length],
              ['canceladas', t('reservas.canceladas'), canceladas.length],
            ].map(([key, label, n]) => (
              <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? 'is-activa' : ''} onClick={() => setTab(key)}>
                {label} <span>{n}</span>
              </button>
            ))}
          </div>
          {visibles.length === 0 ? (
            <p className="rsv-agenda-vacia">{t('reservas.nadaAqui')}</p>
          ) : (
            <ul className="tk-lista">
              {visibles.map((r, i) => (
                <Ticket key={r.id} r={r} t={t} locale={locale} hoy={hoy} meteo={meteo} onCancelar={handleCancelar} compacto={tab !== 'proximas'} i={i} />
              ))}
            </ul>
          )}
        </section>
      )}
    </section>
  );
}
