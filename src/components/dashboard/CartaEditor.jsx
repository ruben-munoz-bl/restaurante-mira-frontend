import { useState, useEffect } from "react";
import { getCartaEditar, guardarCarta } from "../../services/cartaApi.js";
import { ALERGENOS } from "../../models/restaurantModel.js";
import { categoriaVacia, platoVacio, mover, validarCarta, paraGuardar, aFormulario } from "../../models/cartaModel.js";
import { useT } from "../../i18n/index.jsx";
import es from "../../i18n/es.js";
import ca from "../../i18n/ca.js";
import en from "../../i18n/en.js";

const TRADS = { es, ca, en };

/**
 * Editor de carta (M09). Con `oferta`, solo aparece si el restaurante aún no
 * tiene carta y ofrece crearla ahora (onCrear) o hacerlo luego (onLuego).
 */
export default function CartaEditor({ restauranteId, oferta = false, onCrear, onLuego }) {
  const t = useT(TRADS);
  const [cats, setCats] = useState(null);
  const [errores, setErrores] = useState({});
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let vivo = true;
    setCats(null); setError("");
    getCartaEditar(restauranteId)
      .then((c) => { if (vivo) setCats(aFormulario(c?.categorias)); })
      .catch((e) => { if (vivo) { setCats([]); setError(e.status === 403 ? t("cartaEditor.errSinPermiso") : e.message); } });
    return () => { vivo = false; };
  }, [restauranteId]);

  if (oferta) {
    if (!cats || cats.length || error) return null;
    return (
      <div className="op-panel" data-test="carta-oferta">
        <div className="op-panel-title"><span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--op-primary)" }}>menu_book</span>{t("cartaEditor.ofertaTitulo")}</div>
        <p style={{ fontSize: "0.82rem", color: "var(--op-on-variant)" }}>{t("cartaEditor.ofertaTexto")}</p>
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
          <button type="button" className="op-btn-primary" onClick={onCrear}>{t("cartaEditor.crearAhora")}</button>
          <button type="button" className="op-btn-ghost" onClick={onLuego}>{t("cartaEditor.hacerLuego")}</button>
        </div>
      </div>
    );
  }

  if (!cats) return <div className="op-panel"><p>{t("otros.cargando")}</p></div>;

  const cambiar = (fn) => { setCats(fn); setErrores({}); setAviso(""); };
  const setCat = (i, campo, v) => cambiar((p) => p.map((c, k) => (k === i ? { ...c, [campo]: v } : c)));
  const setPlato = (i, j, campo, v) => cambiar((p) => p.map((c, k) => (k !== i ? c : { ...c, platos: c.platos.map((x, m) => (m === j ? { ...x, [campo]: v } : x)) })));
  const err = (ruta) => errores[ruta] && <span className="auth-error" role="alert" style={{ fontSize: "0.75rem" }}>{t(`cartaEditor.${errores[ruta]}`)}</span>;

  async function guardar() {
    const e = validarCarta(cats);
    setErrores(e); setError(""); setAviso("");
    if (Object.keys(e).length) { setError(t("cartaEditor.revisa")); return; }
    setGuardando(true);
    try {
      const c = await guardarCarta(restauranteId, paraGuardar(cats));
      setCats(aFormulario(c?.categorias));
      setAviso(t("cartaEditor.guardada"));
    } catch (e2) {
      setError(e2.status === 400 ? t("cartaEditor.errServidor") : e2.status === 403 ? t("cartaEditor.errSinPermiso") : e2.message);
    } finally { setGuardando(false); }
  }

  const btn = (icono, label, onClick, disabled) => (
    <button type="button" className="op-btn-ghost" onClick={onClick} disabled={disabled} aria-label={label} title={label}>
      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{icono}</span>
    </button>
  );

  return (
    <div className="op-panel" data-test="carta-editor">
      <div className="op-panel-title"><span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--op-primary)" }}>menu_book</span>{t("cartaEditor.titulo")}</div>
      {err("carta")}
      {cats.map((c, i) => (
        <fieldset key={c.id || c._k || `n${i}`} style={{ border: "1px solid var(--op-outline-variant, #ddd)", padding: "0.75rem", margin: "0.5rem 0", display: "grid", gap: "0.5rem" }}>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "end", flexWrap: "wrap" }}>
            <label className="op-field" style={{ flex: 1, minWidth: 200 }}><span>{t("cartaEditor.categoria")}</span>
              <input className="op-input" maxLength={60} value={c.nombre} onChange={(e) => setCat(i, "nombre", e.target.value)} />
            </label>
            {btn("arrow_upward", t("cartaEditor.subir"), () => cambiar((p) => mover(p, i, -1)), i === 0)}
            {btn("arrow_downward", t("cartaEditor.bajar"), () => cambiar((p) => mover(p, i, 1)), i === cats.length - 1)}
            {btn("delete", t("cartaEditor.borrarCategoria"), () => { if (window.confirm(t("cartaEditor.confirmarBorrar"))) cambiar((p) => p.filter((_, k) => k !== i)); })}
          </div>
          {err(`c${i}.nombre`)}{err(`c${i}.platos`)}
          {c.platos.map((p, j) => {
            const r = `c${i}.p${j}`;
            return (
              <div key={p.id || p._k || `n${j}`} style={{ borderTop: "1px dashed var(--op-outline-variant, #ddd)", paddingTop: "0.5rem", display: "grid", gap: "0.5rem", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))" }}>
                <label className="op-field"><span>{t("cartaEditor.plato")} *</span><input className="op-input" maxLength={80} value={p.nombre} onChange={(e) => setPlato(i, j, "nombre", e.target.value)} />{err(`${r}.nombre`)}</label>
                <label className="op-field"><span>{t("cartaEditor.precio")} *</span><input className="op-input" inputMode="decimal" value={p.precio} onChange={(e) => setPlato(i, j, "precio", e.target.value)} />{err(`${r}.precio`)}</label>
                <label className="op-field"><span>{t("cartaEditor.foto")}</span><input className="op-input" type="url" placeholder="https://" value={p.foto} onChange={(e) => setPlato(i, j, "foto", e.target.value)} />{err(`${r}.foto`)}</label>
                <label className="op-field" style={{ gridColumn: "1 / -1" }}><span>{t("cartaEditor.descripcion")}</span><textarea className="op-input" style={{ height: "auto", padding: "0.5rem" }} rows={2} maxLength={300} value={p.descripcion} onChange={(e) => setPlato(i, j, "descripcion", e.target.value)} />{err(`${r}.descripcion`)}</label>
                <fieldset style={{ gridColumn: "1 / -1", border: 0, padding: 0, display: "flex", gap: "0.75rem", flexWrap: "wrap", fontSize: "0.82rem" }}>
                  <legend>{t("cartaEditor.alergenos")}</legend>
                  {ALERGENOS.map((a) => (
                    <label key={a.key}><input type="checkbox" checked={p.alergenos.includes(a.key)} onChange={(e) => setPlato(i, j, "alergenos", e.target.checked ? [...p.alergenos, a.key] : p.alergenos.filter((x) => x !== a.key))} /> {a.label}</label>
                  ))}
                  <label><input type="checkbox" checked={p.disponible} onChange={(e) => setPlato(i, j, "disponible", e.target.checked)} /> {t("cartaEditor.disponible")}</label>
                  {btn("delete", t("cartaEditor.borrarPlato"), () => cambiar((x) => x.map((cc, k) => (k !== i ? cc : { ...cc, platos: cc.platos.filter((_, m) => m !== j) }))))}
                </fieldset>
                {err(`${r}.alergenos`)}
              </div>
            );
          })}
          <button type="button" className="op-btn-ghost" style={{ justifySelf: "start" }} onClick={() => cambiar((p) => p.map((cc, k) => (k === i ? { ...cc, platos: [...cc.platos, platoVacio()] } : cc)))}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span> {t("cartaEditor.anadirPlato")}
          </button>
        </fieldset>
      ))}
      {error && <p className="auth-error" role="alert">{error}</p>}
      {aviso && <p role="status" style={{ color: "#065f46", fontWeight: 700 }}>{aviso}</p>}
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
        <button type="button" className="op-btn-ghost" onClick={() => cambiar((p) => [...p, categoriaVacia()])}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span> {t("cartaEditor.anadirCategoria")}
        </button>
        <button type="button" className="op-btn-primary" onClick={guardar} disabled={guardando} data-test="carta-guardar">
          {guardando ? t("otros.cargando") : t("cartaEditor.guardar")}
        </button>
      </div>
    </div>
  );
}
