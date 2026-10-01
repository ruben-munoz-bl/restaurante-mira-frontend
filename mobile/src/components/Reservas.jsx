/** View pura: "Mis reservas" — calendario con meteo + lista por pestañas. */
import { useEffect, useState } from 'react';
import { listarMisReservas, cancelarReserva } from '../services/reservaApi.js';
import { diasMes, pronosticoDia, alertaTerraza } from '../services/meteoApi.js';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';

function hoyISO() {
  const h = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${h.getFullYear()}-${p(h.getMonth() + 1)}-${p(h.getDate())}`;
}

const TRADS = { es, ca, en };

export default function Reservas({ usuario, esAdmin }) {
  const t = useT(TRADS);
  const MESES = t('modelos.meses');
  const DIAS_SEMANA = t('modelos.diasSemana');
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

  useEffect(() => {
    if (!usuario?.uid) {
      window.location.hash = '#/login';
      return;
    }
    let vivo = true;
    setCargando(true);
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

  // Meteo de los días con reserva del mes visible (gratis, con caché).
  useEffect(() => {
    const prefijo = `${mesVista.anio}-${String(mesVista.mes).padStart(2, '0')}`;
    const porDia = new Map();
    for (const r of lista) {
      if (r.fecha?.startsWith(prefijo) && r.lat != null && r.lng != null && !porDia.has(r.fecha)) {
        porDia.set(r.fecha, r);
      }
    }
    if (!porDia.size) return undefined;
    let vivo = true;
    Promise.all(
      [...porDia].map(async ([fecha, r]) => [fecha, await pronosticoDia(r.lat, r.lng, fecha)]),
    ).then((pares) => {
      if (!vivo) return;
      setMeteo((prev) => {
        const next = { ...prev };
        pares.forEach(([f, p]) => {
          next[f] = p;
        });
        return next;
      });
    });
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
  const noCancelada = (r) => String(r.estado || '').toLowerCase() !== 'cancelada';
  const proximas = lista.filter((r) => noCancelada(r) && r.fecha >= hoy);
  const pasadas = lista.filter((r) => noCancelada(r) && r.fecha < hoy);
  const canceladas = lista.filter((r) => r.estado === 'cancelada');
  const visibles = tab === 'proximas' ? proximas : tab === 'pasadas' ? pasadas : canceladas;

  // Calendario: reservas por día + meteo del día seleccionado.
  const porDia = new Map();
  lista.forEach((r) => {
    if (!r.fecha || r.estado === 'cancelada') return;
    if (!porDia.has(r.fecha)) porDia.set(r.fecha, []);
    porDia.get(r.fecha).push(r);
  });
  const celdas = diasMes(mesVista.anio, mesVista.mes);
  const delDiaSel = (porDia.get(diaSel) || []).slice().sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));

  function moverMes(dir) {
    setMesVista((m) => {
      let { anio, mes } = m;
      mes += dir;
      if (mes < 1) {
        mes = 12;
        anio -= 1;
      }
      if (mes > 12) {
        mes = 1;
        anio += 1;
      }
      return { anio, mes };
    });
  }

  return (
    <section className="auth-pagina pagina-ancha" aria-labelledby="reservas-titulo">
      <div className="auth-tarjeta tarjeta-ancha">
        <h1 id="reservas-titulo">{t('reservas.misReservas')}</h1>
        {cargando && <p>{t('reservas.cargando')}</p>}
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        {!cargando && (
          <section aria-labelledby="cal-titulo">
            <h2 id="cal-titulo" className="cuenta-sub">
              {t('reservas.calendario')}
            </h2>
            <div className="cal-cab">
              <button type="button" className="btn-secundario btn-peq" onClick={() => moverMes(-1)} aria-label={t('reservas.mesAnterior')}>
                ←
              </button>
              <strong>
                {MESES[mesVista.mes - 1]} {mesVista.anio}
              </strong>
              <button type="button" className="btn-secundario btn-peq" onClick={() => moverMes(1)} aria-label={t('reservas.mesSiguiente')}>
                →
              </button>
            </div>
            <div className="cal-grid" role="grid" aria-label={`${t('reservas.misReservas')} ${MESES[mesVista.mes - 1]}`}>
              {DIAS_SEMANA.map((d) => (
                <span key={d} className="cal-nombre-dia" role="columnheader">
                  {d}
                </span>
              ))}
              {celdas.map((c, i) =>
                !c ? (
                  <span key={`vacia-${i}`} className="cal-dia cal-vacio" />
                ) : (
                  <button
                    key={c.fecha}
                    type="button"
                    role="gridcell"
                    aria-pressed={diaSel === c.fecha}
                    aria-label={`${c.dia}: ${(porDia.get(c.fecha) || []).length} reservas`}
                    className={`cal-dia${c.fecha === hoy ? ' cal-hoy' : ''}${diaSel === c.fecha ? ' cal-sel' : ''}${
                      (porDia.get(c.fecha) || []).length ? ' cal-con-reservas' : ''
                    }`}
                    onClick={() => setDiaSel(c.fecha)}
                  >
                    <span className="cal-num">{c.dia}</span>
                    {(porDia.get(c.fecha) || []).length > 0 && (
                      <span className="cal-puntos" aria-hidden="true">
                        {(porDia.get(c.fecha) || []).slice(0, 3).map((r) => (
                          <span key={r.id} className="cal-punto" />
                        ))}
                      </span>
                    )}
                    {meteo[c.fecha] && meteo[c.fecha].tempMax != null && (
                      <span className="cal-temp" title={meteo[c.fecha].resumen}>
                        {Math.round(meteo[c.fecha].tempMax)}°
                      </span>
                    )}
                  </button>
                ),
              )}
            </div>
            <h3 className="cuenta-sub">
              {new Date(`${diaSel}T12:00:00`).toLocaleDateString(t('modelos.locale'), { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            {delDiaSel.length === 0 && <p className="vacio-texto">{t('reservas.nadaEsteDia')}</p>}
            <ul className="lista-registros">
              {delDiaSel.map((r) => {
                const aviso = alertaTerraza(r.terraza, meteo[r.fecha]);
                const m = meteo[r.fecha];
                return (
                  <li key={r.id} className="registro">
                    <div>
                      <strong>{r.nombreRestaurante}</strong>
                      <div className="registro-detalle">
                        {r.hora} · {r.comensales} {Number(r.comensales) === 1 ? t('modelos.persona') : t('modelos.personas')} ·{' '}
                        <code>{r.codigo}</code>
                        {m && m.tempMax != null && (
                          <> · {Math.round(m.tempMax)}° {m.resumen}</>
                        )}
                      </div>
                      {aviso && (
                        <div className="registro-detalle" role="status" style={{ color: '#8f1d14', fontWeight: 700 }}>
                          {aviso}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
        {!cargando && (
          <>
            <div className="tabs" role="tablist" aria-label={t('reservas.misReservas')}>
              {[
                ['proximas', `${t('reservas.proximas')} (${proximas.length})`],
                ['pasadas', `${t('reservas.pasadas')} (${pasadas.length})`],
                ['canceladas', `${t('reservas.canceladas')} (${canceladas.length})`],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={tab === key}
                  className={tab === key ? 'btn-cta btn-peq' : 'btn-secundario btn-peq'}
                  onClick={() => setTab(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            {visibles.length === 0 && (
              <p className="vacio-texto">{t('reservas.nadaAqui')}</p>
            )}
            <ul className="lista-registros">
              {visibles.map((r) => (
                <li key={r.id} className="registro">
                  <div>
                    <strong>{r.nombreRestaurante}</strong>
                    <div className="registro-detalle">
                      {r.fecha} a las {r.hora} · {r.comensales}{' '}
                      {Number(r.comensales) === 1 ? t('modelos.persona') : t('modelos.personas')} · <code>{r.codigo}</code> ·{' '}
                      {r.estado}
                    </div>
                    {r.comentarios && <div className="registro-detalle">“{r.comentarios}”</div>}
                  </div>
                  {String(r.estado || '').toLowerCase() !== 'cancelada' && r.fecha >= hoy && (
                    <button type="button" className="btn-secundario btn-peq" onClick={() => handleCancelar(r)}>
                      {t('reservas.cancelar')}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
