/** Devuelve la URL solo si es http(s), mailto o tel; si no, undefined.
 *  Evita abrir `javascript:`/`intent:`/esquemas arbitrarios que vengan del servidor. */
export function urlSegura(url) {
  if (typeof url !== 'string') return undefined;
  const u = url.trim();
  return /^(https?:\/\/|mailto:|tel:)/i.test(u) ? u : undefined;
}

/** Abre la URL con Linking solo si es segura. */
export function abrirUrlSegura(Linking, url) {
  const u = urlSegura(url);
  if (u) Linking.openURL(u).catch(() => {});
}
