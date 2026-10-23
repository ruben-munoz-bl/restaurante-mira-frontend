/**
 * API falsa para desarrollar SIN tocar la base de datos real (cero lecturas).
 * Sirve los restaurantes de src/data/restaurants.js con la forma de mira-api.
 *
 *   npm run mock-api            # http://localhost:3001
 *   npm run dev:mock            # Vite apuntando a esta API
 */
import http from 'node:http';
import { createHash } from 'node:crypto';
import { restaurants } from '../src/data/restaurants.js';
import { cartaDelLocal } from '../src/models/restaurantModel.js';

const PORT = Number(process.env.MOCK_PORT || 3001);

// Coordenadas repartidas por Barcelona para que funcionen mapa y parkings.
const CENTRO = { lat: 41.3874, lng: 2.1686 };
const CATEGORIAS = {
  'Mediterránea': ['Mediterranean', 'Seafood', 'Tapas'],
  'Italiana': ['Italian', 'Pizza'],
  'Japonesa': ['Japanese', 'Sushi Bars'],
  'Mexicana': ['Mexican', 'Tacos'],
  'Asador': ['Steakhouses', 'Barbeque'],
  'Fusión': ['Asian Fusion', 'Cocktail Bars'],
  'Vegana': ['Vegan', 'Vegetarian', 'Brunch'],
  'Española': ['Spanish', 'Tapas Bars'],
};
const NOMBRES = ['Laura G.', 'Marc P.', 'Núria S.', 'Javier R.', 'Anna M.', 'David L.'];
const COMENTARIOS = [
  'Producto excelente y un servicio muy atento. Repetiremos seguro.',
  'Ambiente agradable, aunque tuvimos que esperar un poco la mesa.',
  'De lo mejor que hemos probado en la zona. Muy recomendable.',
  'Buena relación calidad-precio. Las raciones son generosas.',
  'El postre de la casa es espectacular.',
];

const docs = restaurants.map((r, i) => {
  const ang = (i / restaurants.length) * Math.PI * 2;
  return {
    id: String(r.id),
    nombre: r.nombre,
    categorias: CATEGORIAS[r.cocina] || [r.cocina],
    precio: r.precio,
    rating_yelp: r.valoracion,
    total_resenas_yelp: 40 + ((i * 137) % 600),
    imagen_url: r.imagen.replace(/w=\d+/, 'w=1400'),
    descripcion: r.descripcion,
    direccion_completa: `Carrer de Mallorca, ${100 + i * 17}, 08036 Barcelona`,
    ciudad: 'Barcelona',
    zona_busqueda: 'Barcelona, Spain',
    telefono: `+34 93 ${String(2000000 + i * 13579).slice(0, 3)} ${String(10 + i).padStart(2, '0')} ${String(30 + i * 3).slice(0, 2)}`,
    coordenadas: { latitud: CENTRO.lat + Math.sin(ang) * 0.018, longitud: CENTRO.lng + Math.cos(ang) * 0.024 },
    resenas: Array.from({ length: 3 + (i % 3) }, (_, k) => ({
      usuario: NOMBRES[(i + k) % NOMBRES.length],
      fecha: `2026-0${1 + ((i + k) % 9)}-1${k}`,
      comentario: COMENTARIOS[(i + k) % COMENTARIOS.length],
      puntuacion: Math.max(3, Math.min(5, Math.round(r.valoracion - (k % 2)))),
    })),
  };
});

