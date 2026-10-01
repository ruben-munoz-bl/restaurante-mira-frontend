/**
 * Controller — sesión (Firebase Auth) + dieta + accesibilidad + favoritos.
 * - Logueado: todo en `usuarios/{uid}` (`preferencias`, `accesibilidad`,
 *   `favoritos`); al entrar se fusionan los favoritos de invitado.
 * - Invitado: todo en localStorage (mira:dieta, mira:favoritos).
 * Las Views reciben todo por props.
 */
import { useEffect, useState } from 'react';
import { suscribirSesion, crearCuenta, iniciarSesion, iniciarSesionGoogle as iniciarSesionGoogleFn, cerrarSesion, enviarVerificacionEmail, recargarEmailVerified } from '../services/authApi.js';
import { esAdmin as comprobarAdmin } from '../services/incidenciaApi.js';
import { obtenerPerfil, guardarPerfil, PERFIL_VACIO } from '../services/perfilApi.js';
import { DIETA_VACIA, normalizarDieta, ACCESIBILIDAD_VACIA, normalizarAccesibilidad } from '../models/restaurantModel.js';
import { contarNoLeidos } from '../services/mensajesApi.js';

const LS_DIETA = 'mira:dieta';
const LS_FAVS = 'mira:favoritos';

function leerJSON(clave, defecto) {
  try {
    const raw = localStorage.getItem(clave);
    return raw ? JSON.parse(raw) : defecto;
  } catch {
    return defecto;
  }
}

function guardarJSON(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    /* almacenamiento lleno o bloqueado: se sigue en memoria */
  }
}

/** Lee ajustes locales tolerando la forma antigua (dieta plana sin accesibilidad). */
function leerAjustesLS() {
  const raw = leerJSON(LS_DIETA, null);
  if (!raw || typeof raw !== 'object') {
    return { dieta: { ...DIETA_VACIA }, accesibilidad: { ...ACCESIBILIDAD_VACIA } };
  }
  const esFormaVieja = 'vegano' in raw || 'alergias' in raw;
  return {
    dieta: normalizarDieta(esFormaVieja ? raw : (raw.dieta ?? DIETA_VACIA)),
    accesibilidad: normalizarAccesibilidad(esFormaVieja ? raw.accesibilidad : (raw.accesibilidad ?? ACCESIBILIDAD_VACIA)),
  };
}

function escribirAjustesLS(dieta, accesibilidad) {
  guardarJSON(LS_DIETA, { dieta: normalizarDieta(dieta), accesibilidad: normalizarAccesibilidad(accesibilidad) });
}

/** Unión sin duplicados (para fusionar favoritos al iniciar sesión). */
export function unirIds(a, b) {
  return [...new Set([...(a || []), ...(b || [])])];
}

