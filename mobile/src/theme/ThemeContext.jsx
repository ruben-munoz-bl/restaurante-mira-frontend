/**
 * Tema global claro/oscuro — equivalente a `data-theme` + localStorage 'mira:tema'.
 * Claves y comportamiento idénticos al App.jsx web.
 */
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { Appearance } from 'react-native';
import { TEMAS, CLARO, OSCURO } from './tokens';

const ThemeContext = createContext({
  tema: 'claro',
  colores: CLARO,
  setTema: () => {},
  alternarTema: () => {},
});

function leerTemaInicial() {
  try {
    const guardado = globalThis.localStorage?.getItem('mira:tema');
    if (guardado === 'claro' || guardado === 'oscuro') return guardado;
  } catch {
    /* sin storage: sistema */
  }
  return Appearance.getColorScheme() === 'dark' ? 'oscuro' : 'claro';
}

export function ThemeProvider({ children }) {
  const [tema, setTemaEstado] = useState(leerTemaInicial);

  useEffect(() => {
    try {
      globalThis.localStorage?.setItem('mira:tema', tema);
    } catch {
      /* sin storage: solo sesión */
    }
  }, [tema]);

  const setTema = useCallback((v) => {
    setTemaEstado(v === 'oscuro' || v === 'claro' ? v : 'claro');
  }, []);

  const alternarTema = useCallback(() => {
    setTemaEstado((t) => (t === 'oscuro' ? 'claro' : 'oscuro'));
  }, []);

  const value = useMemo(
    () => ({
      tema,
      colores: tema === 'oscuro' ? OSCURO : CLARO,
      esOscuro: tema === 'oscuro',
      setTema,
      alternarTema,
    }),
    [tema, setTema, alternarTema],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

export { TEMAS };
