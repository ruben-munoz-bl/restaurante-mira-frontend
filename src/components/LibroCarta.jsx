/**
 * View pura: carta libro interactiva. Portada + pliegos con volteo 3D
 * (anverso = página actual, reverso = página del siguiente pliego).
 * Sin cromo de UI: solo el libro. Cerrar con clic fuera o Esc.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
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

const TRADS = { es, ca, en };

const EYEBROWS = {
  Entrantes: 'Para Comenzar',
  Principales: 'Principales de Temporada',
  Postres: 'Dulces & Bodega',
};

function ContenidoSeccion({ seccion, dieta, mostrarConflictos, numero }) {
  const eyebrow = EYEBROWS[seccion.titulo] || seccion.titulo;
  return (
    <>
      <div className="libro-pagina-top">
        <span className="libro-pagina-eyebrow">{eyebrow}</span>
        <span className="libro-pagina-num">{numero}</span>
      </div>
      <h4 className="libro-seccion-titulo">{seccion.titulo}</h4>
      <div className="libro-pagina-cuerpo">
        <ul className="libro-platos">
          {seccion.platos.map((p) => {
            const conflictos = (dieta?.alergias || []).filter((a) => p.alergenos.includes(a));
            return (
              <li key={p.nombre} className="libro-plato">
                <div className="libro-plato-cab">
                  <strong className="libro-plato-nombre">{p.nombre}</strong>
                  <span className="libro-precio">{Number(p.precio).toFixed(2)}€</span>
                </div>
                <p className="libro-plato-desc">{p.descripcion}</p>
                <p className="libro-plato-tags">
                  <Sellos plato={p} />
                  {mostrarConflictos && <ConflictosAlergenos alergenos={conflictos} />}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}

function ContenidoLeyenda({ leyenda, t, numero }) {
  return (
    <>
      <div className="libro-pagina-top">
        <span className="libro-pagina-eyebrow">{t('libro.leyenda')}</span>
        <span className="libro-pagina-num">{numero}</span>
      </div>
      <h4 className="libro-seccion-titulo">{t('libro.leyenda')}</h4>
      <div className="libro-pagina-cuerpo">
        <ul className="libro-leyenda-lista">
          {leyenda.map((e) => (
            <li key={e.nombre}>
              <span className="libro-leyenda-simbolo" aria-hidden="true">
                {e.simbolo}
              </span>
              <span>
                <strong>{e.nombre}.</strong> {e.descripcion}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function ContenidoVacia({ numero }) {
  return (
    <div className="libro-pagina-vacia" aria-hidden="true">
      <span className="libro-pagina-vacia-num">{numero}</span>
      <span className="libro-pagina-vacia-marca">✦</span>
    </div>
  );
}

function ContenidoPortada({ restaurant, tema, libro, totalPlatos, conDieta, aptos, t }) {
  const iniciales = (restaurant.nombre || 'M')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <>
      <div className="libro-portada-marco" aria-hidden="true">
        <div className="libro-portada-esquinas">
          <span>✦</span><span>✦</span>
        </div>
        <div className="libro-portada-esquinas libro-portada-esquinas--abajo">
          <span>✦</span><span>✦</span>
        </div>
      </div>
      <div className="libro-portada-top">
        <span className="libro-portada-badge">{tema.nombre}</span>
      </div>
      <div className="libro-portada-centro">
        <div className="libro-portada-crest" aria-hidden="true">★</div>
        <h3 className="libro-portada-titulo">{restaurant.nombre}</h3>
        <p className="libro-portada-sub">
          {restaurant.cocina} · {restaurant.precio}
        </p>
        <div className="libro-portada-linea" aria-hidden="true" />
        <p className="libro-portada-datos">
          {libro.secciones.length} {t('libro.secciones')} · {totalPlatos} {t('libro.platos')}
          {conDieta && ` · ${t('libro.aptosParaTi')}: ${aptos}`}
          {restaurant.menuInfantil === true && ` · ${t('libro.menuInfantil')}`}
        </p>
        <p className="libro-portada-iniciales" aria-hidden="true">{iniciales}</p>
      </div>
      <div className="libro-portada-cta">
        <span className="libro-portada-cta-pill">{t('libro.abrirMenu')}</span>
        <span className="libro-portada-cta-hint">{t('libro.desliza')}</span>
      </div>
    </>
  );
}

export default function LibroCarta({ restaurant, dieta, onClose }) {
  const t = useT(TRADS);
  const [spread, setSpread] = useState(0);
  const [volteo, setVolteo] = useState(null);
  const touchX = useRef(null);

  const libro = useMemo(() => cartaLibro(restaurant), [restaurant]);
  const tema = useMemo(() => temaCarta(restaurant.cocina), [restaurant.cocina]);
  const leyenda = useMemo(() => leyendaSellos(), []);
  const conDieta = dietaActiva(dieta);
  const aptos = conDieta ? aptosEnCarta(restaurant, dieta) : null;
  const totalPlatos = libro.secciones.reduce((n, s) => n + s.platos.length, 0);

  const spreads = useMemo(() => {
    const paginas = [
      ...libro.secciones.map((s, i) => ({ tipo: 'seccion', ...s, num: i + 1 })),
      { tipo: 'leyenda', num: libro.secciones.length + 1 },
    ];
    if (paginas.length % 2 === 1) {
      paginas.push({ tipo: 'vacia', num: paginas.length + 1 });
    }
    const lista = [{ tipo: 'portada' }];
    for (let i = 0; i < paginas.length; i += 2) {
      lista.push({ tipo: 'spread', izq: paginas[i], der: paginas[i + 1] });
    }
    return lista;
  }, [libro]);

  const maxSpread = spreads.length - 1;

  function irA(n) {
    if (volteo) return;
    const destino = Math.max(0, Math.min(n, maxSpread));
    if (destino === spread) return;
    setVolteo({ dir: destino > spread ? 1 : -1, from: spread, to: destino });
  }

  function finVolteo() {
    setVolteo((v) => {
      if (v) setSpread(v.to);
      return null;
    });
  }

  useEffect(() => {
    if (!volteo) return undefined;
    const id = setTimeout(finVolteo, 900);
    return () => clearTimeout(id);
  }, [volteo]);

  useEffect(() => {
    function alTeclar(e) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        irA(spread + 1);
      }
      if (e.key === 'ArrowLeft') irA(spread - 1);
    }
    window.addEventListener('keydown', alTeclar);
    return () => window.removeEventListener('keydown', alTeclar);
  }, [onClose, spread, maxSpread, volteo]);

  function cerrarDesdeFondo(e) {
    if (e.target === e.currentTarget) onClose();
  }

  function onTouchStart(e) {
    touchX.current = e.changedTouches[0].screenX;
  }

  function onTouchEnd(e) {
    if (touchX.current == null || volteo) return;
    const diff = touchX.current - e.changedTouches[0].screenX;
    touchX.current = null;
    if (diff > 48) irA(spread + 1);
    else if (diff < -48) irA(spread - 1);
  }

  function pintarPagina(pg) {
    if (!pg) return <ContenidoVacia numero="" />;
    if (pg.tipo === 'portada') {
      return (
        <ContenidoPortada
          restaurant={restaurant}
          tema={tema}
          libro={libro}
          totalPlatos={totalPlatos}
          conDieta={conDieta}
          aptos={aptos}
          t={t}
        />
      );
    }
    if (pg.tipo === 'vacia') return <ContenidoVacia numero={pg.num ?? ''} />;
    if (pg.tipo === 'leyenda') {
      return <ContenidoLeyenda leyenda={leyenda} t={t} numero={pg.num} />;
    }
    if (pg.tipo === 'seccion') {
      return (
        <ContenidoSeccion
          seccion={pg}
          dieta={dieta}
          mostrarConflictos={conDieta}
          numero={pg.num}
        />
      );
    }
    return <ContenidoVacia numero="" />;
  }

  function caraPapel(pg, lado) {
    return (
      <div className={`libro-pliego-cara libro-pliego-cara--papel libro-pliego-cara--${lado}`}>
        {pintarPagina(pg)}
      </div>
    );
  }

  function caraCuero(pg) {
    return (
      <div className="libro-pliego-cara libro-pliego-cara--cuero">
        {pintarPagina(pg)}
      </div>
    );
  }

  const keyBase = volteo ? `v-${volteo.from}-${volteo.to}-${volteo.dir}` : `s-${spread}`;
  let hojas;

  if (volteo) {
    const from = spreads[volteo.from];
    const to = spreads[volteo.to];
    const adelante = volteo.dir === 1;
    const esTapa = from.tipo === 'portada' || to.tipo === 'portada';

    if (esTapa) {
      /*
       * Portada ↔ contenido: fade puro (sin rotateY → sin zoom).
       * Abrir: tapa visible → funde; debajo ya está el pliego destino.
       * Cerrar: entra la tapa opaca sobre el último pliego de contenido.
       */
      const portada = from.tipo === 'portada' ? from : to;
      const contenido = from.tipo === 'portada' ? to : from;
      const contIzq = contenido.tipo === 'spread' ? contenido.izq : { tipo: 'vacia', num: '' };
      const contDer = contenido.tipo === 'spread' ? contenido.der : { tipo: 'vacia', num: '' };

      hojas = (
        <div className="libro-spread libro-spread--volteando">
          <div className="libro-pliego libro-pliego--izq libro-pliego--bajo">
            {caraPapel(contIzq, 'izq')}
          </div>
          <div className="libro-lomo" aria-hidden="true" />
          <div className="libro-pliego libro-pliego--der libro-pliego--bajo">
            {caraPapel(contDer, 'der')}
          </div>
          <div
            key={`tapa-${volteo.from}-${volteo.to}`}
            className={`libro-hoja libro-hoja--tapa ${adelante ? 'libro-hoja--next' : 'libro-hoja--prev'}`}
            onAnimationEnd={finVolteo}
          >
            {/* Una sola cara: la portada (no hay reverso 3D en la tapa) */}
            <div className="libro-hoja-cara libro-hoja-cara--anverso">
              {caraCuero(portada)}
            </div>
          </div>
        </div>
      );
    } else {
      /*
       * Pliego a pliego (libro real):
       * - Siguiente: se voltea la hoja DERECHA hacia la izquierda.
       *     anverso = página der actual
       *     reverso = página izq del SIGUIENTE pliego (dorso de esa hoja)
       *     bajo der = página der del destino; bajo izq = izq actual (se cubre)
       * - Anterior: se voltea la hoja IZQUIERDA hacia la derecha.
       *     anverso = página izq actual
       *     reverso = página der del pliego ANTERIOR (dorso de esa hoja)
       *     bajo izq = página izq del destino; bajo der = der actual (se cubre)
       */
      const underIzq = adelante ? from.izq : to.izq;
      const underDer = adelante ? to.der : from.der;
      const leafAnverso = adelante ? from.der : from.izq;
      const leafReverso = adelante ? to.izq : to.der;

      hojas = (
        <div className="libro-spread libro-spread--volteando">
          <div className="libro-pliego libro-pliego--izq libro-pliego--bajo">
            {caraPapel(underIzq, 'izq')}
          </div>
          <div className="libro-lomo" aria-hidden="true" />
          <div className="libro-pliego libro-pliego--der libro-pliego--bajo">
            {caraPapel(underDer, 'der')}
          </div>
          <div
            key={`hoja-${volteo.from}-${volteo.to}`}
            className={`libro-hoja ${adelante ? 'libro-hoja--next' : 'libro-hoja--prev'}`}
            onAnimationEnd={finVolteo}
          >
            <div className="libro-hoja-cara libro-hoja-cara--anverso">
              {caraPapel(leafAnverso, adelante ? 'der' : 'izq')}
            </div>
            <div className="libro-hoja-cara libro-hoja-cara--reverso">
              {caraPapel(leafReverso, adelante ? 'izq' : 'der')}
            </div>
          </div>
        </div>
      );
    }
  } else if (spread === 0) {
    hojas = (
      <div className="libro-spread libro-spread--portada">
        <div
          className="libro-pliego libro-pliego--solo libro-pliego--portada"
          onClick={() => irA(1)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              irA(1);
            }
          }}
        >
          {caraCuero(spreads[0])}
        </div>
      </div>
    );
  } else {
    const pg = spreads[spread];
    hojas = (
      <div className="libro-spread">
        <div
          className="libro-pliego libro-pliego--izq"
          onClick={() => irA(spread - 1)}
          role="presentation"
        >
          {caraPapel(pg.izq, 'izq')}
        </div>
        <div className="libro-lomo" aria-hidden="true" />
        <div
          className="libro-pliego libro-pliego--der"
          onClick={() => irA(spread + 1)}
          role="presentation"
        >
          {caraPapel(pg.der, 'der')}
        </div>
      </div>
    );
  }

  const esPortada = spread === 0 && !volteo;

  return (
    <div className="modal-fondo libro-fondo" onClick={cerrarDesdeFondo}>
      <div
        className={`libro${esPortada ? ' libro--portada' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={t('libro.cartaDe', { nombre: restaurant.nombre })}
        style={{
          '--libro-fondo': tema.fondo,
          '--libro-tinta': tema.tinta,
          '--libro-acento': tema.acento,
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div key={keyBase} className="libro-hojas">
          {hojas}
        </div>
      </div>
    </div>
  );
}
