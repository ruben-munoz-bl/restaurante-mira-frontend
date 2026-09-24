/**
 * Model — tipos del dominio (JSDoc, sin JSX ni lógica de UI).
 *
 * @typedef {Object} Resena
 * @property {string} usuario
 * @property {string} fecha - YYYY-MM-DD
 * @property {string} comentario
 * @property {number} puntuacion - 1 a 5
 *
 * @typedef {Object} Restaurant
 * @property {number|string} id
 * @property {string} nombre
 * @property {string} cocina - primera categoría (filtro rápido)
 * @property {string[]} [categorias] - todas las categorías
 * @property {string} precio - '€' | '€€' | '€€€'
 * @property {number|null} distanciaKm - null sin ubicación
 * @property {{lat:number,lng:number}|null} [coords]
 * @property {number} valoracion - 0 a 5 (nota Yelp)
 * @property {number} [totalResenasYelp]
 * @property {string} imagen
 * @property {string} descripcion - una línea
 * @property {string} [direccion]
 * @property {string} [ciudad]
 * @property {string} [zona] - zona de búsqueda (p. ej. 'Tarragona, Spain')
 * @property {string} [telefono]
 * @property {string} [yelpUrl]
 * @property {Resena[]} [resenas]
 */

/** Cocinas disponibles en el filtro (orden de la carta). */
export const COCINAS = [
  'Mediterránea',
  'Española',
  'Italiana',
  'Japonesa',
  'Mexicana',
  'Asador',
  'Fusión',
  'Vegana',
];

/** Imágenes reales estables por cocina (Unsplash). */
export const IMAGEN_POR_COCINA = {
  'Mediterránea': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop&q=60',
  'Española': 'https://images.unsplash.com/photo-1534080564583-6be75777b70a?w=600&auto=format&fit=crop&q=60',
  'Italiana': 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=600&auto=format&fit=crop&q=60',
  'Japonesa': 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=600&auto=format&fit=crop&q=60',
  'Mexicana': 'https://images.unsplash.com/photo-1551506448-074afa034c05?w=600&auto=format&fit=crop&q=60',
  'Asador': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=60',
  'Fusión': 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop&q=60',
  'Vegana': 'https://images.unsplash.com/photo-1512621776952-a57141f2eefd?w=600&auto=format&fit=crop&q=60',
};

const IMAGENES_VARIADAS = {
  'Mediterránea': [
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop&q=60',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&auto=format&fit=crop&q=60',
  ],
  'Italiana': [
    'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=600&auto=format&fit=crop&q=60',
    'https://images.unsplash.com/photo-1498579150354-977bec7ea0af?w=600&auto=format&fit=crop&q=60',
    'https://images.unsplash.com/photo-1515669097368-22e68427d265?w=600&auto=format&fit=crop&q=60',
  ],
  'Japonesa': [
    'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=600&auto=format&fit=crop&q=60',
    'https://images.unsplash.com/photo-1553621042-f6e147245754?w=600&auto=format&fit=crop&q=60',
  ],
  'Mexicana': [
    'https://images.unsplash.com/photo-1551506448-074afa034c05?w=600&auto=format&fit=crop&q=60',
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&auto=format&fit=crop&q=60',
  ],
  'Asador': [
    'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=60',
    'https://images.unsplash.com/photo-1558030006-450066393d65?w=600&auto=format&fit=crop&q=60',
  ],
  'Vegana': [
    'https://images.unsplash.com/photo-1512621776952-a57141f2eefd?w=600&auto=format&fit=crop&q=60',
    'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600&auto=format&fit=crop&q=60',
  ],
  'Fusión': [
    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop&q=60',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop&q=60',
  ],
  'Española': [
    'https://images.unsplash.com/photo-1534080564583-6be75777b70a?w=600&auto=format&fit=crop&q=60',
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop&q=60',
  ],
};

export function imagenParaRestaurante(cocina, id) {
  const lista = IMAGENES_VARIADAS[cocina] || [IMAGEN_POR_COCINA[cocina] || IMAGEN_POR_COCINA['Mediterránea']];
  // hash simple estable por id para variar sin ser aleatorio
  let h = 0;
  const s = String(id);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997;
  return lista[h % lista.length];
}

/** Precios disponibles en el filtro. */
export const PRECIOS = ['€', '€€', '€€€'];

/**
 * Tramos de distancia del filtro.
 * value '' = sin filtro.
 */
export const DISTANCIAS = [
  { value: '', label: 'Cualquier distancia al centro' },
  { value: 1, label: 'A menos de 1 km del centro' },
  { value: 3, label: 'A menos de 3 km del centro' },
  { value: 5, label: 'A menos de 5 km del centro' },
  { value: 10, label: 'A menos de 10 km del centro' },
];

