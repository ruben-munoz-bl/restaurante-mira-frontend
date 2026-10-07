/**
 * View pura: #/mapa — locales con coordenadas, filtrables por zona.
 * Leaflet + OpenStreetMap (gratis, sin claves), con estilo claro u oscuro según el tema.
 * Al tocar un pin se muestra una preview de la card del restaurante; desde ella
 * se abre la ficha completa. Sin geolocalización: centra en el centro de cada ciudad.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchRestaurants } from '../services/restaurantApi.js';
import { ZONAS_CATALUNA, imagenParaRestaurante } from '../models/restaurantModel.js';
import { centroDeZona, CENTRO_CATALUNA } from '../services/cityCenters.js';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';
import { track } from '../services/auditoria.js';
import '../styles/mapa.css';

const TRADS = { es, ca, en };

// OpenStreetMap (sin clave). El estilo claro/oscuro se aplica con filtros CSS en mapa.css.
const TESELAS = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATRIBUCION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

function nombreZona(z, t) {
  return String(z || '').replace(', Spain', '') || (t ? t('otros.sinZona') : 'Sin zona');
}

function escapar(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Tono del pin según la nota: así se ven de un vistazo los mejor valorados. */
function nivelNota(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 'sin';
  if (n >= 4.6) return 'top';
  if (n >= 4) return 'alta';
  return 'media';
}

function iconoRestaurante(r, seleccionado) {
  const nota = Number(r.valoracion);
  const texto = Number.isFinite(nota) ? nota.toFixed(1) : '•';
  return L.divIcon({
    className: 'mapa-pin-wrap',
    html: `<span class="mapa-pin mapa-pin--${nivelNota(nota)}${seleccionado ? ' is-sel' : ''}"><span class="mapa-pin-nota">${escapar(texto)}</span></span>`,
    iconSize: [44, 52],
    iconAnchor: [22, 47],
  });
}

function iconoCentro() {
  return L.divIcon({ className: 'mapa-centro-pin', html: '★', iconSize: [28, 28], iconAnchor: [14, 14] });
}

/* ───────── Preview de la card ───────── */

function PreviewCard({ r, t, onCerrar, onVerFicha }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.focus();
    const alTeclar = (e) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', alTeclar);
    return () => window.removeEventListener('keydown', alTeclar);
  }, [r.id, onCerrar]);

  const nota = Number(r.valoracion);
  const llenas = Number.isFinite(nota) ? Math.round(nota) : 0;
  return (
    <article ref={ref} tabIndex={-1} className="mapa-preview" key={r.id} aria-label={r.nombre} aria-live="polite">
      <div className="mapa-preview-media">
        <img
          src={r.imagen || imagenParaRestaurante(r.cocina, r.id)}
          alt=""
          loading="lazy"
          onError={(e) => {
            if (e.currentTarget.dataset.fallback) return;
            e.currentTarget.dataset.fallback = '1';
            e.currentTarget.src = imagenParaRestaurante(r.cocina, r.id);
          }}
        />
        {Number.isFinite(nota) && nota >= 4.7 && <span className="mapa-preview-top">{t('card.recomendado')}</span>}
        <button type="button" className="mapa-preview-cerrar" onClick={onCerrar} aria-label={t('otros.cerrar') || 'Cerrar'}>✕</button>
      </div>
      <div className="mapa-preview-cuerpo">
        <p className="mapa-preview-meta">
          <span>{r.cocina}</span>
          {r.precio && <span>{r.precio}</span>}
          <span>{nombreZona(r.zona, t)}</span>
        </p>
        <h3>{r.nombre}</h3>
        <p className="mapa-preview-nota">
          <span className="mapa-preview-estrellas" aria-hidden="true">{'★'.repeat(llenas)}<i>{'★'.repeat(Math.max(0, 5 - llenas))}</i></span>
          <strong>{Number.isFinite(nota) ? nota.toFixed(1) : '—'}</strong>
          {r.totalResenasYelp ? <small>({Number(r.totalResenasYelp).toLocaleString('es-ES')})</small> : null}
        </p>
        {r.descripcion && <p className="mapa-preview-desc">{r.descripcion}</p>}
        <div className="mapa-preview-acciones">
          <button type="button" className="btn-cta btn-peq" onClick={() => onVerFicha(r)}>{t('card.verMas')}</button>
          {r.direccion && <span className="mapa-preview-dir" title={r.direccion}>{r.direccion}</span>}
        </div>
      </div>
    </article>
  );
}

