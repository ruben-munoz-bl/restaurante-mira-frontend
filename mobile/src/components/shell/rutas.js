/**
 * Mapea la ruta actual (expo-router pathname) a la "hoja" del hash routing web
 * (misma semántica que rutaActual() de App.jsx).
 */
export function rutaDesdePath(pathname) {
  const p = pathname || '/';
  if (p === '/') return 'home';
  if (p === '/login') return 'login';
  if (p === '/recuperar') return 'recuperar';
  if (p === '/restablecer') return 'restablecer';
  if (p === '/registro') return 'registro';
  if (p === '/cuenta') return 'cuenta';
  if (p === '/contacto') return 'contacto';
  if (p === '/reservas') return 'reservas';
  if (p === '/admin') return 'admin';
  if (p === '/negocio') return 'negocio';
  if (p === '/favoritos') return 'favoritos';
  if (p === '/mensajes') return 'mensajes';
  if (p === '/mapa') return 'mapa';
  if (p === '/privacidad') return 'privacidad';
  if (p === '/puntos') return 'puntos';
  if (p === '/puntos/historial') return 'historialPuntos';
  if (p === '/invitar') return 'invitar';
  if (p.startsWith('/ticket/')) return 'ticket';
  if (p === '/dashboard') return 'dashboard';
  if (p === '/detalle') return 'detalle';
  if (p === '/carta') return 'carta';
  return 'home';
}

/** Rutas de auth: sin aviso de email verificado (igual que el web). */
export const RUTAS_AUTH = ['login', 'registro', 'recuperar', 'restablecer'];
