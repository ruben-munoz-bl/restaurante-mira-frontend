import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { api } from "../../services/httpClient.js";
import { useT } from "../../i18n/index.jsx";
import { ESTADOS, normalizarCodigo, claveMensajeEstado, estadoDesdeError, aLlegada, agregarLlegada, esQrReserva, estadoCheckinDesdeError } from "../../models/escanerModel.js";
import es from "../../i18n/es.js";
import ca from "../../i18n/ca.js";
import en from "../../i18n/en.js";

const TRADS = { es, ca, en };
const LISTA_MS = 10000;
const ETIQUETA_ESTADO = {
  confirmada: "escaner.listaConfirmada",
  pendiente: "escaner.listaPendiente",
  caducada: "escaner.listaCaducada",
};

/**
 * Escáner de QR de llegada (G10, fase 3). Se monta en el panel de ofertas
 * del dashboard con el restaurante activo.
 *
 * Props:
 *  - restauranteId (obligatorio): valida contra POST /v1/visitas/validar y
 *    carga la lista del día con GET /v1/visitas/restaurante.
 *  - onValidar / onCargarLista (opcional): sustituyen las llamadas reales
 *    (útil para tests o datos simulados); reciben lo mismo que la API.
 *  - onCheckin (opcional): se llama con la respuesta de
 *    POST /v1/reservations/checkin cuando se escanea un QR de reserva (M11).
 */
