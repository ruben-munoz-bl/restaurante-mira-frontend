/**
 * Modal detalle premium: portada con foto, notas, servicios, adelanto de la
 * carta, reserva por pasos, mapa con parkings y reseñas.
 */
import { useEffect, useMemo, useState } from 'react';
import { crearReserva, getDisponibilidad, SLOTS } from '../services/reservaApi.js';
import { crearResena, listarResenasDeRestaurante, darLikeResena, quitarLikeResena } from '../services/resenasApi.js';
import { semillaLikes, parseFechaLocal, hoyLocalISO, ordenarResenas, cartaDelLocal, flagsPlato, imagenParaRestaurante } from '../models/restaurantModel.js';
import { fotoDePlato } from '../services/fotosPlatos.js';
import { esEstimado } from '../models/serviciosEstimados.js';
import { pronosticoDia, alertaTerraza } from '../services/meteoApi.js';
import { fetchNearbyParkings } from '../services/parkingApi.js';
import RestaurantMap from './RestaurantMap.jsx';
import ParkingsPanel from './ParkingsPanel.jsx';
import { Sellos } from './Sellos.jsx';
import usePointsStore from '../stores/usePointsStore.js';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';
import '../styles/detalle.css';
import { track } from '../services/auditoria.js';

const TRADS = { es, ca, en };
const MOSTRAR_INICIAL = 6;
const DIAS_RAPIDOS = 7;

const SERVICIOS = [
  { campo: 'accesoDiscapacidad', icono: '♿', clave: 'accesoAdaptado' },
  { campo: 'menuInfantil', icono: '🧒', clave: 'menuInfantil' },
  { campo: 'tronas', icono: '🪑', clave: 'tronas' },
  { campo: 'terraza', icono: '☀️', clave: 'terraza' },
  { campo: 'entornoTranquilo', icono: '🤫', clave: 'entornoTranquilo' },
];

function googleLink(coords, direccion) {
  if (coordsValidas(coords)) {
    return `https://www.google.com/maps/search/?api=1&query=${Number(coords.lat)},${Number(coords.lng)}`;
  }
  if (direccion) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;
  return null;
}

function coordsValidas(coords) {
  return Boolean(coords) && Number.isFinite(Number(coords.lat)) && Number.isFinite(Number(coords.lng));
}

/** Estrella dorada (SVG) con relleno parcial opcional. */
function Estrella({ relleno = 1, tam = 18 }) {
  const id = useMemo(() => `est-${Math.random().toString(36).slice(2, 8)}`, []);
  return (
    <svg className="det-estrella" width={tam} height={tam} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-oro`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="0.55" stopColor="#f5b301" />
          <stop offset="1" stopColor="#c98a00" />
        </linearGradient>
        <linearGradient id={`${id}-parcial`}>
          <stop offset={relleno} stopColor="#fff" />
          <stop offset={relleno} stopColor="#000" />
        </linearGradient>
        <mask id={`${id}-mascara`}>
          <rect width="24" height="24" fill={`url(#${id}-parcial)`} />
        </mask>
      </defs>
      <path d="M12 2.6l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.5l-5.9 3.1 1.2-6.5L2.5 9.5l6.6-.9z" fill="currentColor" opacity="0.18" />
      <path d="M12 2.6l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.5l-5.9 3.1 1.2-6.5L2.5 9.5l6.6-.9z" fill={`url(#${id}-oro)`} mask={`url(#${id}-mascara)`} />
    </svg>
  );
}

function FilaEstrellas({ nota, tam = 16 }) {
  return (
    <span className="det-fila-estrellas" aria-label={`${nota} / 5`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Estrella key={i} tam={tam} relleno={Math.max(0, Math.min(1, nota - i))} />
      ))}
    </span>
  );
}

