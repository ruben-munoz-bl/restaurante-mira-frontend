import { useCallback, useEffect, useState } from "react";
import { api } from "../../services/httpClient.js";
import { useT } from "../../i18n/index.jsx";
import { rangoPanel, agruparPorDia, marcarPresentada } from "../../models/reservasPanelModel.js";
import OfertasEscanner from "./OfertasEscanner.jsx";
import es from "../../i18n/es.js";
import ca from "../../i18n/ca.js";
import en from "../../i18n/en.js";

const TRADS = { es, ca, en };
const RECARGA_MS = 30000;

const hoyMadrid = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });

/**
 * Reservas y pedidos del restaurante (M10): hoy y los próximos días, con el
 * pedido anticipado y la marca de presentada. El escáner (M11) hace el
 * check-in de los QR `r1.` y marca la fila al momento.
 */
export default function ReservasPedidos({ restauranteId }) {
  const t = useT(TRADS);
  const [reservas, setReservas] = useState(null);
  const [error, setError] = useState(false);
  const [soloPedido, setSoloPedido] = useState(false);
  const [abierta, setAbierta] = useState({});
  const [escaner, setEscaner] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const q = new URLSearchParams({ restauranteId: String(restauranteId), ...rangoPanel(hoyMadrid()) });
      const d = await api.get(`/v1/reservations/restaurante?${q}`);
      setReservas(Array.isArray(d?.data) ? d.data : []);
      setError(false);
    } catch {
      setError(true);
    }
  }, [restauranteId]);

  useEffect(() => { setReservas(null); cargar(); }, [cargar]);
  useEffect(() => {
    const id = setInterval(() => { if (!document.hidden) cargar(); }, RECARGA_MS);
    return () => clearInterval(id);
  }, [cargar]);

  const onCheckin = useCallback((r) => setReservas((l) => marcarPresentada(l, r?.reserva)), []);

  const hoy = hoyMadrid();
  const grupos = agruparPorDia(reservas, { soloPedido });
  const etiquetaDia = (f) => (f === hoy ? t("reservasPanel.hoy") : new Date(`${f}T12:00:00`).toLocaleDateString(t("modelos.locale"), { weekday: "short", day: "2-digit", month: "short" }));
  const chip = (texto, color) => (
    <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "0.1rem 0.45rem", borderRadius: 999, background: color, color: "#fff", whiteSpace: "nowrap" }}>{texto}</span>
  );

  return (
    <div className="op-panel" data-test="reservas-pedidos">
      <div className="op-panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: "0.5rem", flexWrap: "wrap" }}>
        <div>
          <h3 className="op-panel-title">
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--op-primary)" }}>restaurant_menu</span>
            {t("reservasPanel.titulo")}
          </h3>
          <p style={{ fontSize: "0.75rem", color: "var(--op-on-variant)" }}>{t("reservasPanel.subtitulo")}</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ fontSize: "0.78rem", display: "inline-flex", gap: "0.3rem", alignItems: "center" }}>
            <input type="checkbox" checked={soloPedido} onChange={(e) => setSoloPedido(e.target.checked)} /> {t("reservasPanel.soloConPedido")}
          </label>
          <button type="button" className={escaner ? "op-btn-ghost" : "op-btn-primary"} onClick={() => setEscaner((v) => !v)} data-test="reservas-escanear">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>qr_code_scanner</span> {escaner ? t("reservasPanel.ocultarEscaner") : t("reservasPanel.escanear")}
          </button>
        </div>
      </div>

      {escaner && <OfertasEscanner restauranteId={restauranteId} onCheckin={onCheckin} />}

      {error && (
        <p className="ofertas-error" role="alert">
          {t("reservasPanel.error")}{" "}
          <button type="button" className="op-btn-ghost" onClick={cargar}>{t("reservasPanel.reintentar")}</button>
        </p>
      )}
      {!error && reservas === null && <p className="op-empty">{t("otros.cargando")}</p>}
      {!error && reservas && grupos.length === 0 && <p className="op-empty">{t("reservasPanel.sinReservas")}</p>}

      {grupos.map((g) => (
        <section key={g.fecha} style={{ marginTop: "0.75rem" }}>
          <h4 style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--op-on-variant)", margin: "0 0 0.25rem" }}>{etiquetaDia(g.fecha)}</h4>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }} data-test="reservas-dia">
            {g.reservas.map((r) => (
              <li key={r.id} style={{ padding: "0.5rem 0", borderBottom: "1px solid var(--op-border)", fontSize: "0.82rem", opacity: r.cancelada ? 0.55 : 1 }}>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                  <strong style={{ minWidth: "3rem" }}>{r.hora}</strong>
                  <span style={{ flex: 1, minWidth: 120 }}>
                    {r.cliente?.nombre || "—"}
                    <small style={{ color: "var(--op-on-variant)", marginLeft: "0.4rem" }}>{r.codigo} · {t("reservasPanel.personas", { n: r.comensales })}</small>
                  </span>
                  {r.cancelada && chip(t("reservasPanel.cancelada"), "#6b7280")}
                  {r.presentada && chip(`✓ ${t("reservasPanel.presentada")}`, "#047857")}
                  {r.pedido && (
                    <button type="button" className="op-btn-ghost" style={{ padding: "0.15rem 0.5rem", fontSize: "0.75rem" }}
                      aria-expanded={Boolean(abierta[r.id])} onClick={() => setAbierta((a) => ({ ...a, [r.id]: !a[r.id] }))}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>receipt_long</span>
                      {t("reservasPanel.conPedido")} · {Number(r.pedido.total).toFixed(2)} €
                    </button>
                  )}
                </div>
                {r.pedido && abierta[r.id] && (
                  <ul style={{ listStyle: "none", padding: "0.35rem 0 0 3.5rem", margin: 0 }}>
                    {r.pedido.lineas.map((l) => (
                      <li key={l.platoId} style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", maxWidth: 360 }}>
                        <span><strong>{l.cantidad} ×</strong> {l.nombre}</span><span>{Number(l.subtotal).toFixed(2)} €</span>
                      </li>
                    ))}
                  </ul>
                )}
                {r.comentarios && <p style={{ margin: "0.25rem 0 0 3.5rem", fontStyle: "italic", color: "var(--op-on-variant)" }}>“{r.comentarios}”</p>}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
