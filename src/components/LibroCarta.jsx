/**
 * View pura: carta como libro. Todas las hojas existen a la vez y giran sobre
 * el lomo con una transición CSS (nada se desmonta → sin parpadeos, y se puede
 * encadenar o deshacer un giro a medias).
 * - Escritorio: doble página. Hoja i = anverso pág. 2i · reverso pág. 2i+1.
 * - Móvil: una página por hoja; la hoja pasada se aparta hacia la izquierda.
 * Cerrar con ✕, clic fuera o Esc. Flechas, swipe o clic en la página para pasar.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  cartaLibro,
  temaCarta,
  dietaActiva,
  aptosEnCarta,
  leyendaSellos,
} from '../models/restaurantModel.js';
import { Sellos, ConflictosAlergenos } from './Sellos.jsx';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';
import '../styles/carta.css';

const TRADS = { es, ca, en };
const GIRO_MS = 850;

const EYEBROWS = {
  Entrantes: 'Para comenzar',
  Principales: 'De temporada',
  Postres: 'Dulces & bodega',
};

function useEsMovil() {
  const consulta = '(max-width: 719px)';
  const [movil, setMovil] = useState(() => window.matchMedia?.(consulta).matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.(consulta);
    if (!mq) return undefined;
    const alCambiar = (e) => setMovil(e.matches);
    mq.addEventListener('change', alCambiar);
    return () => mq.removeEventListener('change', alCambiar);
  }, []);
  return movil;
}

/* ───────────── Contenido de las páginas ───────────── */

function Cabecera({ eyebrow, numero }) {
  return (
    <div className="carta-cabecera">
      <span>{eyebrow}</span>
      {numero != null && <span className="carta-num">{numero}</span>}
    </div>
  );
}