export default function OfertasEscanner({ restauranteId, onValidar, onCargarLista, onCheckin }) {
  const t = useT(TRADS);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const loopRef = useRef(null);
  const validoRef = useRef(false);
  const montadoRef = useRef(true);

  const [camara, setCamara] = useState("inactiva"); // inactiva | activa | sin_permiso | no_disponible
  const [estado, setEstado] = useState("idle");     // idle | escaneando | validando | resultado
  const [resultado, setResultado] = useState(null); // { estado: ESTADOS.*, cliente?, texto?, descuentoPct? }
  const [manual, setManual] = useState("");
  const [llegadas, setLlegadas] = useState([]);
  const [errorLista, setErrorLista] = useState(false);

  useEffect(() => {
    montadoRef.current = true;
    return () => { montadoRef.current = false; };
  }, []);

  const cargarLista = useCallback(async () => {
    if (!restauranteId) return;
    try {
      const q = new URLSearchParams({ restauranteId: String(restauranteId) });
      const d = onCargarLista
        ? await onCargarLista(restauranteId)
        : await api.get(`/v1/visitas/restaurante?${q}`);
      if (!montadoRef.current) return;
      const filas = (Array.isArray(d?.data) ? d.data : []).map(aLlegada).filter(Boolean);
      setLlegadas(filas);
      setErrorLista(false);
    } catch {
      if (montadoRef.current) setErrorLista(true);
    }
  }, [restauranteId, onCargarLista]);

  useEffect(() => { cargarLista(); }, [cargarLista]);

  // Recarga la lista cada poco para ver llegar al cliente y que pase a «canjeada».
  useEffect(() => {
    const id = setInterval(() => { if (!document.hidden) cargarLista(); }, LISTA_MS);
    return () => clearInterval(id);
  }, [cargarLista]);

  const pararCamara = useCallback(() => {
    if (loopRef.current) cancelAnimationFrame(loopRef.current);
    loopRef.current = null;
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => () => { pararCamara(); }, [pararCamara]);

  const validar = useCallback(async (codigo) => {
    const limpio = normalizarCodigo(codigo);
    if (!limpio) {
      setResultado({ estado: ESTADOS.INVALIDO });
      setEstado("resultado");
      return;
    }
    setEstado("validando");
    // QR de reserva (M11): check-in con pedido; los `v1.` siguen siendo visitas (G10).
    if (esQrReserva(limpio)) {
      try {
        const r = await api.post("/v1/reservations/checkin", { qr: limpio });
        onCheckin?.(r);
        if (montadoRef.current) setResultado({ estado: ESTADOS.OK, tipo: "reserva", cliente: r?.cliente?.nombre || null, reserva: r?.reserva || null, puntos: r?.puntosPedido || 0 });
      } catch (e) {
        if (montadoRef.current) setResultado({ estado: estadoCheckinDesdeError(e), tipo: "reserva" });
      } finally {
        if (montadoRef.current) setEstado("resultado");
      }
      return;
    }
    try {
      const r = onValidar ? await onValidar(limpio) : await api.post("/v1/visitas/validar", { qr: limpio });
      const llegada = aLlegada({ ...r?.visita, cliente: r?.cliente });
      if (montadoRef.current && llegada) setLlegadas((prev) => agregarLlegada(prev, llegada));
      setResultado({
        estado: ESTADOS.OK,
        cliente: r?.cliente?.nombre || llegada?.cliente || null,
        texto: r?.aplicar?.texto || llegada?.texto || null,
        descuentoPct: r?.aplicar?.descuentoPct ?? llegada?.descuentoPct ?? null,
      });
    } catch (e) {
      if (montadoRef.current) setResultado({ estado: estadoDesdeError(e) });
    } finally {
      if (montadoRef.current) {
        setEstado("resultado");
        cargarLista();
      }
    }
  }, [onValidar, cargarLista, onCheckin]);

  const bucle = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      loopRef.current = requestAnimationFrame(bucle);
      return;
    }
    const w = Math.min(video.videoWidth, 480);
    const h = Math.round((video.videoHeight / video.videoWidth) * w) || 480;
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d", { willReadFrequently: true }).drawImage(video, 0, 0, w, h);
    const img = canvas.getContext("2d").getImageData(0, 0, w, h);
    const qr = jsQR(img.data, w, h, { inversionAttempts: "dontInvert" });
    if (qr?.data && !validoRef.current) {
      validoRef.current = true; // evita varias validaciones con el mismo frame
      pararCamara();
      setCamara("inactiva");
      validar(qr.data);
      return;
    }
    loopRef.current = requestAnimationFrame(bucle);
  }, [pararCamara, validar]);

  const abrirCamara = useCallback(async () => {
    setResultado(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamara("no_disponible");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      if (!montadoRef.current) { // se desmontó mientras esperaba el permiso
        stream.getTracks().forEach((tr) => tr.stop());
        return;
      }
      streamRef.current = stream;
      validoRef.current = false;
      setCamara("activa");
      setEstado("escaneando");
      const video = videoRef.current;
      video.srcObject = stream;
      await video.play();
      loopRef.current = requestAnimationFrame(bucle);
    } catch {
      if (montadoRef.current) setCamara("sin_permiso");
    }
  }, [bucle]);

  const cerrarCamara = useCallback(() => {
    pararCamara();
    setCamara("inactiva");
    setEstado("idle");
  }, [pararCamara]);

  function enviarManual(e) {
    e.preventDefault();
    validar(manual);
  }

  function reiniciar() {
    setResultado(null);
    setManual("");
    setEstado("idle");
  }

  const iconoEstado = {
    [ESTADOS.OK]: "check_circle",
    [ESTADOS.CADUCADO]: "schedule",
    [ESTADOS.YA_USADO]: "done_all",
    [ESTADOS.OTRO_RESTAURANTE]: "storefront",
    [ESTADOS.INVALIDO]: "error",
    [ESTADOS.ERROR_RED]: "wifi_off",
    [ESTADOS.CANCELADA]: "event_busy",
    [ESTADOS.FUERA_DE_FECHA]: "event",
  };
  const mensaje = (r) => {
    if (r.tipo !== "reserva") return t(claveMensajeEstado(r.estado));
    if (r.estado === ESTADOS.OK) return t("escaner.estadoReservaOk");
    if (r.estado === ESTADOS.YA_USADO) return t("escaner.estadoYaPresentada");
    return t(claveMensajeEstado(r.estado));
  };

  return (
    <div className="op-panel" data-test="escaner-panel">
      <div className="op-panel-head">
        <h3 className="op-panel-title">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>qr_code_scanner</span>
          {t("escaner.titulo")}
        </h3>
        <p style={{ fontSize: "0.75rem", color: "var(--op-on-variant)" }}>{t("escaner.subtitulo")}</p>
      </div>

      {resultado ? (
        <div style={{ marginTop: "0.75rem", textAlign: "center" }} data-test="escaner-resultado">
          <span className="material-symbols-outlined" style={{
            fontSize: 48, color: resultado.estado === ESTADOS.OK ? "var(--op-primary)" : "var(--op-error, #d9534f)",
          }}>{iconoEstado[resultado.estado]}</span>
          <p style={{ fontWeight: 700, margin: "0.4rem 0" }}>{mensaje(resultado)}</p>
          {resultado.estado === ESTADOS.OK && resultado.tipo === "reserva" && (
            <div data-test="escaner-reserva" style={{
              background: "var(--op-surface-container)", padding: "0.75rem",
              margin: "0.5rem auto", maxWidth: 360, textAlign: "left",
            }}>
              {resultado.cliente && <strong>{resultado.cliente}</strong>}
              {resultado.reserva && (
                <p style={{ margin: "0.2rem 0 0", fontSize: "0.82rem", color: "var(--op-on-variant)" }}>
                  {resultado.reserva.codigo ? `${resultado.reserva.codigo} · ` : ""}
                  {t("escaner.reservaDatos", { hora: resultado.reserva.hora, comensales: resultado.reserva.comensales })}
                </p>
              )}
              {resultado.reserva?.pedido ? (
                <>
                  <p style={{ margin: "0.6rem 0 0.25rem", fontSize: "0.78rem", fontWeight: 700 }}>{t("escaner.reservaPedido")}</p>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "0.82rem" }}>
                    {resultado.reserva.pedido.lineas.map((l) => (
                      <li key={l.platoId} style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                        <span><strong>{l.cantidad} ×</strong> {l.nombre}</span><span>{Number(l.subtotal).toFixed(2)} €</span>
                      </li>
                    ))}
                  </ul>
                  <p style={{ display: "flex", justifyContent: "space-between", margin: "0.35rem 0 0", fontWeight: 700, fontSize: "0.85rem" }}>
                    <span>{t("reservasPanel.total")}</span><span>{Number(resultado.reserva.pedido.total).toFixed(2)} €</span>
                  </p>
                </>
              ) : <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem" }}>{t("escaner.reservaSinPedido")}</p>}
              {resultado.puntos > 0 && <p style={{ margin: "0.5rem 0 0", fontSize: "0.78rem", color: "var(--op-primary)", fontWeight: 700 }}>{t("escaner.puntosPedido", { puntos: resultado.puntos })}</p>}
            </div>
          )}
          {resultado.estado === ESTADOS.OK && resultado.tipo !== "reserva" && (
            <div style={{
              background: "var(--op-surface-container)", borderRadius: "0", padding: "0.75rem",
              margin: "0.5rem auto", maxWidth: 360,
            }}>
              {resultado.cliente && <strong>{resultado.cliente}</strong>}
              {resultado.texto && (
                <p style={{ margin: "0.35rem 0 0", fontSize: "0.82rem" }}>
                  {resultado.texto}
                  {resultado.descuentoPct != null && ` · ${t("escaner.descuento", { pct: resultado.descuentoPct })}`}
                </p>
              )}
            </div>
          )}
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
            {camara === "activa"
              ? <button type="button" className="op-btn-ghost" onClick={cerrarCamara}>{t("escaner.detenerCamara")}</button>
              : <button type="button" className="op-btn-primary" onClick={abrirCamara}>{t("escaner.abrirCamara")}</button>}
            <button type="button" className="op-btn-ghost" onClick={reiniciar}>{t("escaner.reintentar")}</button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ marginTop: "0.75rem", textAlign: "center" }}>
            <video ref={videoRef} playsInline muted style={{
              display: camara === "activa" ? "block" : "none",
              width: "100%", maxWidth: 360, borderRadius: "0", background: "#000", margin: "0 auto",
            }} />
            <canvas ref={canvasRef} style={{ display: "none" }} />
            {camara === "activa" ? (
              <button type="button" className="op-btn-ghost" style={{ marginTop: "0.5rem" }} onClick={cerrarCamara}>
                {t("escaner.detenerCamara")}
              </button>
            ) : (
              <button type="button" className="op-btn-primary" onClick={abrirCamara}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: "middle" }}>photo_camera</span>{" "}
                {t("escaner.abrirCamara")}
              </button>
            )}
            {camara === "sin_permiso" && <p className="op-empty">{t("escaner.permisoDenegado")}</p>}
            {camara === "no_disponible" && <p className="op-empty">{t("escaner.camaraNoDisponible")}</p>}
            {estado === "escaneando" && <p className="op-empty">{t("escaner.apuntando")}</p>}
          </div>

          {/* Fallback manual: siempre disponible, obligatorio si no hay cámara */}
          <form onSubmit={enviarManual} style={{ marginTop: "0.75rem" }}>
            <label className="op-field">
              <span>{t("escaner.manualTitulo")}</span>
              <input className="op-input" value={manual} onChange={(e) => setManual(e.target.value)}
                placeholder={t("escaner.manualPlaceholder")} autoComplete="off" />
            </label>
            <button type="submit" className="op-btn-ghost" disabled={estado === "validando" || !manual.trim()}>
              {estado === "validando" ? t("escaner.validando") : t("escaner.manualBoton")}
            </button>
          </form>
        </>
      )}

      <h4 className="op-panel-title" style={{ marginTop: "1rem", fontSize: "0.8rem" }}>
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>how_to_reg</span>
        {t("escaner.llegadasTitulo")}
      </h4>
      {errorLista && (
        <p className="ofertas-error" role="alert">{t("escaner.errorLista")}</p>
      )}
      <ul style={{ listStyle: "none", padding: 0, margin: "0.4rem 0 0" }} data-test="escaner-lista">
        {llegadas.map((v) => (
          <li key={v.id} style={{
            display: "flex", justifyContent: "space-between", gap: "0.5rem",
            padding: "0.5rem 0", borderBottom: "1px solid var(--op-border)", fontSize: "0.8rem",
          }}>
            <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.cliente || v.texto || t("escaner.ofertaGenerico")}</span>
            <span style={{ color: "var(--op-on-variant)", whiteSpace: "nowrap" }}>
              {v.descuentoPct != null ? t("escaner.descuento", { pct: v.descuentoPct }) + " · " : ""}
              {v.hora ? new Date(v.hora).toLocaleTimeString(t("modelos.locale"), { hour: "2-digit", minute: "2-digit" }) : ""}
            </span>
            {ETIQUETA_ESTADO[v.estado] && (
              <span data-test="escaner-estado" style={{
                fontWeight: 700, whiteSpace: "nowrap",
                color: v.estado === "confirmada" ? "var(--op-primary)" : "var(--op-on-variant)",
              }}>{t(ETIQUETA_ESTADO[v.estado])}</span>
            )}
          </li>
        ))}
        {!errorLista && llegadas.length === 0 && <li className="op-empty">{t("escaner.sinLlegadas")}</li>}
      </ul>
    </div>
  );
}
