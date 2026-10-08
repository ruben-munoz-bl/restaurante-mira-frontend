import { useEffect, useState } from 'react';
import { ticketsApi } from '../../services/api.js';
import { useT } from '../../i18n/index.jsx';
import es from '../../i18n/es.js';
import ca from '../../i18n/ca.js';
import en from '../../i18n/en.js';

const TRADS = { es, ca, en };

export default function TicketDetail({ ticketId, onClose }) {
  const t = useT(TRADS);
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ticketId) return;
    ticketsApi.get(ticketId)
      .then(setTicket)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [ticketId]);

  if (loading) return <div className="ticket-loading">{t('tickets.cargando')}</div>;
  if (!ticket) return <div className="ticket-error">{t('tickets.noEncontrado')}</div>;

  return (
    <div className="ticket-detail">
      <div className="ticket-detail__header">
        <h3>{t('tickets.numero', { id: ticket.id.slice(0, 8).toUpperCase() })}</h3>
        <span className={`ticket-status ticket-status--${ticket.estado}`}>{ticket.estado}</span>
      </div>

      <div className="ticket-detail__restaurant">
        <span className="ticket-restaurant__name">{ticket.nombreRestaurante}</span>
      </div>

      <div className="ticket-detail__breakdown">
        <div className="ticket-row">
          <span>{t('tickets.precioBase')}</span>
          <span>{ticket.precioBase.toFixed(2)} €</span>
        </div>
        {ticket.descuentoAplicado > 0 && (
          <div className="ticket-row ticket-row--descuento">
            <span>{t('tickets.descuentoPuntos')}</span>
            <span>-{ticket.descuentoAplicado.toFixed(2)} €</span>
          </div>
        )}
        <div className="ticket-row ticket-row--total">
          <span>{t('tickets.totalPagado')}</span>
          <span>{ticket.totalPagado.toFixed(2)} €</span>
        </div>
        <div className="ticket-row ticket-row--comision">
          <span>{t('tickets.comisionMira', { pct: ticket.comisionPct })}</span>
          <span>{ticket.importeComision.toFixed(2)} €</span>
        </div>
        {ticket.puntosCanjeados > 0 && (
          <div className="ticket-row ticket-row--puntos">
            <span>{t('tickets.puntosCanjeados')}</span>
            <span>{ticket.puntosCanjeados} pts</span>
          </div>
        )}
      </div>

      {onClose && (
        <button className="btn-texto" onClick={onClose}>{t('otros.cerrar')}</button>
      )}
    </div>
  );
}