export default function Mapa({ todos, total, onVerDetalle }) {
  const t = useT(TRADS);
  const refCont = useRef(null);
  const refMapa = useRef(null);
  const refCapa = useRef(null);
  const refCapaCentro = useRef(null);
  const refMarcadores = useRef(new Map());
  const [fuente, setFuente] = useState(() => (Array.isArray(todos) && todos.length ? [...todos] : []));
  const [cargando, setCargando] = useState(() => !(Array.isArray(todos) && todos.length));
  const [error, setError] = useState('');
  const [zona, setZona] = useState('');
  const [reintento, setReintento] = useState(0);
  const [seleccionado, setSeleccionado] = useState(null);

  // Datos: usa lo ya cargado y mejora a colección completa en fondo sin bloquear el mapa.
  useEffect(() => {
    let vivo = true;
    if (Array.isArray(todos) && todos.length > 0) {
      setFuente((prev) => (prev.length ? prev : [...todos]));
      setCargando(false);
    }
    fetchRestaurants()
      .then((l) => {
        if (!vivo) return;
        if (Array.isArray(l) && l.length) {
          setFuente(l);
          setError('');
        }
        setCargando(false);
      })
      .catch((e) => {
        if (!vivo) return;
        if (fuente.length > 0 || (Array.isArray(todos) && todos.length > 0)) {
          setCargando(false);
          return;
        }
        setError(e.message || t('otros.noMapa'));
        setCargando(false);
      });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reintento, todos]);

  const porZona = useMemo(() => {
    const m = {};
    fuente.forEach((r) => {
      const z = r.zona || t('otros.sinZona');
      m[z] = (m[z] || 0) + 1;
    });
    return m;
  }, [fuente, t]);

  const visibles = useMemo(
    () => fuente.filter((r) =>
      r.coords
      && Number.isFinite(Number(r.coords.lat))
      && Number.isFinite(Number(r.coords.lng))
      && (!zona || (r.zona || t('otros.sinZona')) === zona)),
    [fuente, zona, t],
  );

  // Crear el mapa una sola vez (el contenedor siempre está en el DOM).
  useEffect(() => {
    if (refMapa.current || !refCont.current) return undefined;
    const mapa = L.map(refCont.current, { zoomControl: false, attributionControl: true })
      .setView([CENTRO_CATALUNA.lat, CENTRO_CATALUNA.lng], CENTRO_CATALUNA.zoom);
    L.control.zoom({ position: 'bottomright' }).addTo(mapa);
    L.tileLayer(TESELAS, { maxZoom: 19, attribution: ATRIBUCION }).addTo(mapa);
    refMapa.current = mapa;
    refCapa.current = L.layerGroup().addTo(mapa);
    refCapaCentro.current = L.layerGroup().addTo(mapa);
    mapa.on('click', () => setSeleccionado(null));

    const tiempos = [80, 400, 900].map((ms) => setTimeout(() => mapa.invalidateSize(), ms));
    const onResize = () => mapa.invalidateSize();
    window.addEventListener('resize', onResize);
    return () => {
      tiempos.forEach(clearTimeout);
      window.removeEventListener('resize', onResize);
      mapa.remove();
      refMapa.current = null;
      refCapa.current = null;
      refCapaCentro.current = null;
      refMarcadores.current = new Map();
    };
  }, []);

  const elegir = useCallback((r) => {
    setSeleccionado(r);
    track('mapa_marcador_pulsado', { entidadTipo: 'restaurante', entidadId: String(r.id), entidadNombre: r.nombre });
    const mapa = refMapa.current;
    if (!mapa) return;
    // Desplaza el mapa para que el pin no quede tapado por la preview.
    const punto = mapa.latLngToContainerPoint([Number(r.coords.lat), Number(r.coords.lng)]);
    const tam = mapa.getSize();
    const movil = tam.x < 640;
    const destino = movil ? L.point(tam.x / 2, tam.y * 0.32) : L.point(tam.x * 0.62, tam.y / 2);
    mapa.panBy(punto.subtract(destino), { animate: true, duration: 0.35 });
  }, []);

  // Repintar marcadores al cambiar zona/datos.
  useEffect(() => {
    const mapa = refMapa.current;
    const capa = refCapa.current;
    const capaCentro = refCapaCentro.current;
    if (!mapa || !capa) return;
    capa.clearLayers();
    capaCentro?.clearLayers();
    refMarcadores.current = new Map();

    const centro = centroDeZona(zona);
    if (zona && capaCentro) {
      L.marker([centro.lat, centro.lng], { icon: iconoCentro(), keyboard: false, zIndexOffset: 1000 })
        .bindTooltip(`Centro de ${escapar(centro.nombre || nombreZona(zona, t))}`, { direction: 'top' })
        .addTo(capaCentro);
    }

    const puntos = [];
    visibles.forEach((r) => {
      const lat = Number(r.coords.lat);
      const lng = Number(r.coords.lng);
      const mk = L.marker([lat, lng], { icon: iconoRestaurante(r, false), title: r.nombre, riseOnHover: true, alt: r.nombre });
      mk.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        elegir(r);
      });
      mk.addTo(capa);
      refMarcadores.current.set(String(r.id), mk);
      puntos.push([lat, lng]);
    });

    if (puntos.length > 1) mapa.fitBounds(puntos, { padding: [40, 40], maxZoom: 13 });
    else if (puntos.length === 1) mapa.setView(puntos[0], 15);
    else if (zona) mapa.setView([centro.lat, centro.lng], centro.zoom || 13);
    else if (fuente.length === 0) mapa.setView([CENTRO_CATALUNA.lat, CENTRO_CATALUNA.lng], CENTRO_CATALUNA.zoom);
    setTimeout(() => mapa.invalidateSize(), 80);
    setSeleccionado((s) => (s && visibles.some((r) => r.id === s.id) ? s : null));
  }, [visibles, zona, fuente.length, elegir, t]);

  // Resalta el pin seleccionado (solo cambia los dos iconos afectados, no repinta todos).
  const previo = useRef(null);
  useEffect(() => {
    const mapa = new Map(visibles.map((r) => [String(r.id), r]));
    if (previo.current) {
      const mk = refMarcadores.current.get(previo.current);
      const r = mapa.get(previo.current);
      if (mk && r) { mk.setIcon(iconoRestaurante(r, false)); mk.setZIndexOffset(0); }
    }
    if (seleccionado) {
      const mk = refMarcadores.current.get(String(seleccionado.id));
      if (mk) { mk.setIcon(iconoRestaurante(seleccionado, true)); mk.setZIndexOffset(2000); }
    }
    previo.current = seleccionado ? String(seleccionado.id) : null;
  }, [seleccionado, visibles]);

  const cerrar = useCallback(() => setSeleccionado(null), []);
  const verFicha = useCallback((r) => onVerDetalle(r), [onVerDetalle]);

  const zonas = useMemo(() => [...new Set([...ZONAS_CATALUNA, ...Object.keys(porZona)])], [porZona]);
  const mapaVacio = !cargando && fuente.length === 0 && !error;

  return (
    <section className="mapa-pagina" aria-labelledby="mapa-titulo">
      <header className="mapa-cabecera">
        <div>
          <p className="mapa-eyebrow">MIRA · Cataluña</p>
          <h1 id="mapa-titulo">{t('otros.mapaPorZonas')}</h1>
          <p className="mapa-sub" aria-live="polite">
            {cargando
              ? t('otros.cargandoLocales')
              : t('otros.localesEnMapa', { count: visibles.length }) + (zona ? ` · ${nombreZona(zona, t)}` : '')}
          </p>
        </div>
        <ul className="mapa-leyenda" aria-label="Leyenda de notas">
          <li><i className="mapa-pin-mini mapa-pin--top" />4,6+</li>
          <li><i className="mapa-pin-mini mapa-pin--alta" />4,0+</li>
          <li><i className="mapa-pin-mini mapa-pin--media" />&lt; 4</li>
        </ul>
      </header>

      <div className="mapa-zonas" role="group" aria-label="Filtrar por zona">
        <button type="button" aria-pressed={zona === ''} className={`mapa-zona${zona === '' ? ' is-activa' : ''}`} onClick={() => setZona('')}>
          {t('otros.todas')} <span>{fuente.length || total || 0}</span>
        </button>
        {zonas.map((z) => (
          <button key={z} type="button" aria-pressed={zona === z} className={`mapa-zona${zona === z ? ' is-activa' : ''}`} onClick={() => setZona(z)}>
            {nombreZona(z, t)} <span>{porZona[z] ?? 0}</span>
          </button>
        ))}
      </div>

      {error && fuente.length === 0 && (
        <div className="error-panel" role="alert">
          <p className="vacio-titulo">{t('otros.noMapa')}</p>
          <p>{error}</p>
          <button type="button" className="btn-cta" onClick={() => setReintento((i) => i + 1)}>{t('otros.reintentar')}</button>
        </div>
      )}
      {mapaVacio && <p className="vacio-texto">{t('otros.noCoordenadas')}</p>}

      <div className="mapa-marco">
        {/* El mapa SIEMPRE en el DOM: si no, Leaflet no inicializa (altura 0) */}
        <div ref={refCont} className="mapa-lienzo" role="application" aria-label={t('otros.mapaPorZonas')} />
        {cargando && fuente.length === 0 && <div className="mapa-cargando" role="status"><span />{t('otros.cargandoMapa')}</div>}
        {!seleccionado && !cargando && visibles.length > 0 && <p className="mapa-pista">Toca un pin para ver el restaurante</p>}
        {seleccionado && <PreviewCard r={seleccionado} t={t} onCerrar={cerrar} onVerFicha={verFicha} />}
      </div>
    </section>
  );
}
