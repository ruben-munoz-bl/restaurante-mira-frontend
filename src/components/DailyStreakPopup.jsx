import { useState, useEffect, useCallback } from 'react';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';

const TRADS = { es, ca, en };

function calcularPuntosPorDia(dia) {
  if (dia >= 7) return 0;
  return Math.min(5 + 3 * Math.max(0, dia - 1), 15);
}

/**
 * Camino de 7 días genéricos (no lun–dom).
 * - completado: 1..dias (días ya hechos)
 * - "Hoy": SOLO el día que se puede reclamar ahora
 *   (siguiente a reclamar, o día 7 si toca ruleta)
 * - Si ya reclamaste hoy: ningún día lleva "Hoy"
 */
function construirCamino(dias, yaReclamado, esDia7) {
  const d = Math.min(Math.max(dias || 0, 0), 7);
  return Array.from({ length: 7 }, (_, i) => {
    const dia = i + 1;
    const completado = dia <= d;
    const esSiguiente = !yaReclamado && dia === d + 1;
    // Solo la acción de HOY: reclamar (día siguiente) o girar (día 7 con ruleta).
    const esHoy = yaReclamado
      ? false
      : esDia7
        ? dia === 7
        : esSiguiente;
    const bloqueado = !completado && !esHoy;
    return {
      dia,
      completado,
      esHoy,
      bloqueado,
      esSiguiente,
    };
  });
}

function createConfetti() {
  const colors = ['var(--primary-container)', '#FFC800', '#FF4B4B', '#10B981', '#F59E0B', '#3B82F6'];
  for (let i = 0; i < 40; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'streak-confetti';
    const size = Math.random() * 8 + 6;
    confetti.style.width = size + 'px';
    confetti.style.height = (size * 1.4) + 'px';
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.left = (window.innerWidth / 2 + (Math.random() * 400 - 200)) + 'px';
    confetti.style.top = (window.innerHeight / 2 + (Math.random() * 100 - 50)) + 'px';
    confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
    document.body.appendChild(confetti);

    const velocityX = (Math.random() - 0.5) * 600;
    const velocityY = -Math.random() * 450 - 150;
    const rotationSpeed = (Math.random() - 0.5) * 720;
    let startTime = performance.now();
    const duration = 2200;

    function animateConfetti(time) {
      const elapsed = (time - startTime) / duration;
      if (elapsed < 1) {
        confetti.style.left = (window.innerWidth / 2 + velocityX * elapsed) + 'px';
        confetti.style.top = (window.innerHeight / 2 + velocityY * elapsed + 600 * elapsed * elapsed) + 'px';
        confetti.style.transform = `rotate(${rotationSpeed * elapsed}deg) scale(${1 - elapsed * 0.4})`;
        confetti.style.opacity = (1 - elapsed).toString();
        requestAnimationFrame(animateConfetti);
      } else {
        confetti.remove();
      }
    }
    requestAnimationFrame(animateConfetti);
  }
}

