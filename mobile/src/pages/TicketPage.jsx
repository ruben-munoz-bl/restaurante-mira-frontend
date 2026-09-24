import { useState } from 'react';
import TicketDetail from '../components/tickets/TicketDetail.jsx';

export default function TicketPage() {
  const hash = window.location.hash;
  const match = hash.match(/#\/ticket\/(.+)/);
  const ticketId = match ? match[1] : null;

  if (!ticketId) {
    return (
      <div className="puntos-page">
        <p>Ticket no encontrado</p>
      </div>
    );
  }

  return (
    <div className="puntos-page">
      <TicketDetail ticketId={ticketId} />
    </div>
  );
}
