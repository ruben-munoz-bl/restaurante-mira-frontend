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
    if (p.startsWith('/v1/points/balance')) return enviar(res, 200, { saldoActual: 0, rachaLogin: { dias: 0, yaReclamado: true } });
    return enviar(res, 200, { data: [], items: [] });
  })
  .listen(PORT, () => console.log(`Mock API (sin base de datos) en http://localhost:${PORT}`));
