/**
 * Reglas puras de las campañas de promoción (M15). Espejo del contrato de
 * `POST /v1/promotions` de mira-api: fechas de calendario, presupuesto > 0,
 * CPC > 0 y puntos extra enteros. Sin red: se prueba con node --test.
 */

export const TIPO_POR_DEFECTO = 'boost_visibilidad';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Fecha de hoy (AAAA-MM-DD) en la zona horaria de Madrid, la misma que usa el backend. */
export function hoyMadrid(ahora = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(ahora);
}

/** Suma días a una fecha AAAA-MM-DD sin cruzar husos horarios. */
export function sumarDias(iso, dias) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + Number(dias));
  return d.toISOString().slice(0, 10);
}

/** Formulario con los valores que pone el backend si no se envían. */
export function promocionVacia() {
  const hoy = hoyMadrid();
  return {
    tipo: TIPO_POR_DEFECTO,
    fechaInicio: hoy,
    fechaFin: sumarDias(hoy, 30),
    presupuestoTotal: '300',
    cpc: '0.2',
    puntosExtraPorReserva: '0',
  };
}

/** Firestore/JSON → milisegundos. Acepta ISO, segundos y Timestamp serializado. */
export function aMs(valor) {
  if (valor == null) return null;
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  if (typeof valor === 'string') {
    const ms = Date.parse(valor);
    return Number.isNaN(ms) ? null : ms;
  }
  if (typeof valor === 'object') {
    if (typeof valor.seconds === 'number') return valor.seconds * 1000;
    if (typeof valor._seconds === 'number') return valor._seconds * 1000;
    if (typeof valor.toDate === 'function') return valor.toDate().getTime();
  }
  return null;
}

/** Fecha corta para la lista: «23 oct 2026». */
export function fechaCorta(valor, locale = 'es-ES') {
  const ms = aMs(valor);
  if (ms == null) return '—';
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Europe/Madrid',
  }).format(new Date(ms));
}

/** Fecha AAAA-MM-DD para un input type=date. */
export function fechaInput(valor) {
  const ms = aMs(valor);
  if (ms == null) return '';
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date(ms));
}

/** Estado visible según las fechas (el backend puede seguir diciendo «activa»). */
export function estadoPromocion(p, ahora = Date.now()) {
  if (p?.estado === 'finalizada') return 'finalizada';
  const fin = aMs(p?.fechaFin);
  const inicio = aMs(p?.fechaInicio);
  if (fin != null && fin < ahora) return 'caducada';
  if (inicio != null && inicio > ahora) return 'programada';
  return 'activa';
}

/** true si el backend rechazará una nueva campaña (solo mira `estado`, no fechas). */
export function bloqueaNueva(p) {
  return p?.estado === 'activa';
}

/** { campo: [clave i18n relativa a promociones.] } o null. */
export function validarPromocion(d) {
  const e = {};
  const tipo = String(d.tipo ?? '').trim();
  if (!tipo || tipo.length > 60) e.tipo = ['errTipo'];
  if (!FECHA.test(d.fechaInicio || '')) e.fechaInicio = ['errFechaInicio'];
  if (!FECHA.test(d.fechaFin || '')) e.fechaFin = ['errFechaFin'];
  else if (FECHA.test(d.fechaInicio || '') && d.fechaFin < d.fechaInicio) e.fechaFin = ['errFechaPosterior'];
  const presupuesto = Number(d.presupuestoTotal);
  if (!Number.isFinite(presupuesto) || presupuesto <= 0 || presupuesto > 1000000) e.presupuestoTotal = ['errPresupuesto'];
  const cpc = Number(d.cpc);
  if (!Number.isFinite(cpc) || cpc <= 0 || cpc > 100) e.cpc = ['errCpc'];
  const puntos = Number(d.puntosExtraPorReserva);
  if (!Number.isInteger(puntos) || puntos < 0 || puntos > 10000) e.puntosExtraPorReserva = ['errPuntos'];
  return Object.keys(e).length ? e : null;
}

/** Payload limpio para POST /v1/promotions. */
export function paraGuardar(d, restauranteId) {
  return {
    restauranteId: String(restauranteId),
    tipo: String(d.tipo ?? '').trim() || TIPO_POR_DEFECTO,
    fechaInicio: d.fechaInicio,
    fechaFin: d.fechaFin,
    presupuestoTotal: Number(d.presupuestoTotal),
    cpc: Number(d.cpc),
    puntosExtraPorReserva: Number(d.puntosExtraPorReserva),
  };
}

/** Detalles de campo de un 400 del backend → claves i18n relativas a promociones. */
export function erroresDeApi(err) {
  const detalles = err?.data?.details;
  if (!detalles || typeof detalles !== 'object') return null;
  const mapa = {
    tipo: 'errTipo',
    fechaInicio: 'errFechaInicio',
    fechaFin: 'errFechaFin',
    presupuestoTotal: 'errPresupuesto',
    cpc: 'errCpc',
    puntosExtraPorReserva: 'errPuntos',
  };
  const salida = {};
  for (const campo of Object.keys(detalles)) salida[campo] = [mapa[campo] || 'errValidacion'];
  return salida;
}

/** Error de la API → clave i18n (relativa a promociones.) para el mensaje general. */
export function claveErrorApi(err) {
  if (!err?.status) return 'errRed';
  if (err.status === 409) return 'errActivaExistente';
  if (err.status === 401 || err.status === 403) return 'errPermiso';
  if (err.status === 404) return 'errRestaurante';
  if (err.status === 400) return 'errValidacion';
  return 'errRed';
}
