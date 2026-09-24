import { useEffect, useState } from 'react';
import { ticketsApi } from '../../services/api.js';

export default function TicketDetail({ ticketId, onClose }) {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ticketId) return;
    ticketsApi.get(ticketId)
      .then(setTicket)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [ticketId]);

  if (loading) return <div className="ticket-loading">Cargando ticket...</div>;
  if (!ticket) return <div className="ticket-error">Ticket no encontrado</div>;

  return (
    <div className="ticket-detail">
      <div className="ticket-detail__header">
        <h3>Ticket #{ticket.id.slice(0, 8).toUpperCase()}</h3>
        <span className={`ticket-status ticket-status--${ticket.estado}`}>{ticket.estado}</span>
      </div>

      <div className="ticket-detail__restaurant">
        <span className="ticket-restaurant__name">{ticket.nombreRestaurante}</span>
      </div>

      <div className="ticket-detail__breakdown">
        <div className="ticket-row">
          <span>Precio base</span>
          <span>{ticket.precioBase.toFixed(2)} €</span>
        </div>
        {ticket.descuentoAplicado > 0 && (
          <div className="ticket-row ticket-row--descuento">
            <span>Descuento puntos</span>
            <span>-{ticket.descuentoAplicado.toFixed(2)} €</span>
          </div>
        )}
        <div className="ticket-row ticket-row--total">
          <span>Total pagado</span>
          <span>{ticket.totalPagado.toFixed(2)} €</span>
        </div>
        <div className="ticket-row ticket-row--comision">
          <span>Comisión MIRA ({ticket.comisionPct}%)</span>
          <span>{ticket.importeComision.toFixed(2)} €</span>
        </div>
        {ticket.puntosCanjeados > 0 && (
          <div className="ticket-row ticket-row--puntos">
            <span>Puntos canjeados</span>
            <span>{ticket.puntosCanjeados} pts</span>
          </div>
        )}
      </div>

      {onClose && (
        <button className="btn-texto" onClick={onClose}>Cerrar</button>
      )}
    </div>
  );
}
