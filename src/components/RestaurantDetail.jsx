/**
 * Modal detalle premium: info + reservas + mapa + reseñas con likes.
 */
import { useEffect, useState } from 'react';
import { crearReserva, getDisponibilidad, SLOTS } from '../services/reservaApi.js';
import { crearResena, listarResenasDeRestaurante, darLikeResena, quitarLikeResena } from '../services/resenasApi.js';
import { semillaLikes, parseFechaLocal, hoyLocalISO, ordenarResenas, cartaDelLocal, flagsPlato, imagenParaRestaurante } from '../models/restaurantModel.js';
import { pronosticoDia, alertaTerraza } from '../services/meteoApi.js';
import { fetchNearbyParkings } from '../services/parkingApi.js';
import RestaurantMap from './RestaurantMap.jsx';
import ParkingsPanel from './ParkingsPanel.jsx';
import { Sellos, MiniLeyenda } from './Sellos.jsx';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';

const TRADS = { es, ca, en };

function marcaInfo(valor, t) {
  if (valor === true) return t('detail.si');
  if (valor === false) return t('detail.no');
  return t('detail.sinInfo');
}

const MOSTRAR_INICIAL = 10;

function googleLink(coords, direccion) {
  if (coords) return `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`;
  if (direccion) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;
  return null;
}

