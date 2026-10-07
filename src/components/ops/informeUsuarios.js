/**
 * Informe de usuarios — funciones puras (sin red, sin BD).
 *
 * Todo se calcula en el cliente sobre la lista que ya trae listarUsuarios()
 * o sobre los usuarios simulados de generarUsuariosSimulados().
 */

export const PLATAFORMAS = ['web', 'android', 'ios'];
export const TIPOS = ['cliente', 'restaurante', 'admin'];

/** Pasos del flujo operativo de un comensal, en orden. */
export const PASOS_FLUJO = [
  { id: 'registro', nombre: 'Registro' },
  { id: 'preferencias', nombre: 'Preferencias guardadas' },
  { id: 'primer_login', nombre: 'Primer login' },
  { id: 'busqueda', nombre: 'Búsqueda de restaurante' },
  { id: 'reserva', nombre: 'Reserva hecha' },
  { id: 'visita', nombre: 'Visita confirmada' },
  { id: 'puntos', nombre: 'Puntos canjeados' },
];

export const COLUMNAS = [
  { id: 'nombre', nombre: 'Nombre' },
  { id: 'email', nombre: 'Email' },
  { id: 'tipo', nombre: 'Tipo' },
  { id: 'plataforma', nombre: 'Plataforma' },
  { id: 'creado', nombre: 'Alta' },
  { id: 'ultimoLoginDate', nombre: 'Último login' },
  { id: 'saldoPuntos', nombre: 'Puntos' },
  { id: 'rachaLoginDias', nombre: 'Racha' },
  { id: 'preferencias', nombre: 'Preferencias' },
  { id: 'pasoFlujo', nombre: 'Paso del flujo' },
];

export const FILTROS_DEFECTO = { q: '', tipo: '', plataforma: '', desde: '', hasta: '' };

