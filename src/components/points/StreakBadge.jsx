import { useState, useEffect, useCallback } from 'react';

const TOTAL_DAYS = 7;

export default function StreakBadge({ rachaLogin, rachaReservas, onOpenStreak, fetchStreakData }) {
  const [loading, setLoading] = useState(false);
  const [localRacha, setLocalRacha] = useState(rachaLogin);

  useEffect(() => {
    setLocalRacha(rachaLogin);
  }, [rachaLogin]);

  useEffect(() => {
    if (!fetchStreakData) return;
    let alive = true;
    fetchStreakData()
      .then((data) => {
        if (!alive) return;
        if (data?.racha) setLocalRacha(data.racha);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const dias = localRacha?.dias || 0;
  const multiplicador = rachaReservas?.multiplicador || 1;
  const semanas = rachaReservas?.semanasConsecutivas || 0;
  const yaReclamado = Boolean(localRacha?.yaReclamado);
  const esDia7 = (localRacha?.dia7Disponible ?? dias >= 7) || dias >= 7;
  const puntosHoy = yaReclamado ? 0 : (localRacha?.puntosHoy ?? (esDia7 ? 0 : Math.min(5 + 3 * Math.max(0, dias), 15)));
  const diasRestantes = Math.max(0, TOTAL_DAYS - dias);
  const progreso = Math.min((dias / TOTAL_DAYS) * 100, 100);

  const handleClick = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const data = await fetchStreakData?.();
      if (data?.racha) setLocalRacha(data.racha);
      onOpenStreak?.(data || { racha: localRacha, puntos: 0, yaReclamado: false });
    } catch {
      onOpenStreak?.({ racha: localRacha, puntos: 0, yaReclamado: false });
    } finally {
      setLoading(false);
    }
  }, [loading, fetchStreakData, onOpenStreak, localRacha]);

  return (
    <div className="streak-badge" onClick={handleClick} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && handleClick()}>
      <div className="streak-badge__fire-section">
        <div className={`streak-badge__fire-img-wrap ${esDia7 ? 'streak-badge__fire-img-wrap--ready' : ''}`}>
          <img src="/racha-fuego.png" alt="Racha" className="streak-badge__fire-img" />
          {!esDia7 && <span className="streak-badge__fire-count">{dias}</span>}
          {esDia7 && <span className="streak-badge__fire-count streak-badge__fire-count--wheel">🎡</span>}
        </div>
        <div className="streak-badge__fire-info">
          <span className="streak-badge__fire-title">
            {esDia7 ? '¡Ruleta lista!' : `Racha: ${dias} día${dias !== 1 ? 's' : ''}`}
          </span>
          <span className="streak-badge__fire-sub">
            {esDia7
              ? 'Toca para girar la ruleta y ganar hasta 100 MIRA pts'
              : dias === 0
                ? 'Entra hoy para empezar tu racha'
                : `+${puntosHoy} MIRA pts hoy${diasRestantes > 0 ? ` · ${diasRestantes} días para la ruleta` : ''}`
            }
          </span>
        </div>
        <div className="streak-badge__fire-arrow">
          {loading ? '⏳' : '→'}
        </div>
      </div>

      <div className="streak-badge__progress-section">
        <div className="streak-badge__progress-header">
          <span className="streak-badge__progress-label">Progreso de racha</span>
          <span className="streak-badge__progress-count">{dias}/7 días</span>
        </div>
        <div className="streak-badge__progress-bar">
          <div className="streak-badge__progress-fill" style={{ width: `${progreso}%` }} />
          {[1, 2, 3, 4, 5, 6, 7].map((d) => (
            <div
              key={d}
              className={`streak-badge__progress-dot ${d <= dias ? 'streak-badge__progress-dot--done' : ''} ${d === 7 && esDia7 ? 'streak-badge__progress-dot--wheel' : ''}`}
            />
          ))}
        </div>
        <div className="streak-badge__progress-days">
          {[1, 2, 3, 4, 5, 6, 7].map((d) => (
            <span key={d} className={`streak-badge__progress-day-label ${d <= dias ? 'streak-badge__progress-day-label--done' : ''}`}>
              {d === 7 ? '🎡' : d}
            </span>
          ))}
        </div>
      </div>

      {semanas > 0 && (
        <div className="streak-badge__reserva">
          <span className="streak-badge__icon">⭐</span>
          <div className="streak-badge__info">
            <span className="streak-badge__value">x{multiplicador}</span>
            <span className="streak-badge__label">{semanas} semana{semanas > 1 ? 's' : ''}</span>
          </div>
        </div>
      )}
    </div>
  );
}
