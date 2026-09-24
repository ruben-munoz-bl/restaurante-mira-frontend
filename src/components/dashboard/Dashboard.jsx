import { useState, useEffect, useRef } from "react";
import { dashboardApi } from "../../services/api.js";
import { proponerNegocio, listarMisNegocios } from "../../services/negocioApi.js";
import { RevenueLineChart, ReservationsPieChart, RevenueBarChart } from "./Charts.jsx";
import ReservationActions from "./ReservationActions.jsx";
import TicketUpload from "./TicketUpload.jsx";
import { useT } from "../../i18n/index.jsx";
import { CIUDADES_CATALUNA } from "../../models/restaurantModel.js";
import es from "../../i18n/es.js";
import ca from "../../i18n/ca.js";
import en from "../../i18n/en.js";
import "./dashboard.css";

const TRADS = { es, ca, en };

const EMPTY_REST = {
  nombre: '', ciudad: '', zona: '', direccion: '', telefono: '', email: '',
  categorias: '', precio: '\u20AC\u20AC', descripcion: '', comisionPct: 10,
};

function initials(nombre) {
  if (!nombre) return 'MR';
  const parts = String(nombre).trim().split(/\s+/).slice(0,2);
  return parts.map(p=> p[0]?.toUpperCase()||'').join('') || 'MR';
}
function euro(v){ return `${Number(v||0).toFixed(2)}\u20AC`; }
function pct(v){ return `${(Number(v)||0).toFixed(1)}%`; }
const isPendienteLocal = (s)=> ['pendiente','confirmada','activa','en_mesa','en mesa'].includes(String(s||'').toLowerCase());
const isCanceladaLocal = (s)=> String(s||'').toLowerCase()==='cancelada';

