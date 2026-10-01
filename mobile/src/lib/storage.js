/**
 * Shims de Web Storage con la MISMA API síncrona que el navegador:
 * - localStorage: memoria + persistencia en AsyncStorage (mismas claves que el web:
 *   mira:tema, mira:dieta, mira:favoritos, mira_lang, mira:cookies, mira_emblemas…).
 * - sessionStorage: solo memoria (sesión de proceso), igual de tolerante.
 * Instalados como globals en index.js antes de que corra la app.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const localMem = new Map();
const sessionMem = new Map();
let readyPromise = null;

function crearStorage(mem, persistir) {
  return {
    getItem(clave) {
      return mem.has(clave) ? mem.get(clave) : null;
    },
    setItem(clave, valor) {
      const v = String(valor);
      mem.set(clave, v);
      if (persistir) AsyncStorage.setItem(clave, v).catch(() => {});
    },
    removeItem(clave) {
      mem.delete(clave);
      if (persistir) AsyncStorage.removeItem(clave).catch(() => {});
    },
    clear() {
      mem.clear();
      if (persistir) AsyncStorage.clear().catch(() => {});
    },
    key(i) {
      const k = [...mem.keys()][i];
      return k === undefined ? null : k;
    },
    get length() {
      return mem.size;
    },
  };
}

export const localStorage = crearStorage(localMem, true);
export const sessionStorage = crearStorage(sessionMem, false);

/** Carga todo AsyncStorage a memoria una sola vez. */
export function hydrateStorage() {
  if (!readyPromise) {
    readyPromise = AsyncStorage.getAllKeys()
      .then(async (keys) => {
        if (!keys.length) return;
        const pairs = await AsyncStorage.multiGet(keys);
        for (const [k, v] of pairs) {
          if (v != null) localMem.set(k, v);
        }
      })
      .catch(() => {});
  }
  return readyPromise;
}

export function installStorageGlobals() {
  try {
    if (!globalThis.localStorage || !globalThis.localStorage.__mira) {
      localStorage.__mira = true;
      globalThis.localStorage = localStorage;
    }
    if (!globalThis.sessionStorage || !globalThis.sessionStorage.__mira) {
      sessionStorage.__mira = true;
      globalThis.sessionStorage = sessionStorage;
    }
  } catch {
    /* entorno que no permite globals */
  }
}
