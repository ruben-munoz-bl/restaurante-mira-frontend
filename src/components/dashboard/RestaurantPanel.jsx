import { useState, useEffect } from "react";
import { dashboardApi } from "../../services/api.js";
import { RevenueLineChart, ReservationsPieChart, RevenueBarChart } from "./Charts.jsx";
import StatsCard from "./StatsCard.jsx";
import ReservationActions from "./ReservationActions.jsx";
import TicketUpload from "./TicketUpload.jsx";
import { useT } from "../../i18n/index.jsx";
import es from "../../i18n/es.js";
import ca from "../../i18n/ca.js";
import en from "../../i18n/en.js";

const TRADS = { es, ca, en };

const TABS = ["info", "facturacion", "reservas", "tickets"];

export default function RestaurantPanel({ usuario }) {
  const t = useT(TRADS);
  const [tab, setTab] = useState("info");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!usuario?.uid) return;
    let vivo = true;
    setLoading(true);
    dashboardApi.getMyRestaurant()
      .then(d => { if (vivo) { setData(d); setFormData(d.restaurante); setLoading(false); } })
      .catch(e => { if (vivo) { setError(e.message || 'No se pudo cargar el restaurante'); setLoading(false); } });
    return () => { vivo = false; };
  }, [usuario]);

  function handleEditChange(field, value) {
    setFormData(prev => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      await dashboardApi.updateRestaurant(data.restaurante.id, formData);
      setData(prev => ({ ...prev, restaurante: { ...prev.restaurante, ...formData } }));
      setEditing(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function handleReservationChange(reservaId, action) {
    setData(prev => {
      if (!prev) return prev;
      const newReservas = prev.proximasReservas.map(r =>
        r.id === reservaId ? { ...r, estado: action === "confirmar" ? "completada" : action === "no_show" ? "no_show" : "cancelada" } : r
      );
      return { ...prev, proximasReservas: newReservas };
    });
  }

  if (loading) return <section className="auth-pagina"><div className="auth-tarjeta tarjeta-ancha"><p>{t("otros.cargando")}</p></div></section>;
  if (error && !data) return <section className="auth-pagina"><div className="auth-tarjeta tarjeta-ancha"><h1>{t("dashboard.miRestaurante")}</h1><p className="auth-error">{error}</p><p style={{fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem'}}>Asegúrate de tener un restaurante creado. Si eres empresa, ve a "Mi cuenta" → "Añadir restaurante" para crear uno primero.</p></div></section>;
  if (!data) return null;

  const { restaurante, stats, proximasReservas, ingresosPorMes, ticketsRecientes } = data;

  const mesEntries = Object.entries(ingresosPorMes || {}).sort(([a], [b]) => a.localeCompare(b));
  const totalFacturacion = mesEntries.reduce((s, [, d]) => s + d.facturacion, 0);
  const totalComisiones = mesEntries.reduce((s, [, d]) => s + d.comisiones, 0);

  return (
    <section className="auth-pagina pagina-ancha">
      <div className="auth-tarjeta tarjeta-ancha">
        <div className="dash-header">
          <h1 id="dash-titulo">{restaurante.nombre || t("dashboard.miRestaurante")}</h1>
          <span className={`dash-status ${restaurante.activo ? "dash-active" : "dash-inactive"}`}>
            {restaurante.activo ? t("dashboard.activo") : t("dashboard.inactivo")}
          </span>
        </div>

        <div className="tabs" role="tablist">
          {TABS.map(k => (
            <button key={k} type="button" role="tab" aria-selected={tab === k}
              className={tab === k ? "btn-cta btn-peq" : "btn-secundario btn-peq"}
              onClick={() => setTab(k)}>
              {t(`dashboard.tab${k.charAt(0).toUpperCase() + k.slice(1)}`)}
            </button>
          ))}
        </div>

        {tab === "info" && (
          <div className="dash-tab-content">
            <div className="dash-stats-grid">
              <StatsCard icon="📅" label={t("dashboard.reservasHoy")} value={stats.reservasHoy} color="dash-green" />
              <StatsCard icon="✅" label={t("dashboard.completadas")} value={stats.reservasCompletadas} color="dash-green" />
              <StatsCard icon="⏳" label={t("dashboard.pendientes")} value={stats.reservasPendientes} color="dash-gold" />
              <StatsCard icon="🚫" label={t("dashboard.noShows")} value={stats.reservasNoShow} color="dash-red" />
            </div>

            <div className="dash-form">
              <h3 className="dash-section-title">{t("dashboard.datosRestaurante")}</h3>
              <div className="dash-form-grid">
                {[
                  ["nombre", t("dashboard.nombre"), "text"],
                  ["direccion", t("dashboard.direccion"), "text"],
                  ["telefono", t("dashboard.telefono"), "tel"],
                  ["email", t("dashboard.email"), "email"],
                  ["ciudad", t("dashboard.ciudad"), "text"],
                  ["precio", t("dashboard.rangoPrecio"), "text"],
                  ["cocina", t("dashboard.tipoCocina"), "text"],
                  ["comisionPct", t("dashboard.comisionPct"), "number"],
                ].map(([field, label, type]) => (
                  <div key={field} className="dash-field">
                    <label className="dash-label">{label}</label>
                    {editing ? (
                      <input type={type} className="dash-input" value={formData[field] || ""}
                        onChange={e => handleEditChange(field, e.target.value)} />
                    ) : (
                      <span className="dash-value">{restaurante[field] || "-"}</span>
                    )}
                  </div>
                ))}
                <div className="dash-field">
                  <label className="dash-label">{t("dashboard.activo")}</label>
                  {editing ? (
                    <select className="dash-input" value={formData.activo ? "si" : "no"}
                      onChange={e => handleEditChange("activo", e.target.value === "si")}>
                      <option value="si">{t("dashboard.si")}</option>
                      <option value="no">{t("dashboard.no")}</option>
                    </select>
                  ) : (
                    <span className={`dash-status ${restaurante.activo ? "dash-active" : "dash-inactive"}`}>
                      {restaurante.activo ? t("dashboard.si") : t("dashboard.no")}
                    </span>
                  )}
                </div>
              </div>
              <div className="dash-form-actions">
                {editing ? (
                  <>
                    <button className="btn-cta btn-peq" onClick={handleSave} disabled={saving}>
                      {saving ? t("otros.cargando") : t("dashboard.guardar")}
                    </button>
                    <button className="btn-secundario btn-peq" onClick={() => { setEditing(false); setFormData(restaurante); }}>
                      {t("dashboard.cancelar")}
                    </button>
                  </>
                ) : (
                  <button className="btn-secundario btn-peq" onClick={() => setEditing(true)}>
                    {t("dashboard.editar")}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === "facturacion" && (
          <div className="dash-tab-content">
            <div className="dash-stats-grid">
              <StatsCard icon="💰" label={t("dashboard.totalFacturacion")} value={`${totalFacturacion.toFixed(2)}\u20AC`} color="dash-gold" />
              <StatsCard icon="🏦" label={t("dashboard.totalComisiones")} value={`${totalComisiones.toFixed(2)}\u20AC`} color="dash-red" />
              <StatsCard icon="🧾" label={t("dashboard.ticketPromedio")} value={`${stats.ticketPromedio}\u20AC`} color="dash-green" />
              <StatsCard icon="📊" label={t("dashboard.totalTickets")} value={ticketsRecientes.length} color="dash-blue" />
            </div>
            <RevenueLineChart data={ingresosPorMes} title={t("dashboard.evolucionIngresos")} />
            <RevenueBarChart data={ingresosPorMes} title={t("dashboard.ticketsPorMes")} />
            <h3 className="dash-section-title">{t("dashboard.historialTickets")}</h3>
            <ul className="dash-list">
              {ticketsRecientes.map(ticket => (
                <li key={ticket.id} className="dash-list-item">
                  <span><strong>{ticket.restaurantName || "-"}</strong> · {ticket.codigoReserva || "-"}</span>
                  <span>{ticket.totalPagado?.toFixed(2) || 0}\u20AC · {ticket.fecha || "-"}</span>
                </li>
              ))}
              {ticketsRecientes.length === 0 && <li className="dash-empty">{t("dashboard.sinTickets")}</li>}
            </ul>
          </div>
        )}

        {tab === "reservas" && (
          <div className="dash-tab-content">
            <h3 className="dash-section-title">{t("dashboard.proximasReservas")} ({proximasReservas.length})</h3>
            <ul className="dash-reservation-list">
              {proximasReservas.map(r => (
                <li key={r.id} className="dash-reservation-item">
                  <div className="dash-reservation-info">
                    <strong>{r.usuarioNombre || r.usuarioEmail || t("dashboard.cliente")}</strong>
                    <span className="dash-reservation-meta">
                      {r.fecha} {r.hora} · {r.comensales} pax · <code>{r.codigo}</code>
                    </span>
                    {r.comentarios && <span className="dash-reservation-comment">"{r.comentarios}"</span>}
                  </div>
                  <ReservationActions reserva={r} onStatusChange={handleReservationChange} t={t} />
                </li>
              ))}
              {proximasReservas.length === 0 && <li className="dash-empty">{t("dashboard.sinReservas")}</li>}
            </ul>
          </div>
        )}

        {tab === "tickets" && (
          <div className="dash-tab-content">
            <h3 className="dash-section-title">{t("dashboard.subirTicket")}</h3>
            <p className="dash-help-text">{t("dashboard.ticketHelp")}</p>
            <ul className="dash-reservation-list">
              {proximasReservas.filter(r => r.estado === "confirmada" || r.estado === "pendiente").map(r => (
                <li key={r.id} className="dash-reservation-item">
                  <TicketUpload reserva={r} onUploaded={() => handleReservationChange(r.id, "confirmar")} t={t} />
                </li>
              ))}
              {proximasReservas.filter(r => r.estado === "confirmada" || r.estado === "pendiente").length === 0 && (
                <li className="dash-empty">{t("dashboard.sinReservasPendientes")}</li>
              )}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