/** Fecha ISO (YYYY-MM-DD) de cualquier formato razonable, o ''. */
export function diaDe(v) {
  if (!v) return '';
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  if (typeof v === 'object' && typeof v._seconds === 'number') v = v._seconds * 1000;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

/** Preferencias (objeto, array o texto) a texto plano corto. */
export function textoPreferencias(p) {
  if (!p) return '';
  if (typeof p === 'string') return p;
  if (Array.isArray(p)) return p.join(', ');
  return Object.entries(p)
    .filter(([, v]) => v !== false && v != null && v !== '')
    .map(([k, v]) => (v === true ? k : `${k}: ${Array.isArray(v) ? v.join('/') : v}`))
    .join(', ');
}

export function filtrarUsuarios(lista, f = FILTROS_DEFECTO) {
  const q = (f.q || '').trim().toLowerCase();
  return lista.filter((u) => {
    if (q && ![u.nombre, u.email, u.plataforma, textoPreferencias(u.preferencias)]
      .filter(Boolean).join(' ').toLowerCase().includes(q)) return false;
    if (f.tipo && (u.tipo || 'cliente') !== f.tipo) return false;
    if (f.plataforma && (u.plataforma || '') !== f.plataforma) return false;
    const dia = diaDe(u.ultimoLoginDate);
    if (f.desde && (!dia || dia < f.desde)) return false;
    if (f.hasta && (!dia || dia > f.hasta)) return false;
    return true;
  });
}

export function ordenarUsuarios(lista, campo = 'nombre', asc = true) {
  const s = asc ? 1 : -1;
  return [...lista].sort((a, b) => {
    const va = a[campo] ?? '';
    const vb = b[campo] ?? '';
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * s;
    return String(va).localeCompare(String(vb), 'es') * s;
  });
}

function contar(lista, clave, vacio = 'desconocida') {
  const m = {};
  lista.forEach((u) => {
    const k = clave(u) || vacio;
    m[k] = (m[k] || 0) + 1;
  });
  return Object.entries(m).map(([nombre, valor]) => ({ nombre, valor })).sort((a, b) => b.valor - a.valor);
}

/** Agregados para los gráficos. */
export function agregados(lista) {
  const porSemana = {};
  lista.forEach((u) => {
    const d = diaDe(u.creado);
    if (!d) return;
    const f = new Date(`${d}T00:00:00Z`);
    f.setUTCDate(f.getUTCDate() - ((f.getUTCDay() + 6) % 7)); // lunes
    const k = f.toISOString().slice(0, 10);
    porSemana[k] = (porSemana[k] || 0) + 1;
  });
  const embudo = PASOS_FLUJO.map((p, i) => ({
    nombre: p.nombre,
    valor: lista.filter((u) => indicePaso(u) >= i).length,
  }));
  return {
    porPlataforma: contar(lista, (u) => u.plataforma),
    porTipo: contar(lista, (u) => u.tipo || 'cliente'),
    altasSemana: Object.keys(porSemana).sort().map((k) => ({ nombre: k.slice(5), valor: porSemana[k] })),
    embudo: lista.some((u) => u.pasoFlujo) ? embudo : [],
    total: lista.length,
    puntos: lista.reduce((s, u) => s + (u.saldoPuntos || 0), 0),
  };
}

function indicePaso(u) {
  return PASOS_FLUJO.findIndex((p) => p.id === u.pasoFlujo);
}

/** a***@dominio.com */
export function enmascararEmail(email) {
  const s = String(email || '');
  const at = s.indexOf('@');
  if (at < 1) return s ? '***' : '';
  return `${s[0]}***${s.slice(at)}`;
}

export function valorCelda(u, col, { enmascarar = false } = {}) {
  switch (col) {
    case 'email': return enmascarar ? enmascararEmail(u.email) : (u.email || '');
    case 'creado':
    case 'ultimoLoginDate': return diaDe(u[col]);
    case 'preferencias': return textoPreferencias(u.preferencias);
    case 'pasoFlujo': return PASOS_FLUJO.find((p) => p.id === u.pasoFlujo)?.nombre || '';
    case 'tipo': return u.tipo || 'cliente';
    default: return u[col] ?? '';
  }
}

export function csvUsuarios(lista, columnas, opts) {
  const cols = COLUMNAS.filter((c) => columnas.includes(c.id));
  return {
    cabeceras: cols.map((c) => c.nombre),
    filas: lista.map((u) => cols.map((c) => valorCelda(u, c.id, opts))),
  };
}

/* ---------- Simulación: ~100 comensales con su flujo operativo ---------- */

/** PRNG determinista (mulberry32): misma semilla → mismos usuarios. */
function prng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NOMBRES = ['Laura', 'Marc', 'Lucía', 'Pau', 'Marta', 'Jordi', 'Ana', 'Sergio', 'Núria', 'David', 'Carla', 'Àlex', 'Paula', 'Hugo', 'Elena', 'Iván', 'Sara', 'Oriol', 'Clara', 'Javier'];
const APELLIDOS = ['García', 'Puig', 'López', 'Martí', 'Fernández', 'Soler', 'Sánchez', 'Vidal', 'Romero', 'Ferrer', 'Torres', 'Serra'];
const COCINAS = ['mediterránea', 'japonesa', 'italiana', 'vegana', 'tapas', 'mexicana', 'india', 'brasa'];
const PRESUPUESTOS = ['€', '€€', '€€€'];
const ZONAS = ['Eixample', 'Gràcia', 'Born', 'Sants', 'Poblenou', 'Sarrià'];

/** Probabilidad de pasar de un paso al siguiente (registro → … → puntos). */
const CONVERSION = [1, 0.85, 0.9, 0.8, 0.6, 0.75, 0.5];

/**
 * Genera n usuarios ficticios con un flujo operativo realista:
 * registro → preferencias → primer login → búsqueda → reserva → visita → canje.
 * Cada usuario lleva `eventos` con la traza temporal de cada paso.
 */
export function generarUsuariosSimulados(n = 100, seed = 2026, hoy = new Date()) {
  const r = prng(seed);
  const elegir = (arr) => arr[Math.floor(r() * arr.length)];
  const DIA = 86400000;
  const usuarios = [];
  for (let i = 0; i < n; i++) {
    const nombre = `${elegir(NOMBRES)} ${elegir(APELLIDOS)}`;
    const plat = r() < 0.45 ? 'web' : r() < 0.6 ? 'android' : 'ios';
    const tipo = r() < 0.9 ? 'cliente' : 'restaurante';
    let t = hoy.getTime() - Math.floor(r() * 90) * DIA - Math.floor(r() * DIA);
    const eventos = [];
    let paso = 0;
    for (let k = 0; k < PASOS_FLUJO.length; k++) {
      if (k > 0 && r() > CONVERSION[k]) break;
      if (t > hoy.getTime()) break;
      eventos.push({ paso: PASOS_FLUJO[k].id, fecha: new Date(t).toISOString() });
      paso = k;
      t += Math.floor(r() * 5 * DIA) + 600000;
    }
    const llegó = (id) => eventos.some((e) => e.paso === id);
    const ultimo = eventos[eventos.length - 1].fecha;
    const slug = nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '.');
    usuarios.push({
      uid: `sim-${String(i + 1).padStart(3, '0')}`,
      nombre,
      email: `${slug}${i + 1}@ejemplo.test`,
      tipo,
      plataforma: plat,
      creado: eventos[0].fecha,
      ultimoLoginDate: llegó('primer_login') ? ultimo.slice(0, 10) : null,
      saldoPuntos: llegó('visita') ? 50 + Math.floor(r() * 400) : llegó('primer_login') ? 10 : 0,
      rachaLoginDias: llegó('primer_login') ? Math.floor(r() * 8) : 0,
      yaReclamadoHoy: false,
      preferencias: llegó('preferencias')
        ? { cocina: [elegir(COCINAS), elegir(COCINAS)].filter((v, j, a) => a.indexOf(v) === j), presupuesto: elegir(PRESUPUESTOS), zona: elegir(ZONAS) }
        : null,
      pasoFlujo: PASOS_FLUJO[paso].id,
      eventos,
      simulado: true,
    });
  }
  return usuarios;
}
