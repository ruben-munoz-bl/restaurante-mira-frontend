import es from '../i18n/es.js';

/**
 * Model — meteo con Open-Meteo (gratis, sin claves, CORS abierto).
 * Caché en memoria por (lat,lng,fecha). Si falla, devuelve null y la app
 * sigue funcionando sin meteo. 0 lecturas de Firestore.
 */
const CACHE = new Map();

/** Texto i18n: usa `t('clave', params)` y, si falta, cae al español con params. */
function trad(key, params, t) {
  if (typeof t === 'function') {
    try {
      const v = t(key, params);
      if (v && v !== key) return v;
    } catch { /* sin traductor */ }
  }
  const [sec, k] = key.split('.');
  const base = (es[sec] && es[sec][k]) || key;
  return String(base).replace(/\{\{(\w+)\}\}/g, (m, n) => (params && params[n] != null ? String(params[n]) : m));
}

/**
 * Pronóstico diario: { tempMax, lluviaProb, codigo, resumen } o null.
 * @param {number} lat
 * @param {number} lng
 * @param {string} fechaISO 'YYYY-MM-DD'
 */
export async function pronosticoDia(lat, lng, fechaISO) {
  if (lat == null || lng == null || !fechaISO) return null;
  const clave = `${Number(lat).toFixed(3)},${Number(lng).toFixed(3)},${fechaISO}`;
  if (!CACHE.has(clave)) {
    CACHE.set(
      clave,
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
          `&daily=temperature_2m_max,precipitation_probability_max,weathercode` +
          `&timezone=auto&start_date=${fechaISO}&end_date=${fechaISO}`,
      )
        .then(async (res) => {
          if (!res.ok) throw new Error(`meteo ${res.status}`);
          const json = await res.json();
          const d = json.daily || {};
          if (!d.time?.length) throw new Error('meteo sin datos');
          return {
            tempMax: d.temperature_2m_max?.[0] ?? null,
            lluviaProb: d.precipitation_probability_max?.[0] ?? null,
            codigo: d.weathercode?.[0] ?? null,
            resumen: resumenTexto(d.weathercode?.[0]),
          };
        })
        .catch(() => {
          CACHE.delete(clave);
          return null;
        }),
    );
  }
  return CACHE.get(clave);
}

/** Clave i18n (`meteo.<clave>`) de un código WMO. */
export function claveMeteo(codigo) {
  if (codigo == null) return 'otro';
  if (codigo === 0) return 'despejado';
  if (codigo <= 3) return 'nublado';
  if (codigo === 45 || codigo === 48) return 'niebla';
  if (codigo <= 67) return 'lluvia';
  if (codigo <= 77) return 'nieve';
  if (codigo <= 82) return 'chubascos';
  if (codigo <= 99) return 'tormenta';
  return 'otro';
}

/** Descripción corta de un código WMO (traducida si se pasa `t`). */
export function resumenTexto(codigo, t) {
  return trad(`meteo.${claveMeteo(codigo)}`, {}, t);
}

/**
 * Aviso para terrazas: calor >=33°C o lluvia >=60%. Solo si terraza===true.
 * Devuelve el texto o null.
 */
export function alertaTerraza(terraza, pronostico, t) {
  if (terraza !== true || !pronostico) return null;
  const avisos = [];
  if (pronostico.tempMax != null && pronostico.tempMax >= 33) {
    avisos.push(trad('meteo.calor', { grados: Math.round(pronostico.tempMax) }, t));
  }
  if (pronostico.lluviaProb != null && pronostico.lluviaProb >= 60) {
    avisos.push(trad('meteo.lluviaProb', { prob: pronostico.lluviaProb }, t));
  }
  if (!avisos.length) return null;
  return trad('meteo.aviso', { avisos: avisos.join(trad('meteo.y', {}, t)) }, t);
}

/**
 * Rejilla de 42 celdas (6 semanas, lunes primero) para el calendario.
 * @returns {({ fecha:string, dia:number }|null)[]}
 */
export function diasMes(anio, mes1a12) {
  const primero = new Date(anio, mes1a12 - 1, 1);
  const desfase = (primero.getDay() + 6) % 7;
  const diasEnMes = new Date(anio, mes1a12, 0).getDate();
  const p = (n) => String(n).padStart(2, '0');
  const celdas = [];
  for (let i = 0; i < 42; i++) {
    const n = i - desfase + 1;
    celdas.push(n >= 1 && n <= diasEnMes ? { fecha: `${anio}-${p(mes1a12)}-${p(n)}`, dia: n } : null);
  }
  return celdas;
}