/** Criterios de ordenación del filtro. */
export const ORDENES = ['Relevancia', 'Valoración', 'Distancia', 'Precio'];

/** Días de la semana para filtro */
export const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const FRANJAS = [
  { value: '', label: 'Cualquier hora' },
  { value: 'desayuno', label: 'Desayuno (09:00–12:00)' },
  { value: 'comida', label: 'Comida (13:00–16:00)' },
  { value: 'cena', label: 'Cena (20:00–23:30)' },
];

/** Horario simulado por restaurante (para filtrar por dia/hora) */
export function mesasDelLocal(r) {
  const base = 12 + (String(r.id).length * 3) % 10; // 12-20
  return base;
}
export function horarioRestaurante(r) {
  // Horario genérico: 13-16 y 20-23:30, desayuno 9-12 solo algunos
  const desayuno = ['Vegana','Mediterránea'].includes(r.cocina);
  return { desayuno, comida: [13,16], cena: [20,23.5] };
}
export const FESTIVOS_2026 = ['2026-01-01','2026-01-06','2026-04-10','2026-05-01','2026-06-24','2026-08-15','2026-09-11','2026-10-12','2026-11-01','2026-12-06','2026-12-25','2026-12-26'];
export function esFestivo(fechaStr) {
  return FESTIVOS_2026.includes(fechaStr);
}
export function estaAbierto(r, fechaStr, horaStr) {
  if (!fechaStr && !horaStr) return true;
  if (fechaStr && esFestivo(fechaStr)) {
    // Festivo: solo Mediterránea y Española abren mediodía
    if (!['Mediterránea','Española'].includes(r.cocina)) return false;
  }
  if (fechaStr) {
    const d = parseFechaLocal(fechaStr);
    const diaSemana = d.getDay(); // 0 dom
    const nombres = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const nombre = nombres[diaSemana];
    if (nombre === 'Lunes' && r.cocina === 'Asador') return false;
    if (nombre === 'Martes' && r.cocina === 'Fusión') return false;
    if (nombre === 'Domingo' && r.cocina === 'Vegana' && horaStr && Number(horaStr.split(':')[0])>=20) return false;
  }
  if (horaStr) {
    const [hh, mm]= horaStr.split(':').map(Number);
    const h = hh + mm/60;
    const hor = horarioRestaurante(r);
    const enDesayuno = hor.desayuno && h>=9 && h<12;
    const enComida = h>=hor.comida[0] && h<=hor.comida[1];
    const enCena = h>=hor.cena[0] && h<=hor.cena[1];
    if (!enDesayuno && !enComida && !enCena) return false;
  }
  return true;
}
export function estaDisponible(r, dia, franja, hora) {
  if (!dia && !franja && !hora) return true;
  if (dia === 'Lunes' && r.cocina === 'Asador') return false;
  if (dia === 'Martes' && r.cocina === 'Fusión') return false;
  if (franja === 'cena' && r.precio === '€' && r.cocina === 'Vegana') return false;
  if (hora) {
    const [hh] = hora.split(':').map(Number);
    if (franja === 'desayuno' && hh >= 12) return false;
    if (franja === 'comida' && (hh < 13 || hh > 16)) return false;
    if (franja === 'cena' && hh < 19) return false;
  }
  return true;
}

/**
 * Hash estable texto→número (los ids Yelp son texto: `id*7` daría NaN).
 */