const resenasMira = {};
// M01: cartas en memoria (restaurante 1 con carta de ejemplo) y reservas creadas.
const cartas = new Map([[docs[0]?.id || '1', { restauranteId: docs[0]?.id || '1', actualizada: new Date().toISOString(), categorias: [
  { id: 'cat_entrantes', nombre: 'Entrantes', platos: [
    { id: 'pl_croquetas', nombre: 'Croquetas de jamón', descripcion: '6 unidades', precio: 9.5, foto: null, alergenos: ['gluten', 'lactosa'], disponible: true },
    { id: 'pl_bravas', nombre: 'Patatas bravas', descripcion: '', precio: 6, foto: null, alergenos: [], disponible: true },
    { id: 'pl_agotado', nombre: 'Pulpo a la gallega', descripcion: '', precio: 18, foto: null, alergenos: [], disponible: false },
  ] },
  { id: 'cat_principales', nombre: 'Principales', platos: [
    { id: 'pl_paella', nombre: 'Paella de marisco', descripcion: 'Mínimo 2 personas', precio: 22, foto: null, alergenos: ['crustaceos'], disponible: true },
  ] },
] }]]);
// Como en producción tras M14: el resto de restaurantes con su carta simulada del frontend.
for (const d of docs) {
  if (cartas.has(d.id)) continue;
  const platos = cartaDelLocal(d).map((pl, i) => ({ id: `pl_${d.id}_${i}`, nombre: pl.nombre, descripcion: '', precio: pl.precio, foto: null, alergenos: [], disponible: true }));
  cartas.set(d.id, { restauranteId: d.id, actualizada: new Date().toISOString(), categorias: [{ id: 'cat_carta', nombre: 'Carta', platos }] });
}
const reservas = []; // creadas durante la sesión (en memoria)
const dispositivos = new Map(); // push (T04): id -> { token, tipo, plataforma, idioma }

// Campañas de ejemplo para que la landing pinte el carrusel en modo mock.
const promociones = docs.slice(0, 5).map((d, i) => ({
  id: `promo${i + 1}`,
  restauranteId: d.id,
  estado: 'activa',
  prioridad: 3 - i,
  fechaInicio: null,
  fechaFin: null,
  puntosExtraPorReserva: (i + 1) * 25,
}));

// Ofertas por geolocalización (contrato fase 1, bóveda: Proyecto/Contratos API.md).
// En memoria: se pierden al reiniciar. El mock no comprueba dueños ni sesión.
const DISTANCIAS = [1000, 500, 100, 20];
const ofertas = [{
  id: 'of1', restauranteId: '1', titulo: 'Menú de mediodía', activa: true, desde: null, hasta: null,
  niveles: [
    { distancia: 1000, texto: 'Café gratis con el menú', descuentoPct: 5 },
    { distancia: 500, texto: '10 % en la cuenta', descuentoPct: 10 },
    { distancia: 100, texto: '15 % en la cuenta', descuentoPct: 15 },
    { distancia: 20, texto: '20 % + postre gratis', descuentoPct: 20 },
  ],
  creado: '2026-10-15T09:00:00.000Z', actualizado: '2026-10-15T09:00:00.000Z',
}];

function hoy() { return new Date().toISOString().slice(0, 10); }
function vigente(o) { return o.activa && (!o.desde || o.desde <= hoy()) && (!o.hasta || o.hasta >= hoy()); }

/** Mismas reglas que el contrato; devuelve { campo: [mensajes] } o null. */
function erroresOferta(d, conRestaurante) {
  const e = {};
  const fecha = (v) => v == null || /^\d{4}-\d{2}-\d{2}$/.test(v);
  if (conRestaurante && !d.restauranteId) e.restauranteId = ['Obligatorio'];
  if (typeof d.titulo !== 'string' || !d.titulo.trim() || d.titulo.length > 80) e.titulo = ['Entre 1 y 80 caracteres'];
  if (typeof d.activa !== 'boolean') e.activa = ['Tiene que ser true o false'];
  if (!fecha(d.desde) || !fecha(d.hasta)) e.desde = ['Formato AAAA-MM-DD'];
  else if (d.desde && d.hasta && d.desde > d.hasta) e.hasta = ['No puede ser anterior a desde'];
  const n = d.niveles;
  if (!Array.isArray(n) || n.length !== 4 || n.some((x, i) => x?.distancia !== DISTANCIAS[i])) {
    e.niveles = ['Tienen que ser 4 niveles: 1000, 500, 100 y 20 m, en ese orden'];
  } else if (n.some((x) => typeof x.texto !== 'string' || !x.texto.trim() || x.texto.length > 140 || !Number.isInteger(x.descuentoPct) || x.descuentoPct < 0 || x.descuentoPct > 100)) {
    e.niveles = ['Cada nivel: texto de 1 a 140 caracteres y descuentoPct entero de 0 a 100'];
  } else if (n.some((x, i) => i > 0 && x.descuentoPct < n[i - 1].descuentoPct) || n[3].descuentoPct <= n[0].descuentoPct) {
    e.niveles = ['Cada nivel tiene que ser igual o mejor que el anterior, y el de 20 m mejor que el de 1000 m'];
  }
  return Object.keys(e).length ? e : null;
}

