/** Devuelve la URL solo si es http(s), mailto, tel o una ruta/hash interna; si no, undefined.
 *  Evita XSS por `javascript:`/`data:` en enlaces que vienen del servidor. */
export function urlSegura(url) {
  if (typeof url !== 'string') return undefined;
  const u = url.trim();
  if (/^(#|\/(?!\/))/.test(u)) return u;
  try {
    const { protocol } = new URL(u);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(protocol) ? u : undefined;
  } catch {
    return undefined;
  }
}
