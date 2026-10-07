/**
 * Model — estimación de servicios que la API no trae (acceso adaptado, menú
 * infantil, tronas, terraza, entorno tranquilo).
 *
 * Se deduce en el cliente, sin consultas, a partir de las categorías, el precio,
 * la nota y el nombre del local. Es determinista (mismo local → mismo resultado)
 * y SOLO rellena campos que vienen a null: un dato real nunca se sobrescribe.
 * Cada campo estimado queda marcado en `serviciosEstimados` para que la UI lo
 * etiquete como estimación y los filtros de accesibilidad puedan ignorarlo.
 */

export const SERVICIOS = ['accesoDiscapacidad', 'menuInfantil', 'tronas', 'terraza', 'entornoTranquilo'];

const sinTildes = (s) =>
  (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Hash estable 0..1 por local y campo (desempata los casos dudosos). */
function azar(id, campo) {
  let h = 2166136261;
  for (const c of `${id}:${campo}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

const hay = (texto, patron) => patron.test(texto);

const FAMILIAR = /(pizz|italian|burger|hamburg|american|mexican|taco|brunch|breakfast|cafe|cafeter|creper|crep|familia|family|chicken|pollo|asador|steak|grill|buffet|paella|arros|helad|ice cream|dessert|bakery|panader)/;
const NOCHE = /(cocktail|bar\b|bars|pub|wine bar|vinoteca|lounge|club|discot|beer|cervec|gastrobar|karaoke|speakeasy)/;
const TERRAZA = /(tapas|mediterr|seafood|marisc|chiringuito|beach|playa|brunch|cafe|cafeter|beer|cervec|terrace|terraza|rooftop|paella|arros|helad|juice|smoothie|garden|jardin)/;
const TRANQUILO = /(tea|te\b|cafe|cafeter|vegan|vegetar|japanese|japon|sushi|omakase|bistro|wine|vino|librer|book|french|frances|fine dining|gastronom|healthy|salad|bakery)/;
const RUIDOSO = /(tapas|bar\b|bars|pub|beer|cervec|sports|deport|karaoke|club|discot|mexican|taco|buffet|fast food|kebab|burger)/;
const ANTIGUO = /(taverna|taberna|bodega|tasca|bodeguilla|celler|vermut|vermouth|xiringuito|chiringuito)/;
const MODERNO = /(hotel|centro comercial|mall|food court|cadena|chain|rooftop|fine dining|gastronom|fusion|asian fusion|brunch|healthy)/;

/**
 * Devuelve { valores, estimados } con solo los campos que faltaban.
 * @param {object} r restaurante ya mapeado (nombre, cocina, categorias, precio, valoracion)
 */
export function estimarServicios(r) {
  const texto = sinTildes(`${r.nombre} ${r.cocina} ${(r.categorias || []).join(' ')} ${r.descripcion || ''}`);
  const caro = r.precio === '€€€';
  const barato = r.precio === '€';
  const familiar = hay(texto, FAMILIAR);
  const noche = hay(texto, NOCHE);

  const reglas = {
    menuInfantil: () => {
      if (noche && !familiar) return false;
      if (caro && !familiar) return azar(r.id, 'mi') < 0.15;
      if (familiar) return true;
      return azar(r.id, 'mi') < (barato ? 0.55 : 0.4);
    },
    tronas: (v) => {
      if (noche && !familiar) return false;
      if (v.menuInfantil) return azar(r.id, 'tr') < 0.85;
      return azar(r.id, 'tr') < (caro ? 0.3 : 0.2);
    },
    terraza: () => {
      if (hay(texto, TERRAZA)) return azar(r.id, 'te') < 0.8;
      if (caro) return azar(r.id, 'te') < 0.2;
      return azar(r.id, 'te') < 0.35;
    },
    entornoTranquilo: () => {
      if (hay(texto, RUIDOSO) && !hay(texto, TRANQUILO)) return false;
      if (hay(texto, TRANQUILO) || caro) return azar(r.id, 'tq') < 0.8;
      return azar(r.id, 'tq') < 0.3;
    },
    accesoDiscapacidad: () => {
      if (hay(texto, ANTIGUO)) return azar(r.id, 'ac') < 0.2;
      if (hay(texto, MODERNO) || caro) return azar(r.id, 'ac') < 0.8;
      return azar(r.id, 'ac') < 0.5;
    },
  };

  const valores = {};
  const estimados = {};
  const actual = { ...r };
  for (const campo of ['menuInfantil', 'tronas', 'terraza', 'entornoTranquilo', 'accesoDiscapacidad']) {
    if (r[campo] === true || r[campo] === false) continue; // dato real: no se toca
    valores[campo] = reglas[campo](actual);
    actual[campo] = valores[campo];
    estimados[campo] = true;
  }
  return { valores, estimados };
}

/** Restaurante con los huecos rellenados y marcados. */
export function conServiciosEstimados(r) {
  const { valores, estimados } = estimarServicios(r);
  return { ...r, ...valores, serviciosEstimados: { ...(r.serviciosEstimados || {}), ...estimados } };
}

export const esEstimado = (r, campo) => Boolean(r?.serviciosEstimados?.[campo]);
