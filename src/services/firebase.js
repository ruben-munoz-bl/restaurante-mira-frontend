/**
 * Model — inicialización perezosa del SDK web de Firebase (solo Auth).
 * Firestore ya no se usa desde el frontend: los datos pasan por mira-api.
 */
import { initializeApp } from 'firebase/app';
import { firebaseConfig } from './firebaseConfig.js';

export function configValida() {
  return Boolean(firebaseConfig.apiKey) && !String(firebaseConfig.apiKey).startsWith('PEGA');
}

let app = null;

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