/** Miniatura del plato: foto real (Wikipedia) con brillo de carga y respaldo. */
function FotoPlato({ plato, cocina, restauranteId }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    let vivo = true;
    fotoDePlato(plato.nombre)
      .then((url) => vivo && setSrc(url || imagenParaRestaurante(cocina, restauranteId)))
      .catch(() => vivo && setSrc(imagenParaRestaurante(cocina, restauranteId)));
    return () => { vivo = false; };
  }, [plato.nombre, cocina, restauranteId]);
  return (
    <span className={`det-menu-foto det-menu-foto--${src ? 'lista' : 'cargando'}`}>
      {src && <img src={src} alt="" loading="lazy" />}
    </span>
  );
}

function iniciales(nombre = '') {
  return nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '·';
}

function colorAvatar(nombre = '') {
  let h = 0;
  for (const c of nombre) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${h} 38% 42%)`;
}

export default function RestaurantDetail({ restaurant, usuario, onClose, onVerCarta }) {
  const t = useT(TRADS);
  const locale = t('modelos.locale');
  const { descuentoPendiente, fetchBalance } = usePointsStore();

  const [verTodas, setVerTodas] = useState(false);
  const [ordenResenas, setOrdenResenas] = useState('populares');
  const [fuenteResenas, setFuenteResenas] = useState('todas');
  const [reserva, setReserva] = useState({ fecha: '', hora: '', comensales: '2', comentarios: '' });
  const [verComentarios, setVerComentarios] = useState(false);
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
  const mockResenas = (restaurant.resenas ?? []).map((r, i) => ({
    ...r, id: `mock-${i}`, likes: r.likes ?? semillaLikes(restaurant.id, i), likedBy: [], esMock: true, fuente: 'yelp',
  }));
  const resenasMira = ordenarResenas(resenasFs.map((r) => ({ ...r, fuente: 'mira' })), ordenResenas);
  const resenasYelp = ordenarResenas(mockResenas, ordenResenas);
  const todas = fuenteResenas === 'mira' ? resenasMira : fuenteResenas === 'yelp' ? resenasYelp : ordenarResenas([...resenasMira, ...resenasYelp], ordenResenas);
  const visibles = verTodas ? todas : todas.slice(0, MOSTRAR_INICIAL);
  const todasNotas = [...resenasMira, ...resenasYelp].map((r) => Number(r.puntuacion)).filter(Boolean);
  const distribucion = [5, 4, 3, 2, 1].map((n) => ({ n, cuenta: todasNotas.filter((x) => Math.round(x) === n).length }));
  const externalMapUrl = googleLink(restaurant.coords, restaurant.direccion);
  const platos = cartaDelLocal(restaurant).slice(0, 5);

  // Próximos días para elegir con un toque.
  const dias = useMemo(() => {
    const base = parseFechaLocal(hoyLocalISO());
    return Array.from({ length: DIAS_RAPIDOS }, (_, i) => {
      const d = new Date(base);
      d.setDate(d.getDate() + i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return {
        iso,
        etiqueta: i === 0 ? t('detail.hoy') : i === 1 ? t('detail.manana') : d.toLocaleDateString(locale, { weekday: 'short' }),
        dia: d.getDate(),
        mes: d.toLocaleDateString(locale, { month: 'short' }),
      };
    });
  }, [locale, t]);

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
    if (restaurant.terraza !== true) return undefined;
    if (!reserva.fecha || !coordsValidas(restaurant.coords)) return undefined;
    pronosticoDia(Number(restaurant.coords.lat), Number(restaurant.coords.lng), reserva.fecha)
      .then((p) => { if (vivo) setMeteoReserva(p); })
      .catch(() => {});
    return () => { vivo = false; };
  }, [restaurant, reserva.fecha]);

  const avisoTerraza = alertaTerraza(restaurant.terraza, meteoReserva);

  function cerrarDesdeFondo(e) { if (e.target === e.currentTarget) onClose(); }

  useEffect(() => {
    let vivo = true;
    setCargandoResenas(true);
    listarResenasDeRestaurante(restaurant.id).then((list) => {
      if (vivo) { setResenasFs(list); setCargandoResenas(false); }
    }).catch(() => vivo && setCargandoResenas(false));
    return () => { vivo = false; };
  }, [restaurant.id]);

  useEffect(() => {
    if (!usuario?.uid) return;
    fetchBalance();
  }, [usuario?.uid]);

  useEffect(() => {
    track('restaurante_visto', { entidadTipo: 'restaurante', entidadId: String(restaurant.id), entidadNombre: restaurant.nombre, datos: { cocina: restaurant.cocina, precio: restaurant.precio } });
  }, [restaurant.id]);

  // POST /v1/interactions (puntos por promo) queda en la auditoría como `interaccion` desde el servidor.
  useEffect(() => {
    if (!usuario?.uid) return;
    import('../services/api.js').then(({ interactionsApi }) => {
      interactionsApi.track(restaurant.id, 'view').catch(() => {});
    });
  }, [restaurant.id, usuario?.uid]);

  useEffect(() => {
    let vivo = true;
    const coords = restaurant.coords;
    if (!coordsValidas(coords)) {
      setParkings([]);
      setCargandoParkings(false);
      return undefined;
    }
    setCargandoParkings(true);
    fetchNearbyParkings(Number(coords.lat), Number(coords.lng))
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
    setResenasFs((prev) => prev.map((x) => (x.id === r.id ? { ...x, likes: (x.likes || 0) + (ya ? -1 : 1), likedBy: ya ? x.likedBy.filter((id) => id !== usuario.uid) : [...(x.likedBy || []), usuario.uid] } : x)));
    try {
      if (ya) await quitarLikeResena(r.id, usuario.uid);
      else await darLikeResena(r.id, usuario.uid);
    } catch {
      setResenasFs((prev) => prev.map((x) => (x.id === r.id ? { ...x, likes: (x.likes || 0) + (ya ? 1 : -1), likedBy: ya ? [...(x.likedBy || []), usuario.uid] : x.likedBy.filter((id) => id !== usuario.uid) } : x)));
    }
  }

  const n = Number(reserva.comensales) || 1;
  const diaElegido = dias.find((d) => d.iso === reserva.fecha);
  const fechaLegible = reserva.fecha
    ? parseFechaLocal(reserva.fecha).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })
    : '';
  const sinPlazas = disponibilidad && disponibilidad.libres <= 0;

  return (
    <div className="modal-fondo" onClick={cerrarDesdeFondo}>
      <div className="modal det" role="dialog" aria-modal="true" aria-labelledby="detalle-titulo" style={{ '--acento': restaurant.acento }}>
        <button type="button" className="modal-cerrar det-cerrar" onClick={onClose} aria-label={t('otros.cerrar')} autoFocus>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>

        {/* ── Portada ── */}
        <header className="det-portada">
          <img
            className="det-foto"
            src={restaurant.imagen}
            alt={`${restaurant.nombre} — cocina ${restaurant.cocina}`}
            onError={(e) => {
              const el = e.currentTarget;
              if (el.dataset.fallback === '1') return;
              el.dataset.fallback = '1';
              el.src = imagenParaRestaurante(restaurant.cocina, restaurant.id);
            }}
          />
          <div className="det-portada-velo" aria-hidden="true" />
          <div className="det-portada-texto">
            <p className="det-eyebrow">
              <span>{restaurant.cocina}</span>
              <span className="det-punto" aria-hidden="true">·</span>
              <span>{restaurant.precio}</span>
              {restaurant.ciudad && (<><span className="det-punto" aria-hidden="true">·</span><span>{restaurant.ciudad}</span></>)}
            </p>
            <h2 id="detalle-titulo" className="det-titulo">{restaurant.nombre}</h2>
            <div className="det-notas">
              <div className="det-nota">
                <Estrella tam={22} />
                <strong>{restaurant.valoracion.toLocaleString(locale, { minimumFractionDigits: 1 })}</strong>
                <span>{t('detail.notaYelp')}<small>{restaurant.totalResenasYelp ?? 0} {t('card.opiniones')}</small></span>
              </div>
              {media != null && (
                <div className="det-nota det-nota--mira">
                  <Estrella tam={22} />
                  <strong>{media.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</strong>
                  <span>{t('detail.notaMira')}<small>{t('detail.basadoEn', { n: resenasMira.length + resenasYelp.length })}</small></span>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="modal-cuerpo det-cuerpo">
          {/* ── Acciones ── */}
          <div className="det-acciones det-entra" style={{ '--i': 0 }}>
            {onVerCarta && (
              <button type="button" className="btn-cta" onClick={() => onVerCarta(restaurant)}>{t('detail.verCarta')}</button>
            )}
            {externalMapUrl && (
              <a className="det-accion" href={externalMapUrl} target="_blank" rel="noreferrer">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 21s7-6.5 7-11a7 7 0 10-14 0c0 4.5 7 11 7 11z" /><circle cx="12" cy="10" r="3" /></svg>
                {t('detail.comoLlegar')}
              </a>
            )}
            {restaurant.telefono && (
              <a className="det-accion" href={`tel:${restaurant.telefono.replace(/\s/g, '')}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1.9.4 1.8.7 2.7a2 2 0 01-.5 2.1L8 9.8a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.8.6 2.7.7a2 2 0 011.7 2z" /></svg>
                {t('detail.llamar')}
              </a>
            )}
            {restaurant.yelpUrl && (<a className="det-accion" href={restaurant.yelpUrl} target="_blank" rel="noreferrer">{t('detail.verEnYelp')}</a>)}
          </div>

          {(restaurant.categorias?.length > 1 || restaurant.direccion) && (
            <div className="det-info det-entra" style={{ '--i': 1 }}>
              {restaurant.direccion && <p className="det-direccion">{restaurant.direccion}</p>}
              {restaurant.categorias?.length > 1 && (
                <ul className="det-chips" aria-label={t('detail.especialidades')}>
                  {restaurant.categorias.map((c) => (<li key={c}>{c}</li>))}
                </ul>
              )}
            </div>
          )}

          {/* ── Servicios ── */}
          <section className="det-seccion det-entra" style={{ '--i': 2 }} aria-labelledby="det-servicios">
            <h3 id="det-servicios" className="det-sub">{t('detail.servicios')}</h3>
            <ul className="det-servicios">
              {SERVICIOS.map(({ campo, icono, clave }) => {
                const v = restaurant[campo];
                const estimado = esEstimado(restaurant, campo);
                const estado = v === true ? 'si' : v === false ? 'no' : 'nd';
                return (
                  <li key={campo} className={`det-servicio det-servicio--${estado}`}>
                    <span className="det-servicio-icono" aria-hidden="true">{icono}</span>
                    <span className="det-servicio-nombre">{t(`detail.${clave}`)}</span>
                    <span className="det-servicio-estado">
                      {estado === 'si' ? `✓ ${t('detail.si')}` : estado === 'no' ? `✕ ${t('detail.no')}` : t('detail.sinInfo')}
                    </span>
                    {estimado && (
                      <span className="det-estimado" title={t('detail.estimadoAyuda')}>
                        ✦ {t('detail.estimado')}
                        <span className="sr-only">: {t('detail.estimadoAyuda')}</span>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="det-alergenos"><strong>{t('detail.alergenos')}:</strong> {restaurant.alergenos || t('detail.sinInfoAlrgenos')}</p>
          </section>

          {/* ── Adelanto de la carta ── */}
          <section className="det-seccion det-entra" style={{ '--i': 3 }} aria-labelledby="carta-titulo">
            <h3 id="carta-titulo" className="det-sub">{t('detail.laCarta')}</h3>
            <div className="det-menu">
              <p className="det-menu-eyebrow">{t('detail.platosDestacados')}</p>
              <ul className="det-menu-lista">
                {platos.map((p) => (
                  <li key={p.nombre}>
                    <FotoPlato plato={p} cocina={restaurant.cocina} restauranteId={restaurant.id} />
                    <span className="det-menu-texto">
                      <span className="det-menu-linea">
                        <span className="det-menu-nombre">{p.nombre}</span>
                        <span className="det-menu-puntos" aria-hidden="true" />
                        <span className="det-menu-precio">{Number(p.precio).toFixed(2)} €</span>
                      </span>
                      <Sellos plato={{ ...p, ...flagsPlato(p.nombre) }} />
                    </span>
                  </li>
                ))}
              </ul>
              {onVerCarta && (
                <button type="button" className="det-menu-boton" onClick={() => onVerCarta(restaurant)}>
                  {t('detail.abrirCarta')} <span aria-hidden="true">→</span>
                </button>
              )}
            </div>
          </section>

          {/* ── Reserva ── */}
          <section className="det-seccion det-reserva det-entra" style={{ '--i': 4 }} aria-labelledby="reserva-titulo">
            <div className="det-reserva-cab">
              <h3 id="reserva-titulo" className="det-sub">{t('detail.reservarMesa')}</h3>
              <span className="det-puntos-badge">
                <img src="/moneda-mira.png" alt="" /> +100 pts · x1.2 con racha
              </span>
            </div>
            {descuentoPendiente?.euros > 0 && (
              <p className="reserva-aviso-descuento" role="status">{t('detail.descuentoPendiente', { euros: descuentoPendiente.euros })}</p>
            )}

            <form className="det-reserva-form" onSubmit={handleReserva} noValidate>
              <p className="det-paso"><span>1</span> {t('detail.elegirFecha')}</p>
              <div className="det-dias" role="group" aria-label={t('detail.fecha')}>
                {dias.map((d) => (
                  <button
                    key={d.iso}
                    type="button"
                    className={`det-dia${reserva.fecha === d.iso ? ' activo' : ''}`}
                    aria-pressed={reserva.fecha === d.iso}
                    onClick={() => setReserva((s) => ({ ...s, fecha: d.iso }))}
                  >
                    <span className="det-dia-etq">{d.etiqueta}</span>
                    <span className="det-dia-num">{d.dia}</span>
                    <span className="det-dia-mes">{d.mes}</span>
                  </button>
                ))}
                <label className={`det-dia det-dia--otra${reserva.fecha && !diaElegido ? ' activo' : ''}`}>
                  <span className="det-dia-etq">{t('detail.otraFecha')}</span>
                  <input type="date" value={diaElegido ? '' : reserva.fecha} min={hoyLocalISO()} onChange={(e) => setReserva((s) => ({ ...s, fecha: e.target.value }))} aria-label={t('detail.otraFecha')} />
                </label>
              </div>

              <p className="det-paso"><span>2</span> {t('detail.hora')}</p>
              {[[t('detail.comida'), SLOTS.filter((h) => h < '17:00')], [t('detail.cena'), SLOTS.filter((h) => h >= '17:00')]].map(([grupo, horas]) => (
                <div key={grupo} className="det-horas" role="group" aria-label={grupo}>
                  <span className="det-horas-grupo">{grupo}</span>
                  {horas.map((h) => (
                    <button key={h} type="button" className={`det-hora${reserva.hora === h ? ' activo' : ''}`} aria-pressed={reserva.hora === h} onClick={() => setReserva((s) => ({ ...s, hora: h }))}>
                      {h}
                    </button>
                  ))}
                </div>
              ))}

              <p className="det-paso"><span>3</span> {t('detail.personas')}</p>
              <div className="det-personas">
                <button type="button" onClick={() => setReserva((s) => ({ ...s, comensales: String(Math.max(1, n - 1)) }))} disabled={n <= 1} aria-label={t('detail.menos')}>−</button>
                <output aria-live="polite">{n} {n === 1 ? t('modelos.persona') : t('modelos.personas')}</output>
                <button type="button" onClick={() => setReserva((s) => ({ ...s, comensales: String(Math.min(10, n + 1)) }))} disabled={n >= 10} aria-label={t('detail.mas')}>+</button>
              </div>

              {verComentarios ? (
                <label className="campo det-comentarios">
                  <span>{t('detail.comentarios')}</span>
                  <textarea value={reserva.comentarios} onChange={(e) => setReserva((s) => ({ ...s, comentarios: e.target.value }))} maxLength={500} rows={2} placeholder={t('detail.placeholderComentarios')} autoFocus />
                </label>
              ) : (
                <button type="button" className="btn-texto det-anadir" onClick={() => setVerComentarios(true)}>+ {t('detail.anadirComentario')}</button>
              )}

              {reserva.fecha && reserva.hora && disponibilidad && (
                <p className={`det-disponible${sinPlazas ? ' completo' : ''}`} role="status">
                  {sinPlazas ? t('detail.completo') : t('detail.plazasLibres', { libres: disponibilidad.libres, limite: disponibilidad.limite })}
                </p>
              )}
              {avisoTerraza && (
                <p className="reserva-aviso-meteo" role="status">{avisoTerraza}{meteoReserva && ` (${meteoReserva.resumen})`}</p>
              )}
              {errorReserva && <p className="reserva-error" role="alert">{errorReserva}</p>}

              <div className="det-reserva-pie">
                <span className="det-resumen">
                  {reserva.fecha && reserva.hora ? t('detail.resumen', { fecha: fechaLegible, hora: reserva.hora, n }) : t('detail.eligeFechaHora')}
                </span>
                <button type="submit" className="btn-cta det-reservar" disabled={cargandoReserva || sinPlazas}>
                  {cargandoReserva ? t('detail.reservando') : t('detail.reservar')}
                </button>
              </div>
              {!usuario && <p className="det-nota-login">{t('otros.debes')} <a href="#/login">{t('otros.iniciarSesion')}</a> {t('detail.reservar')}.</p>}
            </form>
            {confirmacion && (
              <div className="det-confirmacion" role="status">
                <span className="det-confirmacion-check" aria-hidden="true">✓</span>
                <div>
                  <strong>{t('detail.reservaConfirmada')}</strong>
                  <p>{t('detail.codigo')}: <code>{confirmacion.codigo}</code> — {confirmacion.fecha} · {confirmacion.hora} · {confirmacion.comensales} {t('modelos.personas')}</p>
                  <a href="#/reservas">{t('detail.verMisReservas')} →</a>
                </div>
              </div>
            )}
          </section>

          {/* ── Ubicación y parkings ── */}
          <section className="det-seccion det-entra" style={{ '--i': 5 }} aria-labelledby="det-ubicacion">
            <h3 id="det-ubicacion" className="det-sub">{t('detail.ubicacion')}</h3>
            {coordsValidas(restaurant.coords) ? (
              <div className="parking-grid det-mapa">
                <RestaurantMap restaurant={restaurant} parkings={parkings} selectedIndex={parkingSeleccionado} />
                <ParkingsPanel
                  parkings={parkings}
                  cargando={cargandoParkings}
                  seleccionado={parkingSeleccionado}
                  onSeleccionarParking={(i) => setParkingSeleccionado(i)}
                />
              </div>
            ) : (<p className="modal-mapa-vacio">{t('detail.esteLocalSinCoord')}</p>)}
          </section>

          {/* ── Reseñas ── */}
          <section className="det-seccion det-entra" style={{ '--i': 6 }} aria-labelledby="resenas-titulo">
            <h3 id="resenas-titulo" className="det-sub">{t('detail.resenas', { count: resenasMira.length + resenasYelp.length })}</h3>

            {todasNotas.length > 0 && (
              <div className="det-resumen-resenas">
                <div className="det-media">
                  <strong>{(todasNotas.reduce((a, b) => a + b, 0) / todasNotas.length).toLocaleString(locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 })}</strong>
                  <FilaEstrellas nota={todasNotas.reduce((a, b) => a + b, 0) / todasNotas.length} />
                  <span>{t('detail.basadoEn', { n: todasNotas.length })}</span>
                </div>
                <ul className="det-barras" aria-hidden="true">
                  {distribucion.map(({ n: estrellas, cuenta }) => (
                    <li key={estrellas}>
                      <span>{estrellas}</span>
                      <span className="det-barra"><span style={{ '--w': `${(cuenta / todasNotas.length) * 100}%` }} /></span>
                      <span>{cuenta}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="det-filtros-resenas">
              <div className="det-segmentos" role="group" aria-label={t('detail.resenas', { count: todas.length })}>
                {[['todas', `${t('busqueda.todas')}`], ['mira', t('detail.fuenteMira')], ['yelp', t('detail.fuenteYelp')]].map(([v, etq]) => (
                  <button key={v} type="button" aria-pressed={fuenteResenas === v} className={fuenteResenas === v ? 'activo' : ''} onClick={() => setFuenteResenas(v)}>{etq}</button>
                ))}
              </div>
              <div className="det-segmentos" role="group" aria-label={t('detail.populares')}>
                {[['populares', t('detail.populares')], ['recientes', t('detail.masRecientes')]].map(([v, etq]) => (
                  <button key={v} type="button" aria-pressed={ordenResenas === v} className={ordenResenas === v ? 'activo' : ''} onClick={() => setOrdenResenas(v)}>{etq}</button>
                ))}
              </div>
            </div>

            {cargandoResenas && <p className="det-vacio">{t('detail.cargandoResenas')}</p>}
            {!cargandoResenas && todas.length === 0 && (
              <p className="det-vacio">{fuenteResenas === 'yelp' ? t('detail.resenasYelpVacias') : t('detail.resenasMiraVacias')}</p>
            )}
            <ul className="det-resenas">
              {visibles.map((r) => {
                const nombre = r.usuarioNombre || r.usuario || 'Anónimo';
                const liked = (r.likedBy || []).includes(usuario?.uid);
                const fecha = r.fecha || (r.createdAt ? new Date(r.createdAt).toLocaleDateString(locale) : '');
                return (
                  <li key={r.id} className="det-resena">
                    <span className="det-avatar" style={{ background: colorAvatar(nombre) }} aria-hidden="true">{iniciales(nombre)}</span>
                    <div className="det-resena-cuerpo">
                      <div className="det-resena-cab">
                        <strong>{nombre}</strong>
                        <span className={`det-fuente det-fuente--${r.fuente}`}>{r.fuente === 'mira' ? 'MIRA' : 'Yelp'}</span>
                        <span className="det-resena-fecha">{fecha}</span>
                      </div>
                      <FilaEstrellas nota={Number(r.puntuacion) || 0} tam={14} />
                      <p className="det-resena-texto">{r.comentario}</p>
                      <button
                        type="button"
                        className={`det-like${liked ? ' activo' : ''}`}
                        onClick={() => handleLike(r)}
                        disabled={r.esMock}
                        title={r.esMock ? t('detail.soloLikeMira') : liked ? t('detail.quitarLike') : t('detail.darLike')}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg>
                        {r.likes || 0}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            {todas.length > MOSTRAR_INICIAL && (
              <button type="button" className="btn-secundario det-ver-mas" onClick={() => { if (!verTodas) track('resena_vista', { entidadTipo: 'restaurante', entidadId: String(restaurant.id), meta: { cantidad: todas.length } }); setVerTodas((v) => !v); }}>
                {verTodas ? t('detail.verMenos') : t('detail.verMasResenas', { n: todas.length - MOSTRAR_INICIAL })}
              </button>
            )}

            <form onSubmit={handleCrearResena} className="det-escribir">
              <p className="det-escribir-titulo">{t('detail.escribeResena')}</p>
              <div className="det-picker" role="radiogroup" aria-label={t('detail.puntuacion')}>
                {[1, 2, 3, 4, 5].map((v) => (
                  <button key={v} type="button" role="radio" aria-checked={nuevaResena.puntuacion === v} aria-label={`${v} ${t('detail.estrellas')}`} onClick={() => setNuevaResena((s) => ({ ...s, puntuacion: v }))}>
                    <Estrella tam={26} relleno={v <= nuevaResena.puntuacion ? 1 : 0} />
                  </button>
                ))}
              </div>
              <label className="campo">
                <span className="sr-only">{t('detail.tuComentario')}</span>
                <textarea value={nuevaResena.comentario} onChange={(e) => setNuevaResena((s) => ({ ...s, comentario: e.target.value }))} placeholder={t('detail.cuentaExperiencia')} rows={3} />
              </label>
              {errorResena && <p className="reserva-error">{errorResena}</p>}
              <button type="submit" className="btn-cta" disabled={enviandoResena}>{enviandoResena ? t('detail.enviando') : t('detail.publicarResena')}</button>
              {!usuario && <p className="det-nota-login">{t('detail.debesLoginResena')}</p>}
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
