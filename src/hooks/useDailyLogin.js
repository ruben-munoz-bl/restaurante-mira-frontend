import { pointsApi } from '../services/api';

/** Fecha YYYY-MM-DD en Europe/Madrid (misma zona que la API). */
function hoyKey() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date());
}

function claimCacheKey() {
  return `dailyLogin_${hoyKey()}`;
}

/** Limpia la caché local de claim (p. ej. si el admin hizo unclaim hoy). */
export function clearDailyLoginCache() {
  try {
    sessionStorage.removeItem(claimCacheKey());
  } catch { /* sin storage */ }
}

const useDailyLogin = () => {
  const claim = async () => {
    // Siempre a la API: la caché solo evita dobles clicks redundantes tras un 201 real.
    // Antes un "falso ya reclamado" en sessionStorage saltaba el claim (sin confeti ni puntos).
    try {
      const result = await pointsApi.dailyLogin();
      if (result && result.yaReclamado !== true && (result.puntos > 0 || result.nuevoSaldo != null)) {
        try {
          sessionStorage.setItem(claimCacheKey(), 'true');
        } catch { /* sin storage */ }
      }
      if (result?.yaReclamado) {
        // Segunda llamada del mismo día: la API devuelve yaReclamado + la racha actual.
        return result;
      }
      return result;
    } catch (err) {
      console.error('Daily login failed:', err);
      throw err;
    }
  };

  const claimWheel = async () => {
    try {
      const result = await pointsApi.claimWheelReward();
      return result;
    } catch (err) {
      console.error('Wheel claim failed:', err);
      throw err;
    }
  };

  return { claim, claimWheel };
};

export default useDailyLogin;