export function useAuth() {
  const [usuario, setUsuario] = useState(null); // { uid, nombre, email, creado } | null
  const [cargandoSesion, setCargandoSesion] = useState(true);
  const [esAdmin, setEsAdmin] = useState(false);
  const [perfil, setPerfil] = useState({ ...PERFIL_VACIO });
  const [seqPerfil, setSeqPerfil] = useState(0);
  const [dieta, setDieta] = useState({ ...DIETA_VACIA });
  const [accesibilidad, setAccesibilidad] = useState({ ...ACCESIBILIDAD_VACIA });
  const [noLeidos, setNoLeidos] = useState(0);
  const [favoritos, setFavoritos] = useState([]);
  const [fusionadoUid, setFusionadoUid] = useState(null);

  useEffect(() => suscribirSesion((u) => {
    setUsuario(u);
    setCargandoSesion(false);
    if (u?.uid) {
      comprobarAdmin(u.uid).then(setEsAdmin).catch(() => setEsAdmin(false));
    } else {
      setEsAdmin(false);
      setPerfil({ ...PERFIL_VACIO });
      setNoLeidos(0);
      // Invitado: ajustes del navegador.
      const local = leerAjustesLS();
      setDieta(local.dieta);
      setAccesibilidad(local.accesibilidad);
      setFavoritos(leerJSON(LS_FAVS, []));
      setFusionadoUid(null);
    }
  }), []);

  // Perfil remoto + fusión de favoritos locales al entrar.
  useEffect(() => {
    if (!usuario?.uid) return;
    let vivo = true;
    obtenerPerfil(usuario.uid)
      .then(async (p) => {
        if (!vivo) return;
        setPerfil(p);
        const dietaRemota = normalizarDieta(p.preferencias ?? p);
        const favsLocales = leerJSON(LS_FAVS, []);
        const favsRemotos = Array.isArray(p.favoritos) ? p.favoritos : [];
        if (fusionadoUid !== usuario.uid && favsLocales.length) {
          // Fusionar una sola vez por sesión: unión y subida.
          const union = unirIds(favsRemotos, favsLocales);
          setFavoritos(union);
          setFusionadoUid(usuario.uid);
          try {
            await guardarPerfil(usuario.uid, { favoritos: union });
          } catch {
            /* sin red: quedan en memoria + local */
          }
        } else {
          setFavoritos(favsRemotos);
        }
        // La dieta remota manda si existe; si no, se conserva la local ya puesta.
        // Igual con accesibilidad (campo `accesibilidad` del perfil).
        const dietaLocal = leerJSON(LS_DIETA, null);
        const tieneRemota =
          p.preferencias && (p.preferencias.vegano || p.preferencias.vegetariano || p.preferencias.sinGluten || (p.preferencias.alergias || []).length);
        setDieta(tieneRemota ? dietaRemota : normalizarDieta(dietaLocal?.dieta ?? dietaLocal ?? DIETA_VACIA));
        setAccesibilidad(
          p.accesibilidad && (p.accesibilidad.sillaRuedas || p.accesibilidad.tea)
            ? normalizarAccesibilidad(p.accesibilidad)
            : normalizarAccesibilidad(dietaLocal?.accesibilidad),
        );
      })
      .catch(() => {
        if (!vivo) return;
        const local = leerAjustesLS();
        setDieta(local.dieta);
        setAccesibilidad(local.accesibilidad);
      });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario, seqPerfil]);

  function recargarPerfil() {
    setSeqPerfil((i) => i + 1);
  }

  /** Nº de mensajes sin leer (1 query pequeña). */
  async function recargarMensajes() {
    if (!usuario?.uid) {
      setNoLeidos(0);
      return 0;
    }
    try {
      const n = await contarNoLeidos(usuario.uid);
      setNoLeidos(n);
      return n;
    } catch {
      return noLeidos;
    }
  }

  useEffect(() => {
    if (usuario?.uid) recargarMensajes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario]);

  /** Guarda dieta (remoto si logueado, si no local; conserva accesibilidad). */
  async function guardarDieta(nueva) {
    const d = normalizarDieta(nueva);
    setDieta(d);
    if (usuario?.uid) {
      await guardarPerfil(usuario.uid, { preferencias: d });
    } else {
      setAccesibilidad((acc) => {
        escribirAjustesLS(d, acc);
        return acc;
      });
    }
  }

  /** Guarda accesibilidad (remoto si logueado, si no local; conserva dieta). */
  async function guardarAccesibilidad(nueva) {
    const a = normalizarAccesibilidad(nueva);
    setAccesibilidad(a);
    if (usuario?.uid) {
      await guardarPerfil(usuario.uid, { accesibilidad: a });
    } else {
      setDieta((d) => {
        escribirAjustesLS(d, a);
        return d;
      });
    }
  }

  /** Toggle favorito (remoto si logueado, si no local). */
  async function toggleFavorito(id) {
    const tiene = favoritos.includes(id);
    const next = tiene ? favoritos.filter((x) => x !== id) : [...favoritos, id];
    setFavoritos(next);
    if (usuario?.uid) {
      try {
        await guardarPerfil(usuario.uid, { favoritos: next });
      } catch {
        /* sin red: queda en memoria */
      }
    } else {
      guardarJSON(LS_FAVS, next);
    }
    return !tiene;
  }

  /** Guarda idioma (remoto si logueado, localStorage siempre). */
  async function guardarLang(nuevoLang) {
    localStorage.setItem('mira_lang', nuevoLang);
    if (usuario?.uid) {
      try { await guardarPerfil(usuario.uid, { lang: nuevoLang }); } catch { /* offline */ }
    }
  }

  /** Envía verificación de correo con el idioma actual. */
  async function enviarVerificacion() {
    return enviarVerificacionEmail(perfil.lang || 'es');
  }

  /** Envía email de recuperación con el idioma actual. */
  async function recuperarContrasenaConLang(email) {
    const { recuperarContrasena } = await import('../services/authApi.js');
    return recuperarContrasena(email, perfil.lang || 'es');
  }

  return {
    usuario,
    cargandoSesion,
    esAdmin,
    perfil,
    recargarPerfil,
    dieta,
    guardarDieta,
    accesibilidad,
    guardarAccesibilidad,
    noLeidos,
    recargarMensajes,
    favoritos,
    toggleFavorito,
    crearCuenta,
    iniciarSesion,
    iniciarSesionGoogle: iniciarSesionGoogleFn,
    cerrarSesion,
    enviarVerificacion,
    enviarVerificacionEmail,
    recargarEmailVerified,
    guardarLang,
    recuperarContrasenaConLang,
  };
}
