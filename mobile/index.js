/**
 * Entry point: instala los shims de storage (localStorage/sessionStorage)
 * ANTES de que expo-router monte cualquier pantalla, y arranca la hidratación
 * desde AsyncStorage. El root layout espera a `hydrateStorage()` antes de renderizar.
 */
import { installStorageGlobals, hydrateStorage } from './src/lib/storage';

installStorageGlobals();
hydrateStorage();

import 'expo-router/entry';
