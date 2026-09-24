/**
 * Google Sign-In para React Native (sin popup): flujo OAuth con
 * expo-web-browser (openAuthSessionAsync) → id_token → credencial Firebase.
 * Requiere EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (y opcional EXPO_PUBLIC_GOOGLE_REDIRECT_URI).
 */
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as Crypto from 'expo-crypto';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { getFirebaseAuth } from './firebase.js';

WebBrowser.maybeCompleteAuthSession();

function urlParams(query) {
  const out = {};
  if (!query) return out;
  for (const par of query.split('&')) {
    const i = par.indexOf('=');
    if (i === -1) continue;
    out[decodeURIComponent(par.slice(0, i))] = decodeURIComponent(par.slice(i + 1).replace(/\+/g, ' '));
  }
  return out;
}

export function googleClientConfigurado() {
  return Boolean(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);
}

/** Abre el consentimiento de Google y devuelve { nombre, email } vía Firebase. */
export async function iniciarSesionGoogleRN() {
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!clientId) {
    const e = new Error('Google Sign-In no configurado: falta EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID en mobile/.env');
    e.code = 'auth/operation-not-allowed';
    throw e;
  }
  const redirectUri = process.env.EXPO_PUBLIC_GOOGLE_REDIRECT_URI || Linking.createURL('auth');
  const nonce = Crypto.randomUUID();

  const params = [
    `client_id=${encodeURIComponent(clientId)}`,
    `redirect_uri=${encodeURIComponent(redirectUri)}`,
    'response_type=id_token',
    `scope=${encodeURIComponent('openid email profile')}`,
    `nonce=${encodeURIComponent(nonce)}`,
    'prompt=select_account',
  ].join('&');

  const result = await WebBrowser.openAuthSessionAsync(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
    redirectUri,
  );

  if (result.type !== 'success' || !result.url) {
    const e = new Error('La ventana de autenticación se cerró. Inténtalo de nuevo.');
    e.code = 'auth/popup-closed-by-user';
    throw e;
  }

  const hash = result.url.includes('#') ? result.url.split('#')[1] : '';
  const search = result.url.includes('?') ? result.url.split('?')[1].split('#')[0] : '';
  const data = { ...urlParams(search), ...urlParams(hash) };

  if (data.error) {
    const e = new Error('No se pudo iniciar sesión con Google. Inténtalo de nuevo.');
    e.code = data.error === 'access_denied' ? 'auth/popup-closed-by-user' : 'auth/network-request-failed';
    throw e;
  }

  const idToken = data.id_token;
  if (!idToken) {
    const e = new Error('No se pudo iniciar sesión con Google. Inténtalo de nuevo.');
    e.code = 'auth/network-request-failed';
    throw e;
  }

  const credential = GoogleAuthProvider.credential(idToken);
  const cred = await signInWithCredential(getFirebaseAuth(), credential);
  return { nombre: cred.user.displayName || '', email: cred.user.email };
}