function PaginaSeccion({ pagina, dieta, conDieta }) {
  const { seccion, num } = pagina;
  return (
    <>
      <Cabecera eyebrow={EYEBROWS[seccion.titulo] || seccion.titulo} numero={num} />
      <h3 className="carta-seccion">{seccion.titulo}</h3>
      <div className="carta-ornamento" aria-hidden="true"><span>✦</span></div>
      <ul className="carta-platos">
        {seccion.platos.map((p) => {
          const conflictos = (dieta?.alergias || []).filter((a) => p.alergenos?.includes(a));
          return (
            <li key={p.nombre} className="carta-plato">
              <div className="carta-plato-linea">
                <strong className="carta-plato-nombre">{p.nombre}</strong>
                <span className="carta-puntos" aria-hidden="true" />
                <span className="carta-precio">{Number(p.precio).toFixed(2)} €</span>
              </div>
              {p.descripcion && <p className="carta-plato-desc">{p.descripcion}</p>}
              <p className="carta-plato-tags">
                {p.cantidad && <span className="carta-cantidad">{p.cantidad}</span>}
                <Sellos plato={p} />
                {conDieta && <ConflictosAlergenos alergenos={conflictos} />}
              </p>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function PaginaLeyenda({ pagina, leyenda, t }) {
  return (
    <>
      <Cabecera eyebrow={t('libro.leyendaCarta')} numero={pagina.num} />
      <h3 className="carta-seccion">{t('libro.leyenda')}</h3>
      <div className="carta-ornamento" aria-hidden="true"><span>✦</span></div>
      <ul className="carta-leyenda">
        {leyenda.map((e) => (
          <li key={e.nombre}>
            <span className="carta-leyenda-simbolo" aria-hidden="true">{e.simbolo}</span>
            <span><strong>{e.nombre}.</strong> {e.descripcion}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function PaginaFin({ restaurant }) {
  return (
    <div className="carta-fin" aria-hidden="true">
      <span className="carta-fin-marca">✦</span>
      <p>{restaurant.nombre}</p>
      <span className="carta-fin-sub">Buen provecho</span>
    </div>
  );
}

function Portada({ restaurant, tema, numSecciones, totalPlatos, conDieta, aptos, t }) {
  return (
    <div className="carta-portada">
      <div className="carta-portada-marco" aria-hidden="true" />
      <span className="carta-portada-sello">{tema.nombre}</span>
      <div className="carta-portada-centro">
        <span className="carta-portada-estrella" aria-hidden="true">✦</span>
        <h2 className="carta-portada-titulo">{restaurant.nombre}</h2>
        <p className="carta-portada-sub">{restaurant.cocina} · {restaurant.precio}</p>
        <span className="carta-portada-linea" aria-hidden="true" />
        <p className="carta-portada-datos">
          {numSecciones} {t('libro.secciones')} · {totalPlatos} {t('libro.platos')}
          {conDieta && ` · ${t('libro.aptosParaTi')}: ${aptos}`}
          {restaurant.menuInfantil === true && ` · ${t('libro.menuInfantil')}`}
        </p>
      </div>
      <span className="carta-portada-pista">{t('libro.abrirMenu')}</span>
    </div>
  );
}

function Contraportada() {
  return (
    <div className="carta-portada carta-portada--trasera" aria-hidden="true">
      <div className="carta-portada-marco" />
      <span className="carta-portada-estrella">✦</span>
    </div>
  );
}

/* ───────────── Libro ───────────── */

export default function LibroCarta({ restaurant, dieta, onClose }) {
  const t = useT(TRADS);
  const movil = useEsMovil();
  const libro = useMemo(() => cartaLibro(restaurant), [restaurant]);
  const tema = useMemo(() => temaCarta(restaurant.cocina), [restaurant.cocina]);
  const leyenda = useMemo(() => leyendaSellos(), []);
  const conDieta = dietaActiva(dieta);
  const aptos = conDieta ? aptosEnCarta(restaurant, dieta) : null;
  const totalPlatos = libro.secciones.reduce((n, s) => n + s.platos.length, 0);

  // Páginas en orden de lectura (la portada es la página 0).
  const paginas = useMemo(
    () => [
      { tipo: 'portada' },
      ...libro.secciones.map((seccion, i) => ({ tipo: 'seccion', seccion, num: i + 1 })),
      { tipo: 'leyenda', num: libro.secciones.length + 1 },
    ],
    [libro],
  );

  // Hojas físicas: [anverso, reverso].
  const hojas = useMemo(() => {
    if (movil) return paginas.map((p) => [p, { tipo: 'dorso' }]);
    const lista = [];
    for (let i = 0; i < paginas.length; i += 2) {
      lista.push([paginas[i], paginas[i + 1] ?? { tipo: 'fin' }]);
    }
    if (paginas.length % 2 === 0) lista.push([{ tipo: 'fin' }, { tipo: 'contraportada' }]);
    else lista[lista.length - 1][1] = { tipo: 'contraportada' };
    return lista;
  }, [paginas, movil]);

  const H = hojas.length;
  // En móvil la última hoja no se pasa (no hay nada detrás).
  const maxVueltas = movil ? H - 1 : H;
  const [vueltas, setVueltas] = useState(0);
  const [girando, setGirando] = useState(null); // índice de la hoja en movimiento
  const vueltasRef = useRef(0);
  const temporizador = useRef(null);
  const touch = useRef(null);
  const cerrarRef = useRef(null);

  useEffect(() => {
    vueltasRef.current = 0;
    setVueltas(0);
  }, [movil]);
  useEffect(() => cerrarRef.current?.focus(), []);
  useEffect(() => () => clearTimeout(temporizador.current), []);

  const ir = useCallback(
    (dir) => {
      const v = vueltasRef.current;
      const n = Math.max(0, Math.min(maxVueltas, v + dir));
      if (n === v) return;
      vueltasRef.current = n;
      setVueltas(n);
      // La hoja que se mueve: al avanzar, la que estaba arriba a la derecha; al volver, la última pasada.
      setGirando(dir > 0 ? v : n);
      clearTimeout(temporizador.current);
      temporizador.current = setTimeout(() => setGirando(null), GIRO_MS);
    },
    [maxVueltas],
  );

  useEffect(() => {
    function alTeclar(e) {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') { e.preventDefault(); ir(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); ir(-1); }
    }
    window.addEventListener('keydown', alTeclar);
    return () => window.removeEventListener('keydown', alTeclar);
  }, [ir, onClose]);

  function pintar(pg, lado) {
    switch (pg.tipo) {
      case 'portada':
        return (
          <Portada restaurant={restaurant} tema={tema} numSecciones={libro.secciones.length}
            totalPlatos={totalPlatos} conDieta={conDieta} aptos={aptos} t={t} />
        );
      case 'contraportada':
        return <Contraportada />;
      case 'seccion':
        return <div className={`carta-papel carta-papel--${lado}`}><div className="carta-cuerpo"><PaginaSeccion pagina={pg} dieta={dieta} conDieta={conDieta} /></div></div>;
      case 'leyenda':
        return <div className={`carta-papel carta-papel--${lado}`}><div className="carta-cuerpo"><PaginaLeyenda pagina={pg} leyenda={leyenda} t={t} /></div></div>;
      case 'fin':
        return <div className={`carta-papel carta-papel--${lado}`}><PaginaFin restaurant={restaurant} /></div>;
      default: // dorso en móvil
        return <div className="carta-papel carta-papel--dorso" />;
    }
  }

  // Posición del libro: cerrado → solo la tapa centrada; al final → solo la contraportada.
  const estado = movil ? 'movil' : vueltas === 0 ? 'cerrado' : vueltas === H ? 'final' : 'abierto';
  const totalLectura = paginas.length - 1; // sin contar la portada
  let indicador = restaurant.nombre;
  if (vueltas > 0) {
    const a = movil ? vueltas : vueltas * 2 - 1;
    const b = movil ? a : Math.min(a + 1, totalLectura);
    indicador = `${a === b || a > totalLectura ? Math.min(a, totalLectura) : `${a}–${b}`} / ${totalLectura}`;
  }

  return (
    <div
      className="carta-fondo"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="presentation"
    >
      <div
        className="carta"
        role="dialog"
        aria-modal="true"
        aria-label={t('libro.cartaDe', { nombre: restaurant.nombre })}
        style={{ '--carta-papel': tema.fondo, '--carta-tinta': tema.tinta, '--carta-acento': tema.acento }}
        onTouchStart={(e) => { touch.current = e.changedTouches[0].clientX; }}
        onTouchEnd={(e) => {
          if (touch.current == null) return;
          const d = touch.current - e.changedTouches[0].clientX;
          touch.current = null;
          if (Math.abs(d) > 45) ir(d > 0 ? 1 : -1);
        }}
      >
        <button ref={cerrarRef} type="button" className="carta-cerrar" onClick={onClose} aria-label={t('libro.cerrarCarta')}>
          ✕
        </button>

        <div className={`carta-libro carta-libro--${estado}`}>
          {hojas.map(([anverso, reverso], i) => {
            const pasada = i < vueltas;
            const z = i === girando ? 1000 : pasada ? i + 1 : H - i;
            // Solo se pintan las hojas a la vista (la de cada lado) y las que toca el giro en curso:
            // las tapadas con scroll propio se transparentarían en Chrome dentro del contexto 3D.
            const visible =
              i === vueltas || i === vueltas - 1 || (girando != null && Math.abs(i - girando) <= 1);
            return (
              <div
                key={i}
                className={`carta-hoja${pasada ? ' pasada' : ''}${i === girando ? ' girando' : ''}`}
                style={{ zIndex: z, visibility: visible ? 'visible' : 'hidden' }}
                onClick={() => ir(pasada ? -1 : 1)}
                aria-hidden={!(pasada ? i === vueltas - 1 : i === vueltas)}
              >
                <div className="carta-cara carta-cara--anverso">{pintar(anverso, movil ? 'unica' : 'der')}</div>
                <div className="carta-cara carta-cara--reverso">{pintar(reverso, 'izq')}</div>
              </div>
            );
          })}
        </div>

        <nav className="carta-nav" aria-label={t('libro.cartaDe', { nombre: restaurant.nombre })}>
          <button type="button" onClick={() => ir(-1)} disabled={vueltas === 0} aria-label={t('libro.anteriorCorto')}>
            ‹
          </button>
          <span className="carta-nav-indicador" aria-live="polite">
            {indicador}
          </span>
          <button type="button" onClick={() => ir(1)} disabled={vueltas === maxVueltas} aria-label={t('libro.siguienteCorto')}>
            ›
          </button>
        </nav>
      </div>
    </div>
  );
}
