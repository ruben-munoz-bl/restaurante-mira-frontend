/**
 * Editor de carta (M09): límites del contrato M01 y validación pura en cliente.
 * El servidor vuelve a validar (400 VALIDATION_ERROR); esto solo avisa antes.
 */
import { ALERGENOS } from './restaurantModel.js';

export const LIMITES = {
  categorias: 30, nombreCategoria: 60, platosPorCategoria: 60, platosTotal: 300,
  nombrePlato: 80, descripcion: 300, precioMin: 0.01, precioMax: 999.99,
};

const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;
const CLAVES_ALERGENO = new Set(ALERGENOS.map((a) => a.key));

// _k: clave local estable para React (paraGuardar no la envía).
let sig = 0;
export const categoriaVacia = () => ({ _k: `n${++sig}`, nombre: '', platos: [] });
export const platoVacio = () => ({ _k: `n${++sig}`, nombre: '', descripcion: '', precio: '', foto: '', alergenos: [], disponible: true });

/** Precio del formulario ("12,5", 12.5…) → número, o NaN. */
export function precioNum(v) {
  const s = String(v ?? '').trim().replace(',', '.');
  return /^\d+(\.\d{1,2})?$/.test(s) ? Number(s) : NaN;
}

/** Mueve el elemento i a i+d; devuelve copia (o la misma lista si se sale). */
export function mover(lista, i, d) {
  const j = i + d;
  if (j < 0 || j >= lista.length) return lista;
  const copia = [...lista];
  [copia[i], copia[j]] = [copia[j], copia[i]];
  return copia;
}

function urlHttps(s) {
  try { return new URL(s).protocol === 'https:'; } catch { return false; }
}

/**
 * Valida la carta del formulario. Devuelve { ruta: clave } (vacío = válida).
 * Rutas: "carta", "c0.nombre", "c0.platos", "c0.p1.precio"…; claves: cartaEditor.err*.
 */
export function validarCarta(categorias) {
  const e = {};
  const cats = categorias || [];
  if (cats.length < 1) e.carta = 'errSinCategorias';
  else if (cats.length > LIMITES.categorias) e.carta = 'errMaxCategorias';
  const total = cats.reduce((s, c) => s + (c.platos?.length || 0), 0);
  if (total > LIMITES.platosTotal) e.carta = 'errMaxPlatosTotal';
  cats.forEach((c, i) => {
    const n = String(c.nombre || '').trim();
    if (!n || n.length > LIMITES.nombreCategoria) e[`c${i}.nombre`] = 'errNombreCategoria';
    if ((c.platos?.length || 0) > LIMITES.platosPorCategoria) e[`c${i}.platos`] = 'errMaxPlatos';
    (c.platos || []).forEach((p, k) => {
      const r = `c${i}.p${k}`;
      const np = String(p.nombre || '').trim();
      if (!np || np.length > LIMITES.nombrePlato) e[`${r}.nombre`] = 'errNombrePlato';
      if (String(p.descripcion || '').trim().length > LIMITES.descripcion) e[`${r}.descripcion`] = 'errDescripcion';
      const precio = precioNum(p.precio);
      if (!(precio >= LIMITES.precioMin && precio <= LIMITES.precioMax)) e[`${r}.precio`] = 'errPrecio';
      const foto = String(p.foto || '').trim();
      if (foto && !urlHttps(foto)) e[`${r}.foto`] = 'errFoto';
      if ((p.alergenos || []).some((a) => !CLAVES_ALERGENO.has(a))) e[`${r}.alergenos`] = 'errAlergenos';
    });
  });
  return e;
}

/** Formulario → cuerpo del PUT: recorta textos, precio a número, foto ''→null; conserva ids válidos. */
export function paraGuardar(categorias) {
  const id = (x) => (ID_RE.test(String(x ?? '')) ? { id: x } : {});
  return (categorias || []).map((c) => ({
    ...id(c.id),
    nombre: String(c.nombre).trim(),
    platos: (c.platos || []).map((p) => ({
      ...id(p.id),
      nombre: String(p.nombre).trim(),
      descripcion: String(p.descripcion || '').trim(),
      precio: precioNum(p.precio),
      foto: String(p.foto || '').trim() || null,
      alergenos: [...(p.alergenos || [])],
      disponible: p.disponible !== false,
    })),
  }));
}

/** Carta del servidor → formulario (precio como texto, foto null → ''). */
export function aFormulario(categorias) {
  return (categorias || []).map((c) => ({
    ...c,
    platos: (c.platos || []).map((p) => ({
      ...p,
      precio: p.precio == null ? '' : String(p.precio),
      foto: p.foto || '',
      alergenos: p.alergenos || [],
      descripcion: p.descripcion || '',
      disponible: p.disponible !== false,
    })),
  }));
}
