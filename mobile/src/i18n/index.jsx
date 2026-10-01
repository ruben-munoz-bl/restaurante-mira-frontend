/**
 * Sistema i18n ligero: context + hook + detección automática.
 * Soporta claves anidadas ('a.b.c') e interpolación {{var}}.
 */
import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { getLocales } from 'expo-localization';

const I18nContext = createContext();

const STORAGE_KEY = 'mira_lang';

const AVAILABLE = {
  es: 'Español',
  ca: 'Català',
  en: 'English',
};

const LANG_ORDER = ['es', 'ca', 'en'];

function detectarIdioma() {
  try {
    const guardado = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (guardado && AVAILABLE[guardado]) return guardado;
  } catch {
    /* sin storage */
  }
  const nav = (getLocales()[0]?.languageTag || 'es').toLowerCase();
  if (nav.startsWith('ca')) return 'ca';
  if (nav.startsWith('en')) return 'en';
  return 'es';
}

function siguienteIdioma(current) {
  const idx = LANG_ORDER.indexOf(current);
  return LANG_ORDER[(idx + 1) % LANG_ORDER.length];
}

function get(obj, path) {
  return path.split('.').reduce((o, k) => (o && o[k] != null ? o[k] : null), obj);
}

function interp(str, params) {
  if (!params) return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, k) => (params[k] != null ? params[k] : `{{${k}}}`));
}

export function I18nProvider({ children, onLangChange }) {
  const [lang, setLangState] = useState(detectarIdioma);

  const setLang = useCallback((l) => {
    if (!AVAILABLE[l]) return;
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, l);
    } catch {
      /* sin storage */
    }
    setLangState(l);
    if (onLangChange) onLangChange(l);
  }, [onLangChange]);

  const cycleLang = useCallback(() => {
    setLang(siguienteIdioma(lang));
  }, [lang, setLang]);

  const value = useMemo(() => ({ lang, setLang, cycleLang, available: AVAILABLE }), [lang, setLang, cycleLang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

export function useT(translations) {
  const { lang } = useContext(I18nContext);
  return useCallback(
    (key, params) => {
      const dict = translations[lang] || translations.es || {};
      const val = get(dict, key);
      if (val == null) return key;
      return typeof val === 'string' ? interp(val, params) : val;
    },
    [lang, translations],
  );
}

export { AVAILABLE, detectarIdioma };
