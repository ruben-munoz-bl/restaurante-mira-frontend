/**
 * Model — autenticación con Firebase Auth (email + contraseña).
 * Recuperación de contraseña y verificación de email incluidos.
 */
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  sendPasswordResetEmail,
  sendEmailVerification,
  verifyPasswordResetCode,
  confirmPasswordReset,
} from 'firebase/auth';
import { getFirebaseAuth } from './firebase.js';
import { iniciarSesionGoogleRN } from './googleAuth.js';
import { guardarPerfil } from './perfilApi.js';

function auth() {
  return getFirebaseAuth();
}

/** URL de la app WEB (los enlaces de Firebase se abren en el navegador). */
const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL || 'https://restaurante-mira-frontend.vercel.app').replace(/\/$/, '');

/** Configura el idioma de los emails de Firebase (verificación, reset). */
export function setEmailLang(lang) {
  const a = auth();
  a.languageCode = lang === 'ca' ? 'ca' : lang === 'en' ? 'en' : 'es';
}

function mensajeError(code, defecto) {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Ese correo ya tiene cuenta. Prueba a iniciar sesión.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Correo o contraseña incorrectos.';
    case 'auth/invalid-email':
      return 'Ese correo no parece válido.';
    case 'auth/weak-password':
      return 'La contraseña debe tener al menos 6 caracteres.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Espera unos minutos y prueba de nuevo.';
    case 'auth/user-disabled':
      return 'Ese usuario está deshabilitado.';
    case 'auth/reset-password-too-many-requests':
      return 'Demasiadas peticiones de recuperación. Espera unos minutos.';
    case 'auth/expired-action-code':
      return 'Enlace caducado, pide otro.';
    case 'auth/invalid-action-code':
      return 'Enlace inválido o ya usado. Pide otro.';
    default:
      return defecto;
  }
}

/** URL de continuación tras el reset: la web (los enlaces de email abren el navegador). */
export function urlContinuacionReset() {
  return WEB_URL + '/#/restablecer';
}

/**
 * Crea la cuenta, guarda el nombre visible y crea el perfil en `usuarios/{uid}`
 * (tipo 'cliente' o 'empresa'). 1 escritura extra, solo al registrarse.
 * @returns {Promise<{nombre:string,email:string}>}
 */
export async function crearCuenta({ nombre, email, password, tipo = 'cliente', preferencias, accesibilidad, lang = 'es' }) {
  try {
    setEmailLang(lang);
    const cred = await createUserWithEmailAndPassword(auth(), email.trim(), password);
    await updateProfile(cred.user, { displayName: nombre.trim() });
    const perfil = {
      tipo: tipo === 'empresa' ? 'empresa' : 'cliente',
      nombre: nombre.trim(),
      email: cred.user.email,
      lang,
    };
    if (preferencias) perfil.preferencias = preferencias;
    if (accesibilidad) perfil.accesibilidad = accesibilidad;
    await guardarPerfil(cred.user.uid, perfil);
    sendEmailVerification(cred.user, { url: urlContinuacionReset() }).catch(() => {});
    return { nombre: nombre.trim(), email: cred.user.email };
  } catch (e) {
    throw new Error(mensajeError(e.code, 'No se pudo crear la cuenta. Inténtalo de nuevo.'));
  }
}

/** @returns {Promise<{nombre:string,email:string}>} */
export async function iniciarSesion({ email, password }) {
  try {
    const cred = await signInWithEmailAndPassword(auth(), email.trim(), password);
    return { nombre: cred.user.displayName || '', email: cred.user.email };
  } catch (e) {
    throw new Error(mensajeError(e.code, 'No se pudo iniciar sesión. Inténtalo de nuevo.'));
  }
}

/** @returns {Promise<{nombre:string,email:string}>} */
export async function iniciarSesionGoogle() {
  try {
    return await iniciarSesionGoogleRN();
  } catch (e) {
    console.error('[Google Sign-In] Error:', e.code, e.message);
    const msg = mensajeErrorGoogle(e.code);
    throw new Error(msg);
  }
}

