/**
 * Model — emblemas por NÚMERO de reservas válidas (no canceladas).
 * Sin Firestore: se calcula siempre desde las reservas; desbloqueos
 * se guardan en localStorage (solo avance) para no re-preguntar.
 * Niveles: 0 → ninguno; 1-4 → foodie; 5-8 → gourmet; 9+ → michelin.
 * Multiplicador: 1.00 | 1.10 | 1.20 | 1.25.
 */

export const EMBLEMAS = [
  { id: 'foodie', img: '/emblemas/foodie.png', umbral: 1, multi: 1.1 },
  { id: 'gourmet', img: '/emblemas/gourmet.png', umbral: 5, multi: 1.2 },
  { id: 'michelin', img: '/emblemas/michelin.png', umbral: 9, multi: 1.25 },
];

const LS_KEY = 'mira_emblemas';

/** Reservas que cuentan: existen y no están canceladas. */
export function reservasValidas(reservas = []) {
  return reservas.filter((r) => r && r.estado !== 'cancelada');
}

export function contarReservasValidas(reservas = []) {
  return reservasValidas(reservas).length;
}

/** Emblema por nº de reservas válidas: null | foodie | gourmet | michelin. */
export function emblemaPorReservas(total = 0) {
  if (total >= 9) return EMBLEMAS[2];
  if (total >= 5) return EMBLEMAS[1];
  if (total >= 1) return EMBLEMAS[0];
  return null;
}

/**
 * Multiplicador de puntos del nivel actual.
 * @returns {number} 1 | 1.1 | 1.2 | 1.25
 */
export function getPointsMultiplier(reservas = []) {
  const emb = emblemaPorReservas(contarReservasValidas(reservas));
  return emb ? emb.multi : 1;
}

/** Texto del multiplicador con 2 decimales (x1.00, x1.10, x1.20, x1.25). */
export function formatearMultiplicador(multi) {
  return `x${Number(multi).toFixed(2)}`;
}

/** Siguiente umbral no alcanzado (null si ya es máximo). */
export function siguienteEmblema(total = 0) {
  return EMBLEMAS.find((e) => total < e.umbral) || null;
}

/** Reservas que faltan para el siguiente nivel (0 si es máximo). */
export function reservasFaltantes(total = 0) {
  const sig = siguienteEmblema(total);
  return sig ? Math.max(0, sig.umbral - total) : 0;
}

/** Ids que el total actual debería tener desbloqueados (solo avance). */
export function emblemasPorReservas(total = 0) {
  return EMBLEMAS.filter((e) => total >= e.umbral).map((e) => e.id);
}

/** Mayor emblema de la lista persistida; null si vacía. */
export function mayorEmblema(desbloqueados = []) {
  for (let i = EMBLEMAS.length - 1; i >= 0; i -= 1) {
    if (desbloqueados.includes(EMBLEMAS[i].id)) return EMBLEMAS[i];
  }
  return null;
}

function leerLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((id) => EMBLEMAS.some((e) => e.id === id)) : [];
  } catch {
    return [];
  }
}

function guardarLocal(ids) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(ids));
  } catch {
    /* modo privado / sin storage: se recalcula en cada carga */
  }
}

/**
 * Estado de emblemas para Mi cuenta a partir de las reservas del usuario.
 * Persiste SOLO ids nuevos en localStorage (nunca retrocede).
 */
export async function obtenerEmblemasUsuario(_uid, reservas = []) {
  const totalReservas = contarReservasValidas(reservas);
  const deberia = emblemasPorReservas(totalReservas);

  const guardados = leerLocal();
  const set = new Set(guardados);
  const nuevos = deberia.filter((id) => !set.has(id));
  const desbloqueados = nuevos.length ? [...guardados, ...nuevos] : guardados;
  if (nuevos.length) guardarLocal(desbloqueados);

  const emblema = emblemaPorReservas(totalReservas);
  const multi = emblema ? emblema.multi : 1;
  const siguiente = siguienteEmblema(totalReservas);
  const faltan = reservasFaltantes(totalReservas);

  return {
    totalReservas,
    desbloqueados,
    emblema,
    multi,
    multiTexto: formatearMultiplicador(multi),
    siguiente,
    faltan,
  };
}
