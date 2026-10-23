import { useCallback, useEffect, useState } from "react";
import { promotionsApi } from "../../services/api.js";
import {
  promocionVacia, validarPromocion, validarEdicion, paraGuardar, paraActualizar,
  estadoPromocion, bloqueaNueva, fechaCorta, fechaInput, erroresDeApi,
  claveErrorApi, claveErrorEdicion,
} from "../../models/promocionesModel.js";
import { useT } from "../../i18n/index.jsx";
import es from "../../i18n/es.js";
import ca from "../../i18n/ca.js";
import en from "../../i18n/en.js";

const TRADS = { es, ca, en };

const ESTADO_BADGE = { activa: "confirmada", caducada: "cancelada", programada: "pendiente", finalizada: "cancelada" };
const ESTADO_CLAVE = { activa: "activa", caducada: "caducada", programada: "programada", finalizada: "finalizada" };

/**
 * Campañas de promoción de un restaurante (M15).
 * Lista + crear + estadísticas. No edita ni desactiva: el backend todavía no
 * tiene PUT/DELETE y una campaña caducada sigue bloqueando con 409.
 */
export default function PromocionesPanel({ restauranteId, restauranteNombre = "" }) {
  const t = useT(TRADS);
  const locale = t("modelos.locale");
  const [promos, setPromos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCargar, setErrorCargar] = useState(false);
  const [modo, setModo] = useState("lista"); // lista | crear
  const [form, setForm] = useState(promocionVacia);
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [stats, setStats] = useState(null);
  const [editando, setEditando] = useState(null); // id de la campaña en edición
  const [edicion, setEdicion] = useState({ fechaFin: "", presupuestoTotal: "" });
  const [erroresEdicion, setErroresEdicion] = useState({});
  const [errorEdicion, setErrorEdicion] = useState("");
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  const recargar = useCallback(async () => {
    if (!restauranteId) { setPromos([]); setCargando(false); return; }
    setCargando(true);
    setErrorCargar(false);
    try {
      setPromos(await promotionsApi.list({ restauranteId, auth: true }));
    } catch {
      setErrorCargar(true);
    } finally {
      setCargando(false);
    }
  }, [restauranteId]);

  useEffect(() => {
    setModo("lista");
    setAviso("");
    setEditando(null);
    recargar();
  }, [recargar]);

  useEffect(() => {
    if (!aviso) return undefined;
    const id = setTimeout(() => setAviso(""), 5000);
    return () => clearTimeout(id);
  }, [aviso]);

  // Las stats solo tienen sentido para la campaña que el backend considera activa.
  const activa = promos.find(bloqueaNueva);
  useEffect(() => {
    if (!activa) { setStats(null); return undefined; }
    let vivo = true;
    promotionsApi.getStats(activa.id)
      .then((s) => { if (vivo) setStats(s); })
      .catch(() => { if (vivo) setStats(null); });
    return () => { vivo = false; };
  }, [activa?.id]);

  function cambiar(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    setErrores({});
    setErrorGeneral("");
  }

  function abrirCrear() {
    setForm(promocionVacia());
    setErrores({});
    setErrorGeneral("");
    setModo("crear");
  }

  async function guardar() {
    const e = validarPromocion(form);
    if (e) { setErrores(e); return; }
    setGuardando(true);
    setErrorGeneral("");
    try {
      await promotionsApi.crear(paraGuardar(form, restauranteId));
      setAviso("creada");
      setModo("lista");
      await recargar();
    } catch (err) {
      const detalles = erroresDeApi(err);
      if (detalles) setErrores(detalles);
      setErrorGeneral(t(`promociones.${claveErrorApi(err)}`));
    } finally {
      setGuardando(false);
    }
  }

  function abrirEditar(p) {
    setEditando(p.id);
    setEdicion({ fechaFin: fechaInput(p.fechaFin), presupuestoTotal: String(p.presupuestoTotal ?? "") });
    setErroresEdicion({});
    setErrorEdicion("");
    setErrorGeneral("");
  }

  function cambiarEdicion(campo, valor) {
    setEdicion((prev) => ({ ...prev, [campo]: valor }));
    setErroresEdicion({});
    setErrorEdicion("");
  }

  async function guardarEdicion(p) {
    const e = validarEdicion(edicion, fechaInput(p.fechaInicio));
    if (e) { setErroresEdicion(e); return; }
    setGuardandoEdicion(true);
    setErrorEdicion("");
    try {
      await promotionsApi.actualizar(p.id, paraActualizar(edicion));
      setAviso("actualizada");
      setEditando(null);
      await recargar();
    } catch (err) {
      const detalles = erroresDeApi(err);
      if (detalles) setErroresEdicion(detalles);
      setErrorEdicion(t(`promociones.${claveErrorEdicion(err)}`));
    } finally {
      setGuardandoEdicion(false);
    }
  }

  async function finalizar(p) {
    if (!window.confirm(t("promociones.confirmarFinalizar"))) return;
    setGuardandoEdicion(true);
    setErrorGeneral("");
    try {
      await promotionsApi.actualizar(p.id, { estado: "finalizada" });
      setAviso("cerrada");
      setEditando(null);
      await recargar();
    } catch (err) {
      setErrorGeneral(t(`promociones.${claveErrorEdicion(err)}`));
    } finally {
      setGuardandoEdicion(false);
    }
  }

  function euros(valor) {
    const n = Number(valor);
    if (!Number.isFinite(n)) return "—";
    return `${n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
  }

  const activaCaducada = Boolean(activa && estadoPromocion(activa) === "caducada");

  return (
    <div className="op-panel ofertas-panel" data-test="promociones-panel">
      <div className="ofertas-head">
        <div>
          <div className="op-panel-title">
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--op-primary)" }}>campaign</span>
            {t("promociones.titulo")}
            {restauranteNombre ? ` · ${restauranteNombre}` : ""}
          </div>
          <p className="ofertas-intro">{t("promociones.intro")}</p>
        </div>
        {modo === "lista" && !activa && (
          <button type="button" className="op-btn-primary" onClick={abrirCrear} data-test="promociones-nueva">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span> {t("promociones.nueva")}
          </button>
        )}
      </div>

      {aviso && (
        <p className="ofertas-ok" role="status" data-test="promociones-aviso">
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
          {t(`promociones.${aviso}`)}
        </p>
      )}

      {activa && modo === "lista" && (
        <p className="ofertas-aviso-mejora" data-test="promociones-bloqueo">
          {t("promociones.avisoActiva")}
          {activaCaducada ? ` ${t("promociones.avisoCaducada")}` : ""}
        </p>
      )}

      {modo === "crear" && (
        <div className="ofertas-form" data-test="promociones-form">
          <div className="ofertas-form-fila">
            <label className="op-field">
              <span>{t("promociones.fechaInicio")}</span>
              <input className="op-input" type="date" value={form.fechaInicio}
                onChange={(e) => cambiar("fechaInicio", e.target.value)} data-test="promociones-fecha-inicio" />
              {errores.fechaInicio && <span className="ofertas-error">{t(`promociones.${errores.fechaInicio[0]}`)}</span>}
            </label>
            <label className="op-field">
              <span>{t("promociones.fechaFin")}</span>
              <input className="op-input" type="date" value={form.fechaFin}
                onChange={(e) => cambiar("fechaFin", e.target.value)} data-test="promociones-fecha-fin" />
              {errores.fechaFin && <span className="ofertas-error">{t(`promociones.${errores.fechaFin[0]}`)}</span>}
            </label>
            <label className="op-field">
              <span>{t("promociones.presupuestoTotal")}</span>
              <input className="op-input" type="number" min="0.01" max="1000000" step="0.01"
                value={form.presupuestoTotal} onChange={(e) => cambiar("presupuestoTotal", e.target.value)}
                data-test="promociones-presupuesto" />
              {errores.presupuestoTotal && <span className="ofertas-error">{t(`promociones.${errores.presupuestoTotal[0]}`)}</span>}
            </label>
          </div>

          <details className="promos-avanzado">
            <summary>{t("promociones.avanzado")}</summary>
            <div className="ofertas-form-fila">
              <label className="op-field">
                <span>{t("promociones.tipoCampo")}</span>
                <input className="op-input" type="text" maxLength={60} value={form.tipo}
                  onChange={(e) => cambiar("tipo", e.target.value)} data-test="promociones-tipo" />
                {errores.tipo && <span className="ofertas-error">{t(`promociones.${errores.tipo[0]}`)}</span>}
              </label>
              <label className="op-field">
                <span>{t("promociones.cpcCampo")}</span>
                <input className="op-input" type="number" min="0.01" max="100" step="0.01"
                  value={form.cpc} onChange={(e) => cambiar("cpc", e.target.value)} data-test="promociones-cpc" />
                {errores.cpc && <span className="ofertas-error">{t(`promociones.${errores.cpc[0]}`)}</span>}
              </label>
              <label className="op-field">
                <span>{t("promociones.puntosExtraCampo")}</span>
                <input className="op-input" type="number" min="0" max="10000" step="1"
                  value={form.puntosExtraPorReserva} onChange={(e) => cambiar("puntosExtraPorReserva", e.target.value)}
                  data-test="promociones-puntos" />
                {errores.puntosExtraPorReserva && <span className="ofertas-error">{t(`promociones.${errores.puntosExtraPorReserva[0]}`)}</span>}
              </label>
            </div>
          </details>

          {errorGeneral && (
            <p className="ofertas-error" role="alert" data-test="promociones-error-form">{errorGeneral}</p>
          )}

          <div className="ofertas-acciones">
            <button type="button" className="op-btn-primary" onClick={guardar} disabled={guardando} data-test="promociones-guardar">
              {guardando ? t("promociones.guardando") : t("promociones.crear")}
            </button>
            <button type="button" className="op-btn-ghost btn-cancelar" onClick={() => setModo("lista")} disabled={guardando}>
              {t("promociones.cancelar")}
            </button>
          </div>
        </div>
      )}

      {modo === "lista" && cargando && <p className="ofertas-vacio">{t("otros.cargando")}</p>}
      {modo === "lista" && errorCargar && (
        <div className="ofertas-vacio">
          <p className="ofertas-error" role="alert">{t("promociones.errorCargar")}</p>
          <button type="button" className="op-btn-ghost" onClick={recargar}>{t("promociones.reintentar")}</button>
        </div>
      )}
      {modo === "lista" && errorGeneral && !cargando && (
        <p className="ofertas-error" role="alert">{errorGeneral}</p>
      )}
      {modo === "lista" && !cargando && !errorCargar && promos.length === 0 && !activa && (
        <p className="ofertas-vacio" data-test="promociones-vacio">{t("promociones.sinPromociones")}</p>
      )}

      {modo === "lista" && !errorCargar && promos.length > 0 && (
        <div className="ofertas-lista">
          {promos.map((p) => {
            const estado = estadoPromocion(p);
            return (
              <div key={p.id} className="ofertas-fila" data-test="promociones-fila">
                <div className="ofertas-fila-info">
                  <div className="ofertas-fila-titulo">
                    {t("promociones.campana")} · {p.tipo || "boost_visibilidad"}
                    <span className={`op-status ${ESTADO_BADGE[estado]}`}>
                      <span className="op-status-dot"></span>{t(`promociones.${ESTADO_CLAVE[estado]}`)}
                    </span>
                  </div>
                  <span className="ofertas-fila-meta">
                    {t("promociones.vigencia")}: {fechaCorta(p.fechaInicio, locale)} → {fechaCorta(p.fechaFin, locale)}
                  </span>
                  <div className="ofertas-chips">
                    <span className="ofertas-chip">{t("promociones.presupuesto")}: {euros(p.presupuestoTotal)}</span>
                    <span className="ofertas-chip">{t("promociones.gasto")}: {euros(p.gastoAcumulado)}</span>
                    <span className="ofertas-chip">{t("promociones.cpc")}: {euros(p.cpc)}</span>
                    <span className="ofertas-chip">{t("promociones.puntosExtra")}: {p.puntosExtraPorReserva ?? 0}</span>
                  </div>
                  {editando === p.id ? (
                    <div className="promos-edicion" data-test="promociones-edicion">
                      <label className="op-field">
                        <span>{t("promociones.fechaFin")}</span>
                        <input className="op-input" type="date" value={edicion.fechaFin}
                          onChange={(e) => cambiarEdicion("fechaFin", e.target.value)} data-test="promociones-editar-fin" />
                        {erroresEdicion.fechaFin && <span className="ofertas-error">{t(`promociones.${erroresEdicion.fechaFin[0]}`)}</span>}
                      </label>
                      <label className="op-field">
                        <span>{t("promociones.presupuestoTotal")}</span>
                        <input className="op-input" type="number" min="0.01" max="1000000" step="0.01"
                          value={edicion.presupuestoTotal} onChange={(e) => cambiarEdicion("presupuestoTotal", e.target.value)}
                          data-test="promociones-editar-presupuesto" />
                        {erroresEdicion.presupuestoTotal && <span className="ofertas-error">{t(`promociones.${erroresEdicion.presupuestoTotal[0]}`)}</span>}
                      </label>
                      {errorEdicion && <p className="ofertas-error" role="alert">{errorEdicion}</p>}
                      <div className="ofertas-acciones">
                        <button type="button" className="op-btn-primary" onClick={() => guardarEdicion(p)} disabled={guardandoEdicion} data-test="promociones-editar-guardar">
                          {guardandoEdicion ? t("promociones.guardandoCambios") : t("promociones.guardarCambios")}
                        </button>
                        <button type="button" className="op-btn-ghost" onClick={() => setEditando(null)} disabled={guardandoEdicion}>
                          {t("promociones.cancelar")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="promos-acciones">
                      <button type="button" className="op-btn-ghost" onClick={() => abrirEditar(p)} data-test="promociones-editar">
                        {t("promociones.editar")}
                      </button>
                      {p.estado !== "finalizada" && (
                        <button type="button" className="op-btn-ghost" onClick={() => finalizar(p)} disabled={guardandoEdicion} data-test="promociones-finalizar">
                          {t("promociones.finalizar")}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modo === "lista" && stats && (
        <div className="promos-stats" data-test="promociones-stats">
          <span><strong>{stats.views ?? 0}</strong> {t("promociones.views")}</span>
          <span><strong>{stats.clicks ?? 0}</strong> {t("promociones.clicks")}</span>
          <span><strong>{stats.ctr ?? 0}%</strong> {t("promociones.ctr")}</span>
          <span><strong>{stats.reservasGeneradas ?? 0}</strong> {t("promociones.reservas")}</span>
          <span><strong>{euros(stats.gastoAcumulado)}</strong> {t("promociones.gastoAcumulado")}</span>
        </div>
      )}
    </div>
  );
}
