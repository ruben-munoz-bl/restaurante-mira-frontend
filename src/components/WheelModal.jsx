import { useState, useEffect, useCallback, useRef } from 'react';

const PRIZES = [
  { puntos: 20, label: '20', color: '#006A55', textColor: '#fff' },
  { puntos: 25, label: '25', color: '#05886d', textColor: '#fff' },
  { puntos: 30, label: '30', color: '#FFC800', textColor: '#1a1a1a' },
  { puntos: 50, label: '50', color: '#FF8600', textColor: '#fff' },
  { puntos: 100, label: '100', color: '#FF4B4B', textColor: '#fff' },
];

const SEGMENT_ANGLE = 360 / PRIZES.length;

function createConfetti() {
  const colors = ['#006A55', '#FFC800', '#FF4B4B', '#10B981', '#F59E0B', '#3B82F6'];
  for (let i = 0; i < 50; i++) {
    const el = document.createElement('div');
    el.className = 'streak-confetti';
    const size = Math.random() * 10 + 6;
    el.style.width = size + 'px';
    el.style.height = (size * 1.4) + 'px';
    el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    el.style.left = (window.innerWidth / 2 + (Math.random() * 500 - 250)) + 'px';
    el.style.top = (window.innerHeight / 2 + (Math.random() * 200 - 100)) + 'px';
    el.style.transform = `rotate(${Math.random() * 360}deg)`;
    document.body.appendChild(el);

    const vx = (Math.random() - 0.5) * 700;
    const vy = -Math.random() * 500 - 200;
    const vr = (Math.random() - 0.5) * 900;
    let start = performance.now();
    const dur = 2500;

    (function anim(t) {
      const e = (t - start) / dur;
      if (e < 1) {
        el.style.left = (window.innerWidth / 2 + vx * e) + 'px';
        el.style.top = (window.innerHeight / 2 + vy * e + 700 * e * e) + 'px';
        el.style.transform = `rotate(${vr * e}deg) scale(${1 - e * 0.5})`;
        el.style.opacity = (1 - e).toString();
        requestAnimationFrame(anim);
      } else {
        el.remove();
      }
    })(performance.now());
  }
}

