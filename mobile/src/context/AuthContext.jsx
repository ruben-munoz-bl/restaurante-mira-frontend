/**
 * Contexto de sesión global — envuelve el controller useAuth para que
 * cualquier pantalla (bajo navegación) acceda sin prop-drilling.
 * Equivale al orquestador App.jsx web.
 */
import { createContext, useContext, useEffect, useMemo } from 'react';
import { useAuth } from '../controllers/useAuth.js';
import usePointsStore from '../stores/usePointsStore.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const auth = useAuth();

  // Equivalente al efecto de App.jsx web: al haber sesión, sincroniza saldo de puntos.
  useEffect(() => {
    if (auth.usuario) {
      usePointsStore.getState().fetchBalance().catch(() => {});
    }
  }, [auth.usuario?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo(() => auth, [auth]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext debe usarse dentro de <AuthProvider>');
  return ctx;
}