export default function DailyStreakPopup({ racha, saldo, yaReclamado, onClaim, onWheel, onClose }) {
  const t = useT(TRADS);
  const [claimed, setClaimed] = useState(yaReclamado || false);
  const [showToast, setShowToast] = useState(false);
  const [animSaldo, setAnimSaldo] = useState(saldo || 0);
  const [isVisible, setIsVisible] = useState(false);
  const [justClaimed, setJustClaimed] = useState(false);
  const [lastPuntos, setLastPuntos] = useState(0);

  // Sincroniza con la API si cambia el prop (p. ej. tras refetch).
  useEffect(() => {
    setClaimed(Boolean(yaReclamado));
  }, [yaReclamado]);

  const dias = Math.max(0, Math.floor(Number(racha?.dias) || 0)); // número seguro: se interpola en HTML
  const puntosDesdeApi = racha?.puntosHoy;
  const esDia7 = Boolean(racha?.dia7Disponible) || dias >= 7;
  const puntosHoy = claimed || esDia7
    ? 0
    : (typeof puntosDesdeApi === 'number'
      ? puntosDesdeApi
      : calcularPuntosPorDia(Math.max(dias + 1, 1)));
  const camino = construirCamino(dias, claimed, esDia7);
  // Singular/plural del día según idioma (es Día/Días, ca Dia/Dies, en Day/Days).
  const formasDia = t('streak.diasFormas');
  const diaPalabra = (n) => (Array.isArray(formasDia) ? formasDia[n === 1 ? 0 : 1] : (n === 1 ? t('ops.dia') : t('ops.dias')));

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  useEffect(() => {
    if (!justClaimed) setAnimSaldo(saldo || 0);
  }, [saldo, justClaimed]);

  const handleClaim = useCallback(async () => {
    if (esDia7) {
      onWheel?.();
      return;
    }
    if (claimed) return;

    try {
      const result = await onClaim?.();
      const puntosNuevos = typeof result?.puntos === 'number' ? result.puntos : 0;
      // Éxito real de la API (puntos nuevos o saldo actualizado sin "ya reclamado").
      const exito = puntosNuevos > 0
        || (result?.nuevoSaldo != null && result?.yaReclamado !== true);

      if (!exito) {
        // Ya estaba reclamado hoy (API o caché): solo cambia el botón, sin confeti.
        setClaimed(true);
        return;
      }

      setClaimed(true);
      setJustClaimed(true);
      setLastPuntos(puntosNuevos);
      if (result?.nuevoSaldo != null) {
        setAnimSaldo(result.nuevoSaldo);
      } else if (puntosNuevos > 0) {
        setAnimSaldo((prev) => prev + puntosNuevos);
      }
      if (puntosNuevos > 0) {
        createConfetti();
      }
      // Toast siempre en claim exitoso (aunque a veces los puntos sean 0 en día 7).
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3500);
    } catch {
      setClaimed(false);
      setJustClaimed(false);
    }
  }, [claimed, esDia7, onClaim, onWheel]);

  const handleClose = () => {
    onClose?.();
  };

  return (
    <div className={`streak-overlay ${isVisible ? 'streak-overlay--visible' : ''}`}>
      <div className={`streak-modal ${isVisible ? 'streak-modal--visible' : ''}`}>

        {/* Cintillo superior */}
        <div className="streak-modal__header">
          <div className="streak-modal__brand">
            <div className="streak-modal__brand-icon">
              <img src="/mira_logo_3_circular_lente.svg" alt="MIRA" className="streak-modal__brand-logo" />
            </div>
            <div>
              <span className="streak-modal__brand-name">MIRA Club</span>
              <span className="streak-modal__brand-sub">{t('streak.dailyReward')}</span>
            </div>
          </div>
          <button className="streak-modal__close" onClick={handleClose} aria-label={t('otros.cerrar')}>✕</button>
        </div>

        {/* Hero con mascota */}
        <div className="streak-modal__hero">
          <div className="streak-sunburst" />
          <div className="streak-glow" />

          <div className="streak-modal__mascot-area">
            <div className="streak-modal__mascot">
              <img src="/mascota-racha.png" alt={t('streak.altMascota')} className="streak-modal__mascot-img" />
              <div className="streak-modal__speech">
                <span>🔥</span>
                <span>
                  {esDia7
                    ? t('streak.speechDay7')
                    : justClaimed
                      ? t('streak.speechDayDone', { n: Math.max(dias, 1) })
                      : claimed
                        ? t('streak.speechUnstoppable')
                        : t('streak.speechClaimToday')}
                </span>
                <div className="streak-modal__speech-arrow" />
              </div>
            </div>

            <div className="streak-modal__coin streak-modal__coin--left">
              <img src="/moneda-mira.png" alt="MIRA Points" />
            </div>
            <div className="streak-modal__coin streak-modal__coin--right">
              <img src="/moneda-mira.png" alt="MIRA Points" />
            </div>
          </div>

          <div className="streak-modal__titles">
            <div className="streak-modal__day-badge">
              <span>⚡</span>{' '}
              {dias === 0
                ? t('streak.badgeWelcome')
                : esDia7
                  ? t('streak.dayCompleted', { n: 7 })
                  : claimed
                    ? t('streak.dayCompleted', { n: Math.max(dias, 1) })
                    : t('streak.streakBadge', { n: dias, dia: diaPalabra(dias) })}
            </div>
            <h2 className="streak-modal__title">
              {dias === 0 ? (
                <span dangerouslySetInnerHTML={{ __html: t('streak.welcomeTitle') }} />
              ) : esDia7 ? (
                <>{t('streak.wheelTitle')} <span className="streak-modal__fire">🎉</span></>
              ) : claimed ? (
                <span
                  dangerouslySetInnerHTML={{
                    __html: t('streak.streakTitle', { n: Math.max(dias, 1), dia: diaPalabra(Math.max(dias, 1)) }),
                  }}
                />
              ) : (
                <span
                  dangerouslySetInnerHTML={{ __html: t('streak.rachaHoyTitle', { n: dias, dia: diaPalabra(dias) }) }}
                />
              )}
            </h2>
            <p className="streak-modal__subtitle">
              {dias === 0 ? (
                <span dangerouslySetInnerHTML={{ __html: t('streak.firstRewardSub') }} />
              ) : esDia7 ? (
                <span dangerouslySetInnerHTML={{ __html: t('streak.wheelSubtitle') }} />
              ) : (
                <span dangerouslySetInnerHTML={{ __html: t('streak.streakSubtitle') }} />
              )}
            </p>
          </div>
        </div>

        {/* Grid 7 días (camino genérico, no lun–dom) */}
        <div className="streak-modal__calendar">
          <div className="streak-modal__calendar-header">
            <div className="streak-modal__calendar-label">
              <span className="streak-modal__calendar-title">{t('streak.foodiePath')}</span>
              <span className="streak-modal__calendar-week">{t('streak.sevenDays')}</span>
            </div>
            {esDia7 && (
              <div className="streak-modal__calendar-prize">
                {t('streak.wheelPrize')}
              </div>
            )}
          </div>

          <div className="streak-grid">
            {camino.map((celda) => {
              const dia = celda.dia;
              const completado = celda.completado;
              const esHoy = celda.esHoy && !completado;
              const bloqueado = celda.bloqueado && !esHoy;
              const puntos = dia === 7 ? null : calcularPuntosPorDia(dia);

              return (
                <div
                  key={dia}
                  className={`streak-day ${completado ? 'streak-day--done' : ''} ${esHoy && !esDia7 ? 'streak-day--today' : ''} ${esHoy && esDia7 ? 'streak-day--wheel' : ''} ${bloqueado ? 'streak-day--locked' : ''}`}
                >
                  {esHoy && <div className="streak-day__tag">{t('streak.hoy')}</div>}
                  <span className="streak-day__name">{t('streak.dayLabel', { n: dia })}</span>
                  <div className="streak-day__icon">
                    {completado && <span className="streak-day__check">✓</span>}
                    {!completado && esHoy && esDia7 && (
                      <img src="/racha-fuego.png" alt={t('streak.altRuleta')} className="streak-day__wheel-icon" />
                    )}
                    {!completado && esHoy && !esDia7 && (
                      <img src="/moneda-mira.png" alt={t('streak.altMoneda')} className="streak-day__coin" />
                    )}
                    {bloqueado && <span className="streak-day__lock">🔒</span>}
                  </div>
                  {dia === 7 ? (
                    <span className="streak-day__points streak-day__points--wheel">{t('streak.ruletaDia7')}</span>
                  ) : (
                    <span className="streak-day__points">+{puntos}</span>
                  )}
                  <span className="streak-day__unit">MIRA</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Saldo + botón */}
        <div className="streak-modal__actions">
          <div className="streak-modal__balance">
            <div className="streak-modal__balance-icon">
              <img src="/moneda-mira.png" alt="" />
            </div>
            <div>
              <div className="streak-modal__balance-label">{t('streak.yourBalance')}</div>
              <div className="streak-modal__balance-amount">
                <span className="streak-modal__balance-num">{animSaldo}</span>
                <span className="streak-modal__balance-text">{t('streak.accumulated')}</span>
              </div>
            </div>
            <div className="streak-modal__balance-bar-wrap">
              <span className="streak-modal__balance-bar-label">{t('streak.balanceGoal', { n: animSaldo })}</span>
              <div className="streak-modal__balance-bar">
                <div className="streak-modal__balance-bar-fill" style={{ width: `${Math.min((animSaldo / 1000) * 100, 100)}%` }} />
              </div>
            </div>
          </div>

          <button
            className={`streak-claim-btn ${claimed ? 'streak-claim-btn--claimed' : ''} ${esDia7 ? 'streak-claim-btn--wheel' : ''}`}
            onClick={handleClaim}
            disabled={false}
          >
            {esDia7 ? (
              <>{t('streak.spinWheel')} 🎡</>
            ) : claimed ? (
              <>{t('streak.viewStreak')}</>
            ) : (
              <>{t('streak.claim', { n: puntosHoy })} ✨</>
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="streak-modal__footer">
          <div className="streak-modal__footer-protect">
            <span>🛡️</span>
            <span>{t('streak.streakProtector')}</span>
          </div>
        </div>
      </div>

      {/* Toast */}
      <div className={`streak-toast ${showToast ? 'streak-toast--visible' : ''}`}>
        <div className="streak-toast__icon">✓</div>
        <div>
          <p className="streak-toast__title">{t('streak.toastClaimed', { n: lastPuntos })}</p>
          <p className="streak-toast__sub">{t('streak.toastNext')}</p>
        </div>
      </div>
    </div>
  );
}