export default function WheelModal({ onSpin, onClose }) {
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [error, setError] = useState(false);
  const wheelRef = useRef(null);

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  const handleSpin = useCallback(async () => {
    if (spinning || result) return;
    setSpinning(true);
    setError(false);

    let prize;
    try {
      prize = await onSpin?.();
    } catch {
      setError(true);
      setSpinning(false);
      return;
    }

    if (!prize) {
      setError(true);
      setSpinning(false);
      return;
    }

    const prizeIndex = PRIZES.findIndex((p) => p.puntos === prize.puntos);
    const matchedPrize = prizeIndex >= 0 ? PRIZES[prizeIndex] : PRIZES[0];
    const idx = prizeIndex >= 0 ? prizeIndex : 0;

    const baseAngle = idx * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
    const extraRotations = 5 * 360 + (360 - baseAngle);
    const totalRotation = rotation + extraRotations;

    setRotation(totalRotation);

    if (wheelRef.current) {
      wheelRef.current.style.transition = 'transform 5s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
      wheelRef.current.style.transform = `rotate(${totalRotation}deg)`;
    }

    setTimeout(() => {
      setResult(matchedPrize);
      setSpinning(false);
      setShowResult(true);
      createConfetti();
      setTimeout(() => {
        onClose?.({ ...matchedPrize, nuevoSaldo: prize.nuevoSaldo });
      }, 4000);
    }, 5200);
  }, [spinning, result, rotation, onSpin, onClose]);

  return (
    <div className={`wheel-overlay ${isVisible ? 'wheel-overlay--visible' : ''}`}>
      <div className={`wheel-modal ${isVisible ? 'wheel-modal--visible' : ''}`}>

        <div className="wheel-modal__header">
          <div className="wheel-modal__brand">
            <div className="wheel-modal__brand-icon">
              <img src="/mira_logo_3_circular_lente.svg" alt="MIRA" className="wheel-modal__brand-logo" />
            </div>
            <div>
              <span className="wheel-modal__brand-name">MIRA Club</span>
              <span className="wheel-modal__brand-sub">Ruleta del Día 7</span>
            </div>
          </div>
        </div>

        <div className="wheel-modal__body">
          <div className="wheel-modal__sunburst" />

          <h2 className="wheel-modal__title">
            ¡Completaste la racha de 7 días! 🎉
          </h2>
          <p className="wheel-modal__subtitle">
            Gira la ruleta para ganar entre <strong>20 y 100 MIRA Points</strong>
          </p>

          <div className="wheel-container">
            {/* Puntero */}
            <div className="wheel-pointer">▼</div>

            {/* Ruleta */}
            <div className="wheel-outer">
              <div
                ref={wheelRef}
                className="wheel-spin"
                style={{ transform: `rotate(${rotation}deg)` }}
              >
                <svg viewBox="0 0 300 300" className="wheel-svg">
                  {PRIZES.map((prize, i) => {
                    const startAngle = i * SEGMENT_ANGLE;
                    const endAngle = startAngle + SEGMENT_ANGLE;
                    const startRad = (startAngle - 90) * Math.PI / 180;
                    const endRad = (endAngle - 90) * Math.PI / 180;
                    const x1 = 150 + 140 * Math.cos(startRad);
                    const y1 = 150 + 140 * Math.sin(startRad);
                    const x2 = 150 + 140 * Math.cos(endRad);
                    const y2 = 150 + 140 * Math.sin(endRad);
                    const largeArc = SEGMENT_ANGLE > 180 ? 1 : 0;
                    const midAngle = ((startAngle + endAngle) / 2 - 90) * Math.PI / 180;
                    const textX = 150 + 95 * Math.cos(midAngle);
                    const textY = 150 + 95 * Math.sin(midAngle);
                    const textRotation = (startAngle + endAngle) / 2;

                    return (
                      <g key={i}>
                        <path
                          d={`M150,150 L${x1},${y1} A140,140 0 ${largeArc},1 ${x2},${y2} Z`}
                          fill={prize.color}
                          stroke="#fff"
                          strokeWidth="2"
                        />
                        <text
                          x={textX}
                          y={textY}
                          fill={prize.textColor}
                          fontSize="22"
                          fontWeight="900"
                          textAnchor="middle"
                          dominantBaseline="central"
                          transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                          style={{ fontFamily: 'var(--fuente-display, sans-serif)' }}
                        >
                          {prize.label}
                        </text>
                      </g>
                    );
                  })}
                  {/* Centro */}
                  <circle cx="150" cy="150" r="30" fill="#fff" stroke="#e5e7eb" strokeWidth="2" />
                  <circle cx="150" cy="150" r="12" fill="var(--primary-container, #006A55)" />
                </svg>
              </div>
            </div>
          </div>

          {!result && !error && (
            <button
              className={`wheel-spin-btn ${spinning ? 'wheel-spin-btn--spinning' : ''}`}
              onClick={handleSpin}
              disabled={spinning}
            >
              {spinning ? 'Girando...' : '🎡 ¡GIRAR RULETA!'}
            </button>
          )}

          {error && (
            <div className="wheel-error">
              <p>Error al girar la ruleta. Inténtalo de nuevo.</p>
              <button className="wheel-spin-btn" onClick={handleSpin}>
                Reintentar
              </button>
            </div>
          )}
        </div>

        {/* Resultado */}
        {showResult && result && (
          <div className="wheel-result">
            <div className="wheel-result__icon">🎉</div>
            <h3 className="wheel-result__title">¡Felicidades!</h3>
            <div className="wheel-result__prize">
              <img src="/moneda-mira.png" alt="" className="wheel-result__coin" />
              <span>+{result.puntos} MIRA Points</span>
            </div>
            <p className="wheel-result__sub">Se han añadido a tu saldo</p>
          </div>
        )}
      </div>
    </div>
  );
}
