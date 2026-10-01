/** OpsRestaurantes — red de locales: paginación 27, buscador y acciones (mensaje / editar / eliminar). */
import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import {
  mensajeErrorFirestore,
  listarRestaurantesAdmin,
  editarRestauranteAdmin,
  eliminarRestauranteAdmin,
  enviarMensajeDueno,
} from './opsData.js';
import { useOpsStyles, MONO } from './OpsTokens';
import {
  OpsCard,
  OpsBtn,
  OpsInput,
  OpsField,
  OpsModal,
  OpsModalTitulo,
  OpsError,
  OpsSuccess,
  OpsEmpty,
  OpsStatusPill,
  OpsTabla,
  OpsTr,
  OpsTd,
} from './OpsUi';

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

const COLS = [
  { titulo: 'Restaurante & ciudad', w: 230 },
  { titulo: 'Cocina', w: 110 },
  { titulo: 'Nota', w: 74, derecha: true },
  { titulo: 'Reseñas', w: 78, derecha: true },
  { titulo: 'Estado', w: 104, derecha: true },
  { titulo: 'Acciones', w: 300, derecha: true },
];

export default function OpsRestaurantes() {
  const { s, op } = useOpsStyles();
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
        base[k] = rest[k] ?? '';
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

  const estadoRest = (r) => {
    if (r.activo === false) return <OpsStatusPill tipo="danger">Inactivo</OpsStatusPill>;
    if ((r.valoracion ?? r.rating_yelp ?? 0) >= 4.5) return <OpsStatusPill>Verificado</OpsStatusPill>;
    return <OpsStatusPill tipo="warn">En red</OpsStatusPill>;
  };

  return (
    <OpsCard
      titulo="Gestión Restaurantes"
      sub={`${items.length} cargados${terminado ? ' (fin de listado)' : cursor ? ' · más disponibles' : ''}${
        qAplicada ? ` · filtro «${qAplicada}»` : ''
      } · lotes de ${LOTE}`}
    >
      <View style={s.toolbar}>
        <OpsInput
          value={q}
          onChangeText={setQ}
          onSubmit={buscar}
          placeholder="Nombre, ciudad, cocina…"
          style={{ flexGrow: 1, minWidth: 200 }}
        />
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <OpsBtn tipo="primary" sm onPress={buscar}>
            Buscar
          </OpsBtn>
          {qAplicada ? (
            <OpsBtn
              sm
              onPress={() => {
                setQ('');
                cargarPrimera('');
              }}
            >
              Limpiar
            </OpsBtn>
          ) : null}
        </View>
      </View>

      <OpsError>{error}</OpsError>
      <OpsSuccess>{ok}</OpsSuccess>
      {cargando && items.length === 0 ? <OpsEmpty cargando /> : null}
      {!cargando && items.length === 0 ? <OpsEmpty>Sin resultados.</OpsEmpty> : null}

      {items.length > 0 ? (
        <OpsTabla cols={COLS}>
          {items.map((r) => (
            <OpsTr key={r.id}>
              <OpsTd w={COLS[0].w}>
                <View style={s.restCell}>
                  <Text style={s.restIni}>{(r.nombre || '?').slice(0, 2).toUpperCase()}</Text>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[s.tdTxt, { fontWeight: '700' }]} numberOfLines={1}>
                      {r.nombre}
                    </Text>
                    <Text style={s.muted} numberOfLines={1}>
                      {r.ciudad} · {r.precio || '—'}
                    </Text>
                  </View>
                </View>
              </OpsTd>
              <OpsTd w={COLS[1].w}>
                <Text style={s.tdTxt} numberOfLines={1}>
                  {r.cocina || (r.categorias || [])[0] || '—'}
                </Text>
              </OpsTd>
              <OpsTd w={COLS[2].w} derecha>
                <Text style={[s.tdTxt, s.num, { fontFamily: MONO }]}>
                  ★ {(r.valoracion ?? r.rating_yelp ?? 0).toLocaleString('es-ES')}
                </Text>
              </OpsTd>
              <OpsTd w={COLS[3].w} derecha>
                <Text style={[s.tdTxt, s.num, { fontFamily: MONO }]}>
                  {(r.totalResenasYelp ?? r.total_resenas_yelp ?? (r.resenas || []).length ?? 0).toLocaleString('es-ES')}
                </Text>
              </OpsTd>
              <OpsTd w={COLS[4].w} derecha>
                {estadoRest(r)}
              </OpsTd>
              <OpsTd w={COLS[5].w} derecha style={{ paddingVertical: 8 }}>
                <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <OpsBtn sm icono="mail" onPress={() => abrirModal('mensaje', r)}>
                    Mensaje
                  </OpsBtn>
                  <OpsBtn sm icono="edit" onPress={() => abrirModal('editar', r)}>
                    Editar
                  </OpsBtn>
                  <OpsBtn tipo="danger" sm icono="delete" onPress={() => abrirModal('eliminar', r)}>
                    Eliminar
                  </OpsBtn>
                </View>
              </OpsTd>
            </OpsTr>
          ))}
        </OpsTabla>
      ) : null}

      {!terminado && cursor && items.length > 0 ? (
        <View style={{ alignItems: 'center', marginTop: 12 }}>
          <OpsBtn sm onPress={cargarMas} disabled={cargando}>
            {cargando ? 'Cargando…' : `Cargar siguientes ${LOTE}`}
          </OpsBtn>
        </View>
      ) : null}

      {/* Modal mensaje al dueño */}
      <OpsModal visible={modal?.tipo === 'mensaje'} onClose={cerrarModal}>
        <OpsModalTitulo sub={`Se entrega en el buzón interno (#/mensajes)${modal?.rest?.email ? ` · ${modal.rest.email}` : ''}`}>
          {`Mensaje al dueño — ${modal?.rest?.nombre || ''}`}
        </OpsModalTitulo>
        <View style={{ height: 12 }} />
        <OpsField label="Asunto">
          <OpsInput value={asunto} onChangeText={setAsunto} maxLength={160} placeholder="Asunto" />
        </OpsField>
        <OpsField label="Mensaje">
          <OpsInput
            value={mensaje}
            onChangeText={setMensaje}
            placeholder="Texto para el dueño…"
            maxLength={4000}
            multiline
            numberOfLines={5}
          />
        </OpsField>
        <View style={s.modalActions}>
          <OpsBtn tipo="primary" sm onPress={enviarAlDueno} disabled={guardando || !mensaje.trim()}>
            {guardando ? 'Enviando…' : 'Enviar'}
          </OpsBtn>
          <OpsBtn sm onPress={cerrarModal} disabled={guardando}>
            Cancelar
          </OpsBtn>
        </View>
      </OpsModal>

      {/* Modal editar ficha */}
      <OpsModal visible={modal?.tipo === 'editar'} onClose={cerrarModal}>
        <OpsModalTitulo sub={modal?.rest?.id ? `ID ${modal.rest.id}` : undefined}>
          {`Editar — ${modal?.rest?.nombre || ''}`}
        </OpsModalTitulo>
        <View style={{ height: 12 }} />
        <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ gap: 10, paddingBottom: 8 }}>
          {CAMPOS_EDICION.map(({ k, label, type }) => (
            <OpsField key={k} label={label}>
              <OpsInput
                value={String(form[k] ?? '')}
                onChangeText={(v) => setForm((prev) => ({ ...prev, [k]: v }))}
                keyboardType={type === 'number' || type === 'email' ? (type === 'email' ? 'email-address' : 'numeric') : 'default'}
                placeholder={label}
              />
            </OpsField>
          ))}
        </ScrollView>
        <View style={s.modalActions}>
          <OpsBtn tipo="primary" sm onPress={guardarEdicion} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </OpsBtn>
          <OpsBtn sm onPress={cerrarModal} disabled={guardando}>
            Cancelar
          </OpsBtn>
        </View>
      </OpsModal>

      {/* Modal eliminar */}
      <OpsModal visible={modal?.tipo === 'eliminar'} onClose={cerrarModal}>
        <OpsModalTitulo>¿Eliminar restaurante?</OpsModalTitulo>
        <View style={{ height: 10 }} />
        <Text style={{ fontSize: 14, color: op.onSurface, lineHeight: 20 }}>
          Vas a borrar «{modal?.rest?.nombre}» ({modal?.rest?.ciudad || '—'}) del catálogo. Esta acción no se puede deshacer desde
          el panel.
        </Text>
        <View style={s.modalActions}>
          <OpsBtn tipo="danger" sm onPress={confirmarEliminar} disabled={guardando}>
            {guardando ? 'Eliminando…' : 'Sí, eliminar'}
          </OpsBtn>
          <OpsBtn sm onPress={cerrarModal} disabled={guardando}>
            Cancelar
          </OpsBtn>
        </View>
      </OpsModal>
    </OpsCard>
  );
}
