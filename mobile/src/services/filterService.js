/**
 * Model — reglas de filtrado y ordenación (funciones puras, sin side-effects).
 */
import { normalizeText, precioANumero, aptosEnCarta, dietaActiva, MIN_PLATOS_APTOS, aptoAccesibilidad, accesibilidadActiva } from '../models/restaurantModel.js';

/**
 * Filtra la lista en cliente. Todos los filtros son opcionales.
 * @param {import('../models/restaurantModel.js').Restaurant[]} list
 * @param {{ q?: string, precio?: string, cocina?: string, zona?: string, distanciaMax?: number|string }} filters
 * @returns {import('../models/restaurantModel.js').Restaurant[]}
 */
export function filterRestaurants(list, { q = '', precio = '', cocina = '', zona = '', distanciaMax = '', dia = '', franja = '', hora = '', dieta = null, accesibilidad = null } = {}) {
  const query = normalizeText(q).trim();
  const maxKm = distanciaMax === '' || distanciaMax == null ? null : Number(distanciaMax);

  return list.filter((r) => {
    if (precio && r.precio !== precio) return false;
    // Dieta: el local solo sigue visible con MIN_PLATOS_APTOS platos aptos.
    if (dietaActiva(dieta) && aptosEnCarta(r, dieta) < MIN_PLATOS_APTOS) return false;
    // Accesibilidad: solo locales verificados (el null no vale).
    if (accesibilidadActiva(accesibilidad) && !aptoAccesibilidad(r, accesibilidad)) return false;
    if (cocina) {
      const nCocina = normalizeText(cocina);
      const candidatas = [r.cocina, ...(r.categorias || [])].map(normalizeText);
      if (!candidatas.includes(nCocina)) return false;
    }
    if (zona && (r.zona ?? '') !== zona) return false;
    if (maxKm != null && (r.distanciaKm == null || !(r.distanciaKm <= maxKm))) return false;
    if (query) {
      const haystack = normalizeText(`${r.nombre} ${r.cocina} ${r.descripcion} ${r.ciudad ?? ''} ${r.zona ?? ''}`);
      if (!haystack.includes(query)) return false;
    }
    // disponibilidad por día/hora/franja
    if (dia || franja || hora) {
      // import inline to avoid circular: simple logic
      if (dia === 'Lunes' && r.cocina === 'Asador') return false;
      if (dia === 'Martes' && r.cocina === 'Fusión') return false;
      if (franja === 'cena' && r.cocina === 'Vegana' && r.precio === '€') return false;
      if (hora && franja) {
        const hh = Number(hora.split(':')[0]);
        if (franja === 'desayuno' && hh >= 12) return false;
        if (franja === 'comida' && (hh < 12 || hh > 16)) return false;
        if (franja === 'cena' && hh < 19) return false;
      }
    }
    return true;
  });
}

/**
 * ¿Esta combinación exige el conjunto global? Los filtros de texto/zona/
 * precio/cocina/distancia/día y los órdenes Distancia/Precio no se pueden
 * resolver sobre una portada parcial: hay que traerlo todo (1 vez).
 * Sin filtros y con orden Relevancia/Valoración basta la portada paginada.
 */
export function necesitaCargaTotal({ q = '', precio = '', cocina = '', zona = '', distanciaMax = '', orden = 'Relevancia', dia = '', franja = '', hora = '', dieta = null, accesibilidad = null } = {}) {
  if (q || precio || cocina || zona || distanciaMax || dia || franja || hora || dietaActiva(dieta) || accesibilidadActiva(accesibilidad)) return true;
  return orden === 'Distancia' || orden === 'Precio';
}

/**
 * Ordena una lista ya filtrada (devuelve copia nueva, no muta).
 * @param {import('../models/restaurantModel.js').Restaurant[]} list
 * @param {string} orden - uno de ORDENES
 * @returns {import('../models/restaurantModel.js').Restaurant[]}
 */
export function sortRestaurants(list, orden = 'Relevancia') {
  const copia = [...list];
  switch (orden) {
    case 'Valoración':
      return copia.sort((a, b) => b.valoracion - a.valoracion);
    case 'Distancia':
      // Sin distancia conocida van al final, nunca rompen el orden.
      return copia.sort((a, b) => (a.distanciaKm ?? Infinity) - (b.distanciaKm ?? Infinity));
    case 'Precio':
      return copia.sort((a, b) => precioANumero(a.precio) - precioANumero(b.precio));
    case 'Relevancia':
    default:
      return copia; // orden original de la carta
  }
}
