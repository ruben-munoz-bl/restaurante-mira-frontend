import { useState } from "react";
import { dashboardApi } from "../../services/api.js";

export default function ReservationActions({ reserva, onStatusChange, t, comisionPct = 8 }) {
  const tt = (k,d)=>{ try{ const v=t?t(k):null; return v && v!==k? v : d; }catch{ return d; } };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [precio, setPrecio] = useState(reserva.totalPagado || reserva.precioBase || "");
  const [showPrice, setShowPrice] = useState(false);

  async function handleAction(action) {
    setLoading(true);
    setError("");
    try {
      const yaTieneTicket = Boolean(reserva.ticketId);
      if (action === "confirmar") {
        const total = Number(precio);
        // 1 ticket por reserva: si ya tiene, solo confirmar asistencia sin crear otro ticket
        if (total > 0 && !yaTieneTicket) {
          await dashboardApi.subirTicket(reserva.id, { totalPagado: total, asistio: true, fileName: "" });
        } else {
          await dashboardApi.confirmAttendance(reserva.id, { precioBase: yaTieneTicket ? 0 : 0 });
        }
      } else if (action === "no_show") {
        const total = Number(precio);
        if (total > 0 && !yaTieneTicket) {
          await dashboardApi.subirTicket(reserva.id, { totalPagado: total, asistio: false, fileName: "" });
        } else {
          await dashboardApi.markNoShow(reserva.id);
        }
      } else if (action === "cancelar") {
        await dashboardApi.updateReservationStatus(reserva.id, "cancelada");
      } else if (action === "completar") {
        await dashboardApi.updateReservationStatus(reserva.id, "completada");
      }
      onStatusChange?.(reserva.id, action);
    } catch (e) {
      setError(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  const estado = String(reserva.estado||'').toLowerCase();
  const activa = ['pendiente','confirmada','activa','en_mesa','en mesa'].includes(estado);
  const yaTieneTicket = Boolean(reserva.ticketId);
  const totalNum = Number(precio)||0;
  const pct = Number(comisionPct) || 8;
  const comisionPreview = totalNum>0 ? Math.round(totalNum*(pct/100)*100)/100 : 0;
  const netoPreview = totalNum>0 ? Math.round((totalNum-comisionPreview)*100)/100 : 0;

  return (
    <div className="dash-reservation-actions" style={{display:'flex', flexDirection:'column', gap:'0.4rem', minWidth:'180px'}}>
      {error && <span style={{color:'#b44d3e', fontSize:'0.78rem', background:'#ffdad6', padding:'0.3rem 0.5rem', borderRadius:'0.4rem'}}>{error}</span>}
      {activa && !yaTieneTicket && (
        <div style={{display:'flex', flexDirection:'column', gap:'0.25rem', background:'var(--op-surface-low, #f0f3ff)', padding:'0.5rem', borderRadius:'0.5rem'}}>
          <label style={{fontSize:'0.68rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <span>{tt("dashboard.precioBase","Importe ticket")}</span>
            <button type="button" onClick={()=> setShowPrice(v=>!v)} style={{fontSize:'0.62rem', background:'none', border:'none', color:'var(--op-primary)', cursor:'pointer', fontWeight:700}}>{showPrice? 'Ocultar' : 'Con ticket'}</button>
          </label>
          {showPrice && (
            <>
              <div style={{display:'flex', gap:'0.35rem', alignItems:'center'}}>
                <input type="number" value={precio} onChange={e=> setPrecio(e.target.value)} placeholder={tt("dashboard.precioPlaceholder","45.50")} step="0.01" min="0" style={{flex:1, height:'2rem', padding:'0 0.5rem', border:'1px solid var(--op-outline-variant, #bec9c0)', borderRadius:'0.4rem', fontSize:'0.82rem'}} />
                <span style={{fontSize:'0.72rem'}}>EUR</span>
              </div>
              {totalNum>0 && <div style={{fontSize:'0.62rem', display:'flex', justifyContent:'space-between', background:'white', padding:'0.25rem 0.4rem', borderRadius:'0.3rem'}}><span>Comisión {pct}%: {comisionPreview.toFixed(2)}€</span><span>Neto: {netoPreview.toFixed(2)}€</span></div>}
            </>
          )}
          {!showPrice && <span style={{fontSize:'0.62rem', color:'var(--op-on-variant, #3f4942)'}}>Se confirmará sin ticket (0€). Activa "Con ticket" para registrar importe.</span>}
        </div>
      )}
      {activa && yaTieneTicket && (
        <div style={{fontSize:'0.62rem', color:'var(--op-on-variant, #3f4942)', background:'var(--op-surface-low, #f0f3ff)', padding:'0.4rem 0.5rem', borderRadius:'0.5rem'}}>
          Ticket ya registrado para esta reserva (máx. 1 por reserva).
        </div>
      )}
      <div style={{display:'flex', gap:'0.35rem', flexWrap:'wrap'}}>
        {activa && (
          <>
            <button className="op-btn-primary" style={{fontSize:'0.72rem', padding:'0.35rem 0.6rem'}} onClick={()=> handleAction("confirmar")} disabled={loading}>
              {loading? tt("otros.cargando","...") : (<><span className="material-symbols-outlined" style={{fontSize:12}}>check</span> {tt("dashboard.confirmarAsistencia","Confirmar asistencia")}</>)}
            </button>
            <button className="op-btn-ghost" style={{fontSize:'0.72rem', padding:'0.35rem 0.6rem'}} onClick={()=> handleAction("no_show")} disabled={loading}>
              <span className="material-symbols-outlined" style={{fontSize:12}}>person_off</span> {tt("dashboard.marcarNoShow","No-show")}
            </button>
            <button className="op-btn-ghost" style={{fontSize:'0.72rem', padding:'0.35rem 0.6rem', color:'#b44d3e'}} onClick={()=> handleAction("cancelar")} disabled={loading}>
              {tt("dashboard.cancelarReserva","Cancelar")}
            </button>
          </>
        )}
        {(estado === "completada" || estado === "no_show" || estado === "cancelada" || estado==="pagado") && (
          <span className={`op-status ${estado==='completada' || estado==='pagado' ? 'pagado' : estado}`} style={{fontSize:'0.68rem'}}>{estado === "completada" || estado==="pagado" ? tt("dashboard.completada","Pagado") : estado === "no_show" ? tt("dashboard.noShow","No-show") : tt("dashboard.cancelada","Cancelada")}{reserva.totalPagado? ` · ${Number(reserva.totalPagado).toFixed(2)}€` : ''}</span>
        )}
      </div>
    </div>
  );
}
