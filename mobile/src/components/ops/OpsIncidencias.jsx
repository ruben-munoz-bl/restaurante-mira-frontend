/** OpsIncidencias — contactos pendientes (resolver) + negocios propuestos (aprobar/rechazar). */
import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { listarPendientes, resolverIncidencia } from '../../services/incidenciaApi.js';
import { listarNegociosPendientes, aprobarNegocio, rechazarNegocio } from '../../services/negocioApi.js';
import { useOpsStyles } from './OpsTokens';
import { OpsCard, OpsBtn, OpsEmpty, OpsError } from './OpsUi';

export default function OpsIncidencias() {
  const { s } = useOpsStyles();
  const [contactos, setContactos] = useState([]);
  const [negocios, setNegocios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [actuando, setActuando] = useState('');

  useEffect(() => {
    let vivo = true;
    Promise.all([listarPendientes().catch(() => []), listarNegociosPendientes().catch(() => [])])
      .then(([c, n]) => {
        if (vivo) {
          setContactos(c);
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
    return () => {
      vivo = false;
    };
  }, []);

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
        {cargando ? (
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
                <OpsBtn tipo="primary" sm disabled={actuando === c.id} onPress={() => accionar(resolverIncidencia, c.id, 'c')}>
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
    </View>
  );
}
