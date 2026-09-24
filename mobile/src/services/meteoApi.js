/**
 * Model — meteo con Open-Meteo (gratis, sin claves, CORS abierto).
 * Caché en memoria por (lat,lng,fecha). Si falla, devuelve null y la app
 * sigue funcionando sin meteo. 0 lecturas de Firestore.
 */
const CACHE = new Map();

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
            resumen: resumenCodigo(d.weathercode?.[0]),
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

/** Descripción corta de un código WMO. */
export function resumenCodigo(codigo) {
  if (codigo == null) return '—';
  if (codigo === 0) return 'Despejado';
  if (codigo <= 3) return 'Nubes y claros';
  if (codigo === 45 || codigo === 48) return 'Niebla';
  if (codigo <= 67) return 'Lluvia';
  if (codigo <= 77) return 'Nieve';
  if (codigo <= 82) return 'Chubascos';
  if (codigo <= 99) return 'Tormenta';
  return '—';
}

/**
 * Aviso para terrazas: calor >=33°C o lluvia >=60%. Solo si terraza===true.
 * Devuelve el texto o null.
 */
export function alertaTerraza(terraza, pronostico) {
  if (terraza !== true || !pronostico) return null;
  const avisos = [];
  if (pronostico.tempMax != null && pronostico.tempMax >= 33) {
    avisos.push(`calor extremo (${Math.round(pronostico.tempMax)}°)`);
  }
  if (pronostico.lluviaProb != null && pronostico.lluviaProb >= 60) {
    avisos.push(`lluvia probable (${pronostico.lluviaProb}%)`);
  }
  if (!avisos.length) return null;
  return `¡Ojo! Este local tiene terraza y se espera ${avisos.join(' y ')}. Pide interior o ven preparado.`;
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