export function hashTexto(str) {
  const s = String(str ?? '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Likes simulados estables 0–12 para reseñas mock. */
export function semillaLikes(id, i) {
  return (hashTexto(id) + i * 3) % 13;
}

/**
 * 'YYYY-MM-DD' → Date LOCAL. (new Date('2026-09-11') es medianoche UTC y en
 * España getDay() devuelve el día anterior: hay que construirla en local.)
 */
export function parseFechaLocal(fechaStr) {
  const [y, m, d] = fechaStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Hoy en 'YYYY-MM-DD' local (toISOString es UTC y falla de madrugada). */
export function hoyLocalISO() {
  const h = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${h.getFullYear()}-${p(h.getMonth() + 1)}-${p(h.getDate())}`;
}

/**
 * Marca temporal de una reseña para ordenar: createdAt de Firestore
 * y si no, fecha 'YYYY-MM-DD'. 0 si no hay ninguna.
 */
export function fechaDeResena(r) {
  if (r?.createdAt?.toMillis) {
    try {
      return r.createdAt.toMillis();
    } catch {
      return 0;
    }
  }
  const t = Date.parse(r?.fecha || '');
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Ordena reseñas: 'populares' (likes, luego nota) o 'recientes' (fecha desc).
 * Devuelve copia nueva, no muta.
 */
export function ordenarResenas(lista, orden = 'populares') {
  const copia = [...(lista || [])];
  if (orden === 'recientes') return copia.sort((a, b) => fechaDeResena(b) - fechaDeResena(a));
  return copia.sort((a, b) => (b.likes || 0) - (a.likes || 0) || (b.puntuacion || 0) - (a.puntuacion || 0));
}

/**
 * Zonas de búsqueda del proyecto (fijas: las queries de Yelp que llenan la BBDD).
 * Se usan para el filtro aunque la portada aún no las haya cargado todas.
 */
export const ZONAS_CATALUNA = ['Barcelona, Spain', 'Tarragona, Spain', 'Girona, Spain', 'Lleida, Spain'];
export const CIUDADES_CATALUNA = ['Tarragona', 'Girona', 'Barcelona', 'Lleida'];

// =====================================================
// Dieta, alérgenos y carta libro (todo determinista, 0 lecturas)
// =====================================================

/** Nº mínimo de platos aptos para que un local siga visible con dieta activa. */
export const MIN_PLATOS_APTOS = 2;

/** Alérgenos del sistema (keys estables para guardar en perfil). */
export const ALERGENOS = [
  { key: 'gluten', label: 'Gluten', codigo: 'GL' },
  { key: 'lactosa', label: 'Lactosa', codigo: 'LA' },
  { key: 'huevo', label: 'Huevo', codigo: 'HU' },
  { key: 'frutos_secos', label: 'Frutos secos', codigo: 'FS' },
  { key: 'marisco', label: 'Marisco', codigo: 'MA' },
  { key: 'pescado', label: 'Pescado', codigo: 'PE' },
  { key: 'soja', label: 'Soja', codigo: 'SO' },
];

/**
 * Catálogo único de sellos de la carta (platos). La leyenda visible se
 * deriva de aquí: al añadir un sello o alérgeno aparece solo, sin tocar la UI.
 * icono: emoji o null (entonces se usa el código como insignia de texto).
 */
export const SELLOS_PLATO = [
  { id: 'vegano', icono: '🌱', codigo: null, nombre: 'Vegano', descripcion: 'Sin nada animal: ni carne, ni pescado, ni lácteos, ni huevo.' },
  { id: 'vegetariano', icono: null, codigo: 'VG', nombre: 'Vegetariano', descripcion: 'Sin carne ni pescado. Puede llevar lácteos o huevo.' },
  { id: 'sinGluten', icono: null, codigo: 'SG', nombre: 'Sin gluten', descripcion: 'Sin trigo, cebada, centeno ni avena.' },
];

/**
 * Leyenda completa y derivada del catálogo: sellos de dieta + alérgenos +
 * símbolos de la carta. Añadir entradas al catálogo las publica solas.
 */
export function leyendaSellos() {
  return [
    ...SELLOS_PLATO.map((s) => ({
      simbolo: s.icono ?? s.codigo,
      nombre: s.nombre,
      descripcion: s.descripcion,
    })),
    ...ALERGENOS.map((a) => ({
      simbolo: a.codigo,
      nombre: a.label,
      descripcion: `Contiene ${a.label.toLowerCase()}.`,
    })),
    { simbolo: '€', nombre: 'Precio', descripcion: 'Precio por plato en euros.' },
    {
      simbolo: '✓',
      nombre: 'Apto para ti',
      descripcion: 'Platos que cumplen tu dieta y evitan tus alergias marcadas.',
    },
  ];
}

/** Código corto de un alérgeno para las insignias de plato. */
export function codigoAlergeno(key) {
  return ALERGENOS.find((a) => a.key === key)?.codigo ?? key.slice(0, 2).toUpperCase();
}

/** Dieta vacía (forma canónica que se guarda en perfil/localStorage). */
export const DIETA_VACIA = { vegano: false, vegetariano: false, sinGluten: false, alergias: [] };

/**
 * Accesibilidad del perfil (forma canónica).
 * - sillaRuedas: necesita acceso sin escalones, baños adaptados, etc.
 * - tea: espectro autista → prefiere entornos tranquilos y predecibles.
 * Solo filtra por datos VERIFICADOS (los declara la empresa); jamás se inventan.
 */
export const ACCESIBILIDAD_VACIA = { sillaRuedas: false, tea: false };

export function normalizarAccesibilidad(a) {
  return {
    sillaRuedas: a?.sillaRuedas === true,
    tea: a?.tea === true,
  };
}

export function accesibilidadActiva(a) {
  const n = normalizarAccesibilidad(a);
  return n.sillaRuedas || n.tea;
}

/**
 * ¿El local es apto verificado? null/sin dato = NO apto cuando el filtro pide.
 * (Mostrarlo sería mentir a quien no puede arriesgarse.)
 */
export function aptoAccesibilidad(restaurante, accesibilidad) {
  const a = normalizarAccesibilidad(accesibilidad);
  if (!a.sillaRuedas && !a.tea) return true;
  if (a.sillaRuedas && restaurante.accesoDiscapacidad !== true) return false;
  if (a.tea && restaurante.entornoTranquilo !== true) return false;
  return true;
}

/** Normaliza cualquier forma vieja (incluido el antiguo `soloVegano`). */
export function normalizarDieta(d) {
  const keys = new Set(ALERGENOS.map((a) => a.key));
  const alergias = [...new Set((Array.isArray(d?.alergias) ? d.alergias : []).filter((a) => keys.has(a)))];
  return {
    vegano: Boolean(d?.vegano || d?.soloVegano),
    vegetariano: Boolean(d?.vegetariano),
    sinGluten: Boolean(d?.sinGluten),
    alergias,
  };
}

/** ¿Hay alguna preferencia activa? */
export function dietaActiva(d) {
  const n = normalizarDieta(d);
  return n.vegano || n.vegetariano || n.sinGluten || n.alergias.length > 0;
}

// Palabras de ingredientes (minúsculas, sin tildes) para derivar flags del plato.
// Conservador a propósito: ante la duda se marca (mejor ocultar que arriesgar).
const CARNE = ['jamon', 'pollo', 'ternera', 'cerdo', 'pato', 'cordero', 'conejo', 'pavo', 'buey', 'entrecot', 'chuleton', 'solomillo', 'secreto', 'morcilla', 'chorizo', 'salchicha', 'frankfurt', 'salami', 'panceta', 'lomo', 'costilla', 'costillas', 'entrana', 'vacio', 'milanesa', 'escalope', 'codillo', 'butifarra', 'longaniza', 'cochinillo', 'lechazo', 'cabrito', 'pastor', 'carnitas', 'cochinita', 'asada'];
const PESCADO = ['atun', 'salmon', 'bacalao', 'merluza', 'lubina', 'dorada', 'trucha', 'rodaballo', 'rape', 'bonito', 'sardina', 'anchoa', 'lenguado', 'gallo', 'pez', 'pescado', 'ceviche', 'sashimi', 'nigiri', 'maki', 'chirashi', 'zarzuela'];
const MARISCO = ['gamba', 'gambon', 'langostino', 'mejillon', 'almeja', 'bogavante', 'ostra', 'percebe', 'percebes', 'calamar', 'pulpo', 'sepia', 'chipiron', 'berberecho', 'cigala', 'necora', 'vieira', 'zamburina', 'navaja', 'marisco', 'zarzuela'];
const LACTEOS = ['queso', 'leche', 'nata', 'mantequilla', 'manteca', 'yogur', 'yogourt', 'crema', 'bechamel', 'helado', 'batido', 'carbonara', 'tiramisu', 'mascarpone', 'panna', 'lasana', 'risotto', 'pizza', 'parmesano', 'flan', 'natilla', 'brownie', 'coulant', 'pastel', 'tarta'];
const HUEVO = ['huevo', 'tortilla', 'mayonesa', 'alioli', 'flan', 'natilla', 'rebozado', 'empanada', 'pisco', 'carbonara', 'tiramisu', 'brownie', 'coulant', 'pastel', 'tarta', 'crep', 'tempura'];
const GLUTEN = ['pan', 'harina', 'pasta', 'pizza', 'empanada', 'croqueta', 'rebozado', 'tempura', 'frito', 'frita', 'bunuelo', 'crep', 'galleta', 'tarta', 'pastel', 'bizcocho', 'bocadillo', 'bocatta', 'hamburguesa', 'canelon', 'lasana', 'fideua', 'fideos', 'tallarines', 'noodles', 'ramen', 'naan', 'focaccia', 'calzone', 'bruschetta', 'gyoza', 'dim sum', 'cuscus', 'seitan'];
const FRUTOS = ['pesto', 'turron', 'romesco', 'praline', 'nuez', 'nueces', 'almendra', 'avellana', 'pistacho', 'anacardo', 'pinon', 'cacahuete', 'frutos secos'];
const SOJA = ['soja', 'tofu', 'edamame', 'miso', 'tamari', 'teriyaki'];
// Platos ambiguos donde el nombre no basta: se asume la versión típica.
const OVERRIDES_PLATO = {
  paella: { vegano: false, vegetariano: false, alergenos: ['marisco'] },
  cesar: { vegano: false, vegetariano: false, alergenos: ['huevo', 'lactosa', 'pescado'] },
  'tres delicias': { vegano: false, vegetariano: false, alergenos: ['huevo'] },
};

function normalizarPlato(nombre) {
  return (nombre || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Flags de un plato a partir de su nombre (heurística conservadora).
 * @returns {{ vegano:boolean, vegetariano:boolean, sinGluten:boolean, alergenos:string[] }}
 */
export function flagsPlato(nombre) {
  const t = normalizarPlato(nombre);
  const tiene = (lista) => lista.some((k) => t.includes(k));
  const esCarnePescado = tiene(CARNE) || tiene(PESCADO) || tiene(MARISCO);
  const flags = {
    vegano: !esCarnePescado && !tiene(LACTEOS) && !tiene(HUEVO),
    vegetariano: !esCarnePescado,
    sinGluten: !tiene(GLUTEN),
    alergenos: [
      ...(tiene(GLUTEN) ? ['gluten'] : []),
      ...(tiene(LACTEOS) ? ['lactosa'] : []),
      ...(tiene(HUEVO) ? ['huevo'] : []),
      ...(tiene(FRUTOS) ? ['frutos_secos'] : []),
      ...(tiene(MARISCO) ? ['marisco'] : []),
      ...(tiene(PESCADO) ? ['pescado'] : []),
      ...(tiene(SOJA) ? ['soja'] : []),
    ],
  };
  for (const [clave, over] of Object.entries(OVERRIDES_PLATO)) {
    if (t.includes(clave)) {
      flags.vegano = over.vegano;
      flags.vegetariano = over.vegetariano;
      flags.alergenos = [...new Set([...flags.alergenos, ...over.alergenos])];
    }
  }
  return flags;
}

/** ¿Este plato le vale a esta dieta (normalizada o no)? */
export function platoApto(dieta, plato) {
  const d = normalizarDieta(dieta);
  const f = plato.vegano !== undefined ? plato : flagsPlato(plato.nombre);
  return (
    (!d.vegano || f.vegano) &&
    (!d.vegetariano || f.vegetariano) &&
    (!d.sinGluten || f.sinGluten) &&
    d.alergias.every((a) => !f.alergenos.includes(a))
  );
}

const DESCRIPCIONES_PLATO = [
  'Receta de la casa con producto fresco.',
  'Elaborado al momento, de los más pedidos.',
  'Clásico de la casa, para compartir o no.',
];
const CANTIDADES_PLATO = ['Ración', 'Media ración', '350 g', '250 g', '8 piezas', '6 piezas', 'Para compartir'];

/**
 * Carta libro del local: misma base que la carta plana (coherentes) con
 * descripción, cantidad y flags, en secciones Entrantes/Principales/Postres.
 * Determinista por id. Si no hay postre detectado, se añade el de la casa.
 */
export function cartaLibro(restaurante) {
  const base = cartaDelLocal(restaurante).map((p) => {
    const h = hashTexto(`${restaurante.id}:${p.nombre}`);
    return {
      ...p,
      descripcion: DESCRIPCIONES_PLATO[h % DESCRIPCIONES_PLATO.length],
      cantidad: CANTIDADES_PLATO[h % CANTIDADES_PLATO.length],
      ...flagsPlato(p.nombre),
    };
  });
  const sinTildes = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const esPostre = (p) => /(dulce|tarta|helado|flan|chocolate|tiramis|panna|coulant|brownie|pastel|strudel|natilla|crema catalana|sorbete|mousse|postre|nutella|mel i mato|yogur)/.test(sinTildes(p.nombre));
  const postres = base.filter(esPostre);
  const resto = base.filter((p) => !esPostre(p));
  const corte = Math.max(1, Math.min(3, resto.length - 1));
  const secciones = [
    { titulo: 'Entrantes', platos: resto.slice(0, corte) },
    { titulo: 'Principales', platos: resto.slice(corte) },
    {
      titulo: 'Postres',
      platos:
        postres.length > 0
          ? postres
          : [{ nombre: 'Postre de la casa', precio: 6, descripcion: 'La sugerencia dulce del día.', cantidad: 'Individual', ...flagsPlato('Postre de la casa') }],
    },
  ];
  return { secciones: secciones.filter((s) => s.platos.length > 0) };
}

/** Nº de platos de la carta aptos para una dieta. */
export function aptosEnCarta(restaurante, dieta) {
  if (!dietaActiva(dieta)) return null;
  let n = 0;
  for (const s of cartaLibro(restaurante).secciones) {
    for (const p of s.platos) if (platoApto(dieta, p)) n++;
  }
  return n;
}

/**
 * Familias de cocina ('Sushi Bars' y 'Japanese' son lo mismo).
 * Devuelve el nombre en español o el texto limpio si no encaja.
 */
const FAMILIAS_COCINA = [
  ['japonesa', ['sushi', 'japon', 'japanese', 'ramen', 'nikkei']],
  ['española', ['tapas', 'spanish', 'espa', 'mediterr', 'catalan', 'paella', 'arros', 'vasca', 'gallega', 'asturiana']],
  ['italiana', ['italian', 'pizza', 'pasta', 'tagliatella', 'trattoria']],
  ['mexicana', ['mexican', 'taco', 'tex-mex', 'texmex']],
  ['china', ['chinese', 'china', 'wok', 'canton', 'asian', 'oriental', 'asiatico']],
  ['tailandesa', ['thai', 'vietnam']],
  ['india', ['indian', 'india', 'curry']],
  ['americana', ['burger', 'hamburg', 'mcdonald', 'american', 'diner', 'sandwich', 'bocatta']],
  ['marisco', ['seafood', 'marisc', 'pescad', 'marisqueria']],
  ['brasa', ['steak', 'grill', 'parrilla', 'asador', 'braseria', 'brass', 'barbecue', 'argentin', 'churrasco']],
  ['francesa', ['french', 'franc']],
  ['griega', ['greek', 'grieg']],
  ['turca', ['kebab', 'turk', 'leban', 'arab']],
  ['dulce', ['dessert', 'postre', 'helad', 'pastel', 'chocolate', 'crep', 'bakery']],
  ['desayuno', ['breakfast', 'brunch', 'caf']],
  ['vinos', ['wine', 'vino', 'taberna', 'bodega', 'celler']],
];

export function familiaCocina(cocina) {
  const t = (cocina || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const [familia, claves] of FAMILIAS_COCINA) {
    if (claves.some((k) => t.includes(k))) return familia;
  }
  return t.replace(/\s*bars?$/i, '').trim() || 'la carta';
}

/**
 * Recomendaciones según tus likes: SOLO misma FAMILIA de cocina que tus
 * favoritos (Sushi Bars y Japanese cuentan igual). La zona y la nota solo
 * ordenan. Sin coincidencia no hay recomendación.
 * Solo con lo ya cargado (0 lecturas). Excluye tus favoritos.
 * El motivo siempre habla de COMIDA, nunca de ciudad ni de nota.
 * @returns {{ restaurante, puntos:number, motivo:string }[]}
 */
export function recomendarPara(favoritos, todos, limite = 6) {
  const favs = (favoritos || []).filter(Boolean);
  if (!favs.length) return [];
  const idsFav = new Set(favs.map((f) => String(f.id ?? f)));
  const familiasFav = new Set(favs.map((f) => familiaCocina(f.cocina)).filter((f) => f && f !== 'la carta'));
  if (!familiasFav.size) return [];
  const zonasFav = new Set(favs.map((f) => f.zona || f.ciudad).filter(Boolean));
  return (todos || [])
    .filter((t) => t && !idsFav.has(String(t.id)) && familiasFav.has(familiaCocina(t.cocina)))
    .map((t) => {
      let puntos = 2;
      const zonaT = t.zona || t.ciudad;
      if (zonaT && zonasFav.has(zonaT)) {
        puntos += 1;
      }
      puntos += (Number(t.valoracion) || 0) / 5;
      return { restaurante: t, puntos, motivo: `Porque te gusta la cocina ${familiaCocina(t.cocina)}.` };
    })
    .sort(
      (a, b) =>
        b.puntos - a.puntos || (b.restaurante.valoracion || 0) - (a.restaurante.valoracion || 0),
    )
    .slice(0, Math.max(0, limite));
}

/**
 * Resumen comparativo de un restaurante (puro, para el comparador).
 * Sin lecturas: todo sale del doc ya cargado + carta determinista.
 */
export function resumenRestaurante(restaurante, dieta = null) {
  const libro = cartaLibro(restaurante);
  const platos = libro.secciones.flatMap((s) => s.platos);
  const porPrecio = [...platos].sort((a, b) => a.precio - b.precio);
  const notaYelp = typeof restaurante.valoracion === 'number' ? restaurante.valoracion : 0;
  const notaMira = mediaResenas(restaurante) ?? 0;
  return {
    id: restaurante.id,
    nombre: restaurante.nombre,
    imagen: restaurante.imagen,
    cocina: restaurante.cocina,
    notaYelp,
    totalYelp: restaurante.totalResenasYelp ?? 0,
    notaMira,
    mejorNota: Math.max(notaYelp, notaMira),
    precio: restaurante.precio,
    distanciaKm: restaurante.distanciaKm ?? null,
    ciudad: restaurante.ciudad || '',
    aptos: aptosEnCarta(restaurante, dieta),
    secciones: libro.secciones.length,
    platos: platos.length,
    barato: porPrecio[0] ?? null,
    caro: porPrecio.length ? porPrecio[porPrecio.length - 1] : null,
  };
}

/** Tema visual del libro según cocina (fondo/tinta/acento). */
export function temaCarta(cocina) {  const t = (cocina || '').toLowerCase();
  if (/japon|sushi/.test(t)) return { nombre: 'Japón', fondo: '#f7f7f4', tinta: '#1a1a1a', acento: '#b03a2e' };
  if (/italian|pizza|pasta/.test(t)) return { nombre: 'Italia', fondo: '#faf4e8', tinta: '#4a2323', acento: '#b03a2e' };
  if (/mexican|taco/.test(t)) return { nombre: 'México', fondo: '#fff6ea', tinta: '#6b2d0c', acento: '#d35400' };
  if (/mediterr|espa|catalan|tapas|paella/.test(t)) return { nombre: 'Mediterráneo', fondo: '#f0f6fb', tinta: '#1f3a5f', acento: '#2e86c1' };
  if (/vegan|veggie|vegeta/.test(t)) return { nombre: 'Verde', fondo: '#eff7ee', tinta: '#1e4620', acento: '#2e7d32' };
  if (/frances|franc/.test(t)) return { nombre: 'París', fondo: '#f4f1fa', tinta: '#2c2340', acento: '#6c3483' };
  return { nombre: 'Casa', fondo: '#f6f2ea', tinta: '#1b1e18', acento: '#b97a1a' };
}

/** Alergias que el usuario puede marcar en su perfil. */
export const ALERGIAS = ['Gluten', 'Frutos secos', 'Lactosa', 'Huevo', 'Marisco', 'Soja', 'Mostaza', 'Sésamo'];

/**
 * ¿El local encaja con dieta vegana? (por categorías Yelp).
 * Pragmático: vegano/vegetariano explícito. Sin datos de platos no se puede hilar más fino.
 */
export function esVegano(restaurante) {
  const texto = ((restaurante.categorias || []).join(' ') + ' ' + (restaurante.cocina || '')).toLowerCase();
  return /(vegan|veggie|vegeta)/.test(texto);
}

// Platos por cocina para la carta determinista (nombres en español).
const CARTA_POR_COCINA = [
  { match: ['sushi', 'japon', 'japanese'], platos: ['Nigiri de salmón', 'Ramen', 'Chirashi', 'Gyoza', 'Maki de atún', 'Tempura', 'Sashimi variado', 'Misoshiru'] },
  { match: ['pizzeria', 'pizza'], platos: ['Pizza margarita', 'Pizza cuatro quesos', 'Calzone', 'Bruschetta', 'Focaccia'] },
  { match: ['crep'], platos: ['Crep de jamón y queso', 'Crep de setas', 'Crep de Nutella', 'Galleta bretona'] },
  { match: ['italian', 'pasta', 'tagliatella', 'trattoria'], platos: ['Carbonara', 'Lasaña', 'Risotto de setas', 'Tiramisú', 'Panna cotta', 'Ossobuco'] },
  { match: ['tapas', 'spanish', 'espa', 'mediterr', 'catalan', 'paella', 'arros'], platos: ['Paella', 'Jamón ibérico', 'Bravas', 'Pulpo a la gallega', 'Tortilla', 'Calçots', 'Gazpacho', 'Crema catalana'] },
  { match: ['frankfurt', 'german', 'deutsch', 'wurst'], platos: ['Salchicha alemana', 'Codillo', 'Ensalada de patata', 'Strudel'] },
  { match: ['argentine', 'argentin', 'milonga'], platos: ['Entrana', 'Vacío', 'Empanadas', 'Flan con dulce de leche'] },
  { match: ['peruvian', 'peru', 'ceviche'], platos: ['Ceviche', 'Lomo saltado', 'Causa limeña', 'Pisco sour'] },
  { match: ['mexican', 'taco'], platos: ['Tacos al pastor', 'Burrito', 'Quesadillas', 'Guacamole', 'Enchiladas', 'Nachos'] },
  { match: ['oriental', 'asiatico', 'asia', 'chinese', 'china', 'wok', 'canton'], platos: ['Pato laqueado', 'Dim sum', 'Arroz tres delicias', 'Tallarines', 'Rollitos'] },
  { match: ['thai', 'vietnam'], platos: ['Pad thai', 'Curry verde', 'Tom yum', 'Rollitos vietnamitas'] },
  { match: ['indian', 'india', 'curry'], platos: ['Pollo tikka masala', 'Curry de cordero', 'Naan', 'Biryani', 'Samosas'] },
  { match: ['mcdonald', 'fast food', 'american', 'diner', 'bocatta', 'sandwich', 'viena'], platos: ['Bocadillo completo', 'Hamburguesa clásica', 'Patatas', 'Nuggets', 'Ensalada César'] },
  { match: ['burger', 'hamburg'], platos: ['Hamburguesa doble', 'Cheeseburger', 'Patatas trufadas', 'Aros de cebolla'] },
  { match: ['marisqueria', 'seafood', 'marisc', 'pescad'], platos: ['Lubina a la espalda', 'Arroz con bogavante', 'Mejillones', 'Gambas al ajillo', 'Zarzuela'] },
  { match: ['asador', 'braseria', 'brass', 'brasa', 'steak', 'grill', 'parrilla', 'barbecue'], platos: ['Entrecot', 'Chuletón', 'Costillas', 'Pollo a la brasa', 'Secreto', 'Steak tartar'] },
  { match: ['taberna', 'bodega', 'bodegueta', 'celler'], platos: ['Tabla de quesos', 'Vermut de grifo', 'Anchoas', 'Mejillones en escabeche'] },
  { match: ['french', 'franc'], platos: ['Confit de pato', 'Sopa de cebolla', 'Steak frites'] },
  { match: ['greek', 'grieg'], platos: ['Musaka', 'Giros', 'Ensalada griega'] },
  { match: ['kebab', 'turk', 'leban', 'arab'], platos: ['Kebab mixto', 'Falafel', 'Hummus', 'Shawarma'] },
  { match: ['dessert', 'postre', 'helad', 'pastel', 'bakery', 'cake', 'ice cream', 'dolc', 'xocolat', 'chocolate'], platos: ['Tarta de queso', 'Coulant', 'Helado artesano', 'Brownie'] },
  { match: ['breakfast', 'brunch', 'caf', 'xurreria', 'churro'], platos: ['Brunch completo', 'Huevos benedict', 'Tostada con tomate', 'Churros', 'Café de especialidad'] },
  { match: ['wine', 'vino'], platos: ['Tabla de embutidos', 'Copa de la casa', 'Vermut'] },
];
const CARTA_GENERICA = ['Plato del día', 'Menú degustación', 'Entrante de la casa', 'Ensalada verde', 'Sopa del día', 'Postre de la casa'];

/**
 * Carta determinista del local (mismo id → misma carta): 6-8 platos de su
 * cocina con precios según su tramo (€ 6-14 · €€ 10-24 · €€€ 18-38).
 * @returns {{ nombre:string, precio:number }[]}
 */
export function cartaDelLocal(restaurante) {
  const texto = (((restaurante.categorias || []).join(' ') + ' ' + (restaurante.nombre || '')))
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const grupo = CARTA_POR_COCINA.find((g) => g.match.some((m) => texto.includes(m)));
  const base = grupo ? grupo.platos : CARTA_GENERICA;
  const [min, max] = restaurante.precio === '€' ? [6, 14] : restaurante.precio === '€€€' ? [18, 38] : [10, 24];
  const h = hashTexto(restaurante.id);
  const n = Math.min(base.length, 6 + (h % 3));
  const rot = h % base.length;
  const rango = max - min + 1;
  return Array.from({ length: n }, (_, i) => ({
    nombre: base[(rot + i) % base.length],
    precio: min + ((h >>> ((i * 2 + 3) % 29)) % rango),
  }));
}

/**
 * Normaliza texto para búsqueda insensible a tildes y mayúsculas.
 * @param {string} str
 * @returns {string}
 */
export function normalizeText(str) {
  return (str ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Convierte '€€€' → 3 para poder ordenar por precio.
 * @param {string} precio
 * @returns {number}
 */
export function precioANumero(precio) {
  return (precio ?? '').length;
}

/**
 * Nota media de las reseñas sintéticas (1 decimal). Null si no hay.
 * @param {import('./restaurantModel.js').Restaurant} r
 * @returns {number|null}
 */
export function mediaResenas(r) {
  const list = r.resenas ?? [];
  if (!list.length) return null;
  const suma = list.reduce((acc, x) => acc + (Number(x.puntuacion) || 0), 0);
  return Math.round((suma / list.length) * 10) / 10;
}

/**
 * Color de acento estable por cocina (para cards dinámicas).
 * @param {string} cocina
 * @returns {string} color hex
 */
export function acentoCocina(cocina) {
  const PALETA = ['#E6A030', '#C0392B', '#2E7D5B', '#3E6B8C', '#7A4E9E', '#B0722A'];
  let h = 0;
  for (const ch of (cocina || '?').toLowerCase()) h = (h * 31 + ch.codePointAt(0)) % 997;
  return PALETA[h % PALETA.length];
}

/**
 * Distancia en km entre dos puntos (fórmula de Haversine).
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number}
 */
export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const rad = (g) => (g * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Completa un restaurante crudo (de la API o de respaldo) con distancia,
 * acento y media. Idempotente: respeta los ya calculados.
 */
export function completarRestaurante(r, posicion = null) {
  return {
    ...r,
    distanciaKm:
      r.coords && posicion
        ? haversineKm(posicion.lat, posicion.lng, r.coords.lat, r.coords.lng)
        : (r.distanciaKm ?? null),
    acento: r.acento ?? acentoCocina(r.cocina),
    media: r.media ?? mediaResenas(r),
  };
}
