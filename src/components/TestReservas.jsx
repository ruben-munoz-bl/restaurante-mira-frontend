/**
 * View pura: data test de N usuarios (número configurable) con su reserva.
 * Identidades aleatorias; fecha: reparto de 3 días, día concreto (también
 * pasado) o rango con días al azar.
 * Se monta dentro del Panel de Control Operativo (OpsDashboard) y también
 * en la ruta suelta `#/test-reservas` (ahí lo enmarca App.jsx).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDataTest, TOTAL_USUARIOS, MAX_USUARIOS } from '../controllers/useDataTest.js';
import { fetchRestaurants } from '../services/restaurantApi.js';
import { dashboardApi } from '../services/api.js';
import { normalizeText } from '../models/restaurantModel.js';
import '../styles/ops.css';

const ETIQUETA_ESTADO = {
  inactivo: 'Sin ejecutar',
  corriendo: 'En curso…',
  completado: 'Completado',
  parado: 'Parado por error',
  detenido: 'Detenido a mano',
};

const DOW = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function p2(n) {
  return String(n).padStart(2, '0');
}

function isoDe(d) {
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}

export default function TestReservas({ esAdmin, todos = [], onOcultar = null }) {
  const { estado, log, resumen, corriendo, ejecutar, detener } = useDataTest();
  const [sel, setSel] = useState('');
  // Fecha de las reservas: reparto (hoy/+1/+2) · día concreto · rango (desde→hasta).
  const [fecha, setFecha] = useState({ modo: 'reparto', dia: '', desde: '', hasta: '' });
  // Cuántos usuarios de prueba quiere la persona (por defecto, 10).
  const [numUsuarios, setNumUsuarios] = useState(String(TOTAL_USUARIOS));
  const [busqueda, setBusqueda] = useState('');
  const [abierto, setAbierto] = useState(false); // desplegable con buscador
  const comboRef = useRef(null);
  const buscadorRef = useRef(null);
  // Catálogo COMPLETO (?all=1): el prop `todos` solo trae la primera página (27).
  const [catalogo, setCatalogo] = useState([]);
  const [catEstado, setCatEstado] = useState('cargando'); // cargando | listo | error
  // Se engancha a admin si alguna vez lo fue, por si el prop llegara a faltar.
  const [fueAdmin, setFueAdmin] = useState(false);
  // Restaurantes de la propia cuenta (si los tiene): se preseleccionan para que
  // las reservas del test caigan en el MISMO panel que luego se consulta.
  const [misRests, setMisRests] = useState([]);
  // true cuando la persona elige a mano: ya no se le cambia la selección.
  const selManual = useRef(false);
  // Restaurante elegido al ejecutar el test (para el resumen final).
  const [destino, setDestino] = useState(null);
  // Calendario de la fecha de reserva (mes mostrado).
  const [calAbierto, setCalAbierto] = useState(false);
  const [calMes, setCalMes] = useState(() => { const h = new Date(); return new Date(h.getFullYear(), h.getMonth(), 1); });
  const fechaRef = useRef(null);

  useEffect(() => {
    if (esAdmin) setFueAdmin(true);
  }, [esAdmin]);

  useEffect(() => {
    let vivo = true;
    dashboardApi
      .listMyRestaurants()
      .then((l) => { if (vivo && Array.isArray(l)) setMisRests(l); })
      // Cuenta sin restaurantes asignados (p. ej. admin): seguimos con el catálogo.
      .catch(() => {});
    return () => { vivo = false; };
  }, []);

  /**
   * Descarga el catálogo entero. `forzar` ignora la caché de 10 min, así que
   * un restaurante recién creado aparece al abrir el panel o al pulsar Refrescar.
   */
  const cargarCatalogo = useCallback(async (forzar = true) => {
    setCatEstado('cargando');
    try {
      const items = await fetchRestaurants({ forzar });
      setCatalogo(items);
      setCatEstado('listo');
    } catch {
      setCatEstado('error');
    }
  }, []);

  useEffect(() => {
    cargarCatalogo(true);
  }, [cargarCatalogo]);

  /**
   * Catálogo completo + lo que traiga el prop (por si la descarga falla) +
   * los restaurantes de esta cuenta (aunque no salgan en el catálogo público).
   * Los míos van primero (`mio`) y se marcan con ★.
   */
  const opciones = useMemo(() => {
    const mapa = new Map();
    for (const r of [...catalogo, ...misRests, ...todos]) {
      if (r?.id != null && !mapa.has(String(r.id))) mapa.set(String(r.id), r);
    }
    const mios = new Set(misRests.map((r) => String(r.id)));
    return [...mapa.values()]
      .map((r) => ({ ...r, mio: mios.has(String(r.id)) }))
      .sort((a, b) => (Number(Boolean(b.mio)) - Number(Boolean(a.mio)))
        || (a.nombre || '').localeCompare(b.nombre || '', 'es'));
  }, [catalogo, misRests, todos]);

  useEffect(() => {
    if (!opciones.length) return;
    const valido = opciones.some((r) => String(r.id) === sel);
    if (selManual.current && valido) return;
    // Orden: restaurante activo del panel (sesión) > uno de los míos > el primero.
    let pref = null;
    try {
      const activo = sessionStorage.getItem('mira_rest_activo');
      if (activo && opciones.some((r) => String(r.id) === activo)) pref = activo;
    } catch { /* sin sessionStorage */ }
    if (!pref) pref = String(opciones.find((r) => r.mio)?.id || '');
    if (pref) {
      if (pref !== sel) setSel(pref);
      return;
    }
    if (!valido) setSel(String(opciones[0].id));
  }, [opciones, sel]);

  const restaurante = useMemo(
    () => opciones.find((r) => String(r.id) === sel) || null,
    [opciones, sel],
  );

  /** Opciones que se pintan: filtro por nombre/ciudad/zona/cocina (sin tildes). */
  const coincidencias = useMemo(() => {
    const q = normalizeText(busqueda.trim());
    if (!q) return opciones;
    return opciones.filter((r) =>
      [r.nombre, r.ciudad, r.zona, r.cocina].some((c) => normalizeText(c).includes(q)),
    );
  }, [opciones, busqueda]);

  const sinResultados =
    Boolean(busqueda.trim()) && coincidencias.length === 0 && opciones.length > 0;

  // El desplegable se cierra al pulsar fuera y al buscar solo queda lo que coincide.
  useEffect(() => {
    if (!abierto) {
      setBusqueda('');
      return undefined;
    }
    buscadorRef.current?.focus();
    function alPulsarFuera(e) {
      if (comboRef.current && !comboRef.current.contains(e.target)) setAbierto(false);
    }
    document.addEventListener('mousedown', alPulsarFuera);
    return () => document.removeEventListener('mousedown', alPulsarFuera);
  }, [abierto]);

  // El calendario se cierra al pulsar fuera o con Escape.
  useEffect(() => {
    if (!calAbierto) return undefined;
    function alPulsarFuera(e) {
      if (fechaRef.current && !fechaRef.current.contains(e.target)) setCalAbierto(false);
    }
    function alTeclar(e) {
      if (e.key === 'Escape') setCalAbierto(false);
    }
    document.addEventListener('mousedown', alPulsarFuera);
    document.addEventListener('keydown', alTeclar);
    return () => {
      document.removeEventListener('mousedown', alPulsarFuera);
      document.removeEventListener('keydown', alTeclar);
    };
  }, [calAbierto]);

  const permitido = Boolean(esAdmin || fueAdmin);
  const nUsr = parseInt(numUsuarios, 10);
  const nValido = Number.isInteger(nUsr) && nUsr >= 1 && nUsr <= MAX_USUARIOS;
  const nMostrar = nValido ? nUsr : TOTAL_USUARIOS;
  const rangoIncompleto = fecha.modo === 'rango' && (!fecha.desde || !fecha.hasta);
  const fechaValida = fecha.modo === 'reparto'
    || (fecha.modo === 'dia' && Boolean(fecha.dia))
    || (fecha.modo === 'rango' && !rangoIncompleto);
  const listo = Boolean(restaurante) && permitido && nValido && fechaValida && !corriendo;
  const hayResultado = log.length > 0 || estado === 'completado' || estado === 'parado' || estado === 'detenido';

  // —— Calendario: rejilla del mes visible (semana empieza en lunes) ——
  const hoy = new Date();
  const hoyISO = isoDe(hoy);
  const calAnio = calMes.getFullYear();
  const calNumMes = calMes.getMonth();
  const hueco = (new Date(calAnio, calNumMes, 1).getDay() + 6) % 7; // lunes = 0
  const diasMes = new Date(calAnio, calNumMes + 1, 0).getDate();
  const celdas = [
    ...Array.from({ length: hueco }, () => null),
    ...Array.from({ length: diasMes }, (_, i) => i + 1),
  ];
  const tituloMes = calMes.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const fmtCompleta = (iso) => new Date(`${iso}T00:00:00`)
    .toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const fmtCorta = (iso) => new Date(`${iso}T00:00:00`)
    .toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  const etiquetaFecha = fecha.modo === 'dia' && fecha.dia
    ? fmtCompleta(fecha.dia)
    : fecha.modo === 'rango' && fecha.desde && fecha.hasta
      ? `del ${fmtCorta(fecha.desde)} al ${fmtCorta(fecha.hasta)} ${fecha.hasta.slice(0, 4)}`
      : fecha.modo === 'rango' && fecha.desde
        ? `del ${fmtCorta(fecha.desde)} al …`
        : fecha.modo === 'rango'
          ? 'Rango: elige día inicial y final…'
          : fecha.modo === 'dia'
            ? 'Elige un día…'
            : 'Repartir: hoy, +1 y +2 días';
  // Qué le pasa a useDataTest: null (reparto) · string (día) · {desde, hasta}.
  const fechaElegida = fecha.modo === 'dia' && fecha.dia
    ? fecha.dia
    : fecha.modo === 'rango' && !rangoIncompleto
      ? { desde: fecha.desde, hasta: fecha.hasta }
      : null;

  /** Clic en un día del calendario: en 'rango' marca inicial y final. */
  function elegirDia(iso) {
    if (fecha.modo === 'rango') {
      if (!fecha.desde || fecha.hasta) {
        // Primer clic (o rango ya completo): empieza uno nuevo.
        setFecha({ ...fecha, desde: iso, hasta: '' });
        return;
      }
      if (iso < fecha.desde) setFecha({ ...fecha, desde: iso, hasta: fecha.desde });
      else setFecha({ ...fecha, hasta: iso });
      setCalAbierto(false);
      return;
    }
    // Un clic suelto en el calendario pasa a modo «día concreto».
    setFecha({ ...fecha, modo: 'dia', dia: iso });
    setCalAbierto(false);
  }

  return (
    <div className="ops-card ops-card-test" aria-labelledby="test-titulo">
      <div className="ops-card-head">
        <div>
          <h2 id="test-titulo">Data test · {nMostrar} usuarios con reserva</h2>
          <p className="ops-card-sub">
            Crea cuentas reales con preferencias y les hace 1 reserva real cada una,
            en el restaurante y las fechas que elijas.
            Serializado con pausa y <strong>para ante el primer error</strong>.
          </p>
        </div>
        <span className="ops-pill warn">Entorno real</span>
      </div>

      {!permitido && (
        <p className="ops-error" role="alert">
          Solo cuentas de administrador pueden ejecutar el test.
        </p>
      )}

      <p className="ops-muted" style={{ marginBottom: 14 }}>
        Se dan de alta {nMostrar} cuentas con <strong>nombre real aleatorio</strong> y correo en
        demo-mira.es (tipo <code>ana.garcia4829@demo-mira.es</code> / «Ana García») con perfil y
        preferencias, y se crea 1 reserva por usuario en mira-api sobre el restaurante seleccionado:
        repartidas en 3 días por defecto, en la fecha concreta que elijas —<strong> también
        pasadas</strong>, para rellenar paneles históricos— o en <strong>días al azar</strong> de un
        rango («Rango de… a…»), sin chocar en franjas.
        El test usa una instancia de Firebase aparte:
        <strong> tu sesión no se toca</strong> y puedes seguir en el panel cuando termine.
      </p>

      <div className="ops-toolbar">
        <div className="ops-field" style={{ flex: 1, minWidth: 260, margin: 0 }}>
          <span id="test-rest-label">
            Restaurante de prueba
            {catEstado === 'listo' && opciones.length > 0 ? ` · ${opciones.length} disponibles` : ''}
          </span>
          <div className="ops-combo" ref={comboRef}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button
                type="button"
                id="test-rest"
                className="ops-selectbox ops-combo-trigger"
                style={{ flex: 1, minWidth: 0 }}
                onClick={() => setAbierto((v) => !v)}
                disabled={corriendo}
                aria-haspopup="listbox"
                aria-expanded={abierto}
                aria-labelledby="test-rest-label"
              >
                <span className="ops-combo-valor">
                  {restaurante
                    ? `${restaurante.mio ? '★ ' : ''}${restaurante.nombre}${restaurante.ciudad ? ` · ${restaurante.ciudad}` : ''}${restaurante.cocina ? ` (${restaurante.cocina})` : ''}`
                    : opciones.length === 0
                      ? (catEstado === 'cargando' ? 'Cargando catálogo…' : 'Sin restaurantes')
                      : 'Selecciona un restaurante'}
                </span>
                <span className="material-symbols-outlined" aria-hidden="true">expand_more</span>
              </button>
              <button
                type="button"
                className="ops-icon-btn"
                onClick={() => cargarCatalogo(true)}
                disabled={corriendo || catEstado === 'cargando'}
                title="Refrescar catálogo (incluye restaurantes nuevos)"
                aria-label="Refrescar catálogo de restaurantes"
              >
                <span className="material-symbols-outlined">refresh</span>
              </button>
            </div>

            {abierto && (
              <div className="ops-combo-panel">
                <div className="ops-search" style={{ maxWidth: 'none' }}>
                  <span className="material-symbols-outlined" aria-hidden="true">search</span>
                  <input
                    ref={buscadorRef}
                    type="search"
                    placeholder="Buscar por nombre, ciudad o cocina…"
                    aria-label="Buscar restaurante"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setAbierto(false);
                      // Intro elige el primer resultado de la lista filtrada.
                      if (e.key === 'Enter' && coincidencias.length > 0) {
                        e.preventDefault();
                        selManual.current = true;
                        setSel(String(coincidencias[0].id));
                        setAbierto(false);
                      }
                    }}
                    autoComplete="off"
                  />
                </div>

                <div className="ops-combo-list" role="listbox" aria-labelledby="test-rest-label">
                  {coincidencias.map((r) => {
                    const activa = String(r.id) === sel;
                    return (
                      <button
                        key={String(r.id)}
                        type="button"
                        role="option"
                        aria-selected={activa}
                        className={`ops-combo-op${activa ? ' activa' : ''}`}
                        onClick={() => {
                          selManual.current = true;
                          setSel(String(r.id));
                          setAbierto(false);
                        }}
                      >
                        <span className="ops-combo-nombre">
                          {r.nombre}
                          {r.ciudad ? ` · ${r.ciudad}` : ''}
                          <span className="ops-combo-meta"> {r.cocina}</span>
                        </span>
                        {r.mio && <span className="ops-combo-mio">★ Tu restaurante</span>}
                        {activa && <span className="material-symbols-outlined">check</span>}
                      </button>
                    );
                  })}
                  {opciones.length === 0 && (
                    <p className="ops-empty">
                      {catEstado === 'cargando' ? 'Cargando catálogo…' : 'Sin restaurantes'}
                    </p>
                  )}
                  {sinResultados && (
                    <p className="ops-empty">Ningún restaurante coincide con «{busqueda.trim()}».</p>
                  )}
                </div>

                <div className="ops-combo-foot">
                  <span className="ops-muted">{coincidencias.length} de {opciones.length}</span>
                  <button
                    type="button"
                    className="ops-btn sm soft"
                    onClick={() => cargarCatalogo(true)}
                    disabled={catEstado === 'cargando'}
                  >
                    Refrescar catálogo
                  </button>
                </div>
              </div>
            )}
          </div>
          {misRests.length > 0 && (
            <p className="ops-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>
              {restaurante?.mio
                ? '★ Es tu restaurante: el test reservará aquí y verás las reservas en Mi panel.'
                : '★ Tu restaurante va primero en la lista: así las reservas caen en tu panel.'}
            </p>
          )}
        </div>
        <div className="ops-field" style={{ flex: '0 1 auto', minWidth: 210, margin: 0 }}>
          <span id="test-fecha-label">Fechas de la reserva</span>
          <div className="ops-combo" ref={fechaRef}>
            <button
              type="button"
              className="ops-selectbox ops-combo-trigger"
              onClick={() => {
                const baseISO = fecha.modo === 'dia' ? fecha.dia : fecha.hasta || fecha.desde;
                const base = baseISO ? new Date(`${baseISO}T00:00:00`) : new Date();
                setCalMes(new Date(base.getFullYear(), base.getMonth(), 1));
                setCalAbierto((v) => !v);
              }}
              disabled={corriendo}
              aria-haspopup="dialog"
              aria-expanded={calAbierto}
              aria-labelledby="test-fecha-label"
            >
              <span className="ops-combo-valor">{etiquetaFecha}</span>
              <span className="material-symbols-outlined" aria-hidden="true">calendar_month</span>
            </button>

            {calAbierto && (
              <div className="ops-cal-panel" role="dialog" aria-label="Elegir la fecha de la reserva">
                <div className="ops-cal-head">
                  <button
                    type="button"
                    className="ops-cal-nav"
                    onClick={() => setCalMes(new Date(calAnio, calNumMes - 1, 1))}
                    aria-label="Mes anterior"
                  >
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>
                  <span className="ops-cal-titulo">{tituloMes}</span>
                  <button
                    type="button"
                    className="ops-cal-nav"
                    onClick={() => setCalMes(new Date(calAnio, calNumMes + 1, 1))}
                    aria-label="Mes siguiente"
                  >
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </div>

                <div className="ops-cal-modos" role="group" aria-label="Modo de fecha">
                  <button
                    type="button"
                    className={`ops-cal-modo${fecha.modo === 'dia' ? ' activa' : ''}`}
                    aria-pressed={fecha.modo === 'dia'}
                    onClick={() => setFecha((f) => ({ ...f, modo: 'dia' }))}
                  >
                    Día concreto
                  </button>
                  <button
                    type="button"
                    className={`ops-cal-modo${fecha.modo === 'rango' ? ' activa' : ''}`}
                    aria-pressed={fecha.modo === 'rango'}
                    onClick={() => setFecha((f) => ({ ...f, modo: 'rango' }))}
                  >
                    Rango (de… a…)
                  </button>
                </div>

                <div className="ops-cal-dow" aria-hidden="true">
                  {DOW.map((d) => <span key={d}>{d}</span>)}
                </div>

                <div className="ops-cal-dias">
                  {celdas.map((dia, i) => {
                    if (dia === null) return <span key={`hueco-${i}`} aria-hidden="true" />;
                    const iso = `${calAnio}-${p2(calNumMes + 1)}-${p2(dia)}`;
                    const activa = (fecha.modo === 'dia' && iso === fecha.dia)
                      || (fecha.modo === 'rango' && (iso === fecha.desde || iso === fecha.hasta));
                    const enRango = fecha.modo === 'rango' && fecha.desde && fecha.hasta
                      && iso >= fecha.desde && iso <= fecha.hasta;
                    return (
                      <button
                        key={iso}
                        type="button"
                        className={`ops-cal-dia${activa ? ' activa' : ''}${enRango && !activa ? ' en-rango' : ''}${iso === hoyISO ? ' hoy' : ''}${iso < hoyISO && !activa ? ' pasada' : ''}`}
                        aria-current={iso === hoyISO ? 'date' : undefined}
                        aria-pressed={activa}
                        onClick={() => elegirDia(iso)}
                      >
                        {dia}
                      </button>
                    );
                  })}
                </div>

                {fecha.modo === 'rango' && (
                  <p className="ops-muted" style={{ margin: 0, fontSize: 11 }}>
                    {rangoIncompleto
                      ? (fecha.desde ? 'Ahora elige el día final del rango.' : 'Elige primero el día inicial y luego el final.')
                      : 'Rango listo: los días y las franjas salen AL AZAR dentro del rango.'}
                  </p>
                )}

                <div className="ops-cal-foot">
                  <button
                    type="button"
                    className={`ops-btn sm ${fecha.modo === 'reparto' ? 'primary' : 'soft'}`}
                    onClick={() => { setFecha({ modo: 'reparto', dia: '', desde: '', hasta: '' }); setCalAbierto(false); }}
                  >
                    Repartir: hoy, +1 y +2 días
                  </button>
                </div>
              </div>
            )}
          </div>
          {fecha.modo === 'rango' && rangoIncompleto && (
            <span className="ops-error" style={{ fontSize: 11 }}>
              Falta el día final del rango
            </span>
          )}
          {fecha.modo === 'dia' && !fecha.dia && (
            <span className="ops-error" style={{ fontSize: 11 }}>
              Elige un día en el calendario
            </span>
          )}
        </div>
        <div className="ops-field" style={{ flex: '0 1 auto', minWidth: 110, margin: 0 }}>
          <span id="test-num-label">Número de usuarios</span>
          <input
            id="test-num"
            className="ops-input"
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_USUARIOS}
            step={1}
            value={numUsuarios}
            onChange={(e) => setNumUsuarios(e.target.value)}
            disabled={corriendo}
            aria-labelledby="test-num-label"
            aria-invalid={nValido ? undefined : true}
            style={{ width: 110 }}
          />
          {!nValido && (
            <span className="ops-error" style={{ fontSize: 11 }}>
              Entre 1 y {MAX_USUARIOS}
            </span>
          )}
        </div>
        <div className="ops-modal-actions" style={{ marginTop: 0, alignItems: 'flex-end' }}>
          <button
            type="button"
            className="ops-btn primary"
            onClick={() => { setDestino(restaurante); ejecutar(restaurante, fechaElegida, nUsr); }}
            disabled={!listo}
          >
            Ejecutar test ({nValido ? nUsr : '—'} usuarios)
          </button>
          <button
            type="button"
            className="ops-btn danger"
            onClick={detener}
            disabled={!corriendo}
          >
            Detener
          </button>
          {onOcultar && (
            <button type="button" className="ops-btn soft" onClick={onOcultar} disabled={corriendo}>
              Ocultar
            </button>
          )}
        </div>
      </div>

      {catEstado === 'error' && (
        <p className="ops-error" role="alert" style={{ marginBottom: 12 }}>
          No se pudo descargar el catálogo completo: se muestran solo los restaurantes cargados
          hasta ahora.{' '}
          <button type="button" className="ops-btn sm soft" onClick={() => cargarCatalogo(true)}>
            Reintentar
          </button>
        </p>
      )}

      <p className="ops-muted" role="status">
        Estado: <strong>{ETIQUETA_ESTADO[estado] || estado}</strong>
        {resumen ? ` · cuentas: ${resumen.creados}/${resumen.total ?? nMostrar} · reservas: ${resumen.reservas}/${resumen.total ?? nMostrar}` : ''}
      </p>

      {hayResultado && (
        <>
          <h3 style={{ margin: '18px 0 8px', fontSize: 15 }}>Registro</h3>
          <ul className="ops-list">
            {log.map((entrada, i) => (
              <li key={`${i}-${entrada.texto}`} className="ops-list-item">
                <span
                  style={{
                    fontVariantNumeric: 'tabular-nums',
                    fontWeight: entrada.ok ? 600 : 700,
                    color: entrada.ok ? 'var(--ops-on-surface)' : 'var(--ops-error)',
                    wordBreak: 'break-word',
                  }}
                >
                  {entrada.texto}
                </span>
              </li>
            ))}
            {log.length === 0 && <li className="ops-empty">Sin pasos registrados.</li>}
          </ul>
        </>
      )}

      {estado === 'completado' && resumen && (
        <p className="ops-success" role="status" style={{ marginTop: 14 }}>
          Listo: {resumen.creados} cuentas y {resumen.reservas} reservas creadas en
          {' '}<strong>«{destino?.nombre || restaurante?.nombre || 'restaurante elegido'}»</strong>.
          Míralas en <a href="#/dashboard">Mi panel del restaurante</a> (Reservas de hoy / Todas las
          futuras), en <a href="#/reservas">Mis reservas</a> o en <a href="#/admin">#/admin</a> (Usuarios → Informe).
          Si no aparecen en tu panel, comprueba en #/admin → Reservas que la columna
          «restaurante» diga el mismo nombre: las del test van dirigidas al restaurante seleccionado arriba.
        </p>
      )}
      {(estado === 'parado' || estado === 'detenido') && resumen && (
        <p className="ops-error" role="alert" style={{ marginTop: 14 }}>
          Test {estado === 'parado' ? 'parado por error' : 'detenido'} tras
          {' '}{resumen.creados} cuentas y {resumen.reservas} reservas. Lo hecho se ha quedado creado;
          revisa el registro para ver el motivo.
        </p>
      )}
    </div>
  );
}