function distanciaM(a, b) {
  const rad = (g) => (g * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

/** Contrato fase 2 (G05): ofertas vigentes a <= 1 km con el nivel alcanzado. */
function ofertasCerca(pos) {
  return ofertas.filter(vigente).map((o) => {
    const r = docs.find((d) => d.id === o.restauranteId);
    if (!r?.coordenadas) return null;
    const coordenadas = { lat: r.coordenadas.latitud, lng: r.coordenadas.longitud };
    const d = Math.round(distanciaM(pos, coordenadas));
    const nivel = [...o.niveles].sort((x, y) => x.distancia - y.distancia).find((n) => d <= n.distancia);
    return nivel ? { restaurante: { id: r.id, nombre: r.nombre, coordenadas }, oferta: o, distanciaM: d, nivel } : null;
  }).filter(Boolean).sort((a, b) => a.distanciaM - b.distanciaM);
}

// Estadísticas (contrato fase 3, para G07): contadores por restaurante y día.
// Se generan 14 días de ejemplo para el restaurante 1 y se suman los avisos reales.
const stats = new Map();
// Visitas con QR (contrato fase 3, para G09/G10). En memoria; el QR lleva una
// firma falsa ("mock"): aquí no hay VISITAS_SECRET.
const visitas = new Map();
const QUINCE_MIN = 15 * 60 * 1000;
function visitaPublica(v) {
  const caducada = v.estado === 'pendiente' && Date.parse(v.caducaEn) <= Date.now();
  return { ...v, estado: caducada ? 'caducada' : v.estado };
}
function qrDe(v) { return `v1.${v.id}.${Date.parse(v.caducaEn)}.mock`; }

function filaStats(rid, fecha) {
  const k = `${rid}_${fecha}`;
  if (!stats.has(k)) stats.set(k, { fecha, avisos: { 1000: 0, 500: 0, 100: 0, 20: 0 }, visitas: 0, confirmadas: 0 });
  return stats.get(k);
}
for (let i = 13; i >= 0; i--) {
  const f = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
  const base = 20 + ((i * 7) % 11);
  Object.assign(filaStats('1', f), { avisos: { 1000: base * 3, 500: base * 2, 100: base, 20: Math.round(base / 2) }, visitas: Math.round(base / 3), confirmadas: Math.round(base / 4) });
}

function otraActiva(restauranteId, id) { return ofertas.some((o) => o.restauranteId === restauranteId && o.activa && o.id !== id); }

function enviar(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Idempotency-Key',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  });
  res.end(JSON.stringify(body));
}

http
  .createServer(async (req, res) => {
    if (req.method === 'OPTIONS') return enviar(res, 204, {});
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const p = url.pathname;
    let cuerpo = '';
    for await (const trozo of req) cuerpo += trozo;
    const datos = cuerpo ? JSON.parse(cuerpo) : {};
    console.log(req.method, req.url);

    if (p === '/v1/restaurants/count') return enviar(res, 200, { total: docs.length });
    if (p === '/v1/restaurants') {
      const q = (url.searchParams.get('q') || '').trim().toLowerCase();
      const items = q ? docs.filter((d) => d.nombre.toLowerCase().includes(q)) : docs;
      return enviar(res, 200, { items, cursor: null, terminado: true });
    }
    // Datos ligeros para #/mapa (mismo contrato que mira-api). Va antes de /:id.
    if (p === '/v1/restaurants/mapa') {
      const items = docs.map((d) => ({
        id: d.id,
        nombre: d.nombre,
        categorias: d.categorias,
        precio: d.precio,
        rating_yelp: d.rating_yelp,
        total_resenas_yelp: d.total_resenas_yelp,
        imagen_url: d.imagen_url,
        coordenadas: d.coordenadas,
        zona_busqueda: d.zona_busqueda,
      }));
      return enviar(res, 200, { items });
    }
    // M12: ranking de reservas de los últimos días (la landing lo pide público).
    if (p === '/v1/restaurants/mas-reservados') {
      const limite = Math.min(Number(url.searchParams.get('limit')) || 8, 50);
      const data = docs.slice(0, limite).map((d, i) => ({ id: d.id, reservas: 30 - i, nombre: d.nombre }));
      return enviar(res, 200, { data });
    }
    const porId = p.match(/^\/v1\/restaurants\/([^/]+)$/);
    if (porId) {
      const d = docs.find((x) => x.id === decodeURIComponent(porId[1]));
      return d ? enviar(res, 200, d) : enviar(res, 404, { error: 'NOT_FOUND' });
    }
    const resenas = p.match(/^\/v1\/reviews\/([^/]+)$/);
    if (resenas && req.method === 'GET') return enviar(res, 200, { data: resenasMira[resenas[1]] || [] });
    if (p === '/v1/reviews' && req.method === 'POST') {
      const lista = (resenasMira[datos.restauranteId] ||= []);
      const nueva = { id: `r${Date.now()}`, ...datos, usuarioNombre: 'Tú', likes: 0, likedBy: [], createdAt: Date.now() };
      lista.unshift(nueva);
      return enviar(res, 200, { data: nueva });
    }
    if (p === '/v1/reservations/availability') return enviar(res, 200, { limite: 20, ocupadas: 6, libres: 14 });
    // M01: carta por restaurante y pedido dentro de la reserva.
    const carta = p.match(/^\/v1\/cartas\/([^/]+)(\/editar)?$/);
    if (carta) {
      const rid = decodeURIComponent(carta[1]);
      if (req.method === 'PUT') {
        let n = 0;
        const categorias = (datos.categorias || []).map((c) => ({ ...c, id: c.id || `cat_${Date.now()}_${n++}`, platos: (c.platos || []).map((pl) => ({ ...pl, id: pl.id || `pl_${Date.now()}_${n++}` })) }));
        cartas.set(rid, { restauranteId: rid, categorias, actualizada: new Date().toISOString() });
        return enviar(res, 200, cartas.get(rid));
      }
      const c = cartas.get(rid);
      if (carta[2]) return enviar(res, 200, c || { restauranteId: rid, categorias: [], actualizada: null });
      if (!c) return enviar(res, 404, { error: 'NOT_FOUND' });
      const categorias = c.categorias.map((k) => ({ ...k, platos: k.platos.filter((pl) => pl.disponible !== false) })).filter((k) => k.platos.length);
      return categorias.length ? enviar(res, 200, { ...c, categorias }) : enviar(res, 404, { error: 'NOT_FOUND' });
    }
    if (p === '/v1/reservations' && req.method === 'POST') {
      const id = `res${reservas.length + 1}`;
      let pedido = null;
      if (datos.pedido) {
        const c = cartas.get(String(datos.restauranteId));
        if (!c) return enviar(res, 400, { error: 'SIN_CARTA' });
        const platos = c.categorias.flatMap((k) => k.platos);
        const lineas = [];
        for (const l of datos.pedido.lineas || []) {
          const pl = platos.find((x) => x.id === l.platoId && x.disponible !== false);
          if (!pl) return enviar(res, 400, { error: 'PLATO_NO_DISPONIBLE', platoId: l.platoId });
          lineas.push({ platoId: pl.id, nombre: pl.nombre, precio: pl.precio, cantidad: l.cantidad, subtotal: Math.round(pl.precio * l.cantidad * 100) / 100 });
        }
        pedido = { lineas, total: Math.round(lineas.reduce((t, l) => t + l.subtotal, 0) * 100) / 100, moneda: 'EUR', creadoEn: new Date().toISOString() };
      }
      const nueva = { id, codigo: 'MIRA-' + Math.random().toString(36).slice(2, 7).toUpperCase(), estado: 'confirmada', ...datos, pedido, presentadaEn: null, qr: `r1.${id}.mock` };
      reservas.push(nueva);
      return enviar(res, 201, nueva);
    }
    if (p === '/v1/reservations' && req.method === 'GET') return enviar(res, 200, { data: reservas });
    // Push (contrato T04): sin Bearer → 401; el id es SHA-256 de `tipo:token`.
    if (p.startsWith('/v1/push/tokens')) {
      if (!req.headers.authorization) return enviar(res, 401, { error: 'MISSING_TOKEN', message: 'Falta el Bearer' });
      if (p === '/v1/push/tokens' && req.method === 'POST') {
        const { token, tipo, plataforma, idioma } = datos;
        const details = {};
        if (typeof token !== 'string' || !token || /\s/.test(token) || token.length > 4096) details.token = ['Token no válido'];
        else if (tipo === 'expo' && !/^Expo(nent)?PushToken\[.+\]$/.test(token)) details.token = ['Formato ExpoPushToken[...]'];
        if (!['expo', 'web'].includes(tipo)) details.tipo = ['expo o web'];
        if (!['android', 'ios', 'web'].includes(plataforma)) details.plataforma = ['android, ios o web'];
        if (!['es', 'ca', 'en'].includes(idioma)) details.idioma = ['es, ca o en'];
        if (Object.keys(datos).some((k) => !['token', 'tipo', 'plataforma', 'idioma'].includes(k))) details._ = ['Campos no admitidos'];
        if (Object.keys(details).length) return enviar(res, 400, { error: 'VALIDATION_ERROR', details });
        const id = createHash('sha256').update(`${tipo}:${token}`).digest('hex');
        dispositivos.set(id, { token, tipo, plataforma, idioma });
        console.log(`  push: ${dispositivos.size} dispositivo(s) registrados`);
        return enviar(res, 200, { id, tipo, plataforma, idioma });
      }
      const borrar = p.match(/^\/v1\/push\/tokens\/([^/]+)$/);
      if (borrar && req.method === 'DELETE') {
        if (!/^[0-9a-f]{64}$/.test(borrar[1])) return enviar(res, 400, { error: 'VALIDATION_ERROR', details: { id: ['64 hex'] } });
        dispositivos.delete(borrar[1]);
        res.writeHead(204, { 'Access-Control-Allow-Origin': '*' });
        return res.end();
      }
    }
    if (p.startsWith('/v1/promotions')) {
      const estado = url.searchParams.get('estado');
      return enviar(res, 200, { data: estado ? promociones.filter((x) => x.estado === estado) : promociones });
    }
    // Agente MIRA: el contrato real vive en mira-api; aquí basta una respuesta fija
    // para que la UI del chat no rompa al pulsar una sugerencia.
    if (p === '/v1/ai/agent' && req.method === 'POST') {
      const mensaje = String(datos.message || '').slice(0, 200);
      return enviar(res, 200, {
        reply: `Soy MIRA en modo mock. He recibido: "${mensaje}".`,
        actions: [],
        needsConfirm: false,
        provider: 'mock',
        model: 'mock',
      });
    }
    if (p === '/v1/ofertas/cerca' && req.method === 'GET') {
      const lat = Number(url.searchParams.get('lat'));
      const lng = Number(url.searchParams.get('lng'));
      if (!url.searchParams.get('lat') || !url.searchParams.get('lng') || !(Math.abs(lat) <= 90) || !(Math.abs(lng) <= 180)) {
        return enviar(res, 400, { error: 'VALIDATION_ERROR', details: { lat: ['Entre -90 y 90'], lng: ['Entre -180 y 180'] } });
      }
      return enviar(res, 200, { data: ofertasCerca({ lat, lng }) });
    }
    if (p === '/v1/ofertas/estadisticas' && req.method === 'GET') {
      const rid = url.searchParams.get('restauranteId'); const desde = url.searchParams.get('desde'); const hasta = url.searchParams.get('hasta');
      if (!rid || !/^\d{4}-\d{2}-\d{2}$/.test(desde || '') || !/^\d{4}-\d{2}-\d{2}$/.test(hasta || '') || desde > hasta) {
        return enviar(res, 400, { error: 'VALIDATION_ERROR', details: { hasta: ['restauranteId, desde y hasta (AAAA-MM-DD, desde <= hasta)'] } });
      }
      const data = [...stats.entries()].filter(([k, v]) => k.startsWith(`${rid}_`) && v.fecha >= desde && v.fecha <= hasta).map(([, v]) => v).sort((a, b) => a.fecha.localeCompare(b.fecha));
      return enviar(res, 200, { data });
    }
    if (p === '/v1/visitas' && req.method === 'POST') {
      if (!req.headers.authorization) return enviar(res, 401, { error: 'MISSING_TOKEN', message: 'Falta el Bearer' });
      const { restauranteId, lat, lng } = datos;
      if (!restauranteId || !(Math.abs(lat) <= 90) || !(Math.abs(lng) <= 180)) {
        return enviar(res, 400, { error: 'VALIDATION_ERROR', details: { restauranteId: ['Obligatorio'], lat: ['-90 a 90'], lng: ['-180 a 180'] } });
      }
      const r = docs.find((d) => d.id === String(restauranteId));
      const o = ofertas.find((x) => x.restauranteId === String(restauranteId) && vigente(x));
      if (!r?.coordenadas || !o) return enviar(res, 404, { error: 'NOT_FOUND' });
      const d = Math.round(distanciaM({ lat, lng }, { lat: r.coordenadas.latitud, lng: r.coordenadas.longitud }));
      if (d > 50) return enviar(res, 422, { error: 'LEJOS', distanciaM: d });
      // Una pendiente por cliente y restaurante: se reemite sin renovar los 15 min.
      const previa = [...visitas.values()].find((v) => v.restauranteId === r.id && visitaPublica(v).estado === 'pendiente');
      const v = previa || {
        id: `vis${Date.now()}`, restauranteId: r.id, ofertaId: o.id,
        nivel: [...o.niveles].sort((a, b) => a.distancia - b.distancia)[0],
        estado: 'pendiente', creada: new Date().toISOString(),
        caducaEn: new Date(Date.now() + QUINCE_MIN).toISOString(), confirmadaEn: null, comisionPct: null,
      };
      if (!previa) { visitas.set(v.id, v); filaStats(r.id, hoy()).visitas += 1; }
      return enviar(res, 201, { visita: visitaPublica(v), qr: qrDe(v) });
    }
    if (p === '/v1/visitas/validar' && req.method === 'POST') {
      const m = /^v1\.([^.]+)\.(\d+)\.(.+)$/.exec(String(datos.qr || ''));
      if (!m) return enviar(res, 400, { error: 'QR_INVALIDO' });
      const v = visitas.get(m[1]);
      if (Number(m[2]) <= Date.now()) return enviar(res, 410, { error: 'QR_CADUCADO' });
      if (!v) return enviar(res, 404, { error: 'NOT_FOUND' });
      if (v.estado !== 'pendiente') return enviar(res, 409, { error: 'QR_USADO' });
      Object.assign(v, { estado: 'confirmada', confirmadaEn: new Date().toISOString(), comisionPct: 8 });
      filaStats(v.restauranteId, hoy()).confirmadas += 1;
      return enviar(res, 200, { visita: visitaPublica(v), aplicar: { texto: v.nivel.texto, descuentoPct: v.nivel.descuentoPct }, cliente: { nombre: 'Cliente de prueba' } });
    }
    if (p === '/v1/visitas/restaurante' && req.method === 'GET') {
      const rid = url.searchParams.get('restauranteId');
      if (!rid) return enviar(res, 400, { error: 'VALIDATION_ERROR', details: { restauranteId: ['Obligatorio'] } });
      const lista = [...visitas.values()].filter((v) => v.restauranteId === rid).reverse();
      return enviar(res, 200, { data: lista.map((v) => ({ ...visitaPublica(v), cliente: { nombre: 'Cliente de prueba' } })) });
    }
    const unaVisita = p.match(/^\/v1\/visitas\/([^/]+)$/);
    if (unaVisita && req.method === 'GET') {
      if (!req.headers.authorization) return enviar(res, 401, { error: 'MISSING_TOKEN', message: 'Falta el Bearer' });
      const v = visitas.get(decodeURIComponent(unaVisita[1]));
      return v ? enviar(res, 200, visitaPublica(v)) : enviar(res, 404, { error: 'NOT_FOUND' });
    }
    const aviso = p.match(/^\/v1\/ofertas\/([^/]+)\/avisos$/);
    if (aviso && req.method === 'POST') {
      const o = ofertas.find((x) => x.id === decodeURIComponent(aviso[1]));
      if (![1000, 500, 100, 20].includes(datos.nivel)) return enviar(res, 400, { error: 'VALIDATION_ERROR', details: { nivel: ['1000, 500, 100 o 20'] } });
      if (!o || !vigente(o)) return enviar(res, 404, { error: 'NOT_FOUND' });
      filaStats(o.restauranteId, hoy()).avisos[datos.nivel] += 1;
      res.writeHead(204, { 'Access-Control-Allow-Origin': '*' }); return res.end();
    }
    if (p === '/v1/ofertas' || p === '/v1/ofertas/mias') {
      const rid = url.searchParams.get('restauranteId');
      if (req.method === 'GET') {
        if (!rid) return enviar(res, 400, { error: 'VALIDATION_ERROR', details: { restauranteId: ['Obligatorio'] } });
        const delRest = ofertas.filter((o) => o.restauranteId === rid);
        return enviar(res, 200, { data: p === '/v1/ofertas' ? delRest.filter(vigente) : [...delRest].reverse() });
      }
      if (req.method === 'POST' && p === '/v1/ofertas') {
        const errores = erroresOferta(datos, true);
        if (errores) return enviar(res, 400, { error: 'VALIDATION_ERROR', details: errores });
        if (datos.activa && otraActiva(String(datos.restauranteId))) return enviar(res, 409, { error: 'CONFLICT', message: 'Ya hay otra oferta activa en este restaurante' });
        const ahora = new Date().toISOString();
        const nueva = { id: `of${Date.now()}`, restauranteId: String(datos.restauranteId), titulo: datos.titulo.trim(), activa: datos.activa, desde: datos.desde ?? null, hasta: datos.hasta ?? null, niveles: datos.niveles, creado: ahora, actualizado: ahora };
        ofertas.push(nueva);
        return enviar(res, 201, nueva);
      }
    }
    const ofertaId = p.match(/^\/v1\/ofertas\/([^/]+)$/);
    if (ofertaId && ofertaId[1] !== 'mias' && ofertaId[1] !== 'cerca') {
      const i = ofertas.findIndex((o) => o.id === decodeURIComponent(ofertaId[1]));
      if (i === -1) return enviar(res, 404, { error: 'NOT_FOUND' });
      if (req.method === 'DELETE') { ofertas.splice(i, 1); res.writeHead(204, { 'Access-Control-Allow-Origin': '*' }); return res.end(); }
      if (req.method === 'PUT') {
        const errores = erroresOferta(datos, false);
        if (errores) return enviar(res, 400, { error: 'VALIDATION_ERROR', details: errores });
        if (datos.activa && otraActiva(ofertas[i].restauranteId, ofertas[i].id)) return enviar(res, 409, { error: 'CONFLICT', message: 'Ya hay otra oferta activa en este restaurante' });
        ofertas[i] = { ...ofertas[i], titulo: datos.titulo.trim(), activa: datos.activa, desde: datos.desde ?? null, hasta: datos.hasta ?? null, niveles: datos.niveles, actualizado: new Date().toISOString() };
        return enviar(res, 200, ofertas[i]);
      }
    }
    // Panel del restaurante: un local fuera del catálogo y sin carta, para probar el paso de carta (M09).
    if (p === '/v1/dashboard/my-restaurant') return enviar(res, 200, { restaurante: { ...docs[1], id: 'demo-panel' }, stats: {}, proximasReservas: [], reservasHoy: [], ticketsRecientes: [], ingresosPorMes: [] });
    if (p.startsWith('/v1/points/balance')) return enviar(res, 200, { saldoActual: 0, rachaLogin: { dias: 0, yaReclamado: true } });
    return enviar(res, 200, { data: [], items: [] });
  })
  .listen(PORT, () => console.log(`Mock API (sin base de datos) en http://localhost:${PORT}`));
