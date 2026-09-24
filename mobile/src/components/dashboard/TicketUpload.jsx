import { useState, useRef } from "react";
import { dashboardApi } from "../../services/api.js";

export default function TicketUpload({ reserva, onUploaded, t, comisionPct = 8 }) {
  const tt = (k, d) => { try{ const v = t ? t(k) : null; return v && v!==k ? v : d; }catch{ return d; } };
  const [precio, setPrecio] = useState(reserva.totalPagado || reserva.precioBase || "");
  const [file, setFile] = useState(null);
  const [asistio, setAsistio] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const fileRef = useRef(null);

  const pct = Number(comisionPct) || 8;
  const total = Number(precio) || 0;
  const comision = Math.round(total * (pct / 100) * 100) / 100;
  const neto = Math.round((total - comision) * 100) / 100;

  async function handleSubmit(e) {
    e.preventDefault();
    // 1 ticket por reserva (no importa comensales)
    if (reserva.ticketId) {
      setError("Esta reserva ya tiene un ticket registrado (máx. 1 por reserva)");
      return;
    }
    if (!precio || Number(precio) <= 0) {
      setError(tt("dashboard.precioRequerido", "Introduce un importe válido (>0)"));
      return;
    }
    setUploading(true);
    setError("");
    try {
      await dashboardApi.subirTicket(reserva.id, {
        totalPagado: Number(precio),
        asistio,
        fileName: file?.name || "",
      });
      setSuccess(true);
      setTimeout(()=> onUploaded?.(reserva.id, asistio ? "completada" : "no_show"), 400);
    } catch (err) {
      setError(err?.message || "Error al subir ticket");
    } finally {
      setUploading(false);
    }
  }

  if (success || reserva.ticketId) {
    return (
      <div style={{background:'#d1fae5', color:'#065f46', padding:'0.7rem', borderRadius:'0.5rem', fontWeight:700, textAlign:'center', fontSize:'0.82rem'}}>
        {success ? `${tt("dashboard.ticketSubido","Ticket registrado")} · ${euro(neto)} neto · ${euro(comision)} comisión ${pct}%` : 'Ticket ya registrado (máx. 1 por reserva)'}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{display:'flex', flexDirection:'column', gap:'0.5rem', background:'var(--op-surface-low)', padding:'0.7rem', borderRadius:'0.5rem', border:'1px solid var(--op-border)'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:'0.5rem'}}>
        <strong style={{fontSize:'0.78rem'}}>{reserva.nombreRestaurante || reserva.restaurantName || tt("dashboard.reserva","Reserva")}</strong>
        <span style={{fontFamily:'ui-monospace', fontSize:'0.62rem', background:'var(--op-surface-lowest)', padding:'0.1rem 0.35rem', borderRadius:'0.3rem'}}>{reserva.codigo || reserva.id?.slice(0,6)}</span>
      </div>
      <div style={{fontSize:'0.72rem', color:'var(--op-on-variant)'}}>{reserva.fecha} {reserva.hora} · {reserva.comensales} pax · {reserva.usuarioNombre || reserva.usuarioEmail || 'Cliente'}</div>

      <label style={{display:'flex', flexDirection:'column', gap:'0.2rem'}}>
        <span style={{fontSize:'0.68rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em'}}>{tt("dashboard.precioTotal","Importe total")}</span>
        <div style={{display:'flex', gap:'0.4rem', alignItems:'center'}}>
          <input type="number" value={precio} onChange={e=> setPrecio(e.target.value)} placeholder={tt("dashboard.precioPlaceholder","45.50")} step="0.01" min="0" style={{flex:1, height:'2.2rem', padding:'0 0.6rem', border:'1px solid var(--op-outline-variant)', borderRadius:'0.5rem'}} />
          <span style={{fontSize:'0.72rem'}}>EUR</span>
        </div>
        {total>0 && (
          <div style={{display:'flex', justifyContent:'space-between', fontSize:'0.68rem', background:'white', padding:'0.35rem 0.5rem', borderRadius:'0.4rem', marginTop:'0.2rem'}}>
            <span>Comisión MIRA {pct}%: <strong>{euro(comision)}</strong></span>
            <span>Neto restaurante: <strong style={{color:'var(--op-primary)'}}>{euro(neto)}</strong></span>
          </div>
        )}
      </label>

      <label style={{display:'flex', alignItems:'center', gap:'0.4rem', fontSize:'0.78rem', cursor:'pointer', userSelect:'none'}}>
        <input type="checkbox" checked={asistio} onChange={e=> setAsistio(e.target.checked)} style={{accentColor:'var(--op-primary)'}} />
        <span style={{fontWeight:600}}>{asistio ? 'Cliente asistió' : 'No-show / No asistió'}</span>
        <span style={{fontSize:'0.62rem', color:'var(--op-on-variant)'}}>{asistio ? '(se marcará completada)' : '(se marcará no-show protegido)'}</span>
      </label>

      <label style={{display:'flex', flexDirection:'column', gap:'0.2rem'}}>
        <span style={{fontSize:'0.68rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em'}}>Ticket / factura (opcional)</span>
        <input type="file" ref={fileRef} accept="image/*,.pdf,.csv,.xml" onChange={e=> setFile(e.target.files?.[0] || null)} style={{fontSize:'0.78rem'}} />
        {file && <span style={{fontSize:'0.68rem', color:'var(--op-on-variant)'}}>{file.name} · {(file.size/1024).toFixed(1)} KB</span>}
      </label>

      {error && <span style={{color:'#b44d3e', fontSize:'0.78rem', background:'#ffdad6', padding:'0.35rem 0.5rem', borderRadius:'0.4rem'}}>{error}</span>}

      <button type="submit" disabled={uploading} className="op-btn-primary" style={{justifyContent:'center'}}>
        {uploading ? tt("otros.cargando","Cargando…") : (<><span className="material-symbols-outlined" style={{fontSize:14}}>upload</span> Registrar ticket y {asistio? 'confirmar asistencia' : 'marcar no-show'}</>)}
      </button>
    </form>
  );
}
function euro(v){ return `${Number(v||0).toFixed(2)}\u20AC`; }
