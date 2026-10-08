/**
 * MIRA JAM — reserva en grupo.
 *  #/jam            → mis salas + crear una
 *  #/jam/nueva?r=ID → crear sala con un restaurante ya elegido
 *  #/jam/CODIGO     → la sala: votar en directo y ver el resultado
 * El grupo vota restaurantes ("me apetece") y franjas ("puedo ir"); al cerrar,
 * MIRA reserva sola la combinación ganadora a nombre del anfitrión.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { jamsApi } from '../services/mejorasApi.js';
import { fetchRestaurants } from '../services/restaurantApi.js';
import { SLOTS } from '../services/reservaApi.js';
import { imagenParaRestaurante } from '../models/restaurantModel.js';
import '../styles/jam.css';

const DURACIONES = [
  [30, '30 minutos'], [120, '2 horas'], [24 * 60, '1 día'], [3 * 24 * 60, '3 días'],
];

function hoyISO(dias = 0) {
  const d = new Date(Date.now() + dias * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function rutaJam() {
  const h = window.location.hash.replace(/^#\/jam\/?/, '');
  const [camino, query = ''] = h.split('?');
  return { camino: decodeURIComponent(camino || ''), params: new URLSearchParams(query) };
}

const fechaCorta = (f) => new Date(`${f}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
const iniciales = (n) => String(n || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';

function useCuentaAtras(hasta) {
  const [ahora, setAhora] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const ms = Math.max(0, new Date(hasta).getTime() - ahora);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return { ms, texto: h >= 24 ? `${Math.floor(h / 24)} d ${h % 24} h` : h ? `${h} h ${m} min` : `${m}:${String(s).padStart(2, '0')}` };
}

/* ───────── Crear sala ───────── */

