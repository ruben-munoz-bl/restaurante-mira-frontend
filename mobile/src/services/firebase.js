/**
 * Model — inicialización perezosa del SDK de Firebase (solo Auth) para React Native.
 * La persistencia de sesión usa AsyncStorage (misma clave/valores que el web:
 * la sesión sobrevive a reinicios de la app).
 * Firestore ya no se usa desde el frontend: los datos pasan por mira-api.
 */
import { initializeApp } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebaseConfig } from './firebaseConfig.js';

export function configValida() {
  return Boolean(firebaseConfig.apiKey) && !String(firebaseConfig.apiKey).startsWith('PEGA');
}

let app = null;
let authInstance = null;

function obtenerApp() {
  if (!configValida()) {
    throw new Error(
      'Falta firebaseConfig: pega tu configuración web en src/services/firebaseConfig.js (pasos en README).',
    );
  }
  if (!app) app = initializeApp(firebaseConfig);
  return app;
}

/** Devuelve la Firebase App (para Auth) o lanza error explicativo. */
export function getFirebaseApp() {
  return obtenerApp();
}

/**
 * Auth con persistencia React Native. initializeAuth solo puede llamararse
 * una vez por app; si ya existe, getAuth devuelve la misma instancia.
 */
export function getFirebaseAuth() {
  const a = obtenerApp();
  if (!authInstance) {
    try {
      authInstance = initializeAuth(a, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    } catch {
      authInstance = getAuth(a);
    }
  }
  return authInstance;
}