export default function Dashboard({ usuario, esAdmin, perfil }) {
  const t = useT(TRADS);
  if (esAdmin) { window.location.hash = '#/admin'; return null; }

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [noRestaurant, setNoRestaurant] = useState(false);
  const [pendingNegocio, setPendingNegocio] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRest, setNewRest] = useState({ ...EMPTY_REST });
  const [creating, setCreating] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showFicha, setShowFicha] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedForecast, setSelectedForecast] = useState(null);
  const [showAllReservas, setShowAllReservas] = useState(false);
  const [dirFilter, setDirFilter] = useState('todos');
  const [showHistorial, setShowHistorial] = useState(false);
  const [showAforoModal, setShowAforoModal] = useState(false);
  const [aforoLimit, setAforoLimit] = useState(12);
  const [selectedMonth, setSelectedMonth] = useState('este-mes');
  const [fechaFiltro, setFechaFiltro] = useState(()=> new Date().toISOString().split('T')[0]);
  const [filtroTodas, setFiltroTodas] = useState(false);
  const [listaRests, setListaRests] = useState([]);
  const [showRestDropdown, setShowRestDropdown] = useState(false);
  const [loadingRestList, setLoadingRestList] = useState(false);
  const fileRef = useRef(null);
  const restDropdownRef = useRef(null);

  async function refreshRestList(currentId) {
    setLoadingRestList(true);
    try {
      const l = await dashboardApi.listMyRestaurants(currentId || data?.restaurante?.id);
      setListaRests(l);
    } catch (e) {
      console.warn('refreshRestList', e);
    } finally {
      setLoadingRestList(false);
    }
  }

  function toggleRestDropdown() {
    const next = !showRestDropdown;
    setShowRestDropdown(next);
    if (next) refreshRestList(data?.restaurante?.id);
  }

  useEffect(() => {
    if (!usuario?.uid) return;
    try {
      if (sessionStorage.getItem('mira_abrir_crear')) {
        sessionStorage.removeItem('mira_abrir_crear');
        setShowCreateForm(true);
      }
    } catch { /* ignore */ }
  }, [usuario]);

  useEffect(() => {
    if (!showRestDropdown) return;
    function onDocClick(e) {
      if (restDropdownRef.current && !restDropdownRef.current.contains(e.target)) {
        setShowRestDropdown(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showRestDropdown]);

  useEffect(() => {
    if (!usuario?.uid) return;
    let vivo = true;
    setLoading(true);
    const cargarExtra = (restId) => {
      dashboardApi.listMyRestaurants(restId)
        .then(l => { if (vivo) setListaRests(l); })
        .catch(err => { console.warn('listMyRestaurants', err); });
      if (restId && typeof sessionStorage !== 'undefined') {
        try { sessionStorage.setItem('mira_rest_activo', restId); } catch { /* ignore */ }
      }
    };
    dashboardApi.getMyRestaurant()
      .then(d => { if (vivo){ setData(d); setFormData(d.restaurante); setLoading(false); cargarExtra(d.restaurante.id); }})
      .catch(e => {
        if (!vivo) return;
        const msg = e.message || "Error al cargar";
        if (msg.includes("Restaurante no encontrado")) {
          listarMisNegocios(usuario.uid).then(negocios=>{
            if (!vivo) return;
            const pendiente = negocios.find(n=> n.estado==="pendiente");
            if (pendiente) setPendingNegocio(pendiente); else setNoRestaurant(true);
            setLoading(false);
            cargarExtra(null);
          }).catch(()=>{ if(vivo){ setNoRestaurant(true); setLoading(false); cargarExtra(null); }});
        } else { setError(msg); setLoading(false); }
      });
    return ()=>{ vivo=false; };
  }, [usuario]);

  async function handleSwitchRest(id){
    if (!id || id === data?.restaurante?.id) return;
    setShowRestDropdown(false);
    setLoading(true); setError("");
    try {
      const d = await dashboardApi.getMyRestaurant(id);
      setData(d); setFormData(d.restaurante); setEditing(false); setShowFicha(false);
      try { sessionStorage.setItem('mira_rest_activo', id); } catch { /* ignore */ }
    } catch(e){ setError(e.message); } finally { setLoading(false); }
  }

  function handleEditChange(field, value){ setFormData(prev=> ({...prev,[field]:value})); }
  async function handleSave(){
    setSaving(true); setError("");
    try{ await dashboardApi.updateRestaurant(data.restaurante.id, formData);
      setData(prev=> ({...prev, restaurante:{...prev.restaurante,...formData}})); setEditing(false); setShowFicha(false);
    }catch(e){ setError(e.message);} finally{ setSaving(false); }
  }
  function handleReservationChange(reservaId, action){
    setData(prev=>{
      if(!prev) return prev;
      // allow both "completada"/actual estado from ticket flow
      const newEstado = action==="confirmar" ? "completada" : action==="completada" ? "completada" : action==="no_show" ? "no_show" : "cancelada";
      const map = (arr)=> (arr||[]).map(r=> r.id===reservaId? {...r, estado:newEstado}:r);
      return {...prev, proximasReservas: map(prev.proximasReservas), reservasHoy: map(prev.reservasHoy), stats:{...prev.stats, reservasCompletadas: newEstado==='completada'? (prev.stats.reservasCompletadas||0)+1 : prev.stats.reservasCompletadas, reservasNoShow: newEstado==='no_show'? (prev.stats.reservasNoShow||0)+1 : prev.stats.reservasNoShow } };
    });
  }
  function handleExportLiquidacion(){
    if(!data) return;
    let list = data.ticketsRecientes||[];
    // filtro por periodo seleccionado
    if(selectedMonth==='90d'){
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate()-90);
      list = list.filter(t=> { const d=t.createdAt?.toDate? t.createdAt.toDate(): new Date(t.fecha||Date.now()); return d>=cutoff; });
    } else if(selectedMonth==='anio'){
      const y=new Date().getFullYear();
      list = list.filter(t=> { const d=t.createdAt?.toDate? t.createdAt.toDate(): new Date(t.fecha||Date.now()); return d.getFullYear()===y; });
    } else {
      // este-mes
      const m=new Date().toISOString().slice(0,7);
      list = list.filter(t=> { const f=t.fecha || (t.createdAt?.toDate? t.createdAt.toDate().toISOString().split('T')[0] : ''); return f.startsWith(m) || true; }); // keep all if no fecha
      // si no hay filtro, deja todos; si quieres estricto, descomenta siguiente linea
      // if(list.length===0) list=data.ticketsRecientes||[];
    }
    const rows = list.map(t=> ({ fecha: t.fecha || (t.createdAt?.toDate? t.createdAt.toDate().toISOString().split('T')[0] : ''), codigo: t.codigoReserva || t.id.slice(0,6), total: t.totalPagado||0, comision: t.importeComision!=null ? t.importeComision : Math.round((t.totalPagado||0)*(comisionPct/100)*100)/100, neto: t.netoRestaurante!=null ? t.netoRestaurante : Math.round(((t.totalPagado||0) - (t.importeComision!=null ? t.importeComision : (t.totalPagado||0)*(comisionPct/100)))*100)/100, cliente: t.clienteNombre||t.restauranteNombre||'' }));
    const header = ['Fecha','Codigo','Cliente','Total',`Comision ${comisionPct}%`,'Neto','Asistio'];
    const csv = [header.join(';'), ...rows.map(r=> [r.fecha,r.codigo,`"${r.cliente}"`,r.total.toFixed(2),r.comision.toFixed(2),r.neto.toFixed(2), 'si'].join(';'))].join('\n');
    const blob = new Blob(["\uFEFF"+csv], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=`liquidacion-${(data.restaurante.nombre||'restaurante').replace(/\s+/g,'_')}-${selectedMonth}-${new Date().toISOString().split('T')[0]}.csv`; a.click(); URL.revokeObjectURL(url);
  }
  async function handleSaveAforo(){
    setSaving(true);
    try{ await dashboardApi.updateRestaurant(data.restaurante.id, { maxReservasPorHora: Number(aforoLimit) });
      setData(prev=> ({...prev, restaurante:{...prev.restaurante, maxReservasPorHora:Number(aforoLimit)}}));
      setShowAforoModal(false);
    }catch(e){ setError(e.message);} finally{ setSaving(false); }
  }
  function filteredTicketsForDir(){
    if(!data) return [];
    if(dirFilter==='pendiente') return (data.ticketsRecientes||[]).filter(t=> !t.conciliado);
    // todos / premium / incidencias mock as todos for single restaurant
    return data.ticketsRecientes||[];
  }
  async function handleCreateRestaurant(e){
    e.preventDefault(); setCreating(true); setError("");
    try{
      const categoriasArr = newRest.categorias.split(",").map(s=> s.trim()).filter(Boolean);
      await proponerNegocio({ usuario, datos:{...newRest, categorias: categoriasArr}});
      setCreateSuccess(true);
      setTimeout(()=>{
        setShowCreateForm(false); setCreateSuccess(false); setNewRest({ ...EMPTY_REST });
        if (data) {
          // Already has a restaurant: keep current panel, proposal goes to admin queue
          dashboardApi.listMyRestaurants(data?.restaurante?.id).then(l=> setListaRests(l)).catch(()=>{});
          return;
        }
        setLoading(true);
        dashboardApi.getMyRestaurant().then(d=>{ setData(d); setFormData(d.restaurante); setNoRestaurant(false); setLoading(false);})
        .catch(()=>{
          listarMisNegocios(usuario.uid).then(negocios=>{
            const pendiente = negocios.find(n=> n.estado==="pendiente");
            if(pendiente) setPendingNegocio(pendiente); else setNoRestaurant(true);
            setLoading(false);
          }).catch(()=>{ setNoRestaurant(true); setLoading(false);});
        });
      },2000);
    }catch(e){ setError(e.message); } finally{ setCreating(false); }
  }

  // —— loading / empty states (keep MIRA web consistency but with op tokens) ——
  if (loading) return <section className="auth-pagina"><div className="auth-tarjeta tarjeta-ancha"><p>{t("otros.cargando")}</p></div></section>;
  if (error && !data && !noRestaurant && !pendingNegocio) return <section className="auth-pagina"><div className="auth-tarjeta tarjeta-ancha"><h1>{t("dashboard.miRestaurante")}</h1><p className="auth-error">{error}</p></div></section>;
  if (!data && !noRestaurant && !pendingNegocio && !showCreateForm) return null;

  if (pendingNegocio && !showCreateForm && !data){
    return (
      <section className="auth-pagina pagina-ancha"><div className="auth-tarjeta tarjeta-ancha" style={{maxWidth:760, margin:'0 auto', width:'100%'}}>
        <div className="op-hub" style={{padding: '1rem'}}>
          <div style={{background:'#fef3c7', border:'1px solid #fde68a', color:'#92400e', padding:'1rem', borderRadius:'0.75rem'}}>
            <p style={{fontWeight:800, display:'flex', alignItems:'center', gap:'0.4rem'}}><span className="material-symbols-outlined" style={{fontSize:18}}>schedule</span> Tu propuesta está pendiente de aprobación</p>
            <p style={{fontSize:'0.82rem', marginTop:'0.35rem'}}><strong>{pendingNegocio.nombre}</strong> ({pendingNegocio.ciudad}) está siendo revisada por un administrador. Te notificaremos cuando sea aprobada.</p>
          </div>
          <div style={{fontSize:'0.82rem', color:'var(--op-on-variant)', display:'grid', gap:'0.25rem', marginTop:'0.75rem'}}>
            <p><strong>Nombre:</strong> {pendingNegocio.nombre}</p>
            <p><strong>Ciudad:</strong> {pendingNegocio.ciudad}</p>
            <p><strong>Dirección:</strong> {pendingNegocio.direccion}</p>
            <p><strong>Cocina:</strong> {(pendingNegocio.categorias||[]).join(", ")}</p>
            <p><strong>Precio:</strong> {pendingNegocio.precio}</p>
          </div>
        </div>
      </div></section>
    );
  }
  if (noRestaurant && !showCreateForm && !data){
    return (
      <section className="auth-pagina pagina-ancha"><div className="auth-tarjeta tarjeta-ancha" style={{maxWidth:760, margin:'0 auto', width:'100%'}}>
        <div className="op-hub" style={{alignItems:'center', textAlign:'center'}}>
          <span className="material-symbols-outlined" style={{fontSize:40, color:'var(--op-primary-container)'}}>storefront</span>
          <h2 style={{fontWeight:800, fontSize:'1.2rem'}}>Aún no tienes un restaurante registrado</h2>
          <p style={{color:'var(--op-on-variant)', fontSize:'0.85rem', maxWidth:480}}>Crea uno para empezar a gestionar reservas, facturación y rendimiento operativo con el Operator Hub.</p>
          <button className="op-btn-primary" onClick={()=> setShowCreateForm(true)}><span className="material-symbols-outlined" style={{fontSize:16}}>add_business</span> Crear mi restaurante</button>
        </div>
      </div></section>
    );
  }
  if (showCreateForm){
    return (
      <section className="auth-pagina pagina-ancha"><div className="auth-tarjeta tarjeta-ancha" style={{maxWidth:760, margin:'0 auto', width:'100%'}}>
        <div className="op-hub">
          <h2 style={{fontWeight:800, fontSize:'1.1rem'}}>{data ? 'Añadir otro restaurante' : 'Crear restaurante'}</h2>
          {data && <p style={{fontSize:'0.82rem', color:'var(--op-on-variant)', marginTop:'-0.35rem'}}>Se enviará como nueva propuesta. Tu restaurante actual no cambia hasta que el admin la apruebe.</p>}
          {createSuccess ? (
            <div style={{background:'#d1fae5', color:'#065f46', padding:'1rem', borderRadius:'0.75rem', textAlign:'center'}}>
              <p style={{fontWeight:800}}>Restaurante creado correctamente</p>
              <p style={{fontSize:'0.82rem', marginTop:'0.25rem'}}>Tu propuesta está pendiente de aprobación por un administrador.</p>
            </div>
          ):(
            <form onSubmit={handleCreateRestaurant} style={{display:'grid', gap:'0.75rem'}}>
              {error && <p className="auth-error" role="alert">{error}</p>}
              <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:'0.75rem'}}>
                <label className="op-field"><span>Nombre *</span><input className="op-input" value={newRest.nombre} onChange={e=> setNewRest(p=>({...p, nombre:e.target.value}))} required /></label>
                <label className="op-field"><span>Ciudad *</span>
                  <select className="op-select" value={newRest.ciudad} onChange={e=> setNewRest(p=>({...p, ciudad:e.target.value}))} required>
                    <option value="">Elige ciudad</option>
                    {CIUDADES_CATALUNA.map(c=> <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <label className="op-field"><span>Zona *</span><input className="op-input" value={newRest.zona} onChange={e=> setNewRest(p=>({...p, zona:e.target.value}))} required /></label>
                <label className="op-field"><span>Dirección *</span><input className="op-input" value={newRest.direccion} onChange={e=> setNewRest(p=>({...p, direccion:e.target.value}))} required /></label>
                <label className="op-field"><span>Teléfono</span><input className="op-input" value={newRest.telefono} onChange={e=> setNewRest(p=>({...p, telefono:e.target.value}))} /></label>
                <label className="op-field"><span>Email</span><input className="op-input" type="email" value={newRest.email} onChange={e=> setNewRest(p=>({...p, email:e.target.value}))} /></label>
                <label className="op-field"><span>Tipo de cocina *</span><input className="op-input" value={newRest.categorias} onChange={e=> setNewRest(p=>({...p, categorias:e.target.value}))} placeholder="Italiana, Mexicana..." required /></label>
                <label className="op-field"><span>Rango de precio *</span><select className="op-select" value={newRest.precio} onChange={e=> setNewRest(p=>({...p, precio:e.target.value}))}><option value={'\u20AC'}>{'\u20AC'}</option><option value={'\u20AC\u20AC'}>{'\u20AC\u20AC'}</option><option value={'\u20AC\u20AC\u20AC'}>{'\u20AC\u20AC\u20AC'}</option></select></label>
              </div>
              <label className="op-field"><span>Descripción</span><textarea className="op-input" style={{height:'auto', padding:'0.6rem'}} rows={3} value={newRest.descripcion} onChange={e=> setNewRest(p=>({...p, descripcion:e.target.value}))} /></label>
              <div style={{display:'flex', gap:'0.5rem'}}>
                <button type="submit" className="op-btn-primary" disabled={creating}>{creating ? t("otros.cargando") : "Crear restaurante"}</button>
                <button type="button" className="op-btn-ghost" onClick={()=>{ setShowCreateForm(false); setError("");}}>Cancelar</button>
              </div>
            </form>
          )}
        </div>
      </div></section>
    );
  }
  if (!data) return null;

  const { restaurante, stats, proximasReservas, reservasHoy: reservasHoyList = [], ingresosPorMes, ticketsRecientes, finanzas, reservasParaTicket = [] } = data;
  const hoyISO = new Date().toISOString().split('T')[0];
  const hoyLabel = new Date().toLocaleDateString('es-ES', { day:'2-digit', month:'short'});
  // Finanzas persistidas (no texto plano) tiene prioridad sobre cálculo efímero
  const totalFacturacion = finanzas ? Number(finanzas.ingresosBrutos||0) : Object.values(ingresosPorMes||{}).reduce((s,d)=> s+(d.facturacion||0),0);
  const totalComisiones = finanzas ? Number(finanzas.comisiones||0) : Object.values(ingresosPorMes||{}).reduce((s,d)=> s+(d.comisiones||0),0);
  const totalTickets = finanzas ? Number(finanzas.totalTickets||0) : ticketsRecientes.length;
  // Denominador "Tickets Subidos": reservas no canceladas (las canceladas no llevan ticket)
  const reservasNoCanceladas = stats.reservasNoCanceladas || (stats.totalReservas - stats.reservasCanceladas) || stats.totalReservas;
  const ticketsPendientesSubir = Math.max(0, reservasNoCanceladas - totalTickets);
  const totalComensales = finanzas && Number(finanzas.comensalesAtendidos) ? Number(finanzas.comensalesAtendidos) : ((data.reservasHoy?.length? data.reservasHoy : proximasReservas).reduce((s,r)=> s+(Number(r.comensales)||0),0) + (stats.reservasCompletadas*2.2|0)); // finanzas persistida, fallback cálculo
  const baseImponible = totalFacturacion / 1.10;
  const costePorPax = totalComensales ? totalComisiones/totalComensales : 0;
  const ticketMedio = stats.ticketPromedio || (totalTickets? totalFacturacion/totalTickets: 0);
  const comisionPct = Number(restaurante.comisionPct) || 8;
  const tasaEfec = totalFacturacion > 0 ? Math.round((totalComisiones / totalFacturacion) * 1000) / 10 : 0;
  const pctConciliados = reservasNoCanceladas > 0 ? Math.min(100, Math.round((totalTickets / reservasNoCanceladas) * 1000) / 10) : 0;
  const paxPorTicket = totalTickets > 0 ? (totalComensales / totalTickets) : 0;
  // Occupancy — aforo real del restaurante si existe; si no, maxReservasPorHora * 10 como techo diario configurado.
  const aforo = Number(restaurante.aforo) || (Number(restaurante.maxReservasPorHora) > 0 ? Number(restaurante.maxReservasPorHora) * 10 : null);
  const hoyComensales = (reservasHoyList||[]).reduce((s,r)=> s+(Number(r.comensales)||0),0);
  const almuerzo = (reservasHoyList||[]).filter(r=> (r.hora||'') < '16:00').reduce((s,r)=> s+(Number(r.comensales)||0),0);
  const cena = hoyComensales - almuerzo;
  const ocupacion = aforo ? Math.min(100, Math.round(hoyComensales/aforo*100)) || 0 : 0;
  const pctAlm = aforo? Math.round(almuerzo/aforo*100):0;
  const pctCena = aforo? Math.round(cena/aforo*100):0;
  const pctLibre = Math.max(0, 100 - pctAlm - pctCena);

  // Forecast grouping by fecha
  const byDate = {};
  (proximasReservas||[]).forEach(r=>{ const d=r.fecha; if(!byDate[d]) byDate[d]=[]; byDate[d].push(r); });
  const capDia = aforo || Number(restaurante.maxReservasPorHora) * 10 || 50;
  const forecastDays = Object.entries(byDate).sort(([a],[b])=>a.localeCompare(b)).slice(0,5).map(([fecha, arr])=>{
    const d = new Date(fecha+'T00:00:00');
    const dow = d.toLocaleDateString('es-ES',{ weekday:'short'}).replace('.','');
    const day = d.getDate();
    const pax = arr.reduce((s,r)=> s+(Number(r.comensales)||0),0);
    const res = arr.length;
    const pct = Math.min(100, Math.round(pax/capDia*100));
    let tag = pct>=98? 'SOLD OUT' : pct>80? 'ALTA DEMANDA' : 'DISPONIBLE';
    let tagClass = pct>=98? 'soldout' : pct>80? 'alta' : '';
    return { dow, day, fecha, res, pax, pct, tag, tagClass };
  });
  // Solo datos reales (sin mock).
  const forecastToShow = forecastDays;

  const estadoToBadge = (estado) =>{
    const s = String(estado||'').toLowerCase();
    if(['completada','pagado','pagada'].includes(s)) return { cls:'pagado', label:'Pagado' };
    if(s==='en_mesa' || s==='en mesa') return { cls:'en_mesa', label:'En mesa' };
    if(s==='confirmada') return { cls:'confirmada', label:'Confirmada' };
    if(['no_show','no-show','no show'].includes(s)) return { cls:'no_show', label:'No-show protegido' };
    if(s==='cancelada') return { cls:'cancelada', label:'Cancelada' };
    return { cls:'pendiente', label:'Pendiente' };
  };

  const nombreCorto = restaurante.nombre || 'Mi Restaurante';
  const dir = restaurante.direccion_completa || restaurante.direccion || restaurante.direccionCompleta || '-';
  const restId = restaurante.id ? `#RES-${String(restaurante.id).slice(-4).toUpperCase()}` : '#RES-????';

  return (
    <section className="auth-pagina pagina-ancha" style={{background:'#F8FAFC', margin:'0 -1.5rem', padding:'1rem 1.5rem 2rem'}}>
      <div style={{maxWidth:1280, margin:'0 auto', width:'100%'}} className="op-hub-wrap">
        <div className="op-hub">
          {/* Top Operational Control Bar */}
          <div className="op-topbar">
            <div className="op-topbar-left">
              <div style={{display:'flex', alignItems:'center', gap:'0.5rem', flexWrap:'wrap'}}>
                <span className="op-live-badge"><span className="op-live-dot"></span> Operator Hub Live</span>
                <span style={{fontSize:'0.68rem', color:'var(--op-outline)'}}>/</span>
                <span style={{fontSize:'0.68rem', fontWeight:600, color:'var(--op-on-variant)'}}>Gestión de Restaurantes &amp; Rendimiento Operativo</span>
              </div>
              <div className="op-topbar-meta">
                <div className="op-rest-selector-wrap" ref={restDropdownRef}>
                  <div
                    className="op-rest-selector"
                    onClick={toggleRestDropdown}
                    title="Cambiar restaurante"
                    role="button"
                  >
                    <div className="op-rest-avatar">{initials(nombreCorto)}</div>
                    <div>
                      <div className="op-rest-name">{nombreCorto} <span className="material-symbols-outlined" style={{fontSize:12, color:'var(--op-secondary)', fontVariationSettings:"'FILL' 1"}}>verified</span></div>
                      <div className="op-rest-sub">ID {restId} · {dir.slice(0,28)}</div>
                    </div>
                    <span className="material-symbols-outlined" style={{fontSize:16, color:'var(--op-on-variant)'}}>{showRestDropdown ? 'expand_less' : 'unfold_more'}</span>
                  </div>
                  {showRestDropdown && (
                    <div className="op-rest-dropdown" role="listbox">
                      <div className="op-rest-dropdown-title">
                        {loadingRestList && listaRests.length === 0
                          ? 'Cargando…'
                          : `Tus restaurantes (${listaRests.length})`}
                      </div>
                      {listaRests.length === 0 && !loadingRestList && (
                        <div className="op-rest-dropdown-empty">Sin restaurantes</div>
                      )}
                      {listaRests.map(r => (
                        <button
                          key={r.id}
                          type="button"
                          role="option"
                          aria-selected={r.id === data.restaurante.id}
                          className={`op-rest-dropdown-item ${r.id === data.restaurante.id ? 'active' : ''}`}
                          onClick={()=> handleSwitchRest(r.id)}
                        >
                          <span className="op-rest-dropdown-check material-symbols-outlined" style={{fontSize:16}}>
                            {r.id === data.restaurante.id ? 'check_circle' : 'radio_button_unchecked'}
                          </span>
                          <span className="op-rest-dropdown-info">
                            <span className="op-rest-dropdown-nombre">{r.nombre || 'Restaurante'}</span>
                            <span className="op-rest-dropdown-meta">{r.ciudad || '—'} · ID {`#RES-${String(r.id).slice(-4).toUpperCase()}`}</span>
                          </span>
                        </button>
                      ))}
                      {loadingRestList && listaRests.length > 0 && (
                        <div className="op-rest-dropdown-empty">Actualizando…</div>
                      )}
                    </div>
                  )}
                </div>
                <div className="op-date-chip"><span className="material-symbols-outlined" style={{fontSize:16}}>date_range</span>
                  <select value={selectedMonth} onChange={e=> setSelectedMonth(e.target.value)}>
                    <option value="este-mes">Este mes - {new Date().toLocaleDateString('es-ES',{month:'long', year:'numeric'})}</option>
                    <option value="90d">Últimos 90 días</option>
                    <option value="anio">Año en curso</option>
                  </select>
                </div>
                <span className="op-premium-badge"><span className="material-symbols-outlined" style={{fontSize:12}}>workspace_premium</span> {restaurante.activo !== false ? 'Partner Activo' : 'Partner Inactivo'}</span>
              </div>
            </div>
            <div className="op-topbar-actions">
              <button className="op-btn-primary" onClick={()=> setShowTicketModal(true)}><span className="material-symbols-outlined" style={{fontSize:16}}>cloud_upload</span> Cargar Tickets &amp; Facturación</button>
              <button className="op-btn-ghost" onClick={handleExportLiquidacion}><span className="material-symbols-outlined" style={{fontSize:16}}>download</span> Exportar Liquidación</button>
              <button className="op-btn-ghost" onClick={()=> setShowFicha(v=>!v)}><span className="material-symbols-outlined" style={{fontSize:16}}>storefront</span> Ficha</button>
            </div>
          </div>

          {/* Inline Ficha edit (collapsible) */}
          {showFicha && (
            <div className="op-panel" style={{border: editing? '1px solid var(--op-primary-container)': undefined}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <h3 style={{fontWeight:800, fontSize:'0.95rem'}}>Ficha del restaurante</h3>
                <button className="op-btn-ghost" onClick={()=> setShowFicha(false)}><span className="material-symbols-outlined">close</span></button>
              </div>
              <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:'0.75rem', marginTop:'0.5rem'}}>
                {[
                  ['nombre','Nombre','text'],
                  ['direccion','Dirección','text'],
                  ['telefono','Teléfono','tel'],
                  ['email','Email','email'],
                  ['ciudad','Ciudad','select'],
                  ['precio','Rango precio','text'],
                  ['cocina','Cocina','text'],
                  ['comisionPct','Comisión %','number']
                ].map(([field,label,type])=>(
                  <label key={field} className="op-field"><span>{label}</span>
                    {editing ? (
                      type === 'select' ? (
                        <select className="op-select" value={formData[field]||''} onChange={e=>handleEditChange(field,e.target.value)}>
                          <option value="">Elige ciudad</option>
                          {CIUDADES_CATALUNA.map(c=> <option key={c} value={c}>{c}</option>)}
                        </select>
                      ) : (
                        <input type={type} className="op-input" value={formData[field]||''} onChange={e=>handleEditChange(field,e.target.value)} />
                      )
                    ) : <span style={{fontSize:'0.85rem', padding:'0.35rem 0'}}>{restaurante[field]||'-'}</span>}
                  </label>
                ))}
                <label className="op-field"><span>Activo</span>
                  {editing ? <select className="op-select" value={formData.activo? 'si':'no'} onChange={e=>handleEditChange('activo', e.target.value==='si')}><option value="si">Sí</option><option value="no">No</option></select> : <span className={`op-status ${restaurante.activo? 'confirmada':'cancelada'}`}><span className="op-status-dot"></span>{restaurante.activo? 'Activo':'Inactivo'}</span>}
                </label>
              </div>
              <div style={{display:'flex', gap:'0.5rem', marginTop:'0.5rem'}}>
                {editing ? <><button className="op-btn-primary" onClick={handleSave} disabled={saving}>{saving? t("otros.cargando"):'Guardar'}</button><button className="op-btn-ghost" onClick={()=>{ setEditing(false); setFormData(restaurante);}}>Cancelar</button></> : <button className="op-btn-ghost" onClick={()=> setEditing(true)}>Editar</button>}
              </div>
            </div>
          )}

          {/* Primary KPIs */}
          <div className="op-kpi-grid">
            <div className="op-kpi-card">
              <div className="op-kpi-head">
                <div><div className="op-kpi-label">Ingresos brutos restaurante</div><div className="op-kpi-sub">Total generado en sala</div></div>
                <div className="op-kpi-icon"><span className="material-symbols-outlined">account_balance_wallet</span></div>
              </div>
              <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between', marginTop:'0.6rem'}}>
                <span className="op-kpi-value">{euro(totalFacturacion || stats.totalFacturacion || 0)}</span>
                <span className="op-kpi-trend neutral">{totalTickets} tickets</span>
              </div>
              <div className="op-kpi-foot"><span className="op-kpi-foot-label">Base imponible sin IVA:</span><span className="op-kpi-foot-val">{euro(baseImponible)}</span></div>
            </div>
            <div className="op-kpi-card">
              <div className="op-kpi-head">
                <div><div className="op-kpi-label">Comisión MIRA</div><div className="op-kpi-sub">Deducible en liquidación neta · {comisionPct}%</div></div>
                <div className="op-kpi-icon"><span className="material-symbols-outlined">receipt_long</span></div>
              </div>
              <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between', marginTop:'0.6rem'}}>
                <span className="op-kpi-value">{euro(totalComisiones || stats.totalComisiones || 0)}</span>
                <span className="op-kpi-trend neutral">Tasa efec. {tasaEfec}%</span>
              </div>
              <div className="op-kpi-foot"><span className="op-kpi-foot-label">Coste por pax confirmado:</span><span className="op-kpi-foot-val" style={{color:'var(--op-secondary)'}}>{euro(costePorPax)} / comensal</span></div>
            </div>
            <div className="op-kpi-card">
              <div className="op-kpi-head">
                <div><div className="op-kpi-label">Total tickets gestionados</div><div className="op-kpi-sub">Cuentas cerradas conciliadas</div></div>
                <div className="op-kpi-icon"><span className="material-symbols-outlined">point_of_sale</span></div>
              </div>
              <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between', marginTop:'0.6rem'}}>
                <span className="op-kpi-value">{totalTickets} <span style={{fontSize:'0.75rem', fontWeight:400, color:'var(--op-outline)'}}>uds</span></span>
                <span className="op-kpi-trend up"><span className="material-symbols-outlined" style={{fontSize:12}}>check_circle</span> {pctConciliados}% OK</span>
              </div>
              <div className="op-kpi-foot"><span className="op-kpi-foot-label">Ticket medio por comanda:</span><span className="op-kpi-foot-val">{euro(ticketMedio)}</span></div>
            </div>
            <div className="op-kpi-card">
              <div className="op-kpi-head">
                <div><div className="op-kpi-label">Comensales atendidos</div><div className="op-kpi-sub">Pax sentados &amp; facturados</div></div>
                <div className="op-kpi-icon"><span className="material-symbols-outlined">groups</span></div>
              </div>
              <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between', marginTop:'0.6rem'}}>
                <span className="op-kpi-value">{totalComensales || 0} <span style={{fontSize:'0.75rem', fontWeight:400, color:'var(--op-outline)'}}>pax</span></span>
                <span className="op-kpi-trend" style={{background:'#a1f4c6', color:'#002112'}}>{totalTickets ? paxPorTicket.toFixed(2) : '—'} pax/res</span>
              </div>
              <div className="op-kpi-foot"><span className="op-kpi-foot-label">Tickets pendientes:</span><span className="op-kpi-foot-val" style={{fontSize:'0.66rem'}}>{ticketsPendientesSubir}</span></div>
            </div>
          </div>

          {/* Reconciliation */}
          <div className="op-reco">
            <div className="op-reco-head">
              <div>
                <div className="op-reco-title">Carga y Conciliación de Tickets de Venta <span className="op-reco-badge">Sync Agora / Revo TPV</span></div>
                <p style={{fontSize:'0.72rem', color:'var(--op-on-variant)', marginTop:'0.15rem'}}>Sube los reportes Z, tickets de caja o facturas simplificadas para validar liquidaciones con MIRA Pay y pasarela bancaria.</p>
              </div>
              <div style={{display:'flex', alignItems:'center', gap:'0.4rem', background:'var(--op-surface-low)', padding:'0.35rem 0.6rem', borderRadius:'0.5rem', fontFamily:'ui-monospace,monospace', fontSize:'0.68rem'}}>
                <span style={{width:'0.45rem', height:'0.45rem', borderRadius:'50%', background:'var(--op-secondary)', display:'inline-block', animation:'opPulse 1s infinite'}}></span> Tickets conciliados: <strong>{totalTickets}</strong>
              </div>
            </div>
            <div className="op-reco-grid">
              <div className={`op-drop ${dragOver? 'dragover':''}`} onDragOver={e=>{e.preventDefault(); setDragOver(true);}} onDragLeave={()=> setDragOver(false)} onDrop={e=>{e.preventDefault(); setDragOver(false); if(e.dataTransfer.files.length) { alert('Archivos recibidos ('+e.dataTransfer.files.length+') - OCR iniciado'); setShowTicketModal(true);}}} onClick={()=> fileRef.current?.click()}>
                <div className="op-drop-icon"><span className="material-symbols-outlined" style={{fontSize:28}}>upload_file</span></div>
                <h4 style={{fontWeight:700, fontSize:'0.85rem', marginTop:'0.6rem'}}>Arrastra o sube tickets Z, cierres de caja o facturas TPV</h4>
                <p style={{fontSize:'0.72rem', color:'var(--op-on-variant)', marginTop:'0.2rem'}}>Soporta formatos <strong style={{fontFamily:'ui-monospace', color:'var(--op-on-surface)'}}>.PDF, .CSV, .XML, .JPG, .PNG</strong> (máx. 45MB por lote)</p>
                <div style={{display:'flex', gap:'0.5rem', marginTop:'0.6rem', alignItems:'center'}}>
                  <input ref={fileRef} type="file" multiple accept=".pdf,.csv,.xml,.jpg,.png" className="hidden" style={{display:'none'}} onChange={e=>{ if(e.target.files.length){ alert('Subida iniciada: '+e.target.files.length+' ticket(s)'); setShowTicketModal(true);}}} />
                  <button className="op-btn-ghost" style={{background:'var(--op-surface-lowest)', boxShadow:'0 1px 2px rgba(0,0,0,0.04)'}} onClick={e=>{e.stopPropagation(); fileRef.current?.click();}} type="button"><span className="material-symbols-outlined" style={{fontSize:14, color:'var(--op-primary)'}}>folder_open</span> Examinar archivos</button>
                  <span style={{fontSize:'0.68rem', color:'var(--op-outline)'}}>o pega desde el portapapeles</span>
                </div>
              </div>
              <div className="op-ledger">
                <div className="op-ledger-head"><span>Últimos lotes conciliados</span><button onClick={()=> setShowHistorial(true)} style={{color:'var(--op-primary)', background:'none', border:'none', fontSize:'0.68rem', fontWeight:600, cursor:'pointer'}}>Ver Historial ({ticketsRecientes.length})</button></div>
                {(ticketsRecientes.slice(0,3).length? ticketsRecientes.slice(0,3) : []).length === 0 && (
                  <p style={{fontSize:'0.68rem', color:'var(--op-on-variant)', padding:'0.5rem'}}>Sin tickets conciliados todavía.</p>
                )}
                {(ticketsRecientes.slice(0,3).length? ticketsRecientes.slice(0,3) : []).map(item=> (
                  <div key={item.id} className="op-ledger-item">
                    <div style={{display:'flex', gap:'0.5rem', alignItems:'center', minWidth:0}}>
                      <span className="material-symbols-outlined" style={{fontSize:18, color: String(item.estado).includes('Revisi')? 'var(--op-error)': String(item.fileName||item.nombre||'').includes('.csv')? 'var(--op-tertiary)':'var(--op-primary)'}}>{String(item.fileName||item.nombre||'').endsWith('.pdf')? 'picture_as_pdf' : String(item.fileName||item.nombre||'').endsWith('.csv')? 'table_chart' : 'receipt'}</span>
                      <div style={{minWidth:0}}>
                        <p style={{fontFamily:'ui-monospace,monospace', fontSize:'0.68rem', fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{item.fileName || item.nombre || item.codigoReserva || item.id?.slice(0,8) || 'Ticket'}</p>
                        <p style={{fontSize:'0.62rem', color:'var(--op-outline)'}}>{item.fecha || (item.createdAt?.toDate? item.createdAt.toDate().toLocaleDateString(): '')}</p>
                      </div>
                    </div>
                    <div style={{textAlign:'right', flex:'0 0 auto', marginLeft:'0.5rem'}}>
                      <div style={{fontFamily:'ui-monospace', fontWeight:700, fontSize:'0.72rem'}}>{euro(item.totalPagado ?? item.total ?? 0)}</div>
                      <span style={{display:'inline-flex', alignItems:'center', gap:'0.2rem', fontSize:'0.58rem', fontWeight:700, padding:'0.1rem 0.3rem', borderRadius:'0.3rem', background: String(item.estado).includes('Revisi')? '#ffdad6':'var(--op-secondary-container)', color: String(item.estado).includes('Revisi')? '#93000a':'var(--op-on-secondary-container)'}}><span style={{width:'0.25rem', height:'0.25rem', borderRadius:'50%', background:'currentColor'}}></span>{item.estado || 'Conciliado'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Dual: Reservas del Día + Previsión */}
          <div className="op-dual">
            <div className="op-panel">
              <div className="op-panel-head">
                <div>
                  <div className="op-panel-title">{filtroTodas ? 'Reservas futuras' : `Reservas del ${new Date(fechaFiltro+'T00:00:00').toLocaleDateString('es-ES',{day:'2-digit', month:'short'})}`} <span className="op-panel-date">{filtroTodas ? `todas · ${stats.totalReservas}` : fechaFiltro===hoyISO ? hoyLabel : fechaFiltro}</span></div>
                  <p style={{fontSize:'0.68rem', color:'var(--op-on-variant)'}}>{filtroTodas ? 'Todas las reservas futuras (puedes cancelar cualquiera)' : 'Filtra por fecha arriba para ver y gestionar cualquier día'}</p>
                </div>
                <div style={{background:'var(--op-surface-low)', padding:'0.35rem 0.6rem', borderRadius:'0.5rem', fontSize:'0.68rem', fontWeight:700, color:'var(--op-primary)', display:'flex', alignItems:'center', gap:'0.25rem'}}>
                  <span className="material-symbols-outlined" style={{fontSize:14}}>cloud_download</span> {hoyComensales} hoy · {(() => { const f=(data?.proximasReservas||[]).concat(data?.reservasHoy||[]).filter(r=> r.fecha===fechaFiltro && !isCanceladaLocal(r.estado)).reduce((s,r)=> s+(Number(r.comensales)||0),0); return f; })()} en {fechaFiltro===hoyISO?'hoy':fechaFiltro.slice(5)}
                </div>
              </div>
              <div className="op-occupancy">
                <div className="op-occupancy-head"><span>{aforo ? `Ocupación estimada de sala: ${ocupacion}%` : 'Pax de hoy (sin aforo configurado)'}</span><span style={{fontFamily:'ui-monospace', color:'var(--op-primary)'}}>{hoyComensales}{aforo ? ` / ${aforo} Asientos` : ' pax'}</span></div>
                <div className="op-bar"><div className="op-bar-almuerzo" style={{width: `${pctAlm}%`}} title="Almuerzo"></div><div className="op-bar-cena" style={{width: `${pctCena}%`}} title="Cena"></div><div className="op-bar-libre" style={{width:`${pctLibre}%`}}></div></div>
                <div className="op-legend"><span style={{display:'flex', alignItems:'center', gap:'0.25rem'}}><span className="op-legend-dot" style={{background:'var(--op-primary)'}}></span>Almuerzo ({almuerzo} pax)</span><span style={{display:'flex', alignItems:'center', gap:'0.25rem'}}><span className="op-legend-dot" style={{background:'#4ae183'}}></span>Cena ({cena} pax)</span><span style={{display:'flex', alignItems:'center', gap:'0.25rem'}}><span className="op-legend-dot" style={{background:'var(--op-outline-variant)'}}></span>Disponible ({aforo ? Math.max(0,aforo-hoyComensales) : '—'} pax)</span></div>
              </div>
              {/* Navegación por fecha — permite ver cualquier día y cancelar */}
              <div className="op-date-nav">
                <button className="op-date-nav-btn" onClick={()=>{ const d=new Date(fechaFiltro); d.setDate(d.getDate()-1); setFechaFiltro(d.toISOString().split('T')[0]); setFiltroTodas(false); setSelectedForecast(null); }} title="Día anterior"><span className="material-symbols-outlined" style={{fontSize:16}}>chevron_left</span></button>
                <input type="date" className="op-date-input" value={fechaFiltro} onChange={e=>{ setFechaFiltro(e.target.value); setFiltroTodas(false); setSelectedForecast(null); }} />
                <button className="op-date-nav-btn" onClick={()=>{ const d=new Date(fechaFiltro); d.setDate(d.getDate()+1); setFechaFiltro(d.toISOString().split('T')[0]); setFiltroTodas(false); setSelectedForecast(null); }} title="Día siguiente"><span className="material-symbols-outlined" style={{fontSize:16}}>chevron_right</span></button>
                <button className={`op-date-chip-btn ${fechaFiltro===hoyISO && !filtroTodas ? 'active':''}`} onClick={()=>{ setFechaFiltro(hoyISO); setFiltroTodas(false); setSelectedForecast(null); }}>Hoy</button>
                <button className={`op-date-chip-btn ${filtroTodas?'active':''}`} onClick={()=> setFiltroTodas(v=>!v)}>{filtroTodas? 'Filtrar por fecha' : 'Ver todas futuras'}</button>
                <div className="op-date-chips" style={{marginLeft:'auto'}}>
                  {Array.from({length:7}, (_,i)=>{ const d=new Date(); d.setDate(d.getDate()+i); const iso=d.toISOString().split('T')[0]; const count=(data?.proximasReservas||[]).concat(data?.reservasHoy||[]).filter(r=> r.fecha===iso && String(r.estado).toLowerCase()!=='cancelada').length; const label=d.toLocaleDateString('es-ES',{day:'2-digit', month:'short'}); return (
                    <button key={iso} onClick={()=>{ setFechaFiltro(iso); setFiltroTodas(false); setSelectedForecast(null); }} className={`op-date-chip-btn ${fechaFiltro===iso && !filtroTodas ? 'active':''}`} title={`${count} reservas`}>{label} {count? `·${count}`:''}</button>
                  );})}
                </div>
              </div>
              <div className="op-table-wrap">
                <table className="op-table">
                  <thead><tr><th>Hora / ID</th><th>Comensal &amp; Notas</th><th style={{textAlign:'center'}}>Pax</th><th>Mesa</th><th>Estado</th><th style={{textAlign:'right'}}>Ticket TPV</th></tr></thead>
                  <tbody>
                    {(()=>{ 
                      // Todas las reservas dedup para filtrar por fecha (hoy + futuras)
                      const allMap = new Map(); [...(reservasHoyList||[]), ...(proximasReservas||[])].forEach(x=> allMap.set(x.id, x));
                      // también incluir todas las del fetch original si hay más (reservas sin filtrar) — usamos allMap + dedup de proximas ya incluye hoy
                      // Para 'todas futuras' usamos todas las del restaurante
                      const allReservas = Array.from(allMap.values());
                      // Si filtroTodas: todas futuras >= hoy
                      let base;
                      if (filtroTodas) {
                        base = allReservas.filter(r=> r.fecha >= hoyISO && !isCanceladaLocal(r.estado)).sort((a,b)=> `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`));
                      } else if (selectedForecast) {
                        base = allReservas.filter(r=> r.fecha===selectedForecast && !isCanceladaLocal(r.estado)).sort((a,b)=> String(a.hora).localeCompare(String(b.hora)));
                      } else {
                        base = allReservas.filter(r=> r.fecha===fechaFiltro && !isCanceladaLocal(r.estado)).sort((a,b)=> String(a.hora).localeCompare(String(b.hora)));
                      }
                      // Si no hay nada para la fecha exacta, también buscar en todas las reservas del restaurante (por si proximasReservas está limitada a 20)
                      if (base.length===0 && !filtroTodas) {
                        const allRaw = (data?.proximasReservas||[]).concat(data?.reservasHoy||[]);
                        // ya está cubierto, pero intentamos fallback a reservas directas (ya tenemos)
                      }
                      if (base.length===0) {
                        return (<tr key="empty"><td colSpan={6} className="op-empty">Sin reservas {filtroTodas? 'futuras' : `para ${fechaFiltro}`} — {filtroTodas? 'no hay reservas próximas' : `prueba ${fechaFiltro===hoyISO? 'otro día o "Ver todas futuras"' : 'otra fecha'}`} </td></tr>);
                      }
                      return base.slice(0, showAllReservas? 50 : 8).map(r=>{
                      const badge = estadoToBadge(r.estado);
                      const mesa = r.mesa || (r.terraza? 'T-04' : `Mesa ${String(r.id).slice(-2)}`);
                      const comensal = r.usuarioNombre || r.usuarioEmail || r.email || 'Cliente';
                      const codigo = r.codigo || `#BK-${String(r.id).slice(-4).toUpperCase()}`;
                      const ticket = r.ticketTotal != null ? euro(r.ticketTotal) : (r.totalPagado != null ? euro(r.totalPagado) : 'Pendiente servicio');
                      return (
                        <tr key={r.id}>
                          <td><div className="op-mono" style={{fontWeight:800}}>{r.hora||'-'}</div><span style={{fontFamily:'ui-monospace', fontSize:'0.62rem', color:'var(--op-outline)'}}>{codigo}</span></td>
                          <td><div style={{fontWeight:700, fontSize:'0.78rem'}}>{comensal}</div><span style={{fontSize:'0.62rem', color:'var(--op-on-variant)'}}>{r.comentarios ? r.comentarios.slice(0,28) : (String(r.usuarioEmail||'').includes('vip') || Number(r.comensales)>=6 ? 'MIRA VIP' : 'Sin notas')}</span></td>
                          <td style={{textAlign:'center'}} className="op-mono">{r.comensales||0}</td>
                          <td><span className="op-mesa">{mesa}</span></td>
                          <td><span className={`op-status ${badge.cls}`}><span className="op-status-dot"></span>{badge.label}</span></td>
                          <td style={{textAlign:'right', fontFamily:'ui-monospace', fontWeight:700}}>{String(ticket).includes('Pendiente') ? (<span style={{fontSize:'0.62rem', color:'var(--op-outline)', fontWeight:400}}>{ticket}</span>) : ticket}</td>
                        </tr>
                      );
                    });
                    })()}
                  </tbody>
                </table>
              </div>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:'0.6rem', borderTop:'1px solid var(--op-surface-low)', fontSize:'0.68rem', color:'var(--op-on-variant)' }}>
                <span>{(()=>{ const allMap2=new Map(); [...(reservasHoyList||[]), ...(proximasReservas||[])].forEach(x=> allMap2.set(x.id,x)); const all2=Array.from(allMap2.values()); const cnt = filtroTodas ? all2.filter(r=> r.fecha>=hoyISO && !isCanceladaLocal(r.estado)).length : all2.filter(r=> r.fecha===fechaFiltro && !isCanceladaLocal(r.estado)).length; const shown = Math.min(showAllReservas? 50:8, cnt); return `Mostrando ${shown} de ${cnt} para ${filtroTodas? 'futuro' : fechaFiltro}`; })()}</span>
                <button onClick={()=> setShowAllReservas(v=>!v)} style={{color:'var(--op-primary)', background:'none', border:'none', fontWeight:700, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:'0.15rem'}}>{showAllReservas? 'Ver menos' : 'Abrir cuadrante de sala completo'} <span className="material-symbols-outlined" style={{fontSize:12}}>{showAllReservas? 'expand_less' : 'chevron_right'}</span></button>
              </div>
              {/* Acciones rápidas: se muestran para las reservas visibles (cualquier fecha) para poder cancelar/confirmar */}
              {(()=>{ const allMap3=new Map(); [...(reservasHoyList||[]), ...(proximasReservas||[])].forEach(x=> allMap3.set(x.id,x)); let base2; if(filtroTodas) base2=Array.from(allMap3.values()).filter(r=> r.fecha>=hoyISO && !isCanceladaLocal(r.estado)).sort((a,b)=> `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`)); else if(selectedForecast) base2=Array.from(allMap3.values()).filter(r=> r.fecha===selectedForecast && !isCanceladaLocal(r.estado)).sort((a,b)=> String(a.hora).localeCompare(String(b.hora))); else base2=Array.from(allMap3.values()).filter(r=> r.fecha===fechaFiltro && !isCanceladaLocal(r.estado)).sort((a,b)=> String(a.hora).localeCompare(String(b.hora))); const vis = base2.slice(0,3); if(vis.length===0) return null; return (
                <div style={{marginTop:'0.5rem', display:'flex', flexDirection:'column', gap:'0.4rem'}}>
                  <span style={{fontSize:'0.68rem', fontWeight:700, color:'var(--op-on-variant)'}}>Acción rápida sobre {filtroTodas? 'próximas' : fechaFiltro}:</span>
                  <div style={{display:'flex', flexWrap:'wrap', gap:'0.4rem'}}>
                    {vis.map(r=> <ReservationActions key={'act-'+r.id} reserva={r} comisionPct={comisionPct} onStatusChange={(id, act)=>{ handleReservationChange(id, act); if(act==='confirmar' || act==='no_show' || act==='cancelada'){ setTimeout(()=> dashboardApi.getMyRestaurant().then(d=> setData(prev=> ({...prev, ...d, restaurante: d.restaurante || prev.restaurante })) ).catch(()=>{}), 400); } }} t={t} />)}
                  </div>
                </div>
              ); })()}
            </div>

            <div className="op-panel">
              <div className="op-panel-head">
                <div><div className="op-panel-title">Previsión y Calendario</div><p style={{fontSize:'0.68rem', color:'var(--op-on-variant)'}}>Próximas reservas reales</p></div>
                <div style={{textAlign:'right'}}><div style={{fontWeight:800, fontSize:'1.1rem', color:'var(--op-primary)', fontVariantNumeric:'tabular-nums'}}>{stats.totalReservas || 0}</div><p style={{fontSize:'0.62rem', color:'var(--op-on-variant)'}}>{totalComensales || 0} pax acumulados</p></div>
              </div>
              <div className="op-forecast-list">
                {forecastToShow.map(d=>(
                  <div key={d.fecha} className="op-forecast-item" onClick={()=> setSelectedForecast(prev=> prev===d.fecha? null : d.fecha)} style={{cursor:'pointer', outline: selectedForecast===d.fecha? '2px solid var(--op-primary-container)': 'none', borderRadius:'0.5rem'}}>
                    <div style={{display:'flex', alignItems:'center', gap:'0.6rem', flex:1}}>
                      <div className="op-cal"><span className="op-cal-day">{d.dow}</span><span className="op-cal-num">{d.day}</span></div>
                      <div className="op-forecast-meta">
                        <div className="op-forecast-title">{d.dow} · {d.fecha} <span className={`op-tag ${d.tagClass}`}>{d.tag}</span></div>
                        <div className="op-forecast-sub">{d.pax} pax confirmados ({d.res} res) · {d.fecha}</div>
                      </div>
                    </div>
                    <div style={{textAlign:'right'}}><div style={{fontFamily:'ui-monospace', fontWeight:800, fontSize:'0.78rem', color: d.pct>=98? 'var(--op-secondary)': 'var(--op-primary)'}}>{d.pct}%</div><p style={{fontFamily:'ui-monospace', fontSize:'0.58rem', color:'var(--op-outline)'}}>{d.res} en espera</p></div>
                  </div>
                ))}
              </div>
              {forecastToShow.length === 0 && (
                <div style={{fontSize:'0.72rem', color:'var(--op-on-variant)', padding:'0.75rem'}}>Sin reservas próximas para prever.</div>
              )}
              {selectedForecast && <div style={{fontSize:'0.68rem', background:'var(--op-secondary-container)', color:'var(--op-on-secondary-container)', padding:'0.35rem 0.5rem', borderRadius:'0.4rem', display:'flex', justifyContent:'space-between', alignItems:'center'}}><span>Filtrando reservas por {selectedForecast}</span><button onClick={()=> setSelectedForecast(null)} style={{background:'none', border:'none', fontWeight:800, cursor:'pointer', color:'inherit'}}>Quitar ×</button></div>}
              <div style={{display:'flex', justifyContent:'space-between', paddingTop:'0.5rem', borderTop:'1px solid var(--op-surface-low)', fontSize:'0.68rem', color:'var(--op-on-variant)'}}><span>Aforo por hora configurable</span><button onClick={()=> { setAforoLimit(data?.restaurante?.maxReservasPorHora||12); setShowAforoModal(true); }} style={{color:'var(--op-primary)', background:'none', border:'none', fontWeight:700, cursor:'pointer'}}>Configurar aforos</button></div>
            </div>
          </div>

          {/* Directorio & Liquidaciones */}
          <div className="op-directory">
            <div className="op-dir-head">
              <div><h3 style={{fontWeight:800, fontSize:'0.95rem'}}>Directorio de Restaurantes &amp; Liquidaciones</h3><p style={{fontSize:'0.68rem', color:'var(--op-on-variant)'}}>Conmuta de restaurante, supervisa tickets pendientes y verifica retenciones por sede.</p></div>
              <div className="op-dir-filters">
                <button onClick={()=> setDirFilter('todos')} className={`op-dir-filter ${dirFilter==='todos'?'active':''}`}>Todos ({listaRests.length || 1})</button>
                <button onClick={()=> setDirFilter('premium')} className={`op-dir-filter ${dirFilter==='premium'?'active':''}`}>Activos ({restaurante.activo !== false ? 1 : 0})</button>
                <button onClick={()=> setDirFilter('incidencias')} className={`op-dir-filter ${dirFilter==='incidencias'?'active':''}`}>Con Incidencias <span style={{width:'0.35rem', height:'0.35rem', borderRadius:'50%', background:'var(--op-error)', display:'inline-block', marginLeft:'0.2rem'}}></span></button>
                <button onClick={()=> setDirFilter('pendiente')} className={`op-dir-filter ${dirFilter==='pendiente'?'active':''}`}>Pendiente de Tickets ({ticketsPendientesSubir})</button>
              </div>
            </div>
            <div className="op-table-wrap">
              <table className="op-table">
                <thead><tr><th>Restaurante &amp; ID</th><th>Ciudad / Zona</th><th style={{textAlign:'right'}}>Ingresos Mes (Bruto)</th><th style={{textAlign:'right'}}>Comisión MIRA</th><th style={{textAlign:'center'}}>Tickets Subidos</th><th style={{textAlign:'right'}}>Próx. Reservas</th><th style={{textAlign:'right'}}>Acciones</th></tr></thead>
                <tbody>
                  {dirFilter==='incidencias' ? (
                    <tr><td colSpan={7} className="op-empty">Sin incidencias críticas · Buen trabajo <span className="material-symbols-outlined" style={{fontSize:14, color:'var(--op-secondary)'}}>verified</span></td></tr>
                  ) : dirFilter==='pendiente' && ticketsPendientesSubir<=0 ? (
                    <tr><td colSpan={7} className="op-empty">Al día — no hay tickets pendientes de subir</td></tr>
                  ) : (
                  <tr className="op-dir-row active">
                    <td><div style={{display:'flex', gap:'0.4rem', alignItems:'center'}}><span style={{width:'0.45rem', height:'0.45rem', borderRadius:'50%', background:'var(--op-primary)'}}></span><div><div style={{fontWeight:800, fontSize:'0.78rem', color:'var(--op-primary)', display:'flex', gap:'0.2rem', alignItems:'center'}}>{nombreCorto} <span className="material-symbols-outlined" style={{fontSize:10, color:'var(--op-secondary)', fontVariationSettings:"'FILL' 1"}}>star</span></div><span style={{fontFamily:'ui-monospace', fontSize:'0.62rem', color:'var(--op-outline)'}}>{restId} · {restaurante.ciudad||'-'}</span></div></div></td>
                    <td style={{fontSize:'0.72rem'}}>{restaurante.ciudad||'-'} {restaurante.zona? `· ${restaurante.zona}`:''}</td>
                    <td style={{textAlign:'right', fontFamily:'ui-monospace', fontWeight:800}}>{euro(totalFacturacion)}</td>
                    <td style={{textAlign:'right', fontFamily:'ui-monospace', fontWeight:700, color:'var(--op-secondary)'}}>{euro(totalComisiones)}</td>
                    <td style={{textAlign:'center'}}><span style={{fontFamily:'ui-monospace', fontSize:'0.68rem', background:'var(--op-surface-lowest)', padding:'0.15rem 0.4rem', borderRadius:'0.3rem', boxShadow:'0 1px 2px rgba(0,0,0,0.04)'}}>1 / 1</span></td>
                    <td style={{textAlign:'right', fontFamily:'ui-monospace'}}>{stats.totalReservas} res.</td>
                    <td style={{textAlign:'right'}}><button onClick={()=> window.scrollTo({top:0, behavior:'smooth'})} className="op-btn-primary" style={{padding:'0.25rem 0.5rem', fontSize:'0.68rem'}}>Panel Activo</button></td>
                  </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div style={{display:'flex', justifyContent:'space-between', paddingTop:'0.5rem', fontSize:'0.68rem', color:'var(--op-on-variant)'}}><span>Mostrando 1 de {listaRests.length || 1} restaurantes</span><div style={{display:'flex', gap:'0.25rem', alignItems:'center'}}><span style={{padding:'0.15rem 0.35rem', borderRadius:'0.25rem', background:'var(--op-primary-container)', color:'var(--op-on-primary)', fontFamily:'ui-monospace', fontWeight:800}}>1</span></div></div>
            {/* Charts kept for data depth, styled with new palette */}
            <div style={{marginTop:'0.75rem', display:'grid', gap:'0.75rem'}}>
              <RevenueLineChart data={ingresosPorMes} title={t("dashboard.evolucionIngresos") || "Evolución ingresos"} />
              <ReservationsPieChart completadas={stats.reservasCompletadas} canceladas={stats.reservasCanceladas} noShow={stats.reservasNoShow} pendientes={stats.reservasPendientes} title={t("dashboard.distribucionReservas") || "Distribución reservas"} />
            </div>
          </div>

          {/* Help / Consistency footer */}
          <div style={{textAlign:'center', fontSize:'0.68rem', color:'var(--op-outline)', padding:'0.5rem'}}>Operator Hub · MIRA · Consistencia con web: tipografía Plus Jakarta Sans, tokens Operator, glass &amp; shadows</div>
        </div>
      </div>

      {/* Ticket Upload Modal */}
      {showTicketModal && (
        <div className="op-modal-overlay" onClick={()=> setShowTicketModal(false)}>
          <div className="op-modal" onClick={e=> e.stopPropagation()} style={{maxWidth:'38rem', background:'#ffffff', backgroundColor:'#ffffff', opacity:1}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
              <div style={{display:'flex', gap:'0.6rem', alignItems:'center'}}>
                <div style={{width:'2.2rem', height:'2.2rem', borderRadius:'0.6rem', background:'var(--op-primary-container)', color:'var(--op-on-primary)', display:'grid', placeItems:'center'}}><span className="material-symbols-outlined">receipt</span></div>
                <div><h3 style={{fontWeight:800, fontSize:'0.95rem'}}>Cargar Tickets &amp; Facturas</h3><p style={{fontSize:'0.68rem', color:'var(--op-on-variant)'}}>{nombreCorto} · ID {restId} · Comisión {comisionPct}%</p></div>
              </div>
              <button className="op-btn-ghost" style={{padding:'0.2rem'}} onClick={()=> setShowTicketModal(false)}><span className="material-symbols-outlined">close</span></button>
            </div>
            <div style={{background:'var(--op-surface-low)', borderRadius:'0.6rem', padding:'0.7rem', display:'flex', gap:'0.5rem', alignItems:'flex-start', border:'1px solid var(--op-outline-variant)'}}>
              <span className="material-symbols-outlined" style={{fontSize:20, color:'var(--op-primary)', marginTop:'0.1rem'}}>info</span>
              <div style={{fontSize:'0.72rem', lineHeight:'1.4'}}>
                <strong>¿Cómo funciona?</strong> Indica el importe total pagado por el cliente. Calculamos automáticamente la comisión MIRA del {comisionPct}% y el neto para tu liquidación. Marca si el cliente asistió para confirmar la reserva o como no-show.
                <div style={{marginTop:'0.3rem', display:'flex', gap:'0.4rem', flexWrap:'wrap'}}>
                  <span style={{background:'white', padding:'0.2rem 0.45rem', borderRadius:'0.4rem', border:'1px solid var(--op-outline-variant)', fontSize:'0.68rem'}}>Ej: 50€ → comisión {euro(50*comisionPct/100)} · neto {euro(50 - 50*comisionPct/100)}</span>
                  <span style={{background:'white', padding:'0.2rem 0.45rem', borderRadius:'0.4rem', border:'1px solid var(--op-outline-variant)', fontSize:'0.68rem'}}>Asistió: <span style={{color:'var(--op-primary)', fontWeight:700}}>completada</span> · No asistió: <span style={{color:'var(--op-error)', fontWeight:700}}>no-show</span></span>
                </div>
              </div>
            </div>
            <div style={{display:'flex', flexDirection:'column', gap:'0.6rem', maxHeight:'52vh', overflowY:'auto', paddingRight:'0.2rem', marginTop:'0.2rem'}}>
              {reservasParaTicket.length? (
                reservasParaTicket.slice(0,12).map(r=>(
                  <div key={r.id} style={{textAlign:'left'}}><TicketUpload reserva={r} comisionPct={comisionPct} onUploaded={(id, estado)=>{ handleReservationChange(id, estado==='no_show' ? 'no_show' : 'confirmar');
                    dashboardApi.getMyRestaurant().then(d=> setData(d)).catch(()=>{});
                    // no cerramos modal automáticamente para permitir varios tickets seguidos
                  }} t={t} /></div>
                ))
              ) : <p className="op-empty" style={{padding:'1.5rem'}}>Todas las reservas activas ya tienen ticket · Las nuevas reservas aparecerán aquí</p>}
            </div>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:'0.4rem', borderTop:'1px solid var(--op-surface-low)', fontSize:'0.68rem', color:'var(--op-on-variant)'}}>
              <span>{reservasParaTicket.length} reservas sin ticket · {totalTickets} subidos</span>
              <span style={{display:'inline-flex', alignItems:'center', gap:'0.2rem'}}><span className="material-symbols-outlined" style={{fontSize:14}}>lock</span> Comisión {comisionPct}% · Liquidación MIRA</span>
            </div>
            <div style={{display:'flex', justifyContent:'flex-end', gap:'0.4rem'}}>
              <button className="op-btn-ghost" onClick={()=> setShowTicketModal(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {showHistorial && (
        <div className="op-modal-overlay" onClick={()=> setShowHistorial(false)}>
          <div className="op-modal" onClick={e=> e.stopPropagation()} style={{maxWidth:'48rem', maxHeight:'85vh', overflow:'auto', background:'#ffffff', backgroundColor:'#ffffff', opacity:1}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, background:'white', paddingBottom:'0.5rem', zIndex:1}}>
              <h3 style={{fontWeight:800}}>Historial de Tickets ({ticketsRecientes.length})</h3>
              <div style={{display:'flex', gap:'0.4rem'}}>
                <button className="op-btn-ghost" style={{fontSize:'0.72rem'}} onClick={handleExportLiquidacion}><span className="material-symbols-outlined" style={{fontSize:14}}>download</span> Exportar CSV</button>
                <button className="op-btn-ghost" onClick={()=> setShowHistorial(false)}><span className="material-symbols-outlined">close</span></button>
              </div>
            </div>
            <div className="op-table-wrap" style={{marginTop:'0.5rem'}}>
              <table className="op-table">
                <thead><tr><th>Fecha</th><th>Código</th><th>Cliente</th><th style={{textAlign:'right'}}>Total</th><th style={{textAlign:'right'}}>Comisión {comisionPct}%</th><th style={{textAlign:'right'}}>Neto</th><th>Estado</th></tr></thead>
                <tbody>
                  {ticketsRecientes.length? ticketsRecientes.map(ti=> (
                    <tr key={ti.id}>
                      <td style={{fontFamily:'ui-monospace', fontSize:'0.72rem'}}>{ti.fecha || (ti.createdAt?.toDate? ti.createdAt.toDate().toLocaleDateString(): '-')}</td>
                      <td style={{fontFamily:'ui-monospace', fontSize:'0.68rem'}}>{ti.codigoReserva || ti.id.slice(0,6)}</td>
                      <td style={{fontSize:'0.72rem'}}>{ti.clienteNombre || ti.restauranteNombre || '-'}</td>
                      <td style={{textAlign:'right', fontFamily:'ui-monospace', fontWeight:700}}>{euro(ti.totalPagado||0)}</td>
                      <td style={{textAlign:'right', fontFamily:'ui-monospace', color:'var(--op-error)'}}>{euro(ti.importeComision!=null ? ti.importeComision : Math.round((ti.totalPagado||0)*(comisionPct/100)*100)/100)}</td>
                      <td style={{textAlign:'right', fontFamily:'ui-monospace', fontWeight:700, color:'var(--op-primary)'}}>{euro(ti.netoRestaurante!=null ? ti.netoRestaurante : Math.round(((ti.totalPagado||0) - (ti.importeComision!=null ? ti.importeComision : (ti.totalPagado||0)*(comisionPct/100)))*100)/100)}</td>
                      <td><span className={`op-status ${ti.asistio===false?'no_show':'pagado'}`}><span className="op-status-dot"></span>{ti.asistio===false?'No-show':'Conciliado'}</span></td>
                    </tr>
                  )) : <tr><td colSpan={7} className="op-empty">Sin tickets conciliados aún</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showAforoModal && (
        <div className="op-modal-overlay" onClick={()=> setShowAforoModal(false)}>
          <div className="op-modal" onClick={e=> e.stopPropagation()} style={{maxWidth:'28rem', background:'#ffffff', backgroundColor:'#ffffff', opacity:1}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <h3 style={{fontWeight:800}}>Configurar aforos</h3>
              <button className="op-btn-ghost" onClick={()=> setShowAforoModal(false)}><span className="material-symbols-outlined">close</span></button>
            </div>
            <p style={{fontSize:'0.78rem', color:'var(--op-on-variant)'}}>Define el máximo de reservas por franja horaria (slots {['13:00','14:00','15:00','20:00','21:00','22:00'].join(', ')}). Se guarda en la ficha del restaurante y aplica al control de disponibilidad.</p>
            <label className="op-field"><span>Máx. reservas por hora</span>
              <input type="number" min="4" max="30" value={aforoLimit} onChange={e=> setAforoLimit(e.target.value)} className="op-input" />
            </label>
            <div style={{fontSize:'0.68rem', background:'var(--op-surface-low)', padding:'0.5rem', borderRadius:'0.4rem'}}>Actual: <strong>{data?.restaurante?.maxReservasPorHora || 12} pax/hora</strong> · Nuevo: <strong>{aforoLimit}</strong></div>
            <div style={{display:'flex', justifyContent:'flex-end', gap:'0.4rem'}}>
              <button className="op-btn-ghost" onClick={()=> setShowAforoModal(false)}>Cancelar</button>
              <button className="op-btn-primary" onClick={handleSaveAforo} disabled={saving}>{saving? 'Guardando…':'Guardar aforo'}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
