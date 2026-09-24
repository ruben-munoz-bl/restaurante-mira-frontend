/**
 * Model — locales propuestos por cuentas empresa vía API.
 */
import { api } from './httpClient.js';

const PRECIOS = ['€', '€€', '€€€'];

function validarPropuesta(d) {
  if (!d.nombre?.trim()) throw new Error('El nombre es obligatorio.');
  if (!d.ciudad?.trim()) throw new Error('La ciudad es obligatoria.');
  if (!d.zona) throw new Error('Elige la zona.');
  if (!d.direccion?.trim()) throw new Error('La dirección es obligatoria.');
  if (!PRECIOS.includes(d.precio)) throw new Error('Precio no válido.');
  if (!Array.isArray(d.categorias) || !d.categorias.length) {
    throw new Error('Indica al menos una cocina (separadas por comas).');
  }
}

export async function proponerNegocio({ datos }) {
  validarPropuesta(datos);
  const d = await api.post('/v1/negocios', {
    nombre: datos.nombre.trim(),
    ciudad: datos.ciudad.trim(),
    zona: datos.zona,
    direccion: datos.direccion.trim(),
    telefono: (datos.telefono || '').trim(),
    categorias: datos.categorias,
    precio: datos.precio,
    descripcion: (datos.descripcion || '').trim(),
    imagen_url: (datos.imagen_url || '').trim(),
    accesoDiscapacidad: datos.accesoDiscapacidad ?? null,
    menuInfantil: datos.menuInfantil ?? null,
    entornoTranquilo: datos.entornoTranquilo ?? null,
    tronas: datos.tronas ?? null,
    terraza: datos.terraza ?? null,
    alergenos: (datos.alergenos || '').trim(),
  });
  return d.id;
}

export async function listarMisNegocios() {
  const d = await api.get('/v1/negocios/my');
  const list = d.data || d || [];
  list.sort((a, b) => (b.creado?.seconds ?? 0) - (a.creado?.seconds ?? 0));
  return list;
}

export async function listarNegociosPendientes() {
  const d = await api.get('/v1/negocios/pendientes');
  return d.data || d || [];
}

export async function aprobarNegocio(negocioId) {
  const d = await api.put(`/v1/negocios/${encodeURIComponent(negocioId)}/aprobar`);
  return d.restaurantId;
}

export async function rechazarNegocio(negocioId) {
  await api.put(`/v1/negocios/${encodeURIComponent(negocioId)}/rechazar`);
}
