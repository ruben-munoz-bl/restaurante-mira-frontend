/** OpsRestaurantes — red de locales: paginación 27, buscador y acciones (mensaje / editar / eliminar). */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  mensajeErrorFirestore,
  listarRestaurantesAdmin,
  editarRestauranteAdmin,
  eliminarRestauranteAdmin,
  enviarMensajeDueno,
} from './opsData.js';

const LOTE = 27;

const CAMPOS_EDICION = [
  { k: 'nombre', label: 'Nombre', type: 'text' },
  { k: 'ciudad', label: 'Ciudad', type: 'text' },
  { k: 'direccion', label: 'Dirección', type: 'text' },
  { k: 'telefono', label: 'Teléfono', type: 'text' },
  { k: 'email', label: 'Email dueño', type: 'email' },
  { k: 'precio', label: 'Precio (€ / €€ / €€€)', type: 'text' },
  { k: 'cocina', label: 'Cocina', type: 'text' },
  { k: 'descripcion', label: 'Descripción', type: 'text' },
  { k: 'comisionPct', label: 'Comisión %', type: 'number' },
  { k: 'maxReservasPorHora', label: 'Máx. reservas/hora', type: 'number' },
];

export default function OpsRestaurantes() {
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [terminado, setTerminado] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [q, setQ] = useState('');
  const [qAplicada, setQAplicada] = useState('');

  const [modal, setModal] = useState(null); // { tipo: 'mensaje'|'editar'|'eliminar', rest }
  const [form, setForm] = useState({});
  const [asunto, setAsunto] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [guardando, setGuardando] = useState(false);
  const peticionRef = useRef(0);

  const cargarPrimera = useCallback(async (texto) => {
    const id = ++peticionRef.current;
    setCargando(true);
    setError('');
    try {
      const r = await listarRestaurantesAdmin({ q: texto || '', limit: LOTE });
      if (id !== peticionRef.current) return;
      setItems(r.items);
      setCursor(r.cursor);
      setTerminado(r.terminado);
      setQAplicada(texto || '');
    } catch (e) {
      if (id === peticionRef.current) setError(mensajeErrorFirestore(e, 'restaurantes'));
    } finally {
      if (id === peticionRef.current) setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarPrimera('');
  }, [cargarPrimera]);

  function buscar() {
    cargarPrimera(q.trim());
  }

  async function cargarMas() {
    if (!cursor || cargando) return;
    const id = peticionRef.current;
    setCargando(true);
    try {
      const r = await listarRestaurantesAdmin({ q: qAplicada, cursor, limit: LOTE });
      if (id !== peticionRef.current) return;
      setItems((prev) => {
        const vistos = new Set(prev.map((x) => x.id));
        return [...prev, ...r.items.filter((x) => !vistos.has(x.id))];
      });
      setCursor(r.cursor);
      setTerminado(r.terminado);
    } catch (e) {
      setError(mensajeErrorFirestore(e, 'restaurantes'));
    } finally {
      setCargando(false);
    }
  }

  function abrirModal(tipo, rest) {
    setError('');
    setOk('');
    if (tipo === 'editar') {
      const base = {};
      CAMPOS_EDICION.forEach(({ k }) => {
        base[k] = rest[k] ?? (k === 'comisionPct' || k === 'maxReservasPorHora' ? '' : '');
      });
      if (rest.categorias?.length && !rest.cocina) base.cocina = rest.categorias[0];
      setForm(base);
    } else if (tipo === 'mensaje') {
      setAsunto(`Consulta MIRA — ${rest.nombre || ''}`);
      setMensaje('');
    }
    setModal({ tipo, rest });
  }

  function cerrarModal() {
    if (guardando) return;
    setModal(null);
    setForm({});
    setAsunto('');
    setMensaje('');
  }

  function patchRest(id, patch) {
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setModal((prev) => (prev && prev.rest.id === id ? { ...prev, rest: { ...prev.rest, ...patch } } : prev));
  }

  async function guardarEdicion() {
    if (!modal || guardando) return;
    setError('');
    setGuardando(true);
    try {
      const payload = {};
      CAMPOS_EDICION.forEach(({ k, type }) => {
        const raw = form[k];
        if (raw === '' || raw == null) return;
        if (type === 'number') {
          const n = Number(raw);
          if (Number.isFinite(n)) payload[k] = n;
        } else {
          payload[k] = String(raw).trim();
        }
      });
      await editarRestauranteAdmin(modal.rest.id, payload);
      patchRest(modal.rest.id, payload);
      setOk(`Restaurante «${payload.nombre || modal.rest.nombre}» actualizado.`);
      setModal(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  async function enviarAlDueno() {
    if (!modal || guardando || !mensaje.trim()) return;
    setError('');
    setGuardando(true);
    try {
      await enviarMensajeDueno(modal.rest.id, {
        asunto: asunto.trim() || undefined,
        mensaje: mensaje.trim(),
      });
      setOk(`Mensaje enviado al dueño de «${modal.rest.nombre}».`);
      setModal(null);
      setMensaje('');
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarEliminar() {
    if (!modal || guardando) return;
    setError('');
    setGuardando(true);
    try {
      await eliminarRestauranteAdmin(modal.rest.id);
      setItems((prev) => prev.filter((r) => r.id !== modal.rest.id));
      setOk(`«${modal.rest.nombre}» eliminado del catálogo.`);
      setModal(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="ops-card">
      <div className="ops-card-head">
        <div>
          <h2>Gestión Restaurantes</h2>
          <p className="ops-card-sub">
            {items.length} cargados{terminado ? ' (fin de listado)' : cursor ? ' · más disponibles' : ''}
            {qAplicada ? ` · filtro «${qAplicada}»` : ''} · lotes de {LOTE}
          </p>
        </div>
      </div>

      <div className="ops-toolbar" role="search">
        <input
          className="ops-input"
          type="search"
          placeholder="Nombre, ciudad, cocina…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') buscar(); }}
          style={{ flex: 1, minWidth: 220 }}
          aria-label="Buscar restaurantes"
        />
        <button type="button" className="ops-btn primary sm" onClick={buscar}>Buscar</button>
        {qAplicada && (
          <button
            type="button"
            className="ops-btn soft sm"
            onClick={() => { setQ(''); cargarPrimera(''); }}
          >
            Limpiar
          </button>
        )}
      </div>

      {error && <p className="ops-error" role="alert">{error}</p>}
      {ok && <p className="ops-success" role="status">{ok}</p>}
      {cargando && items.length === 0 && <p className="ops-empty" role="status">Cargando restaurantes…</p>}
      {!cargando && items.length === 0 && <p className="ops-empty">Sin resultados.</p>}

      {items.length > 0 && (
        <div className="ops-table-wrap">
          <table className="ops-table">
            <thead>
              <tr>
                <th>Restaurante &amp; ciudad</th>
                <th>Cocina</th>
                <th style={{ textAlign: 'right' }}>Nota</th>
                <th style={{ textAlign: 'right' }}>Reseñas</th>
                <th style={{ textAlign: 'right' }}>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id}>
                  <td>
                    <span className="ops-rest-cell">
                      <span className="ops-rest-ini">{(r.nombre || '?').slice(0, 2).toUpperCase()}</span>
                      <span>
                        <strong>{r.nombre}</strong>
                        <br />
                        <span className="ops-muted">{r.ciudad} · {r.precio || '—'}</span>
                      </span>
                    </span>
                  </td>
                  <td>{r.cocina || (r.categorias || [])[0] || '—'}</td>
                  <td className="num">★ {(r.valoracion ?? r.rating_yelp ?? 0).toLocaleString('es-ES')}</td>
                  <td className="num">{(r.totalResenasYelp ?? r.total_resenas_yelp ?? (r.resenas || []).length ?? 0).toLocaleString('es-ES')}</td>
                  <td style={{ textAlign: 'right' }}>
                    {r.activo === false
                      ? <span className="ops-status-pill danger">Inactivo</span>
                      : (r.valoracion ?? r.rating_yelp ?? 0) >= 4.5
                        ? <span className="ops-status-pill">Verificado</span>
                        : <span className="ops-status-pill warn">En red</span>}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <button type="button" className="ops-btn soft sm" onClick={() => abrirModal('mensaje', r)} title="Enviar mensaje al dueño">
                        <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: -2 }}>mail</span>
                        {' '}Mensaje
                      </button>
                      <button type="button" className="ops-btn soft sm" onClick={() => abrirModal('editar', r)} title="Editar ficha">
                        <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: -2 }}>edit</span>
                        {' '}Editar
                      </button>
                      <button type="button" className="ops-btn danger sm" onClick={() => abrirModal('eliminar', r)} title="Eliminar restaurante">
                        <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: -2 }}>delete</span>
                        {' '}Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!terminado && cursor && items.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
          <button type="button" className="ops-btn soft sm" onClick={cargarMas} disabled={cargando}>
            {cargando ? 'Cargando…' : `Cargar siguientes ${LOTE}`}
          </button>
        </div>
      )}

      {modal?.tipo === 'mensaje' && (
        <div className="ops-modal-overlay" onClick={cerrarModal}>
          <div className="ops-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="ops-msg-t">
            <h3 id="ops-msg-t">Mensaje al dueño — {modal.rest.nombre}</h3>
            <p className="ops-muted" style={{ marginTop: -4, marginBottom: 12 }}>
              Se entrega en el buzón interno (#/mensajes){modal.rest.email ? ` · ${modal.rest.email}` : ''}
            </p>
            <div className="ops-field">
              <label htmlFor="ops-asunto">Asunto</label>
              <input id="ops-asunto" type="text" className="ops-input" value={asunto} onChange={(e) => setAsunto(e.target.value)} maxLength={160} />
            </div>
            <div className="ops-field">
              <label htmlFor="ops-mensaje">Mensaje</label>
              <textarea
                id="ops-mensaje"
                className="ops-input"
                style={{ height: 120, paddingTop: 10, resize: 'vertical', fontFamily: 'inherit' }}
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                placeholder="Texto para el dueño…"
                maxLength={4000}
                required
              />
            </div>
            <div className="ops-modal-actions">
              <button type="button" className="ops-btn primary sm" onClick={enviarAlDueno} disabled={guardando || !mensaje.trim()}>
                {guardando ? 'Enviando…' : 'Enviar'}
              </button>
              <button type="button" className="ops-btn soft sm" onClick={cerrarModal} disabled={guardando}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {modal?.tipo === 'editar' && (
        <div className="ops-modal-overlay" onClick={cerrarModal}>
          <div className="ops-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="ops-edit-t">
            <h3 id="ops-edit-t">Editar — {modal.rest.nombre}</h3>
            <p className="ops-muted" style={{ marginTop: -4, marginBottom: 12 }}>ID {modal.rest.id}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {CAMPOS_EDICION.map(({ k, label, type }) => (
                <div className="ops-field" key={k}>
                  <label htmlFor={`ops-f-${k}`}>{label}</label>
                  <input
                    id={`ops-f-${k}`}
                    type={type}
                    className="ops-input"
                    value={form[k] ?? ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, [k]: e.target.value }))}
                    step={type === 'number' ? 'any' : undefined}
                  />
                </div>
              ))}
            </div>
            <div className="ops-modal-actions">
              <button type="button" className="ops-btn primary sm" onClick={guardarEdicion} disabled={guardando}>
                {guardando ? 'Guardando…' : 'Guardar cambios'}
              </button>
              <button type="button" className="ops-btn soft sm" onClick={cerrarModal} disabled={guardando}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {modal?.tipo === 'eliminar' && (
        <div className="ops-modal-overlay" onClick={cerrarModal}>
          <div className="ops-modal" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true" aria-labelledby="ops-del-t">
            <h3 id="ops-del-t">¿Eliminar restaurante?</h3>
            <p>
              Vas a borrar <strong>«{modal.rest.nombre}»</strong> ({modal.rest.ciudad || '—'}) del catálogo.
              Esta acción no se puede deshacer desde el panel.
            </p>
            <div className="ops-modal-actions">
              <button type="button" className="ops-btn danger sm" onClick={confirmarEliminar} disabled={guardando}>
                {guardando ? 'Eliminando…' : 'Sí, eliminar'}
              </button>
              <button type="button" className="ops-btn soft sm" onClick={cerrarModal} disabled={guardando}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
