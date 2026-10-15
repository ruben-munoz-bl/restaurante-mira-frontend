/**
 * API falsa para desarrollar SIN tocar la base de datos real (cero lecturas).
 * Sirve los restaurantes de src/data/restaurants.js con la forma de mira-api.
 *
 *   npm run mock-api            # http://localhost:3001
 *   npm run dev:mock            # Vite apuntando a esta API
 */
import http from 'node:http';
import { restaurants } from '../src/data/restaurants.js';

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

const resenasMira = {}; // creadas durante la sesión (en memoria)

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
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
    if (p === '/v1/restaurants') return enviar(res, 200, { items: docs, cursor: null, terminado: true });
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
    if (p === '/v1/reservations' && req.method === 'POST') {
      return enviar(res, 200, { data: { id: 'res1', codigo: 'MIRA-' + Math.random().toString(36).slice(2, 7).toUpperCase(), ...datos } });
    }
    if (p.startsWith('/v1/promotions')) return enviar(res, 200, { data: [] });
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
    if (p.startsWith('/v1/points/balance')) return enviar(res, 200, { saldoActual: 0, rachaLogin: { dias: 0, yaReclamado: true } });
    return enviar(res, 200, { data: [], items: [] });
  })
  .listen(PORT, () => console.log(`Mock API (sin base de datos) en http://localhost:${PORT}`));