export default function RestaurantDetail({ restaurant, usuario, onClose, onVerCarta }) {
  const t = useT(TRADS);

  function StarPicker({ value, onChange }) {
    return (
      <div style={{ display: 'flex', gap: '0.15rem' }} role="radiogroup" aria-label={t('detail.puntuacion')}>
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} ${t('detail.estrellas')}`}
            onClick={() => onChange(n)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: n <= value ? 'var(--estrella)' : 'var(--borde)', fontSize: '1.45rem', lineHeight: 1 }}>
            ★
          </button>
        ))}
      </div>
    );
  }
  const [verTodas, setVerTodas] = useState(false);
  const [verTodasYelp, setVerTodasYelp] = useState(false);
  const [ordenResenas, setOrdenResenas] = useState('populares');
  const [reserva, setReserva] = useState({ fecha: '', hora: '', comensales: '2', comentarios: '' });
  const [disponibilidad, setDisponibilidad] = useState(null);
  const [meteoReserva, setMeteoReserva] = useState(null);
  const [confirmacion, setConfirmacion] = useState(null);
  const [errorReserva, setErrorReserva] = useState('');
  const [cargandoReserva, setCargandoReserva] = useState(false);

  const [resenasFs, setResenasFs] = useState([]);
  const [cargandoResenas, setCargandoResenas] = useState(true);
  const [nuevaResena, setNuevaResena] = useState({ puntuacion: 5, comentario: '' });
  const [errorResena, setErrorResena] = useState('');
  const [enviandoResena, setEnviandoResena] = useState(false);

  const [parkings, setParkings] = useState([]);
  const [cargandoParkings, setCargandoParkings] = useState(false);
  const [parkingSeleccionado, setParkingSeleccionado] = useState(null);

  const media = restaurant.media;
  const mockResenas = (restaurant.resenas ?? []).map((r, i) => ({ ...r, id: `mock-${i}`, likes: (r.likes ?? semillaLikes(restaurant.id, i)), likedBy: [], esMock: true, puntuacion: r.puntuacion }));
  const resenasMira = ordenarResenas(resenasFs, ordenResenas);
  const resenasYelp = ordenarResenas(mockResenas, ordenResenas);
  const visiblesMira = verTodas ? resenasMira : resenasMira.slice(0, MOSTRAR_INICIAL);
  const visiblesYelp = verTodasYelp ? resenasYelp : resenasYelp.slice(0, MOSTRAR_INICIAL);

  function ItemResena({ r }) {
    const liked = (r.likedBy || []).includes(usuario?.uid);
    return (
      <li>
        <p className="resena-cab">
          <strong>{r.usuarioNombre || r.usuario}</strong> · {(r.fecha || (r.createdAt ? new Date(r.createdAt).toLocaleDateString(t('modelos.locale')) : ''))} · <span aria-label={`${r.puntuacion} de 5`}>★ {r.puntuacion}</span>
          <span style={{ float: 'right', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <button type="button" onClick={() => handleLike(r)} disabled={r.esMock} title={r.esMock ? t('detail.soloLikeMira') : liked ? t('detail.quitarLike') : t('detail.darLike')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: liked ? 'var(--primary-container)' : 'var(--papel)', color: liked ? '#fff' : 'var(--tinta)', border: '1px solid var(--borde)', borderRadius: '999px', padding: '0.15rem 0.5rem', cursor: r.esMock ? 'not-allowed' : 'pointer', fontSize: '0.78rem', fontWeight: 700, opacity: r.esMock ? 0.5 : 1 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg>
              {r.likes || 0}
            </button>
          </span>
        </p>
        <p className="resena-texto">{r.comentario}</p>
      </li>
    );
  }
  const externalMapUrl = googleLink(restaurant.coords, restaurant.direccion);

  useEffect(() => {
    let vivo = true;
    setDisponibilidad(null);
    if (!reserva.fecha || !reserva.hora) return undefined;
    getDisponibilidad(restaurant, reserva.fecha, reserva.hora)
      .then((d) => { if (vivo) setDisponibilidad(d); })
      .catch(() => { if (vivo) setDisponibilidad(null); });
    return () => { vivo = false; };
  }, [restaurant, reserva.fecha, reserva.hora]);

  useEffect(() => {
    let vivo = true;
    setMeteoReserva(null);
    if (restaurant.terraza !== true || !reserva.fecha || !restaurant.coords) return undefined;
    pronosticoDia(restaurant.coords.lat, restaurant.coords.lng, reserva.fecha)
      .then((p) => { if (vivo) setMeteoReserva(p); })
      .catch(() => {});
    return () => { vivo = false; };
  }, [restaurant, reserva.fecha]);

  const avisoTerraza = alertaTerraza(restaurant.terraza, meteoReserva);

  function cerrarDesdeFondo(e) { if (e.target === e.currentTarget) onClose(); }

  useEffect(() => {
    let vivo = true;
    setCargandoResenas(true);
    listarResenasDeRestaurante(restaurant.id).then(list => {
      if (vivo) { setResenasFs(list); setCargandoResenas(false); }
    }).catch(() => vivo && setCargandoResenas(false));
    return () => { vivo = false; };
  }, [restaurant.id]);

  useEffect(() => {
    if (!usuario?.uid) return;
    import('../services/api.js').then(({ interactionsApi }) => {
      interactionsApi.track(restaurant.id, 'view').catch(() => {});
    });
  }, [restaurant.id, usuario?.uid]);

  useEffect(() => {
    let vivo = true;
    const coords = restaurant.coords;
    if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
      setParkings([]);
      setCargandoParkings(false);
      return undefined;
    }
    setCargandoParkings(true);
    fetchNearbyParkings(coords.lat, coords.lng)
      .then((list) => { if (vivo) setParkings(list); })
      .finally(() => { if (vivo) setCargandoParkings(false); });
    return () => { vivo = false; };
  }, [restaurant.coords]);

  async function handleReserva(e) {
    e.preventDefault();
    setErrorReserva(''); setConfirmacion(null);
    if (!usuario?.uid) { window.location.hash = '#/login'; return; }
    if (!reserva.fecha || !reserva.hora || !reserva.comensales) { setErrorReserva(t('detail.eligeFechaHora')); return; }
    const hoy = parseFechaLocal(hoyLocalISO());
    if (parseFechaLocal(reserva.fecha) < hoy) { setErrorReserva(t('detail.fechaNoAnterior')); return; }
    setCargandoReserva(true);
    try {
      const r = await crearReserva({ restaurante: restaurant, usuario, fecha: reserva.fecha, hora: reserva.hora, comensales: reserva.comensales, comentarios: reserva.comentarios });
      setConfirmacion(r);
      const d = await getDisponibilidad(restaurant, reserva.fecha, reserva.hora);
      setDisponibilidad(d);
    } catch (err) { setErrorReserva(err.message); }
    finally { setCargandoReserva(false); }
  }

  async function handleCrearResena(e) {
    e.preventDefault();
    setErrorResena('');
    if (!usuario?.uid) { setErrorResena(t('detail.debesLoginResena')); return; }
    setEnviandoResena(true);
    try {
      await crearResena({ restauranteId: restaurant.id, usuario, puntuacion: nuevaResena.puntuacion, comentario: nuevaResena.comentario });
      setNuevaResena({ puntuacion: 5, comentario: '' });
      const list = await listarResenasDeRestaurante(restaurant.id);
      setResenasFs(list);
    } catch (err) { setErrorResena(err.message); }
    finally { setEnviandoResena(false); }
  }

  async function handleLike(r) {
    if (!usuario?.uid) { setErrorResena(t('detail.iniciaParaLike')); return; }
    const ya = (r.likedBy || []).includes(usuario.uid);
    setResenasFs(prev => prev.map(x => x.id === r.id ? { ...x, likes: (x.likes || 0) + (ya ? -1 : 1), likedBy: ya ? x.likedBy.filter(id => id !== usuario.uid) : [...(x.likedBy || []), usuario.uid] } : x));
    try {
      if (ya) await quitarLikeResena(r.id, usuario.uid);
      else await darLikeResena(r.id, usuario.uid);
    } catch {
      setResenasFs(prev => prev.map(x => x.id === r.id ? { ...x, likes: (x.likes || 0) + (ya ? 1 : -1), likedBy: ya ? [...(x.likedBy || []), usuario.uid] : x.likedBy.filter(id => id !== usuario.uid) } : x));
    }
  }

  return (
    <div className="modal-fondo" onClick={cerrarDesdeFondo}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="detalle-titulo" style={{ '--acento': restaurant.acento }}>
        <button type="button" className="modal-cerrar" onClick={onClose} aria-label={t('otros.cerrar')} autoFocus>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
        <img
          className="modal-foto"
          src={restaurant.imagen}
          alt={`${restaurant.nombre} — cocina ${restaurant.cocina}`}
          onError={(e) => {
            const el = e.currentTarget;
            if (el.dataset.fallback === '1') return;
            el.dataset.fallback = '1';
            el.src = imagenParaRestaurante(restaurant.cocina, restaurant.id);
          }}
        />
        <div className="modal-cuerpo">
          <p className="card-meta" style={{ color: 'var(--gris)', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 0.3rem' }}>{restaurant.cocina}</p>
          <h2 id="detalle-titulo" className="modal-titulo">{restaurant.nombre}</h2>
          {(restaurant.categorias?.length > 1) && (
            <ul className="modal-chips" aria-label={t('detail.especialidades')}>
              {restaurant.categorias.map((c) => (<li key={c}>{c}</li>))}
            </ul>
          )}
          <dl className="modal-datos">
            <div><dt>{t('detail.notaYelp')}</dt><dd>★ {restaurant.valoracion.toLocaleString(t('modelos.locale'))} ({restaurant.totalResenasYelp ?? 0} {t('card.resenas')})</dd></div>
            {media != null && (<div><dt>{t('detail.notaMira')}</dt><dd>★ {media.toLocaleString(t('modelos.locale'))}</dd></div>)}
            <div><dt>{t('detail.precio')}</dt><dd>{restaurant.precio}</dd></div>
            {restaurant.direccion && (<div><dt>{t('detail.direccion')}</dt><dd>{restaurant.direccion}</dd></div>)}
            {restaurant.telefono && (<div><dt>{t('detail.telefono')}</dt><dd><a href={`tel:${restaurant.telefono.replace(/\s/g, '')}`}>{restaurant.telefono}</a></dd></div>)}
            <div><dt>{t('detail.accesoAdaptado')}</dt><dd>{marcaInfo(restaurant.accesoDiscapacidad, t)}</dd></div>
            <div><dt>{t('detail.menuInfantil')}</dt><dd>{marcaInfo(restaurant.menuInfantil, t)}</dd></div>
            <div><dt>{t('detail.tronas')}</dt><dd>{marcaInfo(restaurant.tronas, t)}</dd></div>
            <div><dt>{t('detail.terraza')}</dt><dd>{marcaInfo(restaurant.terraza, t)}</dd></div>
            <div><dt>{t('detail.entornoTranquilo')}</dt><dd>{marcaInfo(restaurant.entornoTranquilo, t)}</dd></div>
            <div><dt>{t('detail.alergenos')}</dt><dd>{restaurant.alergenos || t('detail.sinInfoAlrgenos')}</dd></div>
          </dl>
          <p className="modal-acciones">
            {onVerCarta && (
              <button type="button" className="btn-cta btn-peq" onClick={() => onVerCarta(restaurant)}>
                {t('detail.verCarta')}
              </button>
            )}
            {externalMapUrl && (<a className="btn-secundario" href={externalMapUrl} target="_blank" rel="noreferrer"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: '-2px', marginRight: 6 }}><path d="M12 21s7-6.5 7-11a7 7 0 10-14 0c0 4.5 7 11 7 11z" /><circle cx="12" cy="10" r="3" /></svg>{t('detail.comoLlegar')}</a>)}
            {restaurant.yelpUrl && (<a className="btn-secundario" href={restaurant.yelpUrl} target="_blank" rel="noreferrer">{t('detail.verEnYelp')}</a>)}
          </p>

          <section aria-labelledby="carta-titulo">
            <h3 id="carta-titulo" className="modal-sub">{t('detail.laCarta')}</h3>
            <MiniLeyenda />
            <ul className="carta-lista">
              {cartaDelLocal(restaurant).map((p) => (
                <li key={p.nombre}>
                  <span>{p.nombre} <Sellos plato={{ ...p, ...flagsPlato(p.nombre) }} /></span>
                  <span className="carta-precio">{p.precio} €</span>
                </li>
              ))}
            </ul>
            {onVerCarta && (
              <button type="button" className="btn-secundario" onClick={() => onVerCarta(restaurant)}>
                {t('detail.verCartaCompleta')}
              </button>
            )}
          </section>

          <section className="reserva-bloque" aria-labelledby="reserva-titulo">
            <h3 id="reserva-titulo" className="modal-sub" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
              {t('detail.reservarMesa')}
            </h3>
            <div className="detail-points-preview">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v12M6 12h12" /></svg>
              +100 pts por reserva
              <span className="detail-points-preview__racha">x1.2 si mantienes racha</span>
            </div>
            <form className="reserva-form" onSubmit={handleReserva} noValidate>
              <div className="reserva-grid">
                <label className="campo"><span>{t('detail.fecha')}</span><input type="date" value={reserva.fecha} onChange={e => setReserva(s => ({ ...s, fecha: e.target.value }))} min={hoyLocalISO()} /></label>
                <label className="campo"><span>{t('detail.hora')}</span>
                  <select value={reserva.hora} onChange={e => setReserva(s => ({ ...s, hora: e.target.value }))}>
                    <option value="">{t('detail.eligeHora')}</option>
                    {SLOTS.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </label>
                <label className="campo"><span>{t('detail.comensales')}</span><select value={reserva.comensales} onChange={e => setReserva(s => ({ ...s, comensales: e.target.value }))}>{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n} {n === 1 ? t('modelos.persona') : t('modelos.personas')}</option>)}</select></label>
              </div>
              <label className="campo" style={{ marginTop: '0.6rem' }}><span>{t('detail.comentarios')}</span><textarea value={reserva.comentarios} onChange={e => setReserva(s => ({ ...s, comentarios: e.target.value }))} maxLength={500} rows={2} placeholder={t('detail.placeholderComentarios')} /></label>
              {reserva.fecha && reserva.hora && disponibilidad && (
                <p className="reserva-plazas" role="status">
                  {disponibilidad.libres > 0
                    ? t('detail.plazasLibres', { libres: disponibilidad.libres, limite: disponibilidad.limite })
                    : t('detail.completo')}
                </p>
              )}
              {avisoTerraza && (
                <p className="reserva-aviso-meteo" role="status">
                  {avisoTerraza}
                  {meteoReserva && ` (${meteoReserva.resumen})`}
                </p>
              )}
              {errorReserva && <p className="reserva-error" role="alert">{errorReserva}</p>}
              <button type="submit" className="btn-cta" style={{ width: '100%', marginTop: '0.7rem' }} disabled={cargandoReserva || (disponibilidad && disponibilidad.libres <= 0)}>
                {cargandoReserva ? t('detail.reservando') : t('detail.reservar')}
              </button>
              {!usuario && <p style={{ fontSize: '0.82rem', color: 'var(--gris)', margin: '0.5rem 0 0' }}>{t('otros.debes')} <a href="#/login">{t('otros.iniciarSesion')}</a> {t('detail.reservar')}.</p>}
            </form>
            {confirmacion && (
              <div className="reserva-confirm" role="status">
                <strong>{t('detail.reservaConfirmada')}</strong>
                <p>{t('detail.codigo')}: <code>{confirmacion.codigo}</code> — {confirmacion.fecha} a las {confirmacion.hora} para {confirmacion.comensales} {t('modelos.personas')} en <em>{confirmacion.restauranteNombre}</em>.</p>
                <p><a href="#/reservas">{t('detail.verMisReservas')}</a></p>
              </div>
            )}
          </section>

          {restaurant.coords ? (
            <section className="parking-section" aria-label={`${t('otros.mapaPorZonas')} — ${restaurant.nombre}`}>
              <div className="parking-grid">
                <RestaurantMap
                  restaurant={restaurant}
                  parkings={parkings}
                  selectedIndex={parkingSeleccionado}
                />
                <ParkingsPanel
                  parkings={parkings}
                  cargando={cargandoParkings}
                  onSeleccionarParking={(i) => setParkingSeleccionado(i)}
                />
              </div>
              <p className="mapa-mini-pie">{restaurant.direccion || restaurant.ciudad}</p>
            </section>
          ) : (<p className="modal-mapa-vacio">{t('detail.esteLocalSinCoord')}</p>)}

          <section aria-labelledby="resenas-titulo">
            <h3 id="resenas-titulo" className="modal-sub">{t('detail.resenas', { count: resenasMira.length + resenasYelp.length })}</h3>
            <div className="tabs" role="group" aria-label={t('detail.resenas', { count: resenasMira.length + resenasYelp.length })} style={{ marginBottom: '1rem' }}>
              {[
                ['populares', t('detail.populares')],
                ['recientes', t('detail.masRecientes')],
              ].map(([valor, etiqueta]) => (
                <button
                  key={valor}
                  type="button"
                  aria-pressed={ordenResenas === valor}
                  className={ordenResenas === valor ? 'btn-cta btn-peq' : 'btn-secundario btn-peq'}
                  onClick={() => setOrdenResenas(valor)}
                >
                  {etiqueta}
                </button>
              ))}
            </div>

            <h4 className="modal-sub2">{t('detail.resenasMira', { count: resenasMira.length })}</h4>
            <form onSubmit={handleCrearResena} className="resena-form" style={{ background: 'var(--fondo-suave)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radio-peq)', padding: '0.9rem', marginBottom: '1rem' }}>
              <StarPicker value={nuevaResena.puntuacion} onChange={v => setNuevaResena(s => ({ ...s, puntuacion: v }))} />
              <label className="campo" style={{ marginTop: '0.5rem' }}><span>{t('detail.tuComentario')}</span><textarea value={nuevaResena.comentario} onChange={e => setNuevaResena(s => ({ ...s, comentario: e.target.value }))} placeholder={t('detail.cuentaExperiencia')} rows={3} /></label>
              {errorResena && <p className="reserva-error">{errorResena}</p>}
              <button type="submit" className="btn-secundario" disabled={enviandoResena} style={{ marginTop: '0.5rem', width: '100%' }}>{enviandoResena ? t('detail.enviando') : t('detail.publicarResena')}</button>
              {!usuario && <p style={{ fontSize: '0.82rem', color: 'var(--gris)', margin: '0.4rem 0 0' }}>{t('detail.debesLoginResena')}</p>}
            </form>

            {cargandoResenas && <p>{t('detail.cargandoResenas')}</p>}
            {!cargandoResenas && resenasMira.length === 0 && (
              <p className="vacio-texto">{t('detail.resenasMiraVacias')}</p>
            )}
            <ul className="modal-resenas">
              {visiblesMira.map((r) => (
                <ItemResena key={r.id} r={r} />
              ))}
            </ul>
            {resenasMira.length > MOSTRAR_INICIAL && (
              <button type="button" className="btn-secundario" onClick={() => setVerTodas((v) => !v)}>
                {verTodas ? t('detail.verMenos') : t('detail.verResenasMira', { count: resenasMira.length })}
              </button>
            )}

            <h4 className="modal-sub2">{t('detail.resenasYelp', { count: resenasYelp.length })}</h4>
            {resenasYelp.length === 0 && (
              <p className="vacio-texto">{t('detail.resenasYelpVacias')}</p>
            )}
            <ul className="modal-resenas">
              {visiblesYelp.map((r) => (
                <ItemResena key={r.id} r={r} />
              ))}
            </ul>
            {resenasYelp.length > MOSTRAR_INICIAL && (
              <button type="button" className="btn-secundario" onClick={() => setVerTodasYelp((v) => !v)}>
                {verTodasYelp ? t('detail.verMenos') : t('detail.verResenasYelp', { count: resenasYelp.length })}
              </button>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
