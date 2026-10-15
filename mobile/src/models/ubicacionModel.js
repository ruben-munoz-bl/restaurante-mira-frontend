/**
 * Model — consentimiento de ubicación (G03, ofertas por geolocalización).
 * Solo se guarda la decisión del usuario en este dispositivo, nunca posiciones.
 * Si cambia el texto del consentimiento, subir VERSION_CONSENTIMIENTO para que
 * se vuelva a pedir.
 */
export const CLAVE_UBICACION = 'mira:ubicacion';
export const VERSION_CONSENTIMIENTO = 1;
const ESTADOS = ['aceptado', 'rechazado'];

/** { estado: 'pendiente' | 'aceptado' | 'rechazado', fecha } leído del almacenamiento. */
export function leerConsentimiento(storage) {
  try {
    const d = JSON.parse(storage?.getItem(CLAVE_UBICACION) || 'null');
    if (d && ESTADOS.includes(d.estado) && d.version === VERSION_CONSENTIMIENTO) return { estado: d.estado, fecha: d.fecha || null };
  } catch { /* dato corrupto o sin almacenamiento: se vuelve a preguntar */ }
  return { estado: 'pendiente', fecha: null };
}

/** Guarda la decisión (sin coordenadas). Devuelve lo guardado. */
export function guardarConsentimiento(storage, estado, ahora = new Date()) {
  if (!ESTADOS.includes(estado)) throw new Error(`Estado de consentimiento no válido: ${estado}`);
  const datos = { estado, version: VERSION_CONSENTIMIENTO, fecha: ahora.toISOString() };
  try { storage?.setItem(CLAVE_UBICACION, JSON.stringify(datos)); } catch { /* almacenamiento lleno o bloqueado */ }
  return { estado, fecha: datos.fecha };
}

/** Código de GeolocationPositionError (1, 2, 3) → clave i18n relativa a ubicacion. */
export function claveErrorUbicacion(codigo) {
  if (codigo === 1) return 'errorPermiso';
  if (codigo === 2) return 'errorNoDisponible';
  if (codigo === 3) return 'errorTiempo';
  return 'errorDesconocido';
}

/** Posición para mostrar: solo lat, lng y precisión redondeados; nada más sale de aquí. */
export function posicionVisible(coords) {
  if (!coords || !Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude)) return null;
  return {
    lat: Math.round(coords.latitude * 1e5) / 1e5,
    lng: Math.round(coords.longitude * 1e5) / 1e5,
    precisionM: Number.isFinite(coords.accuracy) ? Math.round(coords.accuracy) : null,
  };
}