function mensajeErrorGoogle(code) {
  switch (code) {
    case 'auth/popup-closed-by-user':
      return 'La ventana de autenticación se cerró. Inténtalo de nuevo.';
    case 'auth/popup-blocked':
      return 'La ventana emergente fue bloqueada. Habilita las ventanas emergentes e intenta de nuevo.';
    case 'auth/account-exists-with-different-credential':
      return 'Este correo ya está registrado con otro método. Inicia sesión con ese método.';
    case 'auth/config-google':
      return 'Google no está configurado en la app: falta EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID en mobile/.env (Client ID tipo «Web» de Google Cloud/Firebase). Reinicia con npx expo start --clear.';
    case 'auth/redirect-mismatch':
      return 'Google rechazó la URL de retorno (redirect_uri). Regístrala en Google Cloud → APIs y servicios → Credenciales → Cliente Web.';
    case 'auth/operation-not-allowed':
      return 'Google no está habilitado como método de inicio de sesión. Contacta al administrador.';
    case 'auth/network-request-failed':
      return 'Error de red. Comprueba tu conexión.';
    default:
      return 'No se pudo iniciar sesión con Google. Inténtalo de nuevo.';
  }
}

/** Envía email de recuperación de contraseña (gratis, 0 coste). No revela si el email existe. */
export async function recuperarContrasena(email, lang = 'es') {
  const limpio = email.trim();
  setEmailLang(lang);
  try {
    await sendPasswordResetEmail(auth(), limpio, {
      url: urlContinuacionReset(),
      handleCodeInApp: false,
    });
  } catch (e) {
    // No revelar existencia: email inexistente se trata como éxito.
    if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') return;
    throw new Error(mensajeError(e.code, 'No se pudo enviar el correo de recuperación.'));
  }
}

/**
 * Verifica el oobCode del enlace y devuelve el email asociado.
 * Lanza Error con mensaje en español (caducado / inválido).
 */
export async function verificarCodigoReset(oobCode) {
  try {
    return await verifyPasswordResetCode(auth(), oobCode);
  } catch (e) {
    throw new Error(mensajeError(e.code, 'Enlace inválido o caducado. Pide otro.'));
  }
}

/** Confirma la nueva contraseña con el oobCode. Mensajes en español. */
export async function confirmarNuevaContrasena(oobCode, nuevaPassword) {
  try {
    await confirmPasswordReset(auth(), oobCode, nuevaPassword);
  } catch (e) {
    throw new Error(mensajeError(e.code, 'No se pudo cambiar la contraseña. Pide otro enlace.'));
  }
}

/** Enmascara un email: "maria@gmail.com" -> "m•••@gmail.com". */
export function enmascararEmail(email) {
  const [local = '', dominio = ''] = String(email || '').split('@');
  if (!dominio) return 'tu correo';
  const inicial = local.charAt(0) || '•';
  return `${inicial}•••@${dominio}`;
}

/**
 * Extrae el oobCode llegue como llegue:
 * - Handler personalizado con hash: #/restablecer?mode=resetPassword&oobCode=XXX
 * - Handler personalizado sin hash: ?oobCode=XXX (search)
 * - Links de Firebase con ?mode=&oobCode= en search
 */
export function extraerOobCode() {
  try {
    if (typeof window === 'undefined' || !window.location) return '';
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    const qHash = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : '';
    for (const qs of [qHash, search.replace(/^\?/, '')]) {
      if (!qs) continue;
      const params = new URLSearchParams(qs);
      const code = params.get('oobCode');
      if (code) return code;
    }
  } catch {
    /* sin oobCode */
  }
  return '';
}

export function cerrarSesion() {
  return signOut(auth());
}

/** Suscribe a los cambios de sesión. Devuelve función para desuscribir. */
export function suscribirSesion(callback) {
  return onAuthStateChanged(auth(), (u) =>
    callback(
      u
        ? { uid: u.uid, nombre: u.displayName || '', email: u.email ?? '', emailVerified: Boolean(u.emailVerified), creado: u.metadata?.creationTime ?? null }
        : null,
    ),
  );
}

/** Envía email de verificación al usuario actual. */
export async function enviarVerificacionEmail(lang = 'es') {
  const u = auth().currentUser;
  if (!u) throw new Error('No hay sesión activa.');
  setEmailLang(lang);
  await sendEmailVerification(u, { url: urlContinuacionReset() });
}

/** Recarga el usuario de Firebase para obtener el emailVerified actualizado. */
export async function recargarEmailVerified() {
  const u = auth().currentUser;
  if (!u) return false;
  await u.reload();
  return Boolean(u.emailVerified);
}
