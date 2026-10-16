/** OpsIncidencias — contactos pendientes (resolver con formulario) y resueltos + negocios propuestos (aprobar/rechazar). */
import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { listarPendientes, listarResueltas, resolverIncidencia, alResolverIncidencia } from '../../services/incidenciaApi.js';
import { listarNegociosPendientes, aprobarNegocio, rechazarNegocio } from '../../services/negocioApi.js';
import { useOpsStyles } from './OpsTokens';
import { OpsCard, OpsBtn, OpsEmpty, OpsError, OpsSeg, OpsModal, OpsModalTitulo, OpsField, OpsInput } from './OpsUi';

const VACIA = { propuestaResolucion: '', solucion: '', encargado: '' };

export default function OpsIncidencias() {
  const { s } = useOpsStyles();
  const [contactos, setContactos] = useState([]);
  const [resueltas, setResueltas] = useState([]);
  const [vista, setVista] = useState('pendientes');
  const [resolviendo, setResolviendo] = useState(null);
  const [form, setForm] = useState(VACIA);
  const [negocios, setNegocios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [actuando, setActuando] = useState('');

  useEffect(() => {
    let vivo = true;
    Promise.all([listarPendientes().catch(() => []), listarNegociosPendientes().catch(() => []), listarResueltas().catch(() => [])])
      .then(([c, n, r]) => {
        if (vivo) {
          setContactos(c);
          setResueltas(r);
          setNegocios(n);
          setCargando(false);
        }
      })
      .catch((e) => {
        if (vivo) {
          setError(e.message);
          setCargando(false);
        }
      });
    // Tras resolver se vuelven a pedir pendientes y resueltas a la API (BUG-133).
    const quitar = alResolverIncidencia(() => {
      listarPendientes().then((c) => vivo && setContactos(c)).catch(() => {});
      listarResueltas().then((r) => vivo && setResueltas(r)).catch(() => {});
    });
    return () => {
      vivo = false;
      quitar();
    };
  }, []);

  async function confirmarResolucion() {
    const c = resolviendo;
    setError('');
    setActuando(c.id);
    try {
      // Antes se enviaba sin cuerpo y la API respondía siempre 400 (BUG-133).
      await resolverIncidencia(c.id, form);
      setContactos((p) => p.filter((x) => x.id !== c.id));
      setResueltas((p) => [{ ...c, ...form, resueltaEn: new Date().toISOString() }, ...p.filter((x) => x.id !== c.id)]);
      setResolviendo(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setActuando('');
    }
  }

  async function accionar(fn, id, quitarDe) {
    setError('');
    setActuando(id);
    try {
      await fn(id);
      if (quitarDe === 'c') setContactos((p) => p.filter((x) => x.id !== id));
      else setNegocios((p) => p.filter((x) => x.id !== id));
    } catch (e) {
      setError(e.message);
    } finally {
      setActuando('');
    }
  }

  return (
    <View style={{ gap: 20 }}>
      <OpsCard
        titulo={`Incidencias & Soporte (${contactos.length})`}
        sub="Mensajes de contacto pendientes · resolver los marca como resueltos"
      >
        <OpsSeg
          valor={vista}
          onChange={setVista}
          opciones={[
            { valor: 'pendientes', etiqueta: `Pendientes (${contactos.length})` },
            { valor: 'resueltas', etiqueta: `Resueltas (${resueltas.length})` },
          ]}
        />
        <View style={{ height: 12 }} />
        {vista === 'resueltas' ? (
          resueltas.length === 0 ? (
            <OpsEmpty>{cargando ? 'Cargando…' : 'Aún no hay incidencias resueltas.'}</OpsEmpty>
          ) : (
            <View style={s.list}>
              {resueltas.map((r) => (
                <View key={r.id} style={s.listItem}>
                  <View style={s.listItemCuerpo}>
                    <Text style={s.listItemTitulo}>
                      {r.motivo || 'Incidencia'} · {r.nombre} ({r.email})
                    </Text>
                    <Text style={s.muted} numberOfLines={3}>
                      {r.solucion || ''}
                    </Text>
                    <Text style={s.muted}>
                      {r.encargado ? `${r.encargado} · ` : ''}
                      {r.resueltaEn ? new Date(r.resueltaEn._seconds ? r.resueltaEn._seconds * 1000 : r.resueltaEn).toLocaleString('es-ES') : ''}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )
        ) : cargando ? (
          <OpsEmpty cargando />
        ) : contactos.length === 0 ? (
          <OpsEmpty>Sin incidencias pendientes.</OpsEmpty>
        ) : (
          <View style={s.list}>
            {contactos.map((c) => (
              <View key={c.id} style={s.listItem}>
                <View style={s.listItemCuerpo}>
                  <Text style={s.listItemTitulo}>
                    {c.motivo || 'Incidencia'} · {c.nombre} ({c.email})
                  </Text>
                  <Text style={s.muted} numberOfLines={4}>
                    {(c.mensaje || '').slice(0, 220)}
                  </Text>
                </View>
                <OpsBtn tipo="primary" sm disabled={actuando === c.id} onPress={() => {
                    setForm(VACIA);
                    setResolviendo(c);
                  }}>
                  Resolver
                </OpsBtn>
              </View>
            ))}
          </View>
        )}
      </OpsCard>

      <OpsCard titulo={`Locales propuestos (${negocios.length})`} sub="Aprobar copia el local a la red · rechazar lo archiva">
        {!cargando && negocios.length === 0 ? <OpsEmpty>Sin propuestas pendientes.</OpsEmpty> : null}
        <View style={s.list}>
          {negocios.map((n) => (
            <View key={n.id} style={s.listItem}>
              <View style={s.listItemCuerpo}>
                <Text style={s.listItemTitulo}>
                  {n.nombre} · {n.ciudad} ({(n.categorias || []).join(', ')})
                </Text>
                <Text style={s.muted}>
                  {n.direccion} · {n.precio} · {n.email}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <OpsBtn tipo="primary" sm disabled={actuando === n.id} onPress={() => accionar(aprobarNegocio, n.id, 'n')}>
                  Aprobar
                </OpsBtn>
                <OpsBtn sm disabled={actuando === n.id} onPress={() => accionar(rechazarNegocio, n.id, 'n')}>
                  Rechazar
                </OpsBtn>
              </View>
            </View>
          ))}
        </View>
      </OpsCard>

      {error ? <OpsError>{error}</OpsError> : null}

      <OpsModal visible={Boolean(resolviendo)} onClose={() => setResolviendo(null)}>
        <OpsModalTitulo sub={resolviendo ? `${resolviendo.nombre || ''} (${resolviendo.email || ''})` : undefined}>
          {`Resolver — ${resolviendo?.motivo || 'Incidencia'}`}
        </OpsModalTitulo>
        <View style={{ height: 12 }} />
        <OpsField label="Propuesta de resolución">
          <OpsInput value={form.propuestaResolucion} onChangeText={(v) => setForm((f) => ({ ...f, propuestaResolucion: v }))} maxLength={4000} multiline numberOfLines={3} />
        </OpsField>
        <OpsField label="Solución aplicada">
          <OpsInput value={form.solucion} onChangeText={(v) => setForm((f) => ({ ...f, solucion: v }))} maxLength={4000} multiline numberOfLines={3} />
        </OpsField>
        <OpsField label="Encargado">
          <OpsInput value={form.encargado} onChangeText={(v) => setForm((f) => ({ ...f, encargado: v }))} maxLength={200} />
        </OpsField>
        {error ? <OpsError>{error}</OpsError> : null}
        <View style={s.modalActions}>
          <OpsBtn
            tipo="primary"
            sm
            onPress={confirmarResolucion}
            disabled={Boolean(actuando) || !form.propuestaResolucion.trim() || !form.solucion.trim() || !form.encargado.trim()}
          >
            {actuando ? 'Guardando…' : 'Confirmar resolución'}
          </OpsBtn>
          <OpsBtn sm onPress={() => setResolviendo(null)} disabled={Boolean(actuando)}>
            Cancelar
          </OpsBtn>
        </View>
      </OpsModal>
    </View>
  );
}
