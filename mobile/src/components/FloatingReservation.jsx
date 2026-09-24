/**
 * Floating reservation bottom sheet — slides up when a time slot is selected.
 */
import { useEffect, useRef } from 'react';
import usePointsStore from '../stores/usePointsStore.js';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';

const TRADS = { es, ca, en };

export default function FloatingReservation({ visible, restaurant, reserva, onConfirm, onClose }) {
  const t = useT(TRADS);
  const sheetRef = useRef(null);
  const descuentoPendiente = usePointsStore((s) => s.descuentoPendiente);

  useEffect(() => {
    if (!visible) return;
    function alTeclar(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', alTeclar);
    return () => window.removeEventListener('keydown', alTeclar);
  }, [visible, onClose]);

  if (!restaurant || !reserva) return null;

  const comensales = parseInt(reserva.comensales, 10) || 2;
  const ahorroPct = reserva.ahorro || 0;
  const precioBase = comensales * 18;
  const ahorro = Math.round(precioBase * ahorroPct / 100);
  const descuentoEuros = descuentoPendiente?.euros > 0 ? descuentoPendiente.euros : 0;
  const total = Math.max(0, precioBase - ahorro - descuentoEuros);

  return (
    <div
      className={`floating-sheet-overlay${visible ? ' visible' : ''}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      aria-hidden={!visible}
    >
      <div className="floating-sheet" ref={sheetRef} role="dialog" aria-label={t('floating.confirmarReserva')}>
        <div className="floating-sheet-handle" />
        <h3 className="floating-sheet-title">{restaurant.nombre}</h3>
        <p className="floating-sheet-meta">
          {reserva.fecha} · {reserva.hora} · {comensales} {comensales === 1 ? t('modelos.persona') : t('modelos.personas')}
        </p>
        <div className="floating-sheet-details">
          <div className="floating-sheet-row">
            <span>{t('floating.reserva')}</span>
            <span>{comensales} × 18 €</span>
          </div>
          {ahorroPct > 0 && (
            <div className="floating-sheet-row" style={{ color: 'var(--primary-container)' }}>
              <span>{t('floating.descuentoEpicure')}</span>
              <span>-{ahorro} €</span>
            </div>
          )}
          {descuentoEuros > 0 && (
            <div className="floating-sheet-row floating-sheet-discount">
              <span>{t('floating.descuentoPendiente')}</span>
              <span>-{descuentoEuros} €</span>
            </div>
          )}
          <div className="floating-sheet-row floating-sheet-total">
            <span>{t('floating.totalEstimado')}</span>
            <span>{total} €</span>
          </div>
        </div>
        {descuentoEuros > 0 && (
          <p className="floating-sheet-discount-hint">
            {t('detail.descuentoPendiente', { euros: descuentoEuros })}
          </p>
        )}
        <button type="button" className="btn-cta floating-sheet-btn" onClick={onConfirm}>
          {t('floating.confirmar')}
        </button>
      </div>
    </div>
  );
}