function CrearJam({ usuario, perfil, preseleccion }) {
  const [catalogo, setCatalogo] = useState([]);
  const [q, setQ] = useState('');
  const [titulo, setTitulo] = useState('');
  const [elegidos, setElegidos] = useState([]);
  const [franjas, setFranjas] = useState([{ fecha: hoyISO(2), hora: '21:00' }]);
  const [duracion, setDuracion] = useState(120);
  const [error, setError] = useState('');
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    fetchRestaurants().then((l) => {
      setCatalogo(l);
      if (preseleccion) {
        const r = l.find((x) => String(x.id) === preseleccion);
        if (r) setElegidos([r]);
      }
    }).catch(() => setCatalogo([]));
  }, [preseleccion]);

  const resultados = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (t.length < 2) return [];
    return catalogo.filter((r) => !elegidos.some((e) => e.id === r.id)
      && `${r.nombre} ${r.cocina} ${r.ciudad}`.toLowerCase().includes(t)).slice(0, 6);
  }, [q, catalogo, elegidos]);

  if (!usuario?.uid) {
    return (
      <div className="jam-vacio">
        <h2>Inicia sesión para crear una JAM</h2>
        <p>Necesitas una cuenta para proponer restaurantes y que MIRA reserve a tu nombre.</p>
        <a className="btn-cta" href="#/login">Iniciar sesión</a>
      </div>
    );
  }

  async function crear(e) {
    e.preventDefault();
    setError('');
    if (!elegidos.length) { setError('Añade al menos un restaurante.'); return; }
    setCreando(true);
    try {
      const jam = await jamsApi.crear({
        titulo: titulo.trim() || undefined,
        nombre: perfil?.nombre || usuario.nombre || undefined,
        restaurantes: elegidos.map((r) => ({ id: String(r.id) })),
        franjas,
        cierraEnMin: duracion,
      });
      window.location.hash = `#/jam/${jam.codigo}`;
    } catch (err) {
      setError(err.message);
    } finally {
      setCreando(false);
    }
  }

  const cambiarFranja = (i, campo, valor) => setFranjas((fs) => fs.map((f, j) => (j === i ? { ...f, [campo]: valor } : f)));

  return (
    <form className="jam-crear" onSubmit={crear}>
      <header className="jam-crear-cab">
        <span className="jam-marca">MIRA <b>JAM</b></span>
        <h1>Reserva en grupo</h1>
        <p>Propón sitios y horas, comparte el código y que vote el grupo. Cuando cierre la votación, MIRA reserva sola la opción ganadora.</p>
      </header>

      {error && <p className="auth-error" role="alert">{error}</p>}

      <label className="jam-campo">
        <span>Nombre del plan</span>
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={80} placeholder="Cena de cumpleaños de Laura" />
      </label>

      <fieldset className="jam-campo">
        <legend>Restaurantes <small>{elegidos.length}/4</small></legend>
        <div className="jam-elegidos">
          {elegidos.map((r) => (
            <span key={r.id} className="jam-chip">
              {r.nombre}
              <button type="button" aria-label={`Quitar ${r.nombre}`} onClick={() => setElegidos((l) => l.filter((x) => x.id !== r.id))}>✕</button>
            </span>
          ))}
        </div>
        {elegidos.length < 4 && (
          <div className="jam-buscar">
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busca por nombre, cocina o ciudad…" aria-label="Buscar restaurante" />
            {resultados.length > 0 && (
              <ul role="listbox">
                {resultados.map((r) => (
                  <li key={r.id}>
                    <button type="button" onClick={() => { setElegidos((l) => [...l, r]); setQ(''); }}>
                      <strong>{r.nombre}</strong><span>{r.cocina} · {r.precio} · {r.ciudad}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </fieldset>

      <fieldset className="jam-campo">
        <legend>¿Cuándo? <small>{franjas.length}/4 opciones</small></legend>
        {franjas.map((f, i) => (
          <div key={i} className="jam-franja-fila">
            <input type="date" min={hoyISO(0)} value={f.fecha} onChange={(e) => cambiarFranja(i, 'fecha', e.target.value)} aria-label={`Fecha opción ${i + 1}`} />
            <select value={f.hora} onChange={(e) => cambiarFranja(i, 'hora', e.target.value)} aria-label={`Hora opción ${i + 1}`}>
              {SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {franjas.length > 1 && <button type="button" className="jam-quitar" onClick={() => setFranjas((fs) => fs.filter((_, j) => j !== i))} aria-label="Quitar opción">✕</button>}
          </div>
        ))}
        {franjas.length < 4 && (
          <button type="button" className="btn-secundario btn-peq" onClick={() => setFranjas((fs) => [...fs, { fecha: fs[fs.length - 1].fecha, hora: '21:30' }])}>+ Otra opción</button>
        )}
      </fieldset>

      <label className="jam-campo">
        <span>La votación se cierra en</span>
        <select value={duracion} onChange={(e) => setDuracion(Number(e.target.value))}>
          {DURACIONES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
        </select>
      </label>

      <button type="submit" className="btn-cta btn-grande jam-crear-boton" disabled={creando}>{creando ? 'Creando…' : 'Crear la JAM'}</button>
    </form>
  );
}

/* ───────── Sala ───────── */

function Sala({ codigo, usuario, perfil }) {
  const [sala, setSala] = useState(null);
  const [error, setError] = useState('');
  const [enDirecto, setEnDirecto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const yo = useRef({ miId: null, soyAnfitrion: false });

  // Lo que solo sabe la petición con sesión (quién soy) se conserva al llegar actualizaciones en directo.
  const aplicar = useCallback((nueva) => {
    if (nueva.miId) yo.current = { miId: nueva.miId, soyAnfitrion: nueva.soyAnfitrion };
    setSala({ ...nueva, ...yo.current, estoyDentro: nueva.participantes.some((p) => p.id === yo.current.miId) });
  }, []);

  useEffect(() => {
    let vivo = true;
    jamsApi.obtener(codigo).then((s) => vivo && aplicar(s)).catch((e) => vivo && setError(e.message));
    const cerrar = jamsApi.enDirecto(codigo, (s) => { setEnDirecto(true); aplicar(s); }, () => setEnDirecto(false));
    return () => { vivo = false; cerrar(); };
  }, [codigo, usuario?.uid, aplicar]);

  const cuenta = useCuentaAtras(sala?.cierraEn || Date.now());

  if (error) return <div className="jam-vacio"><h2>No se encontró la sala</h2><p>{error}</p><a className="btn-cta" href="#/jam">Mis JAM</a></div>;
  if (!sala) return <div className="jam-vacio" role="status"><span className="jam-cargando" />Entrando en la sala…</div>;

  const yoP = sala.participantes.find((p) => p.id === sala.miId);
  const abierta = sala.estado === 'abierta';
  const votosDe = (id) => sala.recuento.restaurantes.find((r) => r.id === id)?.votos || 0;
  const puedenEn = (i) => sala.recuento.franjas.find((f) => f.indice === i)?.pueden || 0;
  const maxVotos = Math.max(1, ...sala.recuento.restaurantes.map((r) => r.votos));
  const lider = sala.recuento.restaurantes[0]?.votos > 0 ? sala.recuento.restaurantes[0].id : null;
  const enlace = `${window.location.origin}${window.location.pathname}#/jam/${sala.codigo}`;

  async function accion(fn) {
    setGuardando(true);
    setError('');
    try { aplicar(await fn()); } catch (e) { window.alert(e.message); } finally { setGuardando(false); }
  }

  function alternar(tipo, valor) {
    if (!yoP || !abierta) return;
    const actual = tipo === 'restaurantes' ? yoP.restaurantes : yoP.franjas;
    const nuevo = actual.includes(valor) ? actual.filter((x) => x !== valor) : [...actual, valor];
    const voto = { restaurantes: yoP.restaurantes, franjas: yoP.franjas, [tipo]: nuevo };
    // Optimista: se pinta al momento y la respuesta (o el directo) lo confirma.
    setSala((s) => ({ ...s, participantes: s.participantes.map((p) => (p.id === s.miId ? { ...p, ...voto } : p)) }));
    accion(() => jamsApi.votar(sala.codigo, voto));
  }

  async function compartir() {
    const datos = { title: `MIRA JAM · ${sala.titulo}`, text: `Vota dónde cenamos: código ${sala.codigo}`, url: enlace };
    try {
      if (navigator.share) await navigator.share(datos);
      else { await navigator.clipboard.writeText(enlace); setCopiado(true); setTimeout(() => setCopiado(false), 1800); }
    } catch { /* compartir cancelado */ }
  }

  return (
    <section className={`jam-sala jam-sala--${sala.estado}`} aria-labelledby="jam-titulo">
      <header className="jam-cabecera">
        <div>
          <span className="jam-marca">MIRA <b>JAM</b> {enDirecto && abierta && <i className="jam-vivo" title="En directo" />}</span>
          <h1 id="jam-titulo">{sala.titulo}</h1>
          <p>Organiza {sala.anfitrion} · {sala.recuento.participantes} en la sala · {sala.recuento.hanVotado} han votado</p>
        </div>
        <div className="jam-codigo-caja">
          <span>Código</span>
          <strong>{sala.codigo}</strong>
          <button type="button" className="jam-compartir" onClick={compartir}>{copiado ? '¡Enlace copiado!' : 'Invitar al grupo'}</button>
        </div>
      </header>

      <ul className="jam-avatares" aria-label="Participantes">
        {sala.participantes.map((p) => (
          <li key={p.id} className={`${p.id === sala.miId ? 'is-yo' : ''}${p.restaurantes.length || p.franjas.length ? ' ha-votado' : ''}`} title={`${p.nombre}${p.esAnfitrion ? ' (anfitrión)' : ''}`}>
            <span>{iniciales(p.nombre)}</span>
            {p.esAnfitrion && <i aria-hidden="true">★</i>}
          </li>
        ))}
      </ul>

      {sala.estado === 'reservada' && (
        <div className="jam-resultado" role="status">
          <span className="jam-resultado-emoji" aria-hidden="true">🎉</span>
          <h2>¡Mesa reservada en {sala.resultado.nombre}!</h2>
          <p>{fechaCorta(sala.resultado.fecha)} a las <strong>{sala.resultado.hora}</strong> · {sala.resultado.comensales} personas</p>
          <p className="jam-resultado-codigo">Código <code>{sala.resultado.codigoReserva}</code></p>
          {sala.resultado.intentos > 1 && <p className="jam-nota">La opción más votada estaba completa; se reservó la siguiente mejor.</p>}
          {sala.soyAnfitrion && <a className="btn-cta btn-peq" href="#/reservas">Ver en Mis reservas</a>}
        </div>
      )}
      {sala.estado === 'sin_mesa' && (
        <div className="jam-resultado jam-resultado--mal" role="status">
          <h2>No quedaba mesa en ninguna opción</h2>
          <p>Prueba otra JAM con nuevas fechas u otros restaurantes.</p>
          <a className="btn-cta btn-peq" href="#/jam/nueva">Crear otra</a>
        </div>
      )}
      {sala.estado === 'cancelada' && <div className="jam-resultado jam-resultado--mal"><h2>El anfitrión canceló esta JAM</h2></div>}

      {abierta && (
        <div className="jam-reloj" role="timer" aria-live="off">
          <span>La votación se cierra en</span>
          <strong>{cuenta.texto}</strong>
        </div>
      )}

      {abierta && !sala.estoyDentro && (
        <div className="jam-unirse">
          {usuario?.uid ? (
            <button type="button" className="btn-cta btn-grande" disabled={guardando} onClick={() => accion(() => jamsApi.unirse(sala.codigo, perfil?.nombre || usuario.nombre))}>Unirme y votar</button>
          ) : (
            <a className="btn-cta btn-grande" href="#/login">Inicia sesión para votar</a>
          )}
        </div>
      )}

      <h2 className="jam-h2">¿Dónde? <small>{abierta && sala.estoyDentro ? 'Toca los que te apetecen' : ''}</small></h2>
      <ul className="jam-restaurantes">
        {sala.restaurantes.map((r) => {
          const votos = votosDe(r.id);
          const mio = yoP?.restaurantes.includes(r.id);
          const ganador = sala.resultado?.restauranteId === r.id;
          return (
            <li key={r.id} className={`jam-rest${mio ? ' is-mio' : ''}${lider === r.id && abierta ? ' is-lider' : ''}${ganador ? ' is-ganador' : ''}`}>
              <button type="button" disabled={!abierta || !sala.estoyDentro || guardando} onClick={() => alternar('restaurantes', r.id)} aria-pressed={Boolean(mio)}>
                <img src={r.imagen || imagenParaRestaurante(r.cocina, r.id)} alt="" loading="lazy" onError={(e) => { e.currentTarget.src = imagenParaRestaurante(r.cocina, r.id); }} />
                <span className="jam-rest-info">
                  <strong>{r.nombre}</strong>
                  <span>{[r.cocina, r.precio, r.ciudad].filter(Boolean).join(' · ')}</span>
                  <span className="jam-barra"><i style={{ transform: `scaleX(${votos / maxVotos})` }} /></span>
                </span>
                <span className="jam-votos"><b>{votos}</b>{votos === 1 ? 'voto' : 'votos'}</span>
                {mio && <span className="jam-check" aria-hidden="true">✓</span>}
              </button>
            </li>
          );
        })}
      </ul>

      <h2 className="jam-h2">¿Cuándo? <small>{abierta && sala.estoyDentro ? 'Marca las que puedes' : ''}</small></h2>
      <ul className="jam-franjas">
        {sala.franjas.map((f, i) => {
          const mio = yoP?.franjas.includes(i);
          const ganadora = sala.resultado && sala.resultado.fecha === f.fecha && sala.resultado.hora === f.hora;
          return (
            <li key={`${f.fecha}${f.hora}`}>
              <button type="button" className={`jam-franja${mio ? ' is-mio' : ''}${ganadora ? ' is-ganador' : ''}`} disabled={!abierta || !sala.estoyDentro || guardando} onClick={() => alternar('franjas', i)} aria-pressed={Boolean(mio)}>
                <span className="jam-franja-fecha">{fechaCorta(f.fecha)}</span>
                <strong>{f.hora}</strong>
                <span className="jam-franja-n">{puedenEn(i)} {puedenEn(i) === 1 ? 'puede' : 'pueden'}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {abierta && (
        <footer className="jam-pie">
          {sala.soyAnfitrion ? (
            <>
              <button type="button" className="btn-cta" disabled={guardando} onClick={() => window.confirm('¿Cerrar la votación y reservar la opción ganadora ahora?') && accion(() => jamsApi.cerrar(sala.codigo))}>
                Cerrar y reservar ya
              </button>
              <button type="button" className="btn-texto" disabled={guardando} onClick={() => window.confirm('¿Cancelar esta JAM? Se avisará al grupo.') && accion(() => jamsApi.cancelar(sala.codigo))}>Cancelar JAM</button>
            </>
          ) : sala.estoyDentro && (
            <button type="button" className="btn-texto" disabled={guardando} onClick={() => accion(() => jamsApi.salir(sala.codigo))}>Salir de la sala</button>
          )}
          <p className="jam-nota">Al cerrar, MIRA reserva el restaurante más votado en la hora a la que pueden ir más personas. Si está completo, prueba la siguiente opción.</p>
        </footer>
      )}
    </section>
  );
}

/* ───────── Mis salas ───────── */

function MisJams({ usuario }) {
  const [lista, setLista] = useState(null);
  useEffect(() => {
    if (!usuario?.uid) { setLista([]); return; }
    jamsApi.mias().then(setLista).catch(() => setLista([]));
  }, [usuario?.uid]);
  const estados = { abierta: 'Votando', reservada: 'Reservada', sin_mesa: 'Sin mesa', cancelada: 'Cancelada' };
  return (
    <section className="jam-mias">
      <header className="jam-crear-cab">
        <span className="jam-marca">MIRA <b>JAM</b></span>
        <h1>Reserva en grupo</h1>
        <p>Votad entre todos dónde y cuándo, y MIRA reserva sola la opción ganadora.</p>
        <div className="jam-mias-acciones">
          <a className="btn-cta" href="#/jam/nueva">Crear una JAM</a>
          <form onSubmit={(e) => { e.preventDefault(); const c = new FormData(e.currentTarget).get('codigo'); if (c) window.location.hash = `#/jam/${String(c).trim().toUpperCase()}`; }}>
            <input name="codigo" maxLength={6} placeholder="Código" aria-label="Código de una JAM" />
            <button type="submit" className="btn-secundario">Entrar</button>
          </form>
        </div>
      </header>
      {lista === null ? <p className="jam-nota">Cargando…</p> : lista.length === 0 ? (
        <p className="jam-nota">{usuario?.uid ? 'Aún no tienes ninguna JAM.' : 'Inicia sesión para ver tus JAM.'}</p>
      ) : (
        <ul className="jam-lista">
          {lista.map((j) => (
            <li key={j.codigo}>
              <a href={`#/jam/${j.codigo}`}>
                <strong>{j.titulo}</strong>
                <span>{j.restaurantes.map((r) => r.nombre).join(' · ')}</span>
                <span className={`jam-estado jam-estado--${j.estado}`}>{estados[j.estado] || j.estado}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function Jam({ usuario, perfil }) {
  const [ruta, setRuta] = useState(rutaJam);
  useEffect(() => {
    const alCambiar = () => setRuta(rutaJam());
    window.addEventListener('hashchange', alCambiar);
    return () => window.removeEventListener('hashchange', alCambiar);
  }, []);
  return (
    <div className="jam">
      {ruta.camino === '' && <MisJams usuario={usuario} />}
      {ruta.camino === 'nueva' && <CrearJam usuario={usuario} perfil={perfil} preseleccion={ruta.params.get('r')} />}
      {ruta.camino && ruta.camino !== 'nueva' && <Sala codigo={ruta.camino.toUpperCase()} usuario={usuario} perfil={perfil} />}
    </div>
  );
}
