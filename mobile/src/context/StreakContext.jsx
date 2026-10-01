/**
 * Contexto de racha/puntos — lógica extraída del orquestador App.jsx web:
 * saldo para header/bottom-nav, popup de racha diaria, ruleta y bienvenida
 * de usuario nuevo ( sessionStorage con las MISMAS claves del web).
 * Los popups (DailyStreakPopup/WheelModal) se renderizan en PopupsRacha
 * (montado una sola vez en _layout.js).
 */
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { pointsApi } from '../services/api.js';
import useDailyLogin from '../hooks/useDailyLogin.js';
import usePointsStore from '../stores/usePointsStore.js';

const StreakContext = createContext(null);

function hoyKey() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date());
}

export function StreakProvider({ children, usuario }) {
  const [puntosSaldo, setPuntosSaldo] = useState(0);
  const [showStreakPopup, setShowStreakPopup] = useState(false);
  const [streakData, setStreakData] = useState(null);
  const [showWheel, setShowWheel] = useState(false);
  const { claim: claimDaily, claimWheel } = useDailyLogin();
  const syncBalance = usePointsStore((s) => s.fetchBalance);
  const claimedTodayKey = `dailyLogin_shown_${hoyKey()}`;
  const newUserKey = `streak_newuser_shown_${usuario?.uid}`;

  const openStreakPopup = useCallback((data) => {
    setStreakData(data);
    setShowStreakPopup(true);
  }, []);

  // Efecto App.jsx: al haber sesión, saldo + popup de usuario nuevo (1 vez/uid).
  // Sin sesión, saldo a 0 (mismo efecto que el reset de uidRef del web).
  useEffect(() => {
    if (!usuario?.uid) {
      setPuntosSaldo(0);
      return undefined;
    }
    let vivo = true;
    Promise.all([pointsApi.getBalance(), pointsApi.isNewUser()])
      .then(([d, isNew]) => {
        if (!vivo) return;
        setPuntosSaldo(d.saldoActual || 0);
        try {
          if (isNew && !sessionStorage.getItem(newUserKey)) {
            openStreakPopup({
              racha: { dias: 0 },
              puntos: 0,
              yaReclamado: false,
              nuevoSaldo: d.saldoActual,
            });
            sessionStorage.setItem(newUserKey, 'true');
          }
        } catch {
          /* sin storage */
        }
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.uid, openStreakPopup]);

  const fetchStreakData = useCallback(async () => {
    if (!usuario) return { racha: { dias: 0 }, puntos: 0, yaReclamado: false };
    try {
      const bal = await pointsApi.getBalance();
      const yaReclamado = bal.rachaLogin?.yaReclamado ?? false;
      if (!yaReclamado) {
        const { clearDailyLoginCache } = await import('../hooks/useDailyLogin.js');
        clearDailyLoginCache();
      }
      return {
        racha: bal.rachaLogin || { dias: 0 },
        puntos: 0,
        yaReclamado,
        nuevoSaldo: bal.saldoActual,
      };
    } catch {
      return { racha: { dias: 0 }, puntos: 0, yaReclamado: false };
    }
  }, [usuario]);

  const handleClaimDaily = useCallback(async () => {
    const result = await claimDaily();
    if (result && result.nuevoSaldo != null) setPuntosSaldo(result.nuevoSaldo);

    const puntosNuevos = typeof result?.puntos === 'number' ? result.puntos : 0;
    const exito = puntosNuevos > 0 || (result?.nuevoSaldo != null && result?.yaReclamado !== true);

    if (result) {
      setStreakData((prev) => ({
        ...prev,
        racha: result.racha || prev?.racha || { dias: 0 },
        yaReclamado: Boolean(result.yaReclamado || puntosNuevos > 0 || exito),
        puntos: puntosNuevos,
      }));
    }
    syncBalance().catch(() => {});
    return result;
  }, [claimDaily, syncBalance]);

  const handleOpenWheel = useCallback(() => {
    setShowStreakPopup(false);
    setShowWheel(true);
  }, []);

  const handleWheelSpin = useCallback(async () => {
    const result = await claimWheel();
    return result;
  }, [claimWheel]);

  const handleCloseWheel = useCallback(
    (finalResult) => {
      setShowWheel(false);
      try {
        sessionStorage.setItem(claimedTodayKey, 'true');
      } catch {
        /* sin storage */
      }
      if (finalResult && finalResult.nuevoSaldo) setPuntosSaldo(finalResult.nuevoSaldo);
      syncBalance().catch(() => {});
      pointsApi
        .getBalance()
        .then((d) => setPuntosSaldo(d.saldoActual || 0))
        .catch(() => {});
    },
    [claimedTodayKey, syncBalance],
  );

  const handleCloseStreakPopup = useCallback(() => {
    setShowStreakPopup(false);
    try {
      sessionStorage.setItem(claimedTodayKey, 'true');
    } catch {
      /* sin storage */
    }
    syncBalance().catch(() => {});
    pointsApi
      .getBalance()
      .then((d) => setPuntosSaldo(d.saldoActual || 0))
      .catch(() => {});
  }, [claimedTodayKey, syncBalance]);

  const value = useMemo(
    () => ({
      puntosSaldo,
      setPuntosSaldo,
      showStreakPopup,
      streakData,
      showWheel,
      openStreakPopup,
      fetchStreakData,
      handleClaimDaily,
      handleOpenWheel,
      handleWheelSpin,
      handleCloseWheel,
      handleCloseStreakPopup,
    }),
    [
      puntosSaldo,
      showStreakPopup,
      streakData,
      showWheel,
      openStreakPopup,
      fetchStreakData,
      handleClaimDaily,
      handleOpenWheel,
      handleWheelSpin,
      handleCloseWheel,
      handleCloseStreakPopup,
    ],
  );

  return <StreakContext.Provider value={value}>{children}</StreakContext.Provider>;
}

export function useStreak() {
  const ctx = useContext(StreakContext);
  if (!ctx) throw new Error('useStreak debe usarse dentro de <StreakProvider>');
  return ctx;
}
