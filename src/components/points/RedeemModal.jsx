import { useState } from 'react';
import usePointsStore from '../../stores/usePointsStore.js';

export default function RedeemModal({ saldoActual, onClose }) {
  const [puntos, setPuntos] = useState(100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const { redeem } = usePointsStore();

  const multiples = [];
  for (let i = 100; i <= Math.min(saldoActual, 5000); i += 100) {
    multiples.push(i);
  }

  const descuento = (puntos * 0.01).toFixed(2);

  async function handleRedeem() {
    setLoading(true);
    setError('');
    try {
      const result = await redeem(puntos);
      setSuccess({ descuento: result.descuento, nuevoSaldo: result.nuevoSaldo });
    } catch (err) {
      setError(err.message || 'Error al canjear');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="redeem-modal">
        <div className="redeem-modal__content">
          <h3>Canje exitoso</h3>
          <div className="redeem-success">
            <span className="redeem-success__amount">{success.descuento} €</span>
            <p>Descuento aplicado a tu próximo ticket</p>
            <p className="redeem-success__saldo">Saldo: {success.nuevoSaldo} pts</p>
          </div>
          <button className="btn-cta" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="redeem-modal" onClick={onClose}>
      <div className="redeem-modal__content" onClick={(e) => e.stopPropagation()}>
        <h3>Canjear puntos</h3>
        <p className="redeem-modal__info">Mínimo 100 pts (1,00 €) · Máximo 50% del ticket</p>

        <div className="redeem-slider">
          <input
            type="range"
            min={100}
            max={Math.min(saldoActual, 5000)}
            step={100}
            value={puntos}
            onChange={(e) => setPuntos(parseInt(e.target.value))}
          />
          <div className="redeem-slider__labels">
            <span>{puntos} pts</span>
            <span className="redeem-slider__euro">= {descuento} €</span>
          </div>
        </div>

        <div className="redeem-quick">
          {multiples.filter((_, i) => i % 5 === 0).map((p) => (
            <button
              key={p}
              className={`redeem-quick__btn ${puntos === p ? 'active' : ''}`}
              onClick={() => setPuntos(p)}
            >
              {p}
            </button>
          ))}
        </div>

        {error && <p className="redeem-error">{error}</p>}

        <div className="redeem-modal__actions">
          <button className="btn-texto" onClick={onClose}>Cancelar</button>
          <button className="btn-cta" onClick={handleRedeem} disabled={loading || puntos > saldoActual}>
            {loading ? 'Canjeando...' : `Canjear ${puntos} pts`}
          </button>
        </div>
      </div>
    </div>
  );
}
