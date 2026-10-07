/**
 * Foto real de un plato desde Wikipedia / Wikimedia Commons (gratis, sin clave,
 * con CORS). Casi todos los platos de la carta tienen artículo con imagen.
 * - Solo vale un artículo de gastronomía (se revisan sus categorías): nada de
 *   anatomía, especies, películas… Se busca en es.wikipedia y luego en en.wikipedia.
 * - Caché en memoria + localStorage 30 días: cada plato se busca una sola vez.
 * - No toca la base de datos de MIRA.
 */

const TTL_MS = 30 * 24 * 60 * 60 * 1000;
// v2: la v1 cogía el primer resultado y podía traer fotos que no eran comida (p. ej. anatomía).
const CLAVE = (nombre) => `mira:foto-plato:v10:${nombre.toLowerCase()}`;

// Solo se aceptan artículos cuyas categorías son de comida; se descartan los que no lo son.
const COMIDA = /(bebida|drink|cocktail|cóctel|gastronom|cocina|platos|plato |comida|alimento|postre|sopa|carne|pescado|marisco|tapa|embutido|queso|pan |pasta|arroz|dulce|repost|guiso|ensalada|salsa|sushi|dish|cuisine|food|meat|dessert|soup|seafood|bread|noodle)/i;
const NO_COMIDA = /(animales descritos|species described|peces del|bodegón|pintura|cuadro|painting|museo|museum|raza|breed|envas|vacuum|máquina|machine|anatom|hueso|esquelet|bone|biolog|zoolog|especie|taxon|enfermedad|disease|película|film|álbum|album|canción|song|personas vivas|living people|municipio|futbol|football)/i;
const GENERICOS = /^(plato|comida|alimento|dish|food)$/i;
// Imágenes que no son fotos de comida (logos, mapas, escudos, banderas, dibujos vectoriales).
const NO_FOTO = /(logo|escudo|coat_of_arms|mapa|map_|locator|flag|bandera|\.svg)/i;

// Nombres de la carta que en Wikipedia significan otra cosa (o cuya foto es el producto
// crudo): búsqueda fijada. Prefijo «en:» = buscar en la Wikipedia inglesa.
const TERMINO = {
  'vacío': 'Vacío corte de carne asado',
  entrana: 'Entraña carne asado',
  'entraña': 'Entraña carne asado',
  secreto: null, // solo hay diagramas de despiece: se usa la foto de la cocina
  giros: 'Gyros',
  costillas: 'en:Pork ribs',
  entrecot: 'en:Steak',
  'chuletón': 'Chuletón',
  vermut: 'Vermú',
  'vermut de grifo': 'Vermú',
  nuggets: 'Nugget de pollo',
  'bocadillo completo': 'Bocadillo',
  'copa de la casa': 'Sangría (bebida)',
  'lubina a la espalda': 'Pescado frito',
  'curry de cordero': 'Rogan josh',
  tortilla: 'Tortilla de patatas',
  shawarma: 'Shawarma',
  patatas: 'Patatas fritas',
  rollitos: 'Rollito de primavera',
  tallarines: 'en:Chow mein',
  'calçots': 'Calçotada',
  'jamón ibérico': 'en:Jamón ibérico',
  anchoas: 'Boquerones en vinagre',
  'tabla de embutidos': 'en:Charcuterie board',
  'tostada con tomate': 'Pan con tomate',
};
const enMemoria = new Map(); // nombre → Promise<string|null>

function leer(nombre) {
  try {
    const raw = localStorage.getItem(CLAVE(nombre));
    if (!raw) return undefined;
    const { url, ts } = JSON.parse(raw);
    return Date.now() - ts < TTL_MS ? url : undefined;
  } catch {
    return undefined;
  }
}

function guardar(nombre, url) {
  if (!url) return; // sin foto: no se guarda, se reintentará otro día
  try {
    localStorage.setItem(CLAVE(nombre), JSON.stringify({ url, ts: Date.now() }));
  } catch {
    /* sin almacenamiento: queda en memoria */
  }
}

const normalizar = (t) => (t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const VACIAS = new Set(['de', 'del', 'la', 'el', 'con', 'al', 'a', 'y', 'en', 'los', 'las']);
/** ¿El título del artículo comparte alguna palabra significativa con el plato? */
function encaja(titulo, plato) {
  const t = normalizar(titulo);
  return normalizar(plato).split(/\W+/).some((w) => w.length >= 4 && !VACIAS.has(w) && t.includes(w.slice(0, Math.max(4, w.length - 1))));
}

/** Artículos de comida con foto, en orden de relevancia: [{ titulo, foto }]. */
async function buscar(idioma, termino, tam) {
  const url = `https://${idioma}.wikipedia.org/w/api.php?action=query&format=json&origin=*&redirects=1`
    + `&prop=pageimages|categories&piprop=thumbnail&pithumbsize=${tam}&cllimit=max&clshow=!hidden`
    + `&generator=search&gsrlimit=6&gsrsearch=${encodeURIComponent(termino)}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return [];
    const paginas = Object.values((await res.json()).query?.pages || {}).sort((a, b) => a.index - b.index);
    return paginas
      .filter((p) => {
        if (!p.thumbnail?.source || NO_FOTO.test(decodeURIComponent(p.thumbnail.source))) return false;
        const categorias = (p.categories || []).map((c) => c.title).join(' | ');
        if (GENERICOS.test(p.title) || NO_COMIDA.test(p.title) || NO_COMIDA.test(categorias)) return false;
        return COMIDA.test(categorias);
      })
      .map((p) => ({ titulo: p.title, foto: p.thumbnail.source }));
  } catch {
    return [];
  } finally {
    clearTimeout(t);
  }
}

/** URL de una foto del plato, o null si no se encuentra. */
let cola = Promise.resolve(); // Wikipedia limita la velocidad: una búsqueda a la vez

export function fotoDePlato(nombre, tam = 320) {
  const guardada = leer(nombre);
  if (guardada !== undefined) return Promise.resolve(guardada);
  if (!enMemoria.has(nombre)) {
    const turno = cola.then(async () => {
        // 1.º artículo de comida cuyo título encaja con el plato; si no, cualquiera de comida.
        // «plato»/«dish» orienta la búsqueda hacia la receta (Costillas → costillas cocinadas).
        const clave = nombre.toLowerCase();
        if (clave in TERMINO && TERMINO[clave] === null) return null;
        const fijado = TERMINO[clave] || nombre;
        const soloIngles = fijado.startsWith('en:');
        const termino = soloIngles ? fijado.slice(3) : fijado;
        const busquedas = soloIngles
          ? [['en', termino], ['en', `${termino} dish`]]
          : [['es', termino], ['es', `${termino} plato`], ['en', `${termino} dish`]];
        const candidatos = [];
        for (const [idioma, q] of busquedas) {
          candidatos.push(...(await buscar(idioma, q, tam)));
          if (candidatos.some((c) => encaja(c.titulo, termino))) break; // ya hay uno bueno
        }
        const elegido = candidatos.find((c) => encaja(c.titulo, termino)) || candidatos[0];
        const url = elegido?.foto || null;
        guardar(nombre, url);
        return url;
    });
    cola = turno.catch(() => {});
    enMemoria.set(nombre, turno);
  }
  return enMemoria.get(nombre);
}
