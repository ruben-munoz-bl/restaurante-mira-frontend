import { useState, useEffect } from "react";
import { dashboardApi } from "../../services/api.js";
import { RevenueLineChart, ReservationsPieChart, RevenueBarChart, RestaurantPerformanceChart } from "./Charts.jsx";
import StatsCard from "./StatsCard.jsx";
import ReservationActions from "./ReservationActions.jsx";
import TicketUpload from "./TicketUpload.jsx";
import { useT } from "../../i18n/index.jsx";
import es from "../../i18n/es.js";
import ca from "../../i18n/ca.js";
import en from "../../i18n/en.js";

const TRADS = { es, ca, en };

const TABS = ["analytics", "reservas", "usuarios", "restaurantes"];

export default function AdminPanel({ usuario }) {
  const t = useT(TRADS);
  const [tab, setTab] = useState("analytics");
  const [data, setData] = useState(null);
  const [users, setUsers] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [restData, setRestData] = useState(null);
  const [userSearch, setUserSearch] = useState("");
  const [pointsModal, setPointsModal] = useState(null);
  const [pointsCant, setPointsCant] = useState("");
  const [pointsMotivo, setPointsMotivo] = useState("");

  useEffect(() => {
    if (!usuario?.uid) return;
    let vivo = true;
    setLoading(true);
    Promise.all([dashboardApi.getAdmin(), dashboardApi.getUsers()])
      .then(([d, u]) => {
        if (vivo) { setData(d); setUsers(u); setLoading(false); }
      })
      .catch(e => { if (vivo) { setError(e.message); setLoading(false); } });
    return () => { vivo = false; };
  }, [usuario]);

  async function handleViewRestaurant(id) {
    setSelectedRestaurant(id);
    try {
      const d = await dashboardApi.getRestaurant(id);
      setRestData(d);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleAddPoints(uid) {
    if (!pointsCant || !pointsMotivo) return;
    try {
      await dashboardApi.addPointsManual(uid, Number(pointsCant), pointsMotivo);
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, saldoPuntos: (u.saldoPuntos || 0) + Number(pointsCant) } : u));
      setPointsModal(null);
      setPointsCant("");
      setPointsMotivo("");
    } catch (e) {
      setError(e.message);
    }
  }

  function handleReservationChange(reservaId, action) {
    setData(prev => {
      if (!prev) return prev;
      const newTickets = prev.ticketsRecientes.map(r =>
        r.id === reservaId ? { ...r, estado: action === "confirmar" ? "completada" : action === "no_show" ? "no_show" : "cancelada" } : r
      );
      return { ...prev, ticketsRecientes: newTickets };
    });
  }

  if (loading) return <section className="auth-pagina"><div className="auth-tarjeta tarjeta-ancha"><p>{t("otros.cargando")}</p></div></section>;
  if (error && !data) return <section className="auth-pagina"><div className="auth-tarjeta tarjeta-ancha"><p className="auth-error">{error}</p></div></section>;
  if (!data) return null;

  const { stats, reservasPorRestaurante, facturacionPorMes, ticketsRecientes } = data;
  const filteredUsers = users.filter(u =>
    !userSearch || (u.nombre || "").toLowerCase().includes(userSearch.toLowerCase()) || (u.email || "").toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <section className="auth-pagina pagina-ancha">
      <div className="auth-tarjeta tarjeta-ancha">
        <div className="dash-header">
          <h1>{t("dashboard.panelAdmin")}</h1>
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

        {tab === "analytics" && (
          <div className="dash-tab-content">
            <div className="dash-stats-grid">
              <StatsCard icon="💰" label={t("dashboard.totalFacturacion")} value={`${stats.totalFacturacion.toFixed(2)}\u20AC`} color="dash-gold" />
              <StatsCard icon="🏦" label={t("dashboard.totalComisiones")} value={`${stats.totalComisiones.toFixed(2)}\u20AC`} color="dash-red" />
              <StatsCard icon="📅" label={t("dashboard.totalReservas")} value={stats.totalReservas} color="dash-green" />
              <StatsCard icon="👥" label={t("dashboard.usuariosActivos")} value={stats.usuariosActivos} color="dash-blue" />
              <StatsCard icon="✅" label={t("dashboard.completadas")} value={stats.reservasCompletadas} color="dash-green" />
              <StatsCard icon="🚫" label={t("dashboard.noShows")} value={stats.reservasNoShow} color="dash-red" />
              <StatsCard icon="🏷️" label={t("dashboard.promosActivas")} value={`${stats.promosActivas}/${stats.totalPromociones}`} color="dash-gold" />
            </div>
            <RevenueLineChart data={facturacionPorMes} title={t("dashboard.evolucionIngresos")} />
            <ReservationsPieChart
              completadas={stats.reservasCompletadas}
              canceladas={stats.reservasCanceladas}
              noShow={stats.reservasNoShow}
              pendientes={stats.totalReservas - stats.reservasCompletadas - stats.reservasCanceladas - stats.reservasNoShow}
              title={t("dashboard.distribucionReservas")}
            />
            <RestaurantPerformanceChart data={reservasPorRestaurante} title={t("dashboard.rendimientoRestaurantes")} />
          </div>
        )}

        {tab === "reservas" && (
          <div className="dash-tab-content">
            <h3 className="dash-section-title">{t("dashboard.reservasRecientes")} ({ticketsRecientes.length})</h3>
            <ul className="dash-reservation-list">
              {ticketsRecientes.map(r => (
                <li key={r.id} className="dash-reservation-item">
                  <div className="dash-reservation-info">
                    <strong>{r.nombreRestaurante || r.restaurantName || "-"}</strong>
                    <span className="dash-reservation-meta">
                      {r.usuarioNombre || r.usuarioEmail || t("dashboard.cliente")} · {r.fecha} {r.hora} · {r.comensales} pax · <code>{r.codigo}</code>
                    </span>
                    <span className={`dash-estado-badge dash-estado-${r.estado}`}>
                      {r.estado === "completada" ? t("dashboard.completada") : r.estado === "no_show" ? t("dashboard.noShow") : r.estado === "cancelada" ? t("dashboard.cancelada") : r.estado}
                    </span>
                  </div>
                  <ReservationActions reserva={r} onStatusChange={handleReservationChange} t={t} />
                </li>
              ))}
              {ticketsRecientes.length === 0 && <li className="dash-empty">{t("dashboard.sinReservas")}</li>}
            </ul>
          </div>
        )}

        {tab === "usuarios" && (
          <div className="dash-tab-content">
            <div className="dash-search-bar">
              <input type="text" className="dash-input" placeholder={t("dashboard.buscarUsuario")}
                value={userSearch} onChange={e => setUserSearch(e.target.value)} />
            </div>
            <ul className="dash-user-list">
              {filteredUsers.map(u => (
                <li key={u.uid} className="dash-user-item">
                  <div className="dash-user-info">
                    <strong>{u.nombre || t("dashboard.sinNombre")}</strong>
                    <span className="dash-user-email">{u.email}</span>
                    <span className="dash-user-meta">
                      {t("dashboard.puntos")}: {u.saldoPuntos || 0} · {u.tipo}
                    </span>
                  </div>
                  <button className="btn-cta btn-peq" onClick={() => setPointsModal(u)}>
                    + {t("dashboard.anadirPuntos")}
                  </button>
                </li>
              ))}
              {filteredUsers.length === 0 && <li className="dash-empty">{t("dashboard.sinUsuarios")}</li>}
            </ul>

            {pointsModal && (
              <div className="dash-modal-overlay" onClick={() => setPointsModal(null)}>
                <div className="dash-modal" onClick={e => e.stopPropagation()}>
                  <h3>{t("dashboard.anadirPuntosA")} {pointsModal.nombre || pointsModal.email}</h3>
                  <div className="dash-field">
                    <label className="dash-label">{t("dashboard.cantidadPuntos")}</label>
                    <input type="number" className="dash-input" value={pointsCant} onChange={e => setPointsCant(e.target.value)} />
                  </div>
                  <div className="dash-field">
                    <label className="dash-label">{t("dashboard.motivo")}</label>
                    <input type="text" className="dash-input" value={pointsMotivo} onChange={e => setPointsMotivo(e.target.value)} />
                  </div>
                  <div className="dash-modal-actions">
                    <button className="btn-cta btn-peq" onClick={() => handleAddPoints(pointsModal.uid)}>
                      {t("dashboard.confirmar")}
                    </button>
                    <button className="btn-secundario btn-peq" onClick={() => setPointsModal(null)}>
                      {t("dashboard.cancelar")}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "restaurantes" && (
          <div className="dash-tab-content">
            {!selectedRestaurant ? (
              <>
                <h3 className="dash-section-title">{t("dashboard.restaurantes")}</h3>
                <ul className="dash-rest-list">
                  {Object.entries(reservasPorRestaurante).map(([id, r]) => (
                    <li key={id} className="dash-rest-item" onClick={() => handleViewRestaurant(id)}>
                      <div className="dash-rest-info">
                        <strong>{r.nombre || id}</strong>
                        <span>{r.total} {t("dashboard.reservas")} · {t("dashboard.completadas")}: {r.completadas} · {t("dashboard.canceladas")}: {r.canceladas}</span>
                      </div>
                      <span className="dash-arrow">→</span>
                    </li>
                  ))}
                  {Object.keys(reservasPorRestaurante).length === 0 && <li className="dash-empty">{t("dashboard.sinRestaurantes")}</li>}
                </ul>
              </>
            ) : (
              <>
                <button className="btn-secundario btn-peq" onClick={() => { setSelectedRestaurant(null); setRestData(null); }}>
                  ← {t("dashboard.volver")}
                </button>
                {restData && (
                  <>
                    <h3 className="dash-section-title">{restData.restaurante?.nombre}</h3>
                    <div className="dash-stats-grid">
                      <StatsCard icon="💰" label={t("dashboard.totalFacturacion")} value={`${restData.stats.totalFacturacion.toFixed(2)}\u20AC`} color="dash-gold" />
                      <StatsCard icon="🏦" label={t("dashboard.totalComisiones")} value={`${restData.stats.totalComisiones.toFixed(2)}\u20AC`} color="dash-red" />
                      <StatsCard icon="📅" label={t("dashboard.totalReservas")} value={restData.stats.totalReservas} color="dash-green" />
                      <StatsCard icon="🧾" label={t("dashboard.ticketPromedio")} value={`${restData.stats.ticketPromedio}\u20AC`} color="dash-blue" />
                    </div>
                    <RevenueLineChart data={restData.ingresosPorMes} title={t("dashboard.evolucionIngresos")} />
                    <ReservationsPieChart
                      completadas={restData.stats.reservasCompletadas}
                      canceladas={restData.stats.reservasCanceladas}
                      noShow={restData.stats.reservasNoShow}
                      pendientes={restData.stats.reservasPendientes}
                      title={t("dashboard.distribucionReservas")}
                    />
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
