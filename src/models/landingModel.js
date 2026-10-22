/**
 * Model — secciones curadas de la landing (M07). Funciones puras: reciben el
 * catálogo ya mapeado, no mutan la entrada y no tocan React.
 */
import { normalizeText } from './restaurantModel.js';

/** Nota ponderada por nº de reseñas, mismo criterio que `Descubrir.jsx`. */
function puntuacion(r) {
  const n = r.totalResenasYelp || 0;
  return ((r.valoracion || 0) * n + 4.2 * 25) / (n + 25);
}

/** Mejores de Barcelona por nota ponderada; fuera las ciudades vecinas y los sin nota. */
export function topBarcelona(lista, limite = 50) {
  return (Array.isArray(lista) ? lista : [])
    .filter((r) => r && normalizeText(r.ciudad).trim() === 'barcelona' && r.valoracion > 0)
    .sort((a, b) => puntuacion(b) - puntuacion(a))
    .slice(0, limite);
}

/** Recién llegados: solo con `creado` parseable, del más nuevo al más antiguo. */
export function nuevosRestaurantes(lista, limite = 8) {
  return (Array.isArray(lista) ? lista : [])
    .filter((r) => Number.isFinite(Date.parse(r?.creado)))
    .sort((a, b) => Date.parse(b.creado) - Date.parse(a.creado))
    .slice(0, limite);
}
